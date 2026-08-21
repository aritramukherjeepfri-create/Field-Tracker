import { supabase } from './supabaseClient';

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function daysFromNowISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Inserts a small set of realistic sample projects (with team, budget
 * heads, expenses, and field logs) into the caller's organization, so a
 * freshly-created org isn't a completely blank slate. Safe to call
 * multiple times — each call just adds another sample project rather
 * than overwriting anything, since this is real shared org data now
 * (unlike the old localStorage "reset demo data" button, this can't
 * silently wipe a teammate's work).
 */
export async function seedSampleData(orgId: string, userId: string): Promise<{ error: string | null }> {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      org_id: orgId,
      name: 'River Basin Water Access (Sample)',
      location: 'Jalpaiguri, West Bengal',
      status: 'ONGOING',
      currency: '₹',
      start_date: daysAgoISO(64),
      end_date: daysFromNowISO(150),
      created_by: userId,
    })
    .select()
    .single();

  if (projectError || !project) return { error: projectError?.message ?? 'Failed to create sample project' };

  const { data: heads } = await supabase
    .from('budget_heads')
    .insert([
      { org_id: orgId, project_id: project.id, name: 'Borewell Construction', description: 'Drilling, casing and pump installation for two new borewells', sanctioned: 420000, allocated: 420000, icon: 'construction' },
      { org_id: orgId, project_id: project.id, name: 'Community Training', description: 'Water committee formation and maintenance training sessions', sanctioned: 85000, allocated: 85000, icon: 'groups' },
      { org_id: orgId, project_id: project.id, name: 'Field Travel', description: 'Local transport for the field team across visit sites', sanctioned: 40000, allocated: 40000, icon: 'my_location' },
    ])
    .select();

  await supabase.from('project_members').insert([
    { org_id: orgId, project_id: project.id, name: 'Ananya Roy', member_role: 'Field Coordinator' },
    { org_id: orgId, project_id: project.id, name: 'Suresh Tamang', member_role: 'Water Engineer' },
  ]);

  const borewellHead = heads?.find((h) => h.name === 'Borewell Construction');
  const trainingHead = heads?.find((h) => h.name === 'Community Training');

  await supabase.from('expenses').insert([
    { org_id: orgId, project_id: project.id, particulars: 'Drilling rig mobilization', category: borewellHead?.name ?? 'Borewell Construction', amount: 68000, currency: '₹', payment_mode: 'UPI / DIGITAL', paid_by: 'Ananya Roy', date: daysAgoISO(20), created_by: userId },
    { org_id: orgId, project_id: project.id, particulars: 'Training venue and refreshments', category: trainingHead?.name ?? 'Community Training', amount: 9500, currency: '₹', payment_mode: 'CASH', paid_by: 'Ananya Roy', date: daysAgoISO(6), created_by: userId },
  ]);

  await supabase.from('field_logs').insert([
    { org_id: orgId, project_id: project.id, author: 'Ananya Roy', log_date: daysAgoISO(1), log_time: '09:40', content: 'Second borewell site cleared with village council. Drilling crew scheduled for next week.', location: 'Rajgunj block', log_type: 'checkpoint', created_by: userId },
    { org_id: orgId, project_id: project.id, author: 'Suresh Tamang', log_date: daysAgoISO(3), log_time: '15:10', content: 'Pump test on site 1 showed lower yield than expected. Flagging for a follow-up hydrology check.', location: 'Site 1, Rajgunj', log_type: 'alert', created_by: userId },
  ]);

  await supabase.from('tasks').insert([
    { org_id: orgId, project_id: project.id, title: 'Schedule hydrology follow-up for Site 1', description: 'Lower-than-expected yield flagged on the pump test; needs an engineer follow-up visit.', status: 'todo', due_date: daysFromNowISO(7), created_by: userId },
    { org_id: orgId, project_id: project.id, title: 'File Q3 utilization report', description: 'Due with the district water board.', status: 'todo', due_date: daysFromNowISO(14), created_by: userId },
  ]);

  return { error: null };
}
