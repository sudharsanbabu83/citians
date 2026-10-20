import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import type { User } from '@campusflow/shared';

import { provisionUser } from '../lib/adminApi';
import { COLLECTIONS, listCollection, patchDocument } from '../lib/firestore';

export function CompetitionsAdminsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    name: '',
    password: '',
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => listCollection<User>(COLLECTIONS.USERS, 200),
  });

  const competitionsAdmins = users.filter((user) => user.role === 'COMPETITIONS_ADMIN');

  const createMutation = useMutation({
    mutationFn: () =>
      provisionUser({
        ...form,
        role: 'COMPETITIONS_ADMIN',
        phone: '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
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
          <h1 className="page-title">Competitions Admins</h1>
          <p className="page-subtitle">Users who curate external hackathons for students</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
          Add competitions admin
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Provision competitions admin</h2>
            <form onSubmit={onSubmit} className="form-grid">
              <div className="form-field">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="email">College email</label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="competitions@citchennai.net"
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="password">Temporary password</label>
                <input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating…' : 'Create account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {competitionsAdmins.length === 0 ? (
                <tr>
                  <td colSpan={4}>No competitions admins yet.</td>
                </tr>
              ) : (
                competitionsAdmins.map((user) => (
                  <tr key={user.uid}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.isActive ? 'Active' : 'Inactive'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() =>
                          toggleUserMutation.mutate({
                            uid: user.uid,
                            isActive: !user.isActive,
                          })
                        }
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
