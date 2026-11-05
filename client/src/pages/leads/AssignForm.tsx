import { useState, type FormEvent } from 'react';
import { Button, ErrorState, Field, Select } from '../../components/ui';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/format';
import type { Executive, Lead } from '../../types/api';
export default function AssignForm({ lead, executives, onSaved, onCancel }: { lead: Lead; executives: Executive[]; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [assignedToId, setAssignedToId] = useState(lead.assignedToId ?? '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await api(`/api/leads/${lead.id}/assign`, { method: 'PATCH', body: { assignedToId: assignedToId || null } }); await onSaved(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <form className="lead-editor" onSubmit={submit}>
    <p className="lead-form-help">Assign {lead.customerName} to a sales executive.</p>
    {error && <ErrorState message={error} />}
    <Field label="Assigned executive"><Select value={assignedToId} onChange={e => setAssignedToId(e.target.value)}><option value="">Unassigned</option>{executives.map(e => <option key={e.id} value={e.id}>{e.name} ({e.email})</option>)}</Select></Field>
    <div className="form-actions"><Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save assignment'}</Button></div>
  </form>;
}


