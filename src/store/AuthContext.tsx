import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { ProfileRow, OrganizationRow } from '../lib/database.types';
interface AuthContextValue {
  session: Session | null;
  profile: ProfileRow | null;
  organization: OrganizationRow | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpCreateOrg: (email: string, password: string, displayName: string, orgName: string) => Promise<{ error: string | null }>;
  signUpJoinOrg: (email: string, password: string, displayName: string, inviteCode: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [organization, setOrganization] = useState<OrganizationRow | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single<ProfileRow>();
    setProfile(profileData ?? null);

    if (profileData) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profileData.org_id)
        .single<OrganizationRow>();
      setOrganization(orgData ?? null);
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
        setOrganization(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    profile,
    organization,
    loading,

    signInWithPassword: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },

    signUpCreateOrg: async (email, password, displayName, orgName) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName, org_name: orgName } },
      });
      return { error: error?.message ?? null };
    },

    signUpJoinOrg: async (email, password, displayName, inviteCode) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName, invite_code: inviteCode.trim() } },
      });
      return { error: error?.message ?? null };
    },

    signOut: async () => {
      await supabase.auth.signOut();
    },

    refreshProfile: async () => {
      if (session) await loadProfile(session.user.id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [session, profile, organization, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
