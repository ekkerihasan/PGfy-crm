import { type FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { dateTime, errorMessage, toLocalInput } from '../../lib/format';
import type { FollowUp } from '../../types/api';
import { Badge, Button, EmptyState, ErrorState, Field, Input, Loading, Modal, PageHeader, Table, Textarea } from '../../components/ui';
import './follow-ups.css';

const scopes = ['today', 'upcoming', 'overdue', 'completed'] as const;
type Scope = typeof scopes[number];
export default function FollowUpsPage() {
  const { user } = useAuth();
  const executive = user?.role === 'SALES_EXECUTIVE';
  const [searchParams, setSearchParams] = useSearchParams();
  const rawScope = searchParams.get('scope');
  const scope: Scope = scopes.includes(rawScope as Scope) ? rawScope as Scope : 'today';
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<{ item: FollowUp; action: 'complete' | 'reschedule' } | null>(null);
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [success, setSuccess] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    api<{ followUps: FollowUp[] }>(`/api/follow-ups?scope=${scope}`, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setFollowUps(data.followUps); }).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [scope, revision]);
  function open(item: FollowUp, action: 'complete' | 'reschedule') {
    setEditing({ item, action }); setDueAt(toLocalInput(item.dueAt)); setNotes(item.notes || ''); setSaveError('');
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!editing) return;
    setSaving(true); setSaveError(''); setSuccess('');
    try {
      const body = editing.action === 'complete' ? { action: 'complete', notes } : { action: 'reschedule', dueAt: new Date(dueAt).toISOString(), notes };
      await api(`/api/follow-ups/${editing.item.id}`, { method: 'PATCH', body });
      setSuccess(editing.action === 'complete' ? 'Follow-up completed.' : 'Follow-up rescheduled. The original remains in history.');
      setEditing(null); setRevision(value => value + 1);
    } catch (e) { setSaveError(errorMessage(e)); }
    finally { setSaving(false); }
  }
  return <><PageHeader title="Follow-ups" description={executive ? 'Manage your next conversations with customers.' : 'Monitor the team’s scheduled follow-ups.'} action={<Button variant="secondary" onClick={() => setRevision(v => v + 1)} disabled={loading}>Refresh</Button>} />
    
    <nav aria-label="Follow-up scopes" className="followup-tabs">{scopes.map(value => <Button key={value} variant={scope === value ? 'primary' : 'secondary'} aria-current={scope === value ? 'page' : undefined} onClick={() => { setSearchParams({ scope: value }); setSuccess(''); }}>{value[0].toUpperCase() + value.slice(1)}</Button>)}</nav>
    {success && <p role="status" className="success-message">{success}</p>}
    {error && <ErrorState message={error} onRetry={() => setRevision(v => v + 1)} />}
    <div className="followup-results-heading"><h2>{scope[0].toUpperCase() + scope.slice(1)} follow-ups {!loading && !error && <span>{followUps.length}</span>}</h2><p>Asia/Kolkata (IST)</p></div>
    {loading ? <Loading /> : !error && (followUps.length === 0 ? <EmptyState message={`No ${scope} follow-ups.`} /> : <Table><thead><tr><th>Customer</th><th>Mobile</th><th>Executive</th><th>Due</th><th>Status</th><th>Notes</th>{scope === 'completed' && <th>Completed at</th>}{executive && scope !== 'completed' && <th>Actions</th>}</tr></thead><tbody>{followUps.map(item => <tr key={item.id}><td><Link className="whitespace-nowrap font-semibold text-[#356448] hover:underline" to={`/leads/${item.leadId}`}>{item.lead.customerName}</Link></td><td className="tabular-nums">{item.lead.mobile}</td><td className="whitespace-nowrap">{item.executive.name}</td><td className="whitespace-nowrap font-medium">{dateTime(item.dueAt)}</td><td><Badge value={item.status} /></td><td className="min-w-48 whitespace-pre-wrap">{item.notes || '—'}</td>{scope === 'completed' && <td className="whitespace-nowrap">{dateTime(item.completedAt)}</td>}{executive && scope !== 'completed' && <td>{item.status === 'PENDING' && <div className="flex gap-2"><Button variant="secondary" onClick={() => open(item, 'complete')}>Complete</Button><Button variant="secondary" onClick={() => open(item, 'reschedule')}>Reschedule</Button></div>}</td>}</tr>)}</tbody></Table>)}
    {editing && <Modal title={`${editing.action === 'complete' ? 'Complete' : 'Reschedule'} follow-up`} onClose={() => { if (!saving) setEditing(null); }}><form onSubmit={submit} className="space-y-4"><p className="text-sm text-slate-600">{editing.item.lead.customerName}</p>{saveError && <ErrorState message={saveError} />}{editing.action === 'reschedule' && <Field label="New due date and time"><Input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} required /></Field>}<Field label="Notes"><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} /></Field><div className="flex gap-2"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : editing.action === 'complete' ? 'Complete follow-up' : 'Reschedule follow-up'}</Button><Button type="button" variant="secondary" disabled={saving} onClick={() => setEditing(null)}>Cancel</Button></div></form></Modal>}
  </>;
}

