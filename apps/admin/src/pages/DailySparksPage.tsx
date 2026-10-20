import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { serverTimestamp } from 'firebase/firestore';

import { COLLECTIONS } from '@campusflow/shared';
import { deleteDocument, listCollection, upsertDocument } from '../lib/firestore';

type Spark = { id: string; category: string; question: string; options: string[]; answer: number; explanation: string; takeaway: string; published: boolean };
const empty = { category: 'Technology', eyebrow: 'A 30-second knowledge check', question: '', options: ['', '', '', ''], answer: 0, explanation: '', takeaway: '' };

export function DailySparksPage() {
  const client = useQueryClient();
  const [form, setForm] = useState(empty);
  const sparks = useQuery({ queryKey: ['adminDailySparks'], queryFn: () => listCollection<Spark>(COLLECTIONS.DAILY_SPARKS, 100) });
  const save = useMutation({ mutationFn: () => upsertDocument(COLLECTIONS.DAILY_SPARKS, `spark-${Date.now()}`, { ...form, published: true, createdAt: serverTimestamp() }), onSuccess: () => { setForm(empty); client.invalidateQueries({ queryKey: ['adminDailySparks'] }); } });
  const remove = useMutation({ mutationFn: (id: string) => deleteDocument(COLLECTIONS.DAILY_SPARKS, id), onSuccess: () => client.invalidateQueries({ queryKey: ['adminDailySparks'] }) });
  const setOption = (index: number, value: string) => setForm({ ...form, options: form.options.map((item, itemIndex) => itemIndex === index ? value : item) });

  return <>
    <h1 className="page-title">Daily Spark</h1>
    <p className="page-subtitle">Add the short questions students see when they open the app.</p>
    <form className="form-grid" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
      <div className="form-field"><label>Category</label><input required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></div>
      <div className="form-field"><label>Eyebrow</label><input required value={form.eyebrow} onChange={(event) => setForm({ ...form, eyebrow: event.target.value })} /></div>
      <div className="form-field"><label>Question</label><textarea required minLength={10} rows={3} value={form.question} onChange={(event) => setForm({ ...form, question: event.target.value })} /></div>
      {form.options.map((option, index) => <div className="form-field" key={index}><label>Option {String.fromCharCode(65 + index)}{index === form.answer ? ' · correct' : ''}</label><input required value={option} onChange={(event) => setOption(index, event.target.value)} /></div>)}
      <div className="form-field"><label>Correct answer</label><select value={form.answer} onChange={(event) => setForm({ ...form, answer: Number(event.target.value) })}>{form.options.map((_, index) => <option key={index} value={index}>Option {String.fromCharCode(65 + index)}</option>)}</select></div>
      <div className="form-field"><label>Explanation</label><textarea required rows={3} value={form.explanation} onChange={(event) => setForm({ ...form, explanation: event.target.value })} /></div>
      <div className="form-field"><label>Takeaway</label><input required value={form.takeaway} onChange={(event) => setForm({ ...form, takeaway: event.target.value })} /></div>
      <div className="form-actions"><button className="btn btn-primary" disabled={save.isPending}>{save.isPending ? 'Publishing…' : 'Publish question'}</button></div>
    </form>
    <div className="data-table-wrap" style={{ marginTop: '1.5rem' }}><table className="data-table"><thead><tr><th>Question</th><th>Category</th><th>Answer</th><th /></tr></thead><tbody>{sparks.isLoading ? <tr><td colSpan={4}>Loading…</td></tr> : sparks.data?.length ? sparks.data.map((spark) => <tr key={spark.id}><td>{spark.question}</td><td>{spark.category}</td><td>{spark.options[spark.answer]}</td><td><button className="btn btn-danger" onClick={() => window.confirm(`Remove this question?`) && remove.mutate(spark.id)}>Remove</button></td></tr>) : <tr><td colSpan={4}>No questions published yet.</td></tr>}</tbody></table></div>
  </>;
}
