import { useRef, useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { useApp } from '../store/AppContext';
import { useTheme } from '../store/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import { seedSampleData } from '../lib/seedRemote';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { Avatar } from '../components/Avatar';
import { FloatingInput } from '../components/FloatingInput';
import { ConfirmDialog } from '../components/Modal';
import type { UserRole } from '../types';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Program Manager',
  field_officer: 'Field Officer',
  viewer: 'Viewer',
};

export function Settings() {
  const { profile, organization, session, signOut, refreshProfile } = useAuth();
  const { orgMembers, canManage, refresh } = useApp();
  const { theme, toggleTheme } = useTheme();

  const [name, setName] = useState(profile?.name ?? '');
  const [avatar, setAvatar] = useState<string | undefined>(profile?.avatar_url ?? undefined);
  const [savedFlash, setSavedFlash] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    await supabase.from('profiles').update({ name: name.trim() || profile.name, avatar_url: avatar ?? null }).eq('id', profile.id);
    await refreshProfile();
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  async function handleRoleChange(memberId: string, role: UserRole) {
    await supabase.from('profiles').update({ role }).eq('id', memberId);
    await refresh();
  }

  async function handleAddSampleData() {
    if (!profile || !session) return;
    setSeeding(true);
    setSeedMessage(null);
    const { error } = await seedSampleData(profile.org_id, session.user.id);
    setSeeding(false);
    setSeedMessage(error ?? 'Sample project added.');
    await refresh();
  }

  function copyInviteCode() {
    if (!organization) return;
    navigator.clipboard?.writeText(organization.invite_code);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 1500);
  }

  return (
    <div className="px-md py-lg flex flex-col gap-xl pb-2xl">
      <section className="flex flex-col gap-sm">
        <h2 className="text-title-lg text-on-surface">Profile</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-sm">
          <div className="flex items-center gap-md">
            <Avatar name={name || 'User'} src={avatar} size={64} />
            <label className="text-body-sm font-medium text-primary cursor-pointer flex items-center gap-xs">
              <Icon name="photo_camera" size={16} />
              Change photo
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </label>
          </div>
          <FloatingInput label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <FloatingInput label="Email" value={session?.user.email ?? ''} disabled className="opacity-70" />
          <FloatingInput label="Role" value={profile ? ROLE_LABELS[profile.role] : ''} disabled className="opacity-70" />
          <Button type="submit" icon={<Icon name="save" size={18} />} className="self-start">
            {savedFlash ? 'Saved' : 'Save changes'}
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-sm">
        <h2 className="text-title-lg text-on-surface">Organization</h2>
        <div className="rounded-xl bg-surface-container-low p-md flex flex-col gap-xs">
          <p className="text-body-lg font-medium text-on-surface">{organization?.name}</p>
          {canManage && organization && (
            <>
              <p className="text-body-sm text-on-surface-variant">
                Share this invite code with new team members — they'll enter it on the "Join org" tab when signing up.
              </p>
              <button
                onClick={copyInviteCode}
                className="self-start flex items-center gap-xs rounded-full bg-surface-container-lowest border border-outline-variant px-md py-xs text-body-sm font-mono text-on-surface"
              >
                {organization.invite_code}
                <Icon name={copiedInvite ? 'check_circle' : 'download'} size={14} />
              </button>
              {copiedInvite && <p className="text-[11px] text-secondary">Copied to clipboard.</p>}
            </>
          )}
        </div>

        <h3 className="text-body-lg font-medium text-on-surface mt-sm">Team ({orgMembers.length})</h3>
        <div className="flex flex-col gap-xs">
          {orgMembers.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl bg-surface-container-low px-md py-sm">
              <div className="flex items-center gap-sm min-w-0">
                <Avatar name={m.name} src={m.avatarUrl ?? undefined} size={36} />
                <p className="text-body-sm font-medium text-on-surface truncate">{m.name}</p>
              </div>
              {canManage && m.id !== profile?.id ? (
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.id, e.target.value as UserRole)}
                  className="text-[12px] rounded-full border border-outline-variant bg-surface-container-lowest px-sm py-xs shrink-0"
                >
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              ) : (
                <span className="text-[11px] text-on-surface-variant shrink-0">{ROLE_LABELS[m.role]}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-sm">
        <h2 className="text-title-lg text-on-surface">Appearance</h2>
        <button
          onClick={toggleTheme}
          className="flex items-center justify-between rounded-xl bg-surface-container-low px-md py-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span className="flex items-center gap-sm text-body-lg text-on-surface">
            <Icon name={theme === 'dark' ? 'dark_mode' : 'light_mode'} />
            {theme === 'dark' ? 'Dark mode' : 'Light mode'}
          </span>
          <span className={`relative w-11 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-outline-variant'}`}>
            <span className={`absolute top-[2px] w-5 h-5 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
          </span>
        </button>
      </section>

      {canManage && (
        <section className="flex flex-col gap-sm">
          <h2 className="text-title-lg text-on-surface">Sample data</h2>
          <Button variant="outline" icon={<Icon name="add" size={18} />} className="self-start" onClick={handleAddSampleData} disabled={seeding}>
            {seeding ? 'Adding…' : 'Add Sample Project'}
          </Button>
          {seedMessage && <p className="text-body-sm text-on-surface-variant">{seedMessage}</p>}
          <p className="text-body-sm text-on-surface-variant">
            Adds one realistic sample project with budgets, team, logs, and tasks — useful for exploring the app without touching real data. This adds to your org's data rather than replacing it.
          </p>
        </section>
      )}

      <section className="flex flex-col gap-sm">
        <h2 className="text-title-lg text-on-surface">Account</h2>
        <Button variant="outline" icon={<Icon name="logout" size={18} />} className="self-start" onClick={() => setConfirmSignOut(true)}>
          Sign Out
        </Button>
      </section>

      <ConfirmDialog
        open={confirmSignOut}
        title="Sign out?"
        message="You'll need to sign in again to access your organization's data."
        confirmLabel="Sign Out"
        danger={false}
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={() => {
          setConfirmSignOut(false);
          signOut();
        }}
      />
    </div>
  );
}
