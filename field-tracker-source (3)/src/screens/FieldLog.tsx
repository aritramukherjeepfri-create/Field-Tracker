import { useMemo, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { FloatingInput, FloatingSelect, FloatingTextarea } from '../components/FloatingInput';
import { EmptyState } from '../components/StatusBadge';
import { todayISO, nowTimeHHMM } from '../lib/projectStats';
import type { FieldLogType } from '../types';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isoFor(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

const TYPE_ICON: Record<FieldLogType, string> = {
  note: 'description',
  alert: 'warning',
  checkpoint: 'task_alt',
};

export function FieldLog() {
  const { projects, addLog, isViewer } = useApp();
  const today = new Date();

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayISO());

  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? '');
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [logType, setLogType] = useState<FieldLogType>('note');
  const [location, setLocation] = useState('');
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allLogs = useMemo(() => projects.flatMap((p) => p.logs), [projects]);
  const logsByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of allLogs) {
      map.set(l.date, (map.get(l.date) ?? 0) + 1);
    }
    return map;
  }, [allLogs]);

  const dayLogs = useMemo(
    () => allLogs.filter((l) => l.date === selectedDate).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [allLogs, selectedDate]
  );

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();
  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  function captureGeolocation() {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      return;
    }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        setGeoStatus('done');
      },
      () => setGeoStatus('error'),
      { timeout: 8000 }
    );
  }

  function resetForm() {
    setContent('');
    setLocation('');
    setPhoto(undefined);
    setGeoStatus('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProjectId || !content.trim() || !author.trim()) return;
    addLog({
      projectId: selectedProjectId,
      author: author.trim(),
      date: selectedDate,
      timestamp: nowTimeHHMM(),
      content: content.trim(),
      attachments: photo ? [photo] : undefined,
      location: location.trim() || undefined,
      type: logType,
    });
    resetForm();
  }

  if (projects.length === 0) {
    return (
      <div className="px-md py-lg">
        <EmptyState
          icon="description"
          title="No projects to log against"
          description="Create a project first, then you'll be able to add field log entries here."
        />
      </div>
    );
  }

  return (
    <div className="px-md py-lg flex flex-col gap-xl pb-2xl">
      <section className="flex flex-col gap-sm">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPrevMonth}
            aria-label="Previous month"
            className="rounded-full p-sm hover:bg-surface-container-high"
          >
            <Icon name="chevron_left" />
          </button>
          <h2 className="text-title-lg text-on-surface">{MONTH_LABELS[viewMonth]} {viewYear}</h2>
          <button
            onClick={goToNextMonth}
            aria-label="Next month"
            className="rounded-full p-sm hover:bg-surface-container-high"
          >
            <Icon name="chevron_right" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-[4px] text-center">
          {WEEKDAY_LABELS.map((d, i) => (
            <span key={i} className="text-[10px] label-caps text-on-surface-variant py-xs">{d}</span>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const iso = isoFor(viewYear, viewMonth, day);
            const isSelected = iso === selectedDate;
            const isToday = iso === todayISO();
            const count = logsByDate.get(iso) ?? 0;
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(iso)}
                className={`relative aspect-square rounded-full text-body-sm flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
                  ${isSelected ? 'bg-primary text-on-primary font-semibold' : isToday ? 'border border-primary text-primary' : 'text-on-surface hover:bg-surface-container-high'}
                `}
              >
                {day}
                {count > 0 && !isSelected && (
                  <span className="absolute bottom-[2px] w-1 h-1 rounded-full bg-secondary" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-sm">
        <h2 className="text-title-lg text-on-surface">
          Entries for {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </h2>
        {dayLogs.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant py-sm">No log entries for this day yet.</p>
        ) : (
          <div className="flex flex-col gap-xs">
            {dayLogs.map((l) => (
              <div key={l.id} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md flex gap-sm">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-tertiary-container/20 text-tertiary shrink-0">
                  <Icon name={TYPE_ICON[l.type ?? 'note']} size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-sm">
                    <p className="text-body-sm font-medium text-on-surface truncate">{l.projectName}</p>
                    <span className="text-[11px] text-on-surface-variant shrink-0">{l.timestamp}</span>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">{l.content}</p>
                  <p className="text-[11px] text-outline mt-[2px]">
                    by {l.author}{l.location ? ` · ${l.location}` : ''}
                  </p>
                  {l.attachments?.[0] && (
                    <img src={l.attachments[0]} alt="Log attachment" className="mt-sm w-20 h-20 object-cover rounded-lg" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-sm">
        <h2 className="text-title-lg text-on-surface">New log entry</h2>
        {isViewer ? (
          <p className="text-body-sm text-on-surface-variant rounded-xl bg-surface-container-low p-md flex items-center gap-sm">
            <Icon name="info" size={18} className="shrink-0" /> You have view-only access and can't add new log entries.
          </p>
        ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-sm">
          <FloatingSelect label="Project" value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </FloatingSelect>
          <FloatingInput label="Your name" value={author} onChange={(e) => setAuthor(e.target.value)} required />
          <FloatingTextarea label="Notes" rows={4} value={content} onChange={(e) => setContent(e.target.value)} required />
          <FloatingSelect label="Entry type" value={logType} onChange={(e) => setLogType(e.target.value as FieldLogType)}>
            <option value="note">Note</option>
            <option value="checkpoint">Checkpoint</option>
            <option value="alert">Alert</option>
          </FloatingSelect>

          <div className="flex gap-sm">
            <label className="flex-1 flex items-center gap-xs rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-md py-sm cursor-pointer text-body-sm text-on-surface-variant">
              <Icon name="photo_camera" size={18} />
              {photo ? 'Photo attached' : 'Attach photo'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFile}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={captureGeolocation}
              className="flex-1 flex items-center gap-xs rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-md py-sm text-body-sm text-on-surface-variant"
            >
              <Icon name="my_location" size={18} />
              {geoStatus === 'loading' ? 'Locating…' : geoStatus === 'done' ? 'Location tagged' : geoStatus === 'error' ? 'Location unavailable' : 'Tag location'}
            </button>
          </div>
          {location && (
            <p className="text-[11px] text-on-surface-variant flex items-center gap-[2px]">
              <Icon name="location_on" size={12} /> {location}
            </p>
          )}
          {photo && <img src={photo} alt="Attachment preview" className="w-20 h-20 object-cover rounded-lg" />}

          <Button type="submit" icon={<Icon name="add" size={18} />}>Add Entry</Button>
        </form>
        )}
      </section>
    </div>
  );
}
