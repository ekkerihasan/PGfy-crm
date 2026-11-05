import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { dateTime, duration, errorMessage, label } from '../../lib/format';
import { CALL_OUTCOMES, type Call, type Executive } from '../../types/api';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Loading, PageHeader, Select, Table } from '../../components/ui';
import './calls.css';

export default function CallsPage() {
  const { user } = useAuth();
  const admin = user?.role === 'ADMIN';
  const [calls, setCalls] = useState<Call[]>([]);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [executiveId, setExecutiveId] = useState('');
  const [outcome, setOutcome] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [executiveError, setExecutiveError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!admin) return;
    const controller = new AbortController();
    setExecutiveError('');
    api<{ executives: Executive[] }>('/api/users/executives', { signal: controller.signal }).then(data => setExecutives(data.executives)).catch(e => { if (!controller.signal.aborted) setExecutiveError(errorMessage(e)); });
    return () => controller.abort();
  }, [admin, revision]);
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams();
    if (admin && executiveId) query.set('executiveId', executiveId);
    if (outcome) query.set('outcome', outcome);
    setLoading(true); setError('');
    api<{ calls: Call[] }>(`/api/calls?${query}`, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setCalls(data.calls); }).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [admin, executiveId, outcome, revision]);
  return <><PageHeader title={admin ? 'Call history' : 'My calls'} description="Every recorded call, with outcomes and follow-up dates." action={<Button variant="secondary" onClick={() => setRevision(v => v + 1)} disabled={loading}>Refresh</Button>} />
    <Card className="call-filter-panel"><div className="call-filter-heading"><h2>Filter calls</h2>{(executiveId || outcome) && <Button variant="ghost" onClick={() => { setExecutiveId(''); setOutcome(''); }}>Clear filters</Button>}</div><div className="call-filter-fields">{admin && <Field label="Executive"><Select value={executiveId} onChange={e => setExecutiveId(e.target.value)}><option value="">All executives</option>{executives.map(executive => <option key={executive.id} value={executive.id}>{executive.name}</option>)}</Select></Field>}<Field label="Outcome"><Select value={outcome} onChange={e => setOutcome(e.target.value)}><option value="">All outcomes</option>{CALL_OUTCOMES.map(value => <option key={value} value={value}>{label(value)}</option>)}</Select></Field></div></Card>
    {executiveError && <ErrorState message={`Unable to load executive filter: ${executiveError}`} onRetry={() => setRevision(v => v + 1)} />}
    {error && <ErrorState message={error} onRetry={() => setRevision(v => v + 1)} />}
    {loading ? <Loading /> : !error && (calls.length === 0 ? <EmptyState message="No calls match these filters." /> : <><div className="call-results-heading"><h2>Recorded calls <span>{calls.length}</span></h2><p>Newest first</p></div><Table><thead><tr><th>Customer</th><th>Mobile</th><th>Executive</th><th>Called at</th><th>Duration</th><th>Outcome</th><th>Notes</th><th>Next follow-up</th></tr></thead><tbody>{calls.map(call => <tr key={call.id}><td><Link className="whitespace-nowrap font-semibold text-[#356448] hover:underline" to={`/leads/${call.leadId}`}>{call.lead.customerName}</Link></td><td className="tabular-nums">{call.lead.mobile}</td><td className="whitespace-nowrap">{call.executive.name}</td><td className="whitespace-nowrap">{dateTime(call.calledAt)}</td><td className="whitespace-nowrap tabular-nums">{duration(call.durationSeconds)}</td><td><Badge value={call.outcome} /></td><td className="min-w-48 whitespace-pre-wrap">{call.notes || '—'}</td><td className="whitespace-nowrap">{dateTime(call.nextFollowUpAt)}</td></tr>)}</tbody></Table></>)}
  </>;
}

