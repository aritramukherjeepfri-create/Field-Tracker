import { useMemo, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { FloatingInput, FloatingSelect } from '../components/FloatingInput';
import { EmptyState } from '../components/StatusBadge';
import { formatCurrency, formatDate, todayISO } from '../lib/projectStats';
import { downloadCSV } from '../lib/csv';
import type { PaymentMode } from '../types';

const GENERIC_CATEGORIES = ['Travel', 'Supplies', 'Accommodation', 'Communication', 'Miscellaneous'];

interface ExpensesProps {
  initialProjectId?: string | null;
}

export function Expenses({ initialProjectId }: ExpensesProps) {
  const { projects, addExpense, isViewer } = useApp();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId ?? projects[0]?.id ?? ''
  );
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const [particulars, setParticulars] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI / DIGITAL');
  const [paidBySelect, setPaidBySelect] = useState('');
  const [paidByFreeText, setPaidByFreeText] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | undefined>(undefined);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoryOptions = selectedProject && selectedProject.budgetHeads.length > 0
    ? selectedProject.budgetHeads.map((h) => h.name)
    : GENERIC_CATEGORIES;

  const hasTeam = (selectedProject?.team.length ?? 0) > 0;

  const ledger = useMemo(() => {
    const all = projects.flatMap((p) => p.expenses);
    const scoped = showAllProjects ? all : projects.find((p) => p.id === selectedProjectId)?.expenses ?? [];
    return [...scoped].sort((a, b) => b.date.localeCompare(a.date));
  }, [projects, showAllProjects, selectedProjectId]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReceiptImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  function resetForm() {
    setParticulars('');
    setCategory('');
    setAmount('');
    setPaidBySelect('');
    setPaidByFreeText('');
    setReceiptImage(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProject) return;
    const amt = Number(amount);
    if (!particulars.trim() || !Number.isFinite(amt) || amt <= 0) return;
    const paidBy = hasTeam ? paidBySelect : paidByFreeText.trim();
    if (!paidBy) return;

    void addExpense({
      projectId: selectedProject.id,
      particulars: particulars.trim(),
      category: category || categoryOptions[0],
      amount: amt,
      currency: selectedProject.currency,
      paymentMode,
      paidBy,
      date: todayISO(),
      receiptImage,
    });
    resetForm();
  }

  function exportCSV() {
    downloadCSV(showAllProjects ? 'all_projects_expenses.csv' : `${selectedProject?.name.replace(/\s+/g, '_')}_expenses.csv`, [
      ['Date', 'Project', 'Particulars', 'Category', 'Amount', 'Currency', 'Payment Mode', 'Paid By'],
      ...ledger.map((e) => [e.date, e.projectName, e.particulars, e.category, e.amount ?? 'hidden', e.currency, e.paymentMode, e.paidBy]),
    ]);
  }

  if (projects.length === 0) {
    return (
      <div className="px-md py-lg">
        <EmptyState
          icon="payments"
          title="No projects to log expenses against"
          description="Create a project first, then you'll be able to record expenses here."
        />
      </div>
    );
  }

  return (
    <div className="px-md py-lg flex flex-col gap-xl pb-2xl">
      {isViewer ? (
        <section className="rounded-xl bg-surface-container-low p-md text-body-sm text-on-surface-variant flex items-center gap-sm">
          <Icon name="info" size={18} className="shrink-0" />
          You have view-only access. Expenses logged by the team appear in the ledger below.
        </section>
      ) : (
      <section className="flex flex-col gap-sm">
        <h2 className="text-title-lg text-on-surface">New expense</h2>
        <FloatingSelect
          label="Project"
          value={selectedProjectId}
          onChange={(e) => {
            setSelectedProjectId(e.target.value);
            setCategory('');
            setPaidBySelect('');
          }}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </FloatingSelect>

        <form onSubmit={handleSubmit} className="flex flex-col gap-sm">
          <FloatingInput label="Particulars" value={particulars} onChange={(e) => setParticulars(e.target.value)} required />

          <FloatingSelect label="Category" value={category || categoryOptions[0]} onChange={(e) => setCategory(e.target.value)}>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </FloatingSelect>

          <div className="grid grid-cols-2 gap-sm">
            <FloatingInput
              label={`Amount (${selectedProject?.currency ?? ''})`}
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <FloatingSelect label="Payment mode" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}>
              <option value="UPI / DIGITAL">UPI / Digital</option>
              <option value="CASH">Cash</option>
            </FloatingSelect>
          </div>

          {hasTeam ? (
            <FloatingSelect label="Payment made by" value={paidBySelect} onChange={(e) => setPaidBySelect(e.target.value)} required>
              <option value="" disabled>Select team member</option>
              {selectedProject!.team.map((m) => (
                <option key={m.id} value={m.name}>{m.name} — {m.role}</option>
              ))}
            </FloatingSelect>
          ) : (
            <FloatingInput
              label="Payment made by (enter name)"
              value={paidByFreeText}
              onChange={(e) => setPaidByFreeText(e.target.value)}
              required
            />
          )}

          <div>
            <label className="flex items-center gap-sm rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-md py-sm cursor-pointer text-body-sm text-on-surface-variant">
              <Icon name="photo_camera" size={18} />
              {receiptImage ? 'Receipt attached — tap to replace' : 'Attach receipt photo (optional)'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFile}
                className="hidden"
              />
            </label>
            {receiptImage && (
              <img src={receiptImage} alt="Receipt preview" className="mt-sm w-24 h-24 object-cover rounded-lg" />
            )}
          </div>

          <Button type="submit" icon={<Icon name="add" size={18} />}>Log Expense</Button>
        </form>
      </section>
      )}

      <section className="flex flex-col gap-sm">
        <div className="flex items-center justify-between gap-sm flex-wrap">
          <h2 className="text-title-lg text-on-surface">Transaction ledger</h2>
          <div className="flex items-center gap-sm">
            <label className="flex items-center gap-xs text-body-sm text-on-surface-variant">
              <input
                type="checkbox"
                checked={showAllProjects}
                onChange={(e) => setShowAllProjects(e.target.checked)}
                className="accent-primary"
              />
              All projects
            </label>
            <Button size="sm" variant="outline" icon={<Icon name="download" size={16} />} onClick={exportCSV}>
              CSV
            </Button>
          </div>
        </div>

        {ledger.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant py-md text-center">
            No expenses logged {showAllProjects ? 'yet' : 'for this project yet'}.
          </p>
        ) : (
          <div className="flex flex-col gap-xs">
            {ledger.map((e) => (
              <div key={e.id} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md flex items-start justify-between gap-sm">
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-on-surface truncate">{e.particulars}</p>
                  <p className="text-[11px] text-on-surface-variant">
                    {e.category} · {formatDate(e.date)} · {e.paymentMode === 'CASH' ? 'Cash' : 'UPI / Digital'}
                  </p>
                  {showAllProjects && <p className="text-[11px] text-outline">{e.projectName}</p>}
                  <p className="text-[11px] text-outline">Paid by {e.paidBy}</p>
                </div>
                <span className="text-body-sm font-semibold text-on-surface shrink-0">
                  {e.amount !== null ? formatCurrency(e.amount, e.currency) : (
                    <span className="text-on-surface-variant font-normal flex items-center gap-[2px]">
                      <Icon name="warning" size={12} /> Hidden
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
