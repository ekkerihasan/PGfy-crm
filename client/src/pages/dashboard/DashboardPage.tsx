import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { errorMessage, percent } from '../../lib/format';
import type { Dashboard, Metrics } from '../../types/api';
import { Button, Card, EmptyState, ErrorState, Loading, PageHeader, Table } from '../../components/ui';

const names: Record<string, string> = { totalLeads: 'Total leads', assignedLeads: 'Assigned leads', unassignedLeads: 'Unassigned leads', leadsContacted: 'Leads contacted', totalCalls: 'Total calls', connectedCalls: 'Connected calls', pendingFollowUps: 'Pending follow-ups', overdueFollowUps: 'Overdue follow-ups', todayFollowUps: 'Today’s follow-ups', convertedLeads: 'Converted leads' };
const metricInfo: { key: keyof Metrics; name: string; explanation: string }[] = [
  { key: 'callCoverageRate', name: 'Call coverage rate', explanation: 'Unique assigned leads contacted ÷ assigned leads' },
  { key: 'conversionRate', name: 'Conversion rate', explanation: 'Converted leads ÷ assigned leads' },
  { key: 'connectionRate', name: 'Connection rate', explanation: 'Connected calls ÷ total calls' },
];
export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await api<Dashboard>('/api/dashboard')); }
    catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <>
    <PageHeader title="Dashboard" description={data?.role === 'ADMIN' ? 'A view of your sales team and pipeline.' : 'Your assigned leads, calls and follow-ups.'} action={<Button variant="secondary" onClick={load} disabled={loading}>Refresh</Button>} />
    {error && <ErrorState message={error} onRetry={load} />}
    {loading ? <Loading /> : data && <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">{Object.entries(data.totals).map(([key, value]) => <Card key={key}><p className="text-sm text-slate-500">{names[key] || key}</p><p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{value.toLocaleString('en-IN')}</p></Card>)}</div>
      <div className="grid gap-4 md:grid-cols-3">{metricInfo.map(metric => <Card key={metric.key}><p className="text-sm font-medium text-slate-600">{metric.name}</p><p className="my-2 text-3xl font-semibold text-slate-900">{percent(data.metrics[metric.key])}</p><p className="text-xs text-slate-500">{metric.explanation} × 100</p></Card>)}</div>
      {data.role === 'ADMIN' && <section><h2 className="mb-3 text-lg font-semibold">Executive performance</h2><p className="mb-3 text-sm text-slate-500">Coverage and conversion use current assignments. Calls remain attributed to the executive who made them.</p>{data.executives.length === 0 ? <EmptyState message="No executive performance to display." /> : <Table><thead><tr><th>Executive</th><th>Email</th><th>Assigned leads</th><th>Leads contacted</th><th>Total calls</th><th>Connected calls</th><th>Converted leads</th><th>Pending follow-ups</th><th>Overdue follow-ups</th><th>Call coverage</th><th>Conversion</th><th>Connection</th></tr></thead><tbody>{data.executives.map(executive => <tr key={executive.id}><td className="font-medium">{executive.name}</td><td>{executive.email}</td><td>{executive.assignedLeads}</td><td>{executive.leadsContacted}</td><td>{executive.totalCalls}</td><td>{executive.connectedCalls}</td><td>{executive.convertedLeads}</td><td>{executive.pendingFollowUps}</td><td>{executive.overdueFollowUps}</td><td>{percent(executive.callCoverageRate)}</td><td>{percent(executive.conversionRate)}</td><td>{percent(executive.connectionRate)}</td></tr>)}</tbody></Table>}</section>}
    </div>}
  </>;
}
