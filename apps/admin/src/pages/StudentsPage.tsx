import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import type { Student, User } from '@campusflow/shared';

import { provisionUser } from '../lib/adminApi';
import { COLLECTIONS, listCollection, patchDocument } from '../lib/firestore';

export function StudentsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    name: '',
    password: 'password123',
    departmentId: 'cse',
    registerNumber: '',
    year: '3',
    section: 'A',
  });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => listCollection<Student>(COLLECTIONS.STUDENTS, 200),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => listCollection<User>(COLLECTIONS.USERS, 200),
  });

  const userMap = new Map(users.map((u) => [u.uid, u]));

  const createMutation = useMutation({
    mutationFn: () =>
      provisionUser({
        ...form,
        role: 'STUDENT',
        phone: '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
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
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">View and provision student accounts</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
          Add student
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Provision student</h2>
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
                <label>Password</label>
                <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <div className="form-field">
                <label>Department ID</label>
                <input value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} required />
              </div>
              <div className="form-field">
                <label>Register number</label>
                <input value={form.registerNumber} onChange={(e) => setForm({ ...form, registerNumber: e.target.value })} required />
              </div>
              <div className="form-field">
                <label>Year</label>
                <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required />
              </div>
              <div className="form-field">
                <label>Section</label>
                <input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} required />
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
              <th>Reg. No</th>
              <th>Dept</th>
              <th>Year</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7}>Loading…</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={7}>No students</td></tr>
            ) : (
              students.map((s) => {
                const user = userMap.get(s.userId);
                return (
                  <tr key={s.id}>
                    <td>{user?.name ?? '—'}</td>
                    <td>{user?.email ?? '—'}</td>
                    <td>{s.registerNumber}</td>
                    <td>{s.departmentId}</td>
                    <td>{s.year}/{s.section}</td>
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
