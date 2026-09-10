import { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { FloatingInput } from '../components/FloatingInput';

type Mode = 'signin' | 'signup-create' | 'signup-join';

export function AuthScreen() {
  const { signInWithPassword, signUpCreateOrg, signUpJoinOrg } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    let result: { error: string | null };
    if (mode === 'signin') {
      result = await signInWithPassword(email, password);
    } else if (mode === 'signup-create') {
      result = await signUpCreateOrg(email, password, displayName, orgName);
    } else {
      result = await signUpJoinOrg(email, password, displayName, inviteCode);
    }

    setBusy(false);
    if (result.error) {
      setError(result.error);
    } else if (mode !== 'signin') {
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-lg">
        <div className="max-w-sm w-full text-center flex flex-col items-center gap-sm">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container">
            <Icon name="check_circle" size={32} />
          </div>
          <h1 className="text-headline-md-mobile text-on-surface">Check your email</h1>
          <p className="text-body-sm text-on-surface-variant">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in here.
          </p>
          <Button variant="outline" onClick={() => { setCheckEmail(false); setMode('signin'); }} className="mt-sm">
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-lg py-2xl">
      <div className="max-w-sm w-full flex flex-col gap-lg">
        <div className="flex flex-col items-center gap-xs">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-on-primary">
            <img src="/favicon.svg" alt="" className="w-8 h-8" />
          </div>
          <h1 className="text-headline-md-mobile text-on-surface">Field Tracker</h1>
          <p className="text-body-sm text-on-surface-variant text-center">
            {mode === 'signin' ? 'Sign in to your organization' : 'Create your account'}
          </p>
        </div>

        <div className="flex rounded-full bg-surface-container-low p-[3px]">
          {(['signin', 'signup-create', 'signup-join'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              className={`flex-1 rounded-full py-xs text-[12px] font-medium transition-colors ${
                mode === m ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant'
              }`}
            >
              {m === 'signin' ? 'Sign in' : m === 'signup-create' ? 'New org' : 'Join org'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-sm">
          {mode !== 'signin' && (
            <FloatingInput label="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          )}
          <FloatingInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <FloatingInput label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />

          {mode === 'signup-create' && (
            <FloatingInput label="Organization name" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
          )}
          {mode === 'signup-join' && (
            <FloatingInput label="Invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required />
          )}

          {mode === 'signup-create' && (
            <p className="text-[11px] text-on-surface-variant">
              This creates a brand-new organization with you as Admin. You'll get an invite code afterward to share with your team.
            </p>
          )}
          {mode === 'signup-join' && (
            <p className="text-[11px] text-on-surface-variant">
              Ask your organization's admin for the invite code (Settings → Team, once signed in).
            </p>
          )}

          {error && (
            <p className="text-body-sm text-error flex items-center gap-xs">
              <Icon name="warning" size={16} /> {error}
            </p>
          )}

          <Button type="submit" disabled={busy} className="mt-sm">
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>
      </div>
    </div>
  );
}
