import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { downloadReport } from '../../lib/api';
import { errorMessage } from '../../lib/format';
import { Button, Card, ErrorState, PageHeader } from '../../components/ui';
import './reports.css';

const reports = [
  { kind: 'leads', title: 'Leads', description: 'A complete view of your customer enquiries and lead pipeline.', contents: 'Customer details · Lead status · Assignments' },
  { kind: 'calls', title: 'Call history', description: 'Every conversation recorded by your sales team, in one place.', contents: 'Call outcomes · Notes · Follow-up details' },
  { kind: 'performance', title: 'Executive performance', description: 'Understand activity and sales performance across the team.', contents: 'Lead coverage · Conversions · Call metrics' },
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
  return <><PageHeader title="Reports" description="Your sales data, ready to take with you." />
    {error && <ErrorState message={error} />}
    {success && <p role="status" className="success-message">{success}</p>}
    <div className="report-section-heading"><h2>Available reports</h2><span>CSV exports</span></div>
    <div className="report-grid">{reports.map((report, index) => <Card key={report.kind} className="report-card"><div className="report-card-top"><span className={`report-icon report-icon-${index}`} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M8 13h8m-8 4h5" /></svg></span><span className="report-format">CSV</span></div><h2>{report.title}</h2><p className="report-description">{report.description}</p><p className="report-contents">{report.contents}</p><Button variant="secondary" className="report-download" onClick={() => download(report.kind, report.title)} disabled={busy !== null}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4" /></svg>{busy === report.kind ? 'Downloading…' : `Download ${report.title.toLowerCase()}`}</Button></Card>)}</div>
    <p className="reports-note">Reports include current data and open in Excel, Google Sheets or another spreadsheet app.</p>
  </>;
}
