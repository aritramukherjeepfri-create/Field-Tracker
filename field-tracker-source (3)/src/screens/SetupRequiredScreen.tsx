import { Icon } from '../components/Icon';

export function SetupRequiredScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-lg py-2xl">
      <div className="max-w-md w-full flex flex-col gap-md">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary-container/20 text-primary">
          <Icon name="construction" size={28} />
        </div>
        <h1 className="text-headline-md-mobile text-on-surface">Connect Supabase to continue</h1>
        <p className="text-body-sm text-on-surface-variant">
          Field Tracker needs a Supabase project to store your organization's data. This is a one-time setup.
        </p>
        <ol className="flex flex-col gap-sm text-body-sm text-on-surface-variant list-decimal list-inside">
          <li>Create a free project at <span className="text-primary">supabase.com</span>.</li>
          <li>Open the SQL Editor in your new project and run the contents of <code className="text-on-surface bg-surface-container-low px-xs py-[1px] rounded">supabase/schema.sql</code> from this repo.</li>
          <li>In your Supabase project settings, copy the <strong>Project URL</strong> and <strong>anon public key</strong>.</li>
          <li>
            Create a <code className="text-on-surface bg-surface-container-low px-xs py-[1px] rounded">.env</code> file in the
            project root (copy <code className="text-on-surface bg-surface-container-low px-xs py-[1px] rounded">.env.example</code>) and fill in:
          </li>
        </ol>
        <pre className="text-[12px] bg-surface-container-low text-on-surface rounded-xl p-md overflow-x-auto">
{`VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...`}
        </pre>
        <p className="text-body-sm text-on-surface-variant">
          Then restart the dev server (or redeploy). Full details are in <code className="text-on-surface bg-surface-container-low px-xs py-[1px] rounded">README.md</code>.
        </p>
      </div>
    </div>
  );
}
