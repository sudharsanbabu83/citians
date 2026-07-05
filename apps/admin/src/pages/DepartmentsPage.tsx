import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import type { Department } from '@campusflow/shared';

import { COLLECTIONS, listCollection, patchDocument, upsertDocument } from '../lib/firestore';

export function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ id: '', name: '', code: '', hodId: '' });
  const [message, setMessage] = useState<string | null>(null);

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => listCollection<Department>(COLLECTIONS.DEPARTMENTS, 50),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const id = form.id.trim().toLowerCase() || form.code.trim().toLowerCase();
      if (!id || !form.name || !form.code) throw new Error('ID, name, and code are required.');
      await upsertDocument(COLLECTIONS.DEPARTMENTS, id, {
        name: form.name,
        code: form.code.toUpperCase(),
        hodId: form.hodId || null,
        isActive: true,
        createdAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setMessage('Department saved.');
      setForm({ id: '', name: '', code: '', hodId: '' });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      patchDocument(COLLECTIONS.DEPARTMENTS, id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] }),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    saveMutation.mutate();
  };

  return (
    <>
      <h1 className="page-title">Departments</h1>
      <p className="page-subtitle">Manage college departments and HOD assignments</p>
      {message && <div className="success-banner">{message}</div>}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Add / update department</h2>
        <form onSubmit={onSubmit} className="form-grid">
          <div className="form-field">
            <label>Doc ID (slug, e.g. cse)</label>
            <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="cse" />
          </div>
          <div className="form-field">
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-field">
            <label>Code</label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          </div>
          <div className="form-field">
            <label>HOD user ID (optional)</label>
            <input value={form.hodId} onChange={(e) => setForm({ ...form, hodId: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
            Save department
          </button>
        </form>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Code</th>
              <th>HOD</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6}>Loading…</td></tr>
            ) : departments.length === 0 ? (
              <tr><td colSpan={6}>No departments</td></tr>
            ) : (
              departments.map((d) => (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{d.name}</td>
                  <td>{d.code}</td>
                  <td>{d.hodId ?? '—'}</td>
                  <td>
                    <span className={`badge-status ${d.isActive ? 'badge-active' : 'badge-inactive'}`}>
                      {d.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => toggleMutation.mutate({ id: d.id, isActive: !d.isActive })}
                    >
                      Toggle
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
