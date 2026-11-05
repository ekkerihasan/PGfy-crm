import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Loading, Modal, PageHeader, Select, Table } from '../../components/ui';
import { api } from '../../lib/api';
import { currency, date, errorMessage, label } from '../../lib/format';
import { LEAD_STATUSES, type Executive, type Lead } from '../../types/api';
import LeadForm from './LeadForm';
import AssignForm from './AssignForm';
export default function LeadsPage() {
  const { user } = useAuth(); const admin = user?.role === 'ADMIN';
  const [leads, setLeads] = useState<Lead[]>([]); const [executives, setExecutives] = useState<Executive[]>([]);
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [assignee, setAssignee] = useState('');
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [form, setForm] = useState<Lead | 'new' | null>(null); const [assign, setAssign] = useState<Lead | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    const query = new URLSearchParams(); if (search.trim()) query.set('search', search.trim()); if (status) query.set('status', status); if (admin && assignee) query.set('assignedToId', assignee);
    try { const result = await api<{ leads: Lead[] }>(`/api/leads?${query}`, { signal }); if (!signal?.aborted) setLeads(result.leads); }
    catch (e) { if (!signal?.aborted) setError(errorMessage(e)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [search, status, assignee, admin]);
  useEffect(() => { const controller = new AbortController(); const timer = setTimeout(() => { void load(controller.signal); }, 200); return () => { clearTimeout(timer); controller.abort(); }; }, [load]);
  useEffect(() => { if (!admin) return; const c = new AbortController(); api<{ executives: Executive[] }>('/api/users/executives', { signal: c.signal }).then(r => setExecutives(r.executives)).catch(e => { if (!c.signal.aborted) setError(errorMessage(e)); }); return () => c.abort(); }, [admin]);
  async function saved() { setForm(null); setAssign(null); await load(); }
  return <div className="space-y-6">
    <PageHeader title="Leads" description={admin ? 'Manage customer enquiries and executive assignments.' : 'Your assigned customer enquiries.'} action={admin ? <Button onClick={() => setForm('new')}>New lead</Button> : undefined} />
    <Card><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Search leads"><Input type="search" placeholder="Name, mobile, email or location" value={search} onChange={e => setSearch(e.target.value)} /></Field>
      <Field label="Status"><Select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{LEAD_STATUSES.map(v => <option key={v} value={v}>{label(v)}</option>)}</Select></Field>
      {admin && <Field label="Assignee"><Select value={assignee} onChange={e => setAssignee(e.target.value)}><option value="">All executives</option><option value="unassigned">Unassigned</option>{executives.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></Field>}
    </div></Card>
    {error && <ErrorState message={error} onRetry={() => void load()} />}
    {loading ? <Loading /> : !error && (leads.length ? <Card><p className="mb-3 text-sm text-slate-500">{leads.length} {leads.length === 1 ? 'lead' : 'leads'}</p><Table><thead><tr>{['Customer', 'Mobile', 'Category', 'Location', 'Budget / month', 'Source', 'Status', 'Executive', 'Enquiry date', ...(admin ? ['Actions'] : [])].map(v => <th key={v}>{v}</th>)}</tr></thead><tbody>{leads.map(lead => <tr key={lead.id}>
      <td><Link className="font-medium text-blue-700 hover:underline" to={`/leads/${lead.id}`}>{lead.customerName}</Link>{lead.email && <div className="text-xs text-slate-500">{lead.email}</div>}</td>
      <td>{lead.mobile}</td><td>{label(lead.propertyCategory)}</td><td>{lead.preferredLocation}</td><td className="whitespace-nowrap">{currency(lead.budget)}</td><td>{label(lead.leadSource)}</td><td><Badge value={lead.status} /></td><td>{lead.assignedTo?.name ?? 'Unassigned'}</td><td className="whitespace-nowrap">{date(lead.enquiryDate)}</td>
      {admin && <td><div className="flex gap-2"><Button variant="secondary" onClick={() => setForm(lead)} aria-label={`Edit ${lead.customerName}`}>Edit</Button><Button variant="secondary" onClick={() => setAssign(lead)} aria-label={`Assign ${lead.customerName}`}>{lead.assignedTo ? 'Reassign' : 'Assign'}</Button></div></td>}
    </tr>)}</tbody></Table></Card> : <EmptyState message="No leads match your filters." />)}
    {form && <Modal title={form === 'new' ? 'New lead' : 'Edit lead'} onClose={() => setForm(null)}><LeadForm lead={form === 'new' ? undefined : form} onSaved={saved} onCancel={() => setForm(null)} /></Modal>}
    {assign && <Modal title="Assign lead" onClose={() => setAssign(null)}><AssignForm lead={assign} executives={executives} onSaved={saved} onCancel={() => setAssign(null)} /></Modal>}
  </div>;
}
