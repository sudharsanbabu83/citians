import { useQuery } from '@tanstack/react-query';
import type { ActiveUserReportEntry } from '@campusflow/shared';

import { getActiveUserReportCallable } from '../config/firebase';

function readableTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

function roleLabel(role: string) {
  return role.replaceAll('_', ' ');
}

function UserRow({ user }: { user: ActiveUserReportEntry }) {
  return (
    <tr>
      <td>
        <strong>{user.name}</strong>
        <small className="active-user-muted">{user.email}</small>
      </td>
      <td>
        <span className="badge-status badge-active">LIVE</span>
        <small className="active-user-muted">{roleLabel(user.role)}{user.department ? ` · ${user.department}` : ''}</small>
      </td>
      <td>
        <strong>{user.currentFeature ?? 'Unknown'}</strong>
        <small className="active-user-muted active-route">{user.currentRoute ?? 'Route not reported'}</small>
      </td>
      <td>
        <span>{user.deviceLabel ?? user.platform ?? 'Unknown device'}</span>
        <small className="active-user-muted">v{user.appVersion ?? '?'} · {user.platform ?? 'unknown platform'}</small>
      </td>
      <td title={readableTime(user.lastSeenAt)}>
        <strong>{relativeTime(user.lastSeenAt)}</strong>
        <small className="active-user-muted">{readableTime(user.lastSeenAt)}</small>
      </td>
    </tr>
  );
}

export function ActiveUsersPage() {
  const report = useQuery({
    queryKey: ['active-users'],
    queryFn: async () => (await getActiveUserReportCallable()).data,
    refetchInterval: 30_000,
    retry: 1,
  });
  const data = report.data;
  const features = Object.entries(data?.summary.byFeature ?? {}).sort(([, a], [, b]) => b - a);

  return (
    <section className="active-users-page">
      <div className="toolbar active-users-heading">
        <div>
          <p className="health-eyebrow">LIVE OPERATIONS</p>
          <h1 className="page-title">Active Users</h1>
          <p className="page-subtitle">See who is using Citians right now and which areas they are using.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => report.refetch()} disabled={report.isFetching}>
          {report.isFetching ? 'Refreshing…' : 'Refresh now'}
        </button>
      </div>

      {report.error && <div className="error-banner">Could not load active user report: {report.error instanceof Error ? report.error.message : 'Unknown error'}</div>}
      {!data && !report.error && <div className="health-loading">Loading live activity…</div>}

      {data && (
        <>
          <div className="active-users-hero">
            <span className="health-pulse" aria-hidden="true" />
            <div>
              <strong>{data.summary.activeUsers} users active now</strong>
              <p>Active means the app reported activity within the last {Math.round(data.activeWindowSeconds / 60)} minutes · updates every 30 seconds</p>
            </div>
          </div>

          <div className="health-metrics active-users-metrics">
            <article><strong>{data.summary.activeUsers}</strong><span>Active now</span></article>
            <article><strong>{data.summary.students}</strong><span>Students</span></article>
            <article><strong>{data.summary.staff}</strong><span>Staff / admins</span></article>
            <article><strong>{features.length}</strong><span>Features in use</span></article>
          </div>

          <div className="active-users-grid">
            <div className="health-panel">
              <div className="health-panel-heading">
                <h2>What people are using</h2>
                <p>Current feature reported by active sessions.</p>
              </div>
              <div className="feature-list">
                {features.length === 0 ? <div className="health-empty">No feature activity yet.</div> : features.map(([feature, count]) => (
                  <div className="feature-row" key={feature}>
                    <span>{feature}</span><strong>{count}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="health-panel">
              <div className="health-panel-heading">
                <h2>Live sessions</h2>
                <p>Last heartbeat from each active user.</p>
              </div>
              {data.users.length === 0 ? (
                <div className="health-empty"><strong>No active users right now.</strong><span>The report will update automatically when someone opens the app.</span></div>
              ) : (
                <div className="data-table-wrap active-users-table-wrap">
                  <table className="data-table active-users-table">
                    <thead><tr><th>User</th><th>Role</th><th>Using</th><th>Device</th><th>Last seen</th></tr></thead>
                    <tbody>{data.users.map((user) => <UserRow key={user.userId} user={user} />)}</tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
