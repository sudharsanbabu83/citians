import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { serverTimestamp } from 'firebase/firestore';

import { COLLECTIONS } from '@campusflow/shared';
import { deleteDocument, listCollection, upsertDocument } from '../lib/firestore';

type TechPulsePost = { id: string; category: string; title: string; summary: string; takeaway: string; source: string; age: string; published: boolean };
const empty = { category: 'AI', title: '', summary: '', takeaway: '', source: 'Citians Tech Desk', age: 'Today' };

export function TechPulsePage() {
  const client = useQueryClient();
  const [form, setForm] = useState(empty);
  const posts = useQuery({ queryKey: ['adminTechPulse'], queryFn: () => listCollection<TechPulsePost>(COLLECTIONS.TECH_PULSE, 100) });
  const save = useMutation({
    mutationFn: () => upsertDocument(COLLECTIONS.TECH_PULSE, `post-${Date.now()}`, { ...form, icon: form.category === 'AI' ? 'sparkles-outline' : form.category === 'Build' ? 'code-slash-outline' : form.category === 'Cyber safety' ? 'shield-checkmark-outline' : 'leaf-outline', accent: form.category === 'AI' ? '#7C5CFC' : form.category === 'Build' ? '#087F73' : form.category === 'Cyber safety' ? '#2372C8' : '#C55D4E', published: true, createdAt: serverTimestamp() }),
    onSuccess: () => { setForm(empty); client.invalidateQueries({ queryKey: ['adminTechPulse'] }); },
  });
  const remove = useMutation({ mutationFn: (id: string) => deleteDocument(COLLECTIONS.TECH_PULSE, id), onSuccess: () => client.invalidateQueries({ queryKey: ['adminTechPulse'] }) });

  return <>
    <h1 className="page-title">Tech Pulse</h1>
    <p className="page-subtitle">Publish short, student-friendly technology updates to the mobile feed.</p>
    <form className="form-grid" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
      <div className="form-field"><label>Category</label><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{['AI', 'Build', 'Cyber safety', 'Future'].map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="form-field"><label>Headline</label><input required minLength={5} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="A short headline students will want to open" /></div>
      <div className="form-field"><label>Summary</label><textarea required minLength={10} rows={4} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></div>
      <div className="form-field"><label>Why it matters</label><input required value={form.takeaway} onChange={(event) => setForm({ ...form, takeaway: event.target.value })} /></div>
      <div className="form-field"><label>Source label</label><input value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} /></div>
      <div className="form-actions"><button className="btn btn-primary" disabled={save.isPending}>{save.isPending ? 'Publishing…' : 'Publish update'}</button></div>
    </form>
    <div className="data-table-wrap" style={{ marginTop: '1.5rem' }}><table className="data-table"><thead><tr><th>Headline</th><th>Category</th><th>Source</th><th /></tr></thead><tbody>{posts.isLoading ? <tr><td colSpan={4}>Loading…</td></tr> : posts.data?.length ? posts.data.map((post) => <tr key={post.id}><td>{post.title}<br /><small>{post.summary}</small></td><td>{post.category}</td><td>{post.source}</td><td><button className="btn btn-danger" onClick={() => window.confirm(`Remove "${post.title}"?`) && remove.mutate(post.id)}>Remove</button></td></tr>) : <tr><td colSpan={4}>No updates published yet.</td></tr>}</tbody></table></div>
  </>;
}
