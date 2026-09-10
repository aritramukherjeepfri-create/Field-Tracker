import { useState, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './store/AuthContext';
import { AppProvider } from './store/AppContext';
import { ThemeProvider } from './store/ThemeContext';
import { isSupabaseConfigured } from './lib/supabaseClient';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { SetupRequiredScreen } from './screens/SetupRequiredScreen';
import { AuthScreen } from './screens/AuthScreen';
import { ProjectsDashboard } from './screens/ProjectsDashboard';
import { NewProject } from './screens/NewProject';
import { ProjectDetail } from './screens/ProjectDetail';
import { Tasks } from './screens/Tasks';
import { Expenses } from './screens/Expenses';
import { FieldLog } from './screens/FieldLog';
import { Settings } from './screens/Settings';
import type { ActiveTab } from './types';

// Reports pulls in recharts, which is the single heaviest dependency in
// the app — lazy-load it so the initial bundle (and every screen that
// isn't Reports) stays light.
const Reports = lazy(() => import('./screens/Reports').then((m) => ({ default: m.Reports })));

function ScreenLoading() {
  return (
    <div className="flex items-center justify-center py-2xl">
      <div className="w-6 h-6 rounded-full border-2 border-outline-variant border-t-primary animate-spin" />
    </div>
  );
}

type View =
  | { kind: 'tab'; tab: ActiveTab }
  | { kind: 'new-project' }
  | { kind: 'project-detail'; projectId: string };

function AppShell() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('projects');
  const [view, setView] = useState<View>({ kind: 'tab', tab: 'projects' });

  function goToTab(tab: ActiveTab) {
    setActiveTab(tab);
    setView({ kind: 'tab', tab });
  }

  const showBack = view.kind !== 'tab';

  let overrideTitle: string | undefined;
  let content: React.ReactNode;

  if (view.kind === 'new-project') {
    overrideTitle = 'New Project';
    content = (
      <NewProject
        onCancel={() => goToTab('projects')}
        onCreated={(id) => setView({ kind: 'project-detail', projectId: id })}
      />
    );
  } else if (view.kind === 'project-detail') {
    overrideTitle = 'Project';
    content = (
      <ProjectDetail
        projectId={view.projectId}
        onBack={() => goToTab('projects')}
        onDeleted={() => goToTab('projects')}
      />
    );
  } else {
    switch (activeTab) {
      case 'projects':
        content = (
          <ProjectsDashboard
            onSelectProject={(id) => setView({ kind: 'project-detail', projectId: id })}
            onNewProject={() => setView({ kind: 'new-project' })}
          />
        );
        break;
      case 'tasks':
        content = <Tasks />;
        break;
      case 'expenses':
        content = <Expenses />;
        break;
      case 'log':
        content = <FieldLog />;
        break;
      case 'reports':
        content = (
          <Suspense fallback={<ScreenLoading />}>
            <Reports />
          </Suspense>
        );
        break;
      case 'settings':
        content = <Settings />;
        break;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header
        activeTab={activeTab}
        onBack={showBack ? () => goToTab(activeTab) : undefined}
        overrideTitle={overrideTitle}
        onOpenSettings={() => goToTab('settings')}
      />
      <main className="flex-1 max-w-xl w-full mx-auto">{content}</main>
      <BottomNav active={activeTab} onChange={goToTab} />
    </div>
  );
}

function Gate() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 rounded-full border-2 border-outline-variant border-t-primary animate-spin" />
      </div>
    );
  }

  if (!session || !profile) {
    return <AuthScreen />;
  }

  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

function App() {
  if (!isSupabaseConfigured) {
    return <SetupRequiredScreen />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
