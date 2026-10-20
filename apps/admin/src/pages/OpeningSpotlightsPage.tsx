import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Timestamp, serverTimestamp } from 'firebase/firestore';
import type { Event } from '@campusflow/shared';

import { COLLECTIONS, listCollection, patchDocument, upsertDocument, deleteDocument } from '../lib/firestore';

type SpotlightKind = 'EVENT' | 'TECH' | 'COMPETITION' | 'GENERAL';
type SpotlightTarget = 'EVENTS' | 'EVENT_DETAIL' | 'TECH_PULSE' | 'CODE_TOGETHER' | 'NETWORK' | 'FOCUS';
type OpeningSpotlight = {
  id: string;
  kind: SpotlightKind;
  title: string;
  message: string;
  actionLabel: string;
  target: SpotlightTarget;
  targetId?: string | null;
  emoji: string;
  accentColor: string;
  published: boolean;
  startsAt?: unknown;
  endsAt?: unknown;
};

const TARGETS: Array<{ value: SpotlightTarget; label: string }> = [
  { value: 'EVENT_DETAIL', label: 'Specific event registration' },
  { value: 'EVENTS', label: 'All events' },
  { value: 'TECH_PULSE', label: 'Tech Pulse' },
  { value: 'CODE_TOGETHER', label: 'Code Together' },
  { value: 'NETWORK', label: 'Campus Network' },
  { value: 'FOCUS', label: 'Focus Session' },
];

const emptyForm = {
  kind: 'EVENT' as SpotlightKind,
  title: '',
  message: '',
  actionLabel: 'Register now',
  target: 'EVENT_DETAIL' as SpotlightTarget,
  targetId: '',
  emoji: '📣',
  accentColor: '#6C4CF6',
  startsAt: '',
  endsAt: '',
  published: true,
};

function formatTimestamp(value: unknown): string {
  if (!value) return 'Immediately';
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toLocaleString('en-IN');
  }
  return String(value);
}

function targetLabel(target: SpotlightTarget): string {
  return TARGETS.find((item) => item.value === target)?.label ?? target;
}

export function OpeningSpotlightsPage() {
  const client = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [validationError, setValidationError] = useState('');
  const spotlights = useQuery({ queryKey: ['adminOpeningSpotlights'], queryFn: () => listCollection<OpeningSpotlight>(COLLECTIONS.OPENING_SPOTLIGHTS, 100) });
  const events = useQuery({ queryKey: ['adminSpotlightEvents'], queryFn: () => listCollection<Event & { id: string }>(COLLECTIONS.EVENTS, 200, 'startAt') });

  const save = useMutation({
    mutationFn: () => upsertDocument(COLLECTIONS.OPENING_SPOTLIGHTS, `spotlight-${Date.now()}`, {
      kind: form.kind,
      title: form.title.trim(),
      message: form.message.trim(),
      actionLabel: form.actionLabel.trim(),
      target: form.target,
      targetId: form.target === 'EVENT_DETAIL' ? form.targetId : null,
      emoji: form.emoji.trim() || '📣',
      accentColor: form.accentColor,
      published: form.published,
      startsAt: form.startsAt ? Timestamp.fromDate(new Date(form.startsAt)) : null,
      endsAt: form.endsAt ? Timestamp.fromDate(new Date(form.endsAt)) : null,
      createdAt: serverTimestamp(),
    }),
    onSuccess: () => { setForm(emptyForm); setValidationError(''); client.invalidateQueries({ queryKey: ['adminOpeningSpotlights'] }); },
  });

  const toggle = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) => patchDocument(COLLECTIONS.OPENING_SPOTLIGHTS, id, { published }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['adminOpeningSpotlights'] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteDocument(COLLECTIONS.OPENING_SPOTLIGHTS, id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['adminOpeningSpotlights'] }),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (form.target === 'EVENT_DETAIL' && !form.targetId) return setValidationError('Select the event students should register for.');
    if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) return setValidationError('The end time must be after the start time.');
    setValidationError('');
    save.mutate();
  };

  return <>
    <h1 className="page-title">Opening Spotlight</h1>
    <p className="page-subtitle">Control the announcement students see when they first open the app. Use it for event registration, urgent campus updates, or a useful action.</p>

    <form className="form-grid" onSubmit={submit}>
      <div className="form-field"><label>Content type</label><select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as SpotlightKind })}><option value="EVENT">Event</option><option value="TECH">Tech update</option><option value="COMPETITION">Competition</option><option value="GENERAL">General campus message</option></select></div>
      <div className="form-field"><label>Emoji</label><input required maxLength={4} value={form.emoji} onChange={(event) => setForm({ ...form, emoji: event.target.value })} /></div>
      <div className="form-field"><label>Headline</label><input required minLength={5} maxLength={90} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Hack Night registration is open" /></div>
      <div className="form-field"><label>Message</label><textarea required minLength={10} maxLength={240} rows={3} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Join students from across campus for an evening of building and learning." /></div>
      <div className="form-field"><label>Action button text</label><input required maxLength={30} value={form.actionLabel} onChange={(event) => setForm({ ...form, actionLabel: event.target.value })} /></div>
      <div className="form-field"><label>Where should the button go?</label><select value={form.target} onChange={(event) => setForm({ ...form, target: event.target.value as SpotlightTarget, targetId: '' })}>{TARGETS.map((target) => <option key={target.value} value={target.value}>{target.label}</option>)}</select></div>
      {form.target === 'EVENT_DETAIL' ? <div className="form-field"><label>Published event</label><select required value={form.targetId} onChange={(event) => setForm({ ...form, targetId: event.target.value })}><option value="">Select an approved event</option>{events.data?.filter((event) => event.status === 'PUBLISHED').map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></div> : null}
      <div className="form-field"><label>Accent color</label><input type="color" value={form.accentColor} onChange={(event) => setForm({ ...form, accentColor: event.target.value })} /></div>
      <div className="form-field"><label>Show from (optional)</label><input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></div>
      <div className="form-field"><label>Hide after (optional)</label><input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></div>
      <label className="checkbox-row"><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} /> Publish immediately when saved</label>
      {validationError ? <div className="error-banner">{validationError}</div> : null}
      {save.isError ? <div className="error-banner">The spotlight could not be saved. Check your admin permissions and try again.</div> : null}
      <div className="form-actions"><button className="btn btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Create opening spotlight'}</button></div>
    </form>

    <div className="data-table-wrap" style={{ marginTop: '1.5rem' }}><table className="data-table"><thead><tr><th>Headline</th><th>Destination</th><th>Schedule</th><th>Status</th><th>Actions</th></tr></thead><tbody>{spotlights.isLoading ? <tr><td colSpan={5}>Loading…</td></tr> : spotlights.data?.length ? spotlights.data.map((spotlight) => <tr key={spotlight.id}><td>{spotlight.emoji} {spotlight.title}<br /><small>{spotlight.message}</small></td><td>{targetLabel(spotlight.target)}{spotlight.targetId ? <><br /><small>{spotlight.targetId}</small></> : null}</td><td>{formatTimestamp(spotlight.startsAt)}<br />until {formatTimestamp(spotlight.endsAt)}</td><td><span className={`badge-status ${spotlight.published ? 'badge-approved' : 'badge-pending'}`}>{spotlight.published ? 'LIVE' : 'PAUSED'}</span></td><td><button type="button" className="btn btn-secondary" disabled={toggle.isPending} onClick={() => toggle.mutate({ id: spotlight.id, published: !spotlight.published })}>{spotlight.published ? 'Pause' : 'Publish'}</button>{' '}<button type="button" className="btn btn-danger" disabled={remove.isPending} onClick={() => window.confirm(`Remove "${spotlight.title}"?`) && remove.mutate(spotlight.id)}>Remove</button></td></tr>) : <tr><td colSpan={5}>No opening spotlights created yet.</td></tr>}</tbody></table></div>
  </>;
}
