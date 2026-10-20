import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Event } from '@campusflow/shared';

import { approveEvent, cancelEvent, rejectEvent } from '../lib/adminApi';
import { COLLECTIONS, listCollection } from '../lib/firestore';

function statusBadge(status: string) {
  if (status === 'PUBLISHED') return 'badge-approved';
  if (status === 'CANCELLED') return 'badge-rejected';
  return 'badge-pending';
}

function formatTimestamp(value: unknown): string {
  if (!value) return '—';
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toLocaleString('en-IN');
  }
  return String(value);
}

export function EventsPage() {
  const queryClient = useQueryClient();
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['adminEvents'],
    queryFn: () => listCollection<Event & { id: string }>(COLLECTIONS.EVENTS, 200, 'startAt'),
  });

  const cancelMutation = useMutation({
    mutationFn: (eventId: string) => cancelEvent(eventId, 'Cancelled by admin'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminEvents'] }),
  });

  const approvalMutation = useMutation({
    mutationFn: ({ eventId, action, reason }: { eventId: string; action: 'APPROVE' | 'REJECT'; reason: string }) =>
      action === 'APPROVE' ? approveEvent(eventId, reason) : rejectEvent(eventId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminEvents'] }),
  });

  return (
    <>
      <h1 className="page-title">Events & Hackathons</h1>
      <p className="page-subtitle">Campus events hosted by students</p>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Organizer</th>
              <th>Type</th>
              <th>Status</th>
              <th>Starts</th>
              <th>Registrations</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7}>Loading…</td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={7}>No events yet</td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id}>
                  <td>{event.title}</td>
                  <td>{event.organizerName}</td>
                  <td>{event.type}</td>
                  <td>
                    <span className={`badge-status ${statusBadge(event.status)}`}>
                      {event.status}
                    </span>
                  </td>
                  <td>{formatTimestamp(event.startAt)}</td>
                  <td>
                    {event.registrationCount ?? 0}
                    {event.maxParticipants ? ` / ${event.maxParticipants}` : ''}
                  </td>
                  <td>
                    {['PENDING_ADMIN_REVIEW', 'REJECTED'].includes(event.status) ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={approvalMutation.isPending}
                          onClick={() => approvalMutation.mutate({ eventId: event.id, action: 'APPROVE', reason: 'Approved by admin' })}
                        >
                          Approve
                        </button>{' '}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={approvalMutation.isPending}
                          onClick={() => {
                            const reason = window.prompt('Reason for rejecting this event:', 'Event details need correction');
                            if (reason?.trim()) approvalMutation.mutate({ eventId: event.id, action: 'REJECT', reason: reason.trim() });
                          }}
                        >
                          Reject
                        </button>
                      </>
                    ) : event.status === 'PUBLISHED' ? (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={cancelMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Cancel "${event.title}"?`)) {
                            cancelMutation.mutate(event.id);
                          }
                        }}
                      >
                        Cancel
                      </button>
                    ) : (
                      '—'
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
