import { useQuery } from '@tanstack/react-query';

import { COLLECTIONS, listCollection } from '../lib/firestore';

interface AuditLogRow {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt?: unknown;
}

export function AuditLogsPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => listCollection<AuditLogRow>(COLLECTIONS.AUDIT_LOGS, 100),
  });

  return (
    <>
      <h1 className="page-title">Audit Logs</h1>
      <p className="page-subtitle">Server-written audit trail (read-only)</p>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Entity</th>
              <th>Entity ID</th>
              <th>Actor</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4}>Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4}>No audit logs</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.action}</td>
                  <td>{log.entityType}</td>
                  <td>{log.entityId}</td>
                  <td>{log.actorUserId.slice(0, 8)}…</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
