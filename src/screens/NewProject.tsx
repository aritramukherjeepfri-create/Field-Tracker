import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { FloatingInput, FloatingSelect, FloatingTextarea } from '../components/FloatingInput';
import { todayISO, addMonthsISO } from '../lib/projectStats';
import type { ProjectStatus } from '../types';

interface NewProjectProps {
  onCancel: () => void;
  onCreated: (id: string) => void;
}

interface DraftMember {
  name: string;
  role: string;
}

interface DraftHead {
  name: string;
  description: string;
  sanctioned: string;
  icon: string;
}

const CURRENCIES = ['₹', '$', '€', '£'];
const ICON_CHOICES = ['construction', 'groups', 'inventory_2', 'category', 'my_location', 'account_balance_wallet'];

export function NewProject({ onCancel, onCreated }: NewProjectProps) {
  const { addProject } = useApp();
  const today = todayISO();

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [currency, setCurrency] = useState('₹');
  const [status, setStatus] = useState<ProjectStatus>('NEW');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addMonthsISO(today, 6));

  const [members, setMembers] = useState<DraftMember[]>([]);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('');

  const [heads, setHeads] = useState<DraftHead[]>([]);
  const [headName, setHeadName] = useState('');
  const [headDesc, setHeadDesc] = useState('');
  const [headAmount, setHeadAmount] = useState('');
  const [headIcon, setHeadIcon] = useState(ICON_CHOICES[0]);

  const canSave = name.trim().length > 0 && location.trim().length > 0;

  function addMember() {
    if (!memberName.trim()) return;
    setMembers((m) => [...m, { name: memberName.trim(), role: memberRole.trim() || 'Team Member' }]);
    setMemberName('');
    setMemberRole('');
  }

  function addHead() {
    if (!headName.trim()) return;
    setHeads((h) => [...h, { name: headName.trim(), description: headDesc.trim(), sanctioned: headAmount, icon: headIcon }]);
    setHeadName('');
    setHeadDesc('');
    setHeadAmount('');
  }

  async function handleSave() {
    if (!canSave) return;
    const id = await addProject({
      name: name.trim(),
      location: location.trim(),
      currency,
      status,
      startDate,
      endDate,
      team: members.map((m) => ({ name: m.name, role: m.role })),
      budgetHeads: heads.map((h) => ({
        name: h.name,
        description: h.description,
        sanctioned: Number(h.sanctioned) || 0,
        icon: h.icon,
      })),
    });
    if (id) onCreated(id);
  }

  return (
    <div className="px-md py-lg flex flex-col gap-xl pb-2xl">
      <section className="flex flex-col gap-sm">
        <h2 className="text-title-lg text-on-surface">Project details</h2>
        <FloatingInput label="Project name" value={name} onChange={(e) => setName(e.target.value)} />
        <FloatingInput label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <div className="grid grid-cols-2 gap-sm">
          <FloatingSelect label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </FloatingSelect>
          <FloatingSelect label="Status" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
            <option value="NEW">New</option>
            <option value="ONGOING">Ongoing</option>
            <option value="STALLED">Stalled</option>
            <option value="ARCHIVE">Archived</option>
          </FloatingSelect>
        </div>
        <div className="grid grid-cols-2 gap-sm">
          <FloatingInput label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <FloatingInput label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </section>

      <section className="flex flex-col gap-sm">
        <h2 className="text-title-lg text-on-surface">Team members</h2>
        <p className="text-body-sm text-on-surface-variant">Optional — you can also add these later from the project page.</p>
        {members.length > 0 && (
          <div className="flex flex-col gap-xs">
            {members.map((m, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-surface-container-low px-md py-sm">
                <div>
                  <p className="text-body-sm font-medium text-on-surface">{m.name}</p>
                  <p className="text-[11px] text-on-surface-variant">{m.role}</p>
                </div>
                <button
                  onClick={() => setMembers((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label={`Remove ${m.name}`}
                  className="rounded-full p-xs text-on-surface-variant hover:bg-surface-container-high"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-sm">
          <FloatingInput label="Name" value={memberName} onChange={(e) => setMemberName(e.target.value)} />
          <FloatingInput label="Role" value={memberRole} onChange={(e) => setMemberRole(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" icon={<Icon name="add" size={16} />} onClick={addMember} className="self-start">
          Add member
        </Button>
      </section>

      <section className="flex flex-col gap-sm">
        <h2 className="text-title-lg text-on-surface">Budget heads</h2>
        <p className="text-body-sm text-on-surface-variant">Optional — a project can start with zero budget heads.</p>
        {heads.length > 0 && (
          <div className="flex flex-col gap-xs">
            {heads.map((h, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-surface-container-low px-md py-sm">
                <div className="flex items-center gap-sm min-w-0">
                  <Icon name={h.icon} className="text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-on-surface truncate">{h.name}</p>
                    <p className="text-[11px] text-on-surface-variant">{currency}{h.sanctioned || 0}</p>
                  </div>
                </div>
                <button
                  onClick={() => setHeads((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label={`Remove ${h.name}`}
                  className="rounded-full p-xs text-on-surface-variant hover:bg-surface-container-high shrink-0"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
        <FloatingInput label="Head name" value={headName} onChange={(e) => setHeadName(e.target.value)} />
        <FloatingTextarea label="Description" rows={2} value={headDesc} onChange={(e) => setHeadDesc(e.target.value)} />
        <div className="grid grid-cols-2 gap-sm">
          <FloatingInput label="Sanctioned amount" type="number" min="0" value={headAmount} onChange={(e) => setHeadAmount(e.target.value)} />
          <FloatingSelect label="Icon" value={headIcon} onChange={(e) => setHeadIcon(e.target.value)}>
            {ICON_CHOICES.map((ic) => (
              <option key={ic} value={ic}>{ic.replace(/_/g, ' ')}</option>
            ))}
          </FloatingSelect>
        </div>
        <Button variant="outline" size="sm" icon={<Icon name="add" size={16} />} onClick={addHead} className="self-start">
          Add budget head
        </Button>
      </section>

      <div className="flex gap-sm sticky bottom-md">
        <Button variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={handleSave} disabled={!canSave} className="flex-1">Create Project</Button>
      </div>
    </div>
  );
}
