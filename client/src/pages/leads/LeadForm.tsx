import { useState, type FormEvent } from 'react';
import { Button, Field, Input, Select, ErrorState } from '../../components/ui';
import { api } from '../../lib/api';
import { errorMessage, label, toLocalInput } from '../../lib/format';
import { LEAD_SOURCES, LEAD_STATUSES, PROPERTY_CATEGORIES, type Lead, type LeadSource, type LeadStatus, type PropertyCategory } from '../../types/api';
export default function LeadForm({ lead, onSaved, onCancel }: { lead?: Lead; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState(lead?.customerName ?? '');
  const [mobile, setMobile] = useState(lead?.mobile ?? '');
  const [email, setEmail] = useState(lead?.email ?? '');
  const [category, setCategory] = useState<PropertyCategory>(lead?.propertyCategory ?? 'PG');
  const [location, setLocation] = useState(lead?.preferredLocation ?? '');
  const [budget, setBudget] = useState(String(lead?.budget ?? ''));
  const [source, setSource] = useState<LeadSource>(lead?.leadSource ?? 'WEBSITE');
  const [status, setStatus] = useState<LeadStatus>(lead?.status ?? 'NEW');
  const [enquiry, setEnquiry] = useState(toLocalInput(lead?.enquiryDate ?? new Date().toISOString()));
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api(lead ? `/api/leads/${lead.id}` : '/api/leads', { method: lead ? 'PATCH' : 'POST', body: {
        customerName: name.trim(), mobile: mobile.trim(), email: email.trim() || null,
        propertyCategory: category, preferredLocation: location.trim(), budget: Number(budget),
        leadSource: source, status, enquiryDate: new Date(enquiry).toISOString(),
      } }); await onSaved();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="lead-editor">
    {error && <ErrorState message={error} />}
    <fieldset className="lead-form-section"><legend>Customer details</legend><div className="form-grid">
      <Field label="Customer name"><Input required placeholder="Full name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></Field>
      <Field label="Mobile"><Input required type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" title="10 digits, starting with 6, 7, 8 or 9" maxLength={10} value={mobile} onChange={e => setMobile(e.target.value)} /></Field>
      <Field label="Email (optional)"><Input type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} /></Field>
      </div></fieldset><fieldset className="lead-form-section"><legend>Property preferences</legend><div className="form-grid"><Field label="Property category"><Select value={category} onChange={e => setCategory(e.target.value as PropertyCategory)}>{PROPERTY_CATEGORIES.map(v => <option key={v} value={v}>{label(v)}</option>)}</Select></Field>
      <Field label="Preferred location"><Input required placeholder="e.g. Koramangala" value={location} onChange={e => setLocation(e.target.value)} /></Field>
      <Field label="Monthly budget (₹)"><Input required type="number" min="1" step="1" value={budget} onChange={e => setBudget(e.target.value)} /></Field>
      </div></fieldset><fieldset className="lead-form-section"><legend>Enquiry details</legend><div className="form-grid"><Field label="Lead source"><Select value={source} onChange={e => setSource(e.target.value as LeadSource)}>{LEAD_SOURCES.map(v => <option key={v} value={v}>{label(v)}</option>)}</Select></Field>
      <Field label="Lead status"><Select value={status} onChange={e => setStatus(e.target.value as LeadStatus)}>{LEAD_STATUSES.map(v => <option key={v} value={v}>{label(v)}</option>)}</Select></Field>
      <Field label="Enquiry date"><Input required type="datetime-local" value={enquiry} onChange={e => setEnquiry(e.target.value)} /></Field>
    </div></fieldset>
    <div className="form-actions"><Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : lead ? 'Save changes' : 'Create lead'}</Button></div>
  </form>;
}


