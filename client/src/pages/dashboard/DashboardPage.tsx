import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { errorMessage, percent } from '../../lib/format';
import type { Dashboard, Metrics } from '../../types/api';
import { Button, Card, EmptyState, ErrorState, Loading, PageHeader, Table } from '../../components/ui';
import './dashboard.css';

const names: Record<string, string> = { totalLeads: 'Total leads', assignedLeads: 'Assigned leads', unassignedLeads: 'Unassigned', leadsContacted: 'Leads contacted', totalCalls: 'Total calls', connectedCalls: 'Connected calls', pendingFollowUps: 'Pending follow-ups', overdueFollowUps: 'Overdue', todayFollowUps: 'Due today', convertedLeads: 'Converted leads' };
const metricInfo: { key: keyof Metrics; name: string; explanation: string; color: string }[] = [
  { key: 'callCoverageRate', name: 'Call coverage rate', explanation: 'Unique assigned leads contacted ÷ assigned leads × 100', color: '#39775d' },
  { key: 'conversionRate', name: 'Conversion rate', explanation: 'Converted leads ÷ assigned leads × 100', color: '#708e66' },
  { key: 'connectionRate', name: 'Connection rate', explanation: 'Connected calls ÷ total calls × 100', color: '#658e92' },
];
function OverviewIcon({ kind }: { kind: 'pipeline' | 'calls' | 'followups' }) {
  return <span className={`overview-icon overview-icon-${kind}`} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{kind === 'pipeline' ? <><rect x="4" y="4" width="16" height="17" rx="2" /><path d="M8 4V2m8 2V2M8 9h8m-8 4h5m-5 4h3" /></> : kind === 'calls' ? <path d="m8 3 3 5-3 3c1.4 2.8 2.8 4.2 5.5 5.5l3-3 4.5 3c.4.3.6.8.4 1.3-.7 2.1-2.5 3.6-4.6 3.2C9.4 19.5 4.5 14.6 3 7.2c-.4-2.1 1.1-3.9 3.2-4.6.7-.2 1.4 0 1.8.4Z" /> : <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18m-14 5h3m4 0h3" /></>}</svg></span>;
}
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
  const groups = data ? [
    { title: 'Lead pipeline', kind: 'pipeline' as const, primary: data.role === 'ADMIN' ? 'totalLeads' : 'assignedLeads', secondary: data.role === 'ADMIN' ? ['assignedLeads', 'unassignedLeads', 'leadsContacted', 'convertedLeads'] : ['leadsContacted', 'convertedLeads'], note: data.role === 'ADMIN' ? 'Across all enquiries' : 'Currently assigned to you' },
    { title: 'Call activity', kind: 'calls' as const, primary: 'totalCalls', secondary: ['connectedCalls'], note: data.role === 'ADMIN' ? 'Calls recorded by your team' : 'Calls you have recorded' },
    { title: 'Follow-ups', kind: 'followups' as const, primary: 'pendingFollowUps', secondary: ['todayFollowUps', 'overdueFollowUps'], note: 'Pending includes today and overdue' },
  ] : [];
  return <>
    <PageHeader title="Dashboard" description={data?.role === 'ADMIN' ? 'Your team’s activity and sales pipeline, at a glance.' : 'A clear view of your pipeline and next conversations.'} action={<Button variant="secondary" onClick={load} disabled={loading}>Refresh</Button>} />
    {error && <ErrorState message={error} onRetry={load} />}
    {loading ? <Loading /> : data && <div className="dashboard-content">
      <div className="overview-grid">{groups.map(group => <Card key={group.kind} className="overview-card"><div className="overview-card-heading"><span>{group.title}</span><OverviewIcon kind={group.kind} /></div><p className="overview-number">{data.totals[group.primary as keyof typeof data.totals].toLocaleString('en-IN')}</p><p className="overview-primary-label">{names[group.primary]}</p><p className="overview-note">{group.note}</p><div className="overview-secondary">{group.secondary.map(key => <div key={key}><span>{names[key]}</span><strong className={key === 'overdueFollowUps' ? 'overview-overdue' : key === 'convertedLeads' ? 'overview-converted' : ''}>{data.totals[key as keyof typeof data.totals].toLocaleString('en-IN')}</strong></div>)}</div></Card>)}</div>
      <section aria-labelledby="sales-metrics"><div className="dashboard-section-heading"><div><h2 id="sales-metrics">Sales metrics</h2><p>Progress through the pipeline</p></div><span className="section-kicker">{data.role === 'ADMIN' ? 'Overall performance' : 'Your performance'}</span></div><div className="metric-card-grid">{metricInfo.map(metric => <Card key={metric.key} className="performance-metric"><p className="metric-name">{metric.name}</p><p className="performance-value">{percent(data.metrics[metric.key])}</p><div className="metric-track" role="progressbar" aria-label={metric.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={data.metrics[metric.key]}><span style={{ width: `${Math.min(100, Math.max(0, data.metrics[metric.key]))}%`, background: metric.color }} /></div><p className="metric-explanation">{metric.explanation}</p></Card>)}</div></section>
      {data.role === 'ADMIN' && <section aria-labelledby="executive-performance"><div className="dashboard-section-heading"><div><h2 id="executive-performance">Executive performance</h2><p>Activity, follow-ups and conversion by executive</p></div><span className="section-kicker">{data.executives.length} executive{data.executives.length === 1 ? '' : 's'}</span></div>{data.executives.length === 0 ? <EmptyState message="No executive performance to display." /> : <Table><thead><tr><th>Executive</th><th>Email</th><th>Assigned leads</th><th>Leads contacted</th><th>Total calls</th><th>Connected calls</th><th>Converted leads</th><th>Pending follow-ups</th><th>Overdue follow-ups</th><th>Call coverage</th><th>Conversion</th><th>Connection</th></tr></thead><tbody>{data.executives.map(executive => <tr key={executive.id}><td className="whitespace-nowrap font-semibold text-[#274e3c]">{executive.name}</td><td>{executive.email}</td><td>{executive.assignedLeads}</td><td>{executive.leadsContacted}</td><td>{executive.totalCalls}</td><td>{executive.connectedCalls}</td><td className="font-semibold text-[#39775d]">{executive.convertedLeads}</td><td>{executive.pendingFollowUps}</td><td>{executive.overdueFollowUps}</td><td>{percent(executive.callCoverageRate)}</td><td>{percent(executive.conversionRate)}</td><td>{percent(executive.connectionRate)}</td></tr>)}</tbody></Table>}<p className="dashboard-footnote">Coverage and conversion use current assignments. Calls remain attributed to the executive who made them.</p></section>}
    </div>}
  </>;
}
