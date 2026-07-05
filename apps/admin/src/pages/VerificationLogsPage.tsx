import { useQuery } from '@tanstack/react-query';

import { COLLECTIONS, listCollection } from '../lib/firestore';

interface VerificationLogRow {
  id: string;
  approvalId: string;
  passId: string;
  result: string;
  scannedBy?: string | null;
}

export function VerificationLogsPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['verificationLogs'],
    queryFn: () => listCollection<VerificationLogRow>(COLLECTIONS.VERIFICATION_LOGS, 100),
  });

  return (
    <>
      <h1 className="page-title">Verification Logs</h1>
      <p className="page-subtitle">QR pass scan results (read-only)</p>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Result</th>
              <th>Approval ID</th>
              <th>Pass ID</th>
              <th>Scanned by</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4}>Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4}>No verification logs yet</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span className={`badge-status ${log.result === 'VALID' ? 'badge-active' : 'badge-rejected'}`}>
                      {log.result}
                    </span>
                  </td>
                  <td>{log.approvalId}</td>
                  <td>{log.passId.slice(0, 10)}…</td>
                  <td>{log.scannedBy ? `${log.scannedBy.slice(0, 8)}…` : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
