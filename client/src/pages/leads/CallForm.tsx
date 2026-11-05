import { useState, type FormEvent } from 'react';
import { Button, ErrorState, Field, Input, Select, Textarea } from '../../components/ui';
import { api } from '../../lib/api';
import { errorMessage, label } from '../../lib/format';
import { CALL_OUTCOMES, type CallOutcome } from '../../types/api';
export default function CallForm({ leadId, onSaved }: { leadId: string; onSaved: () => Promise<void> }) {
  const [outcome, setOutcome] = useState<CallOutcome>('CONNECTED');
  const [minutes, setMinutes] = useState('0'); const [seconds, setSeconds] = useState('0');
  const [notes, setNotes] = useState(''); const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setSuccess('');
    try {
      await api(`/api/leads/${leadId}/calls`, { method: 'POST', body: { outcome, durationSeconds: Number(minutes) * 60 + Number(seconds), ...(notes.trim() ? { notes: notes.trim() } : {}), ...(next ? { nextFollowUpAt: new Date(next).toISOString() } : {}) } });
      setNotes(''); setNext(''); setMinutes('0'); setSeconds('0'); await onSaved(); setSuccess('Call recorded.');
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <form className="lead-call-form" onSubmit={submit}>
    {error && <ErrorState message={error} />}{success && <p role="status" className="text-sm text-emerald-700">{success}</p>}
    <div className="lead-call-fields">
      <Field label="Call outcome"><Select value={outcome} onChange={e => setOutcome(e.target.value as CallOutcome)}>{CALL_OUTCOMES.map(v => <option key={v} value={v}>{label(v)}</option>)}</Select></Field>
      <Field label="Duration minutes"><Input required type="number" min="0" step="1" value={minutes} onChange={e => setMinutes(e.target.value)} /></Field>
      <Field label="Duration seconds"><Input required type="number" min="0" max="59" step="1" value={seconds} onChange={e => setSeconds(e.target.value)} /></Field>
    </div>
    <Field label="Call notes (optional)"><Textarea placeholder="What did you discuss? Add useful context for the next call." value={notes} onChange={e => setNotes(e.target.value)} /></Field>
    <div className="lead-call-bottom"><Field label="Next follow-up (optional)"><Input type="datetime-local" value={next} onChange={e => setNext(e.target.value)} /></Field>
    <Button type="submit" disabled={busy}>{busy ? 'Recording…' : 'Record call'}</Button></div>
  </form>;
}

