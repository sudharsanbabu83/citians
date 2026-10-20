import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { moderateCanvasDrop } from '../lib/adminApi';
import { listCanvasDrops } from '../lib/firestore';

type CanvasDropRow = {
  id: string;
  roomId: string;
  kind: 'text' | 'voice';
  authorId: string;
  authorName: string;
  text: string;
  createdAt?: unknown;
};

function formatTimestamp(value: unknown): string {
  if (!value) return '—';
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toLocaleString('en-IN');
  }
  return String(value);
}

export function CanvasModerationPage() {
  const queryClient = useQueryClient();
  const { data: drops = [], isLoading, isError } = useQuery({
    queryKey: ['adminCanvasDrops'],
    queryFn: () => listCanvasDrops<CanvasDropRow>(200),
  });
  const remove = useMutation({
    mutationFn: ({ roomId, dropId, reason }: { roomId: string; dropId: string; reason: string }) =>
      moderateCanvasDrop(roomId, dropId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminCanvasDrops'] }),
  });

  return (
    <>
      <h1 className="page-title">Canvas Moderation</h1>
      <p className="page-subtitle">Review and remove inappropriate text or voice drops from student Canvas rooms.</p>

      {isError ? <div className="error-banner">Canvas posts could not be loaded. Check your admin permissions and try again.</div> : null}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Author</th>
              <th>Type</th>
              <th>Content</th>
              <th>Posted</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6}>Loading Canvas posts…</td></tr> : drops.length === 0 ? <tr><td colSpan={6}>No Canvas posts found.</td></tr> : drops.map((drop) => (
              <tr key={`${drop.roomId}/${drop.id}`}>
                <td>{drop.roomId}</td>
                <td>{drop.authorName}<br /><small>{drop.authorId.slice(0, 10)}…</small></td>
                <td><span className="badge-status badge-pending">{drop.kind}</span></td>
                <td className="canvas-content-cell">{drop.kind === 'voice' ? 'Voice pulse' : drop.text}</td>
                <td>{formatTimestamp(drop.createdAt)}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={remove.isPending}
                    onClick={() => {
                      const reason = window.prompt('Reason for removing this Canvas post:', 'Inappropriate content');
                      if (reason?.trim()) remove.mutate({ roomId: drop.roomId, dropId: drop.id, reason: reason.trim() });
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
