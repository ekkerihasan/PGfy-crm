import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { downloadReport } from '../../lib/api';
import { errorMessage } from '../../lib/format';
import { Button, Card, ErrorState, PageHeader } from '../../components/ui';

const reports = [
  { kind: 'leads', title: 'Leads', description: 'Customer information, status and executive assignments.' },
  { kind: 'calls', title: 'Call history', description: 'Recorded calls, outcomes, notes and follow-up details.' },
  { kind: 'performance', title: 'Executive performance', description: 'Assigned leads, call activity, follow-ups and sales metrics.' },
] as const;
export default function ReportsPage() {
  const { user } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function download(kind: typeof reports[number]['kind'], title: string) {
    setBusy(kind); setError(''); setSuccess('');
    try { await downloadReport(kind); setSuccess(`${title} CSV download started.`); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(null); }
  }
  if (user?.role !== 'ADMIN') return <ErrorState message="Reports are available to administrators only." />;
  return <><PageHeader title="Reports" description="Download current sales data as CSV files." />
    {error && <ErrorState message={error} />}
    {success && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{success}</p>}
    <div className="grid gap-4 md:grid-cols-3">{reports.map(report => <Card key={report.kind}><h2 className="text-lg font-semibold">{report.title}</h2><p className="mb-5 mt-2 text-sm text-slate-600">{report.description}</p><Button onClick={() => download(report.kind, report.title)} disabled={busy !== null}>{busy === report.kind ? 'Downloading…' : `Download ${report.title.toLowerCase()}`}</Button></Card>)}</div>
  </>;
}
