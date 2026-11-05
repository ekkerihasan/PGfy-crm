import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Loading, Modal, PageHeader, Select, Table } from '../../components/ui';
import { api } from '../../lib/api';
import { currency, dateTime, duration, errorMessage, label } from '../../lib/format';
import { LEAD_STATUSES, type Call, type Executive, type FollowUp, type Lead, type LeadStatus } from '../../types/api';
import LeadForm from './LeadForm';
import AssignForm from './AssignForm';
import CallForm from './CallForm';
import FollowUpForm from './FollowUpForm';
export default function LeadDetailPage() {
  const { id } = useParams(); const { user } = useAuth(); const admin = user?.role === 'ADMIN'; const executive = user?.role === 'SALES_EXECUTIVE';
  const [lead, setLead] = useState<Lead | null>(null); const [calls, setCalls] = useState<Call[]>([]); const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [executives, setExecutives] = useState<Executive[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [actionError, setActionError] = useState(''); const [busy, setBusy] = useState(false); const [status, setStatus] = useState<LeadStatus>('NEW');
  const [edit, setEdit] = useState(false); const [assign, setAssign] = useState(false); const [followForm, setFollowForm] = useState<FollowUp | 'new' | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    if (!id) return; setError('');
    try {
      const [leadResult, callResult, followResult] = await Promise.all([
        api<{ lead: Lead }>(`/api/leads/${id}`, { signal }), api<{ calls: Call[] }>(`/api/leads/${id}/calls`, { signal }),
        api<{ followUps: FollowUp[] }>(`/api/follow-ups?${new URLSearchParams({ scope: 'all', leadId: id })}`, { signal }),
      ]);
      if (!signal?.aborted) { setLead(leadResult.lead); setStatus(leadResult.lead.status); setCalls([...callResult.calls].sort((a,b) => Date.parse(b.calledAt) - Date.parse(a.calledAt))); setFollowUps(followResult.followUps); }
    } catch (e) { if (!signal?.aborted) setError(errorMessage(e)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [id]);
  useEffect(() => { const c = new AbortController(); setLoading(true); setLead(null); void load(c.signal); return () => c.abort(); }, [load]);
  useEffect(() => { if (!admin) return; const c = new AbortController(); api<{ executives: Executive[] }>('/api/users/executives', { signal: c.signal }).then(r => setExecutives(r.executives)).catch(e => { if (!c.signal.aborted) setActionError(errorMessage(e)); }); return () => c.abort(); }, [admin]);
  async function saved() { setEdit(false); setAssign(false); setFollowForm(null); await load(); }
  async function updateStatus() {
    setBusy(true); setActionError('');
    try { await api(`/api/leads/${id}`, { method: 'PATCH', body: { status } }); await load(); }
    catch (e) { setActionError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function complete(followUp: FollowUp) {
    setBusy(true); setActionError('');
    try { await api(`/api/follow-ups/${followUp.id}`, { method: 'PATCH', body: { action: 'complete' } }); await load(); }
    catch (e) { setActionError(errorMessage(e)); } finally { setBusy(false); }
  }
  if (loading) return <Loading />;
  if (!lead) return <div className="space-y-4"><Link to="/leads" className="text-blue-700 hover:underline">← Back to leads</Link><ErrorState message={error || 'Lead not found.'} onRetry={() => void load()} /></div>;
  return <div className="space-y-6">
    <Link to="/leads" className="text-sm text-blue-700 hover:underline">← Back to leads</Link>
    <PageHeader title={lead.customerName} description="Customer details, call history and follow-ups." action={admin ? <div className="flex gap-2"><Button variant="secondary" onClick={() => setEdit(true)}>Edit lead</Button><Button onClick={() => setAssign(true)}>{lead.assignedTo ? 'Reassign lead' : 'Assign lead'}</Button></div> : undefined} />
    {error && <ErrorState message={error} onRetry={() => void load()} />}{actionError && <ErrorState message={actionError} />}
    <Card><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Customer information</h2><Badge value={lead.status} /></div>
      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{[
        ['Mobile', lead.mobile], ['Email', lead.email || '—'], ['Property category', label(lead.propertyCategory)], ['Preferred location', lead.preferredLocation],
        ['Monthly budget', currency(lead.budget)], ['Lead source', label(lead.leadSource)], ['Assigned executive', lead.assignedTo?.name || 'Unassigned'],
        ['Enquiry date', dateTime(lead.enquiryDate)], ['Last updated', dateTime(lead.updatedAt)],
      ].map(([term, value]) => <div key={term}><dt className="text-xs font-medium text-slate-500">{term}</dt><dd className="mt-1 break-words text-sm">{value}</dd></div>)}</dl>
      <div className="mt-6 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4"><Field label="Lead status"><Select value={status} disabled={busy} onChange={e => setStatus(e.target.value as LeadStatus)}>{LEAD_STATUSES.map(v => <option key={v} value={v}>{label(v)}</option>)}</Select></Field><Button disabled={busy || status === lead.status} onClick={() => void updateStatus()}>{busy ? 'Saving…' : 'Update status'}</Button></div>
    </Card>
    {executive && <Card><h2 className="mb-4 text-lg font-semibold">Add call</h2><CallForm key={lead.id} leadId={lead.id} onSaved={load} /></Card>}
    <Card><h2 className="mb-4 text-lg font-semibold">Call history <span className="text-sm font-normal text-slate-500">({calls.length})</span></h2>{calls.length ? <Table><thead><tr>{['Called at', 'Executive', 'Outcome', 'Duration', 'Notes', 'Next follow-up'].map(v => <th key={v}>{v}</th>)}</tr></thead><tbody>{calls.map(call => <tr key={call.id}><td className="whitespace-nowrap">{dateTime(call.calledAt)}</td><td>{call.executive.name}</td><td><Badge value={call.outcome} /></td><td className="whitespace-nowrap">{duration(call.durationSeconds)}</td><td className="min-w-40 whitespace-pre-wrap">{call.notes || '—'}</td><td className="whitespace-nowrap">{dateTime(call.nextFollowUpAt)}</td></tr>)}</tbody></Table> : <EmptyState message="No calls recorded for this lead yet." />}</Card>
    <Card><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Follow-ups</h2>{executive && <Button onClick={() => setFollowForm('new')}>Schedule follow-up</Button>}</div>
      {followUps.length ? <Table><thead><tr>{['Due', 'Executive', 'Status', 'Notes', 'Completed at', ...(executive ? ['Actions'] : [])].map(v => <th key={v}>{v}</th>)}</tr></thead><tbody>{followUps.map(f => <tr key={f.id}><td className="whitespace-nowrap">{dateTime(f.dueAt)}</td><td>{f.executive.name}</td><td><Badge value={f.status} /></td><td className="min-w-40 whitespace-pre-wrap">{f.notes || '—'}</td><td className="whitespace-nowrap">{dateTime(f.completedAt)}</td>{executive && <td>{f.status === 'PENDING' ? <div className="flex gap-2"><Button variant="secondary" disabled={busy} onClick={() => void complete(f)}>Complete</Button><Button variant="secondary" disabled={busy} onClick={() => setFollowForm(f)}>Reschedule</Button></div> : '—'}</td>}</tr>)}</tbody></Table> : <EmptyState message="No follow-ups for this lead yet." />}
    </Card>
    {edit && <Modal title="Edit lead" onClose={() => setEdit(false)}><LeadForm lead={lead} onSaved={saved} onCancel={() => setEdit(false)} /></Modal>}
    {assign && <Modal title="Assign lead" onClose={() => setAssign(false)}><AssignForm lead={lead} executives={executives} onSaved={saved} onCancel={() => setAssign(false)} /></Modal>}
    {followForm && <Modal title={followForm === 'new' ? 'Schedule follow-up' : 'Reschedule follow-up'} onClose={() => setFollowForm(null)}><FollowUpForm leadId={lead.id} followUp={followForm === 'new' ? undefined : followForm} onSaved={saved} onCancel={() => setFollowForm(null)} /></Modal>}
  </div>;
}
