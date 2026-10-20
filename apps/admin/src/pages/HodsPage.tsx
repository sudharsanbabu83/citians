import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import type { Hod, User } from '@campusflow/shared';

import { provisionUser } from '../lib/adminApi';
import { COLLECTIONS, listCollection, patchDocument } from '../lib/firestore';

export function HodsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    name: '',
    password: '',
    departmentId: 'cse',
    designation: 'Head of Department',
  });

  const { data: hods = [], isLoading } = useQuery({
    queryKey: ['hods'],
    queryFn: () => listCollection<Hod>(COLLECTIONS.HODS, 50),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => listCollection<User>(COLLECTIONS.USERS, 200),
  });

  const userMap = new Map(users.map((u) => [u.uid, u]));

  const createMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        role: 'HOD' as const,
        phone: '',
      };
      if (!payload.password.trim()) {
        const { password: _password, ...rest } = payload;
        return provisionUser(rest);
      }
      return provisionUser(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hods'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setShowForm(false);
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const toggleUserMutation = useMutation({
    mutationFn: ({ uid, isActive }: { uid: string; isActive: boolean }) =>
      patchDocument(COLLECTIONS.USERS, uid, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    createMutation.mutate();
  };

  return (
    <>
      <div className="toolbar">
        <div>
          <h1 className="page-title">HODs</h1>
          <p className="page-subtitle">Heads of department</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
          Add HOD
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Provision HOD</h2>
            <form onSubmit={onSubmit} className="form-grid">
              <div className="form-field">
                <label>Email</label>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="form-field">
                <label>Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-field">
                <label>Password (optional)</label>
                <input
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Leave blank — HOD completes registration in the app"
                />
              </div>
              <div className="form-field">
                <label>Department ID</label>
                <input value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} required />
              </div>
              <div className="form-field">
                <label>Designation</label>
                <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} required />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                  Create
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6}>Loading…</td></tr>
            ) : hods.length === 0 ? (
              <tr><td colSpan={6}>No HODs</td></tr>
            ) : (
              hods.map((h) => {
                const user = userMap.get(h.userId);
                return (
                  <tr key={h.id}>
                    <td>{user?.name ?? '—'}</td>
                    <td>{user?.email ?? '—'}</td>
                    <td>{h.departmentId}</td>
                    <td>{h.designation}</td>
                    <td>
                      <span className={`badge-status ${user?.isActive !== false ? 'badge-active' : 'badge-inactive'}`}>
                        {user?.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {user && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => toggleUserMutation.mutate({ uid: user.uid, isActive: !user.isActive })}
                        >
                          Toggle active
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
