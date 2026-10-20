import { useQuery } from '@tanstack/react-query';

import { getSystemHealthCallable } from '../config/firebase';

const statusLabel = {
  HEALTHY: 'All systems operational',
  DEGRADED: 'Attention needed',
  DOWN: 'Service disruption detected',
} as const;

function readableTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function SystemHealthPage() {
  const health = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => (await getSystemHealthCallable()).data,
    refetchInterval: 30_000,
    retry: 1,
  });

  const data = health.data;

  return (
    <section className="health-page">
      <div className="health-heading">
        <div>
          <p className="health-eyebrow">OPERATIONS CENTER</p>
          <h1 className="page-title">System Health</h1>
          <p className="page-subtitle">Live backend checks and failures reported by installed mobile apps.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => health.refetch()} disabled={health.isFetching}>
          {health.isFetching ? 'Checking…' : 'Run checks now'}
        </button>
      </div>

      {health.error && (
        <div className="health-alert health-alert-down">
          <strong>The monitoring endpoint is unreachable.</strong>
          <span>{health.error instanceof Error ? health.error.message : 'Unknown monitoring error'}</span>
        </div>
      )}

      {!data && !health.error && <div className="health-loading">Running secure diagnostics…</div>}

      {data && (
        <>
          <div className={`health-hero health-${data.status.toLowerCase()}`}>
            <span className="health-pulse" aria-hidden="true" />
            <div>
              <strong>{statusLabel[data.status]}</strong>
              <p>{data.environment} · checked {readableTime(data.timestamp)} · refreshes every 30 seconds</p>
            </div>
          </div>

          <div className="health-service-grid">
            {data.checks.map((check) => (
              <article className="health-service" key={check.id}>
                <div className="health-service-top">
                  <span className={`health-status-dot health-dot-${check.status.toLowerCase()}`} />
                  <span className={`health-chip health-chip-${check.status.toLowerCase()}`}>{check.status}</span>
                </div>
                <h2>{check.label}</h2>
                <p>{check.message}</p>
                <span className="health-latency">{check.latencyMs} ms</span>
              </article>
            ))}
          </div>

          <div className="health-metrics">
            <article><strong>{data.incidents.last24Hours}</strong><span>Failures in 24h</span></article>
            <article><strong>{data.incidents.affectedUsers}</strong><span>Affected users</span></article>
            <article><strong>{data.incidents.fatalCount}</strong><span>Fatal failures</span></article>
            <article><strong>{Object.keys(data.incidents.byFeature).length}</strong><span>Affected features</span></article>
          </div>

          <div className="health-panel">
            <div className="health-panel-heading">
              <div><h2>Recent mobile failures</h2><p>Grouped duplicates show their total occurrence count.</p></div>
            </div>
            {data.recentErrors.length === 0 ? (
              <div className="health-empty"><strong>No mobile failures reported in the last 24 hours.</strong><span>That is the kind of quiet we like.</span></div>
            ) : (
              <div className="data-table-wrap health-table-wrap">
                <table className="data-table health-table">
                  <thead><tr><th>Severity</th><th>Feature / operation</th><th>Error</th><th>Device / build</th><th>Count</th><th>Last seen</th></tr></thead>
                  <tbody>{data.recentErrors.map((error) => (
                    <tr key={error.id}>
                      <td><span className={`health-chip health-chip-${error.severity === 'WARNING' ? 'degraded' : 'down'}`}>{error.severity}</span></td>
                      <td><strong>{error.feature.replaceAll('_', ' ')}</strong><small>{error.operation}</small></td>
                      <td><span>{error.message}</span>{error.code && <small>{error.code}</small>}</td>
                      <td><span>{error.deviceModel ?? error.platform}</span><small>v{error.appVersion ?? '?'} ({error.buildVersion ?? '?'}) · {error.osVersion ?? error.platform}</small></td>
                      <td><strong>×{error.occurrenceCount}</strong></td>
                      <td>{readableTime(error.lastSeenAt)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
