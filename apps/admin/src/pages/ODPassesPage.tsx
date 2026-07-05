import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ODPass } from '@campusflow/shared';

import { revokeODPass } from '../lib/adminApi';
import { COLLECTIONS, listCollection } from '../lib/firestore';

export function ODPassesPage() {
  const queryClient = useQueryClient();
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: passes = [], isLoading } = useQuery({
    queryKey: ['odPasses'],
    queryFn: () => listCollection<ODPass>(COLLECTIONS.OD_PASSES, 200),
  });

  const revokeMutation = useMutation({
    mutationFn: () => revokeODPass(revokeId!, reason.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odPasses'] });
      setRevokeId(null);
      setReason('');
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <>
      <h1 className="page-title">OD Passes</h1>
      <p className="page-subtitle">Revoke digital passes when needed</p>
      {error && <div className="error-banner">{error}</div>}

      {revokeId && (
        <div className="modal-overlay" onClick={() => setRevokeId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Revoke pass</h2>
            <div className="form-field">
              <label>Reason</label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason shown to the student"
              />
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-danger"
                disabled={!reason.trim() || revokeMutation.isPending}
                onClick={() => revokeMutation.mutate()}
              >
                Confirm revoke
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setRevokeId(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Pass ID</th>
              <th>Request</th>
              <th>Student</th>
              <th>Approval ID</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6}>Loading…</td></tr>
            ) : passes.length === 0 ? (
              <tr><td colSpan={6}>No passes</td></tr>
            ) : (
              passes.map((p) => (
                <tr key={p.id}>
                  <td>{p.id.slice(0, 10)}…</td>
                  <td>{p.requestId.slice(0, 10)}…</td>
                  <td>{p.studentUserId.slice(0, 8)}…</td>
                  <td>{p.approvalId}</td>
                  <td>
                    <span className={`badge-status ${p.status === 'ACTIVE' ? 'badge-active' : 'badge-revoked'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    {p.status === 'ACTIVE' && (
                      <button type="button" className="btn btn-danger" onClick={() => setRevokeId(p.id)}>
                        Revoke
                      </button>
                    )}
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
