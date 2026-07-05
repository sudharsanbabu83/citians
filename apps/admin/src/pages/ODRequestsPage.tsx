import { useQuery } from '@tanstack/react-query';
import type { ODRequest } from '@campusflow/shared';

import { COLLECTIONS, listCollection } from '../lib/firestore';

function statusBadge(status: string) {
  if (status === 'APPROVED') return 'badge-approved';
  if (status === 'REJECTED' || status === 'REVOKED') return 'badge-rejected';
  if (status === 'PENDING_HOD_REVIEW') return 'badge-pending';
  return 'badge-revoked';
}

export function ODRequestsPage() {
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['odRequests'],
    queryFn: () => listCollection<ODRequest & { id: string }>(COLLECTIONS.OD_REQUESTS, 200),
  });

  return (
    <>
      <h1 className="page-title">OD Requests</h1>
      <p className="page-subtitle">Read-only overview of all on-duty requests</p>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Student</th>
              <th>Department</th>
              <th>Status</th>
              <th>Dates</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5}>Loading…</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={5}>No requests</td></tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.eventName}</td>
                  <td>{r.studentUserId.slice(0, 8)}…</td>
                  <td>{r.departmentId}</td>
                  <td>
                    <span className={`badge-status ${statusBadge(r.status)}`}>
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>{r.startDate} – {r.endDate}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
