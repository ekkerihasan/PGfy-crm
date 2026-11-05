import { useState, type FormEvent } from 'react';
import { Button, ErrorState, Field, Input, Textarea } from '../../components/ui';
import { api } from '../../lib/api';
import { errorMessage, toLocalInput } from '../../lib/format';
import type { FollowUp } from '../../types/api';
export default function FollowUpForm({ leadId, followUp, onSaved, onCancel }: { leadId: string; followUp?: FollowUp; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [dueAt, setDueAt] = useState(followUp ? toLocalInput(followUp.dueAt) : '');
  const [notes, setNotes] = useState(followUp?.notes ?? ''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api(followUp ? `/api/follow-ups/${followUp.id}` : '/api/follow-ups', { method: followUp ? 'PATCH' : 'POST', body: { ...(followUp ? { action: 'reschedule' } : { leadId }), dueAt: new Date(dueAt).toISOString(), notes: notes.trim() } }); await onSaved();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <form className="space-y-4" onSubmit={submit}>
    {error && <ErrorState message={error} />}
    <Field label="Follow-up due"><Input required type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} /></Field>
    <Field label="Follow-up notes (optional)"><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></Field>
    <p className="text-xs text-slate-500">Choose today or a later date. Today is based on India Standard Time.</p>
    <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : followUp ? 'Save reschedule' : 'Schedule follow-up'}</Button></div>
  </form>;
}
