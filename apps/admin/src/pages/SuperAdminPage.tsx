import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import type { CodingQuestion, NetworkPost, ProfileReport, User, WorkPost } from '@campusflow/shared';

import {
  createOfficialWorkPost,
  moderateWorkPost,
  setUserAccountStatus,
} from '../lib/adminApi';
import { COLLECTIONS, listCollection, patchDocument } from '../lib/firestore';

const reasonFor = (message: string) => window.prompt('Reason (recorded in the audit log):', message);

export function SuperAdminPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: '', description: '', category: 'OTHER' });
  const { data: users = [] } = useQuery({
    queryKey: ['superAdminUsers'],
    queryFn: () => listCollection<User>(COLLECTIONS.USERS, 200),
  });
  const { data: posts = [] } = useQuery({
    queryKey: ['superAdminPosts'],
    queryFn: () => listCollection<WorkPost>(COLLECTIONS.WORK_POSTS, 200),
  });
  const { data: codingQuestions = [] } = useQuery({
    queryKey: ['superAdminCodingQuestions'],
    queryFn: () => listCollection<CodingQuestion>(COLLECTIONS.CODING_QUESTIONS, 200),
  });
  const { data: networkPosts = [] } = useQuery({
    queryKey: ['superAdminNetworkPosts'],
    queryFn: () => listCollection<NetworkPost>(COLLECTIONS.NETWORK_POSTS, 200),
  });
  const { data: profileReports = [] } = useQuery({
    queryKey: ['superAdminProfileReports'],
    queryFn: () => listCollection<ProfileReport>(COLLECTIONS.PROFILE_REPORTS, 200),
  });

  const accountMutation = useMutation({
    mutationFn: ({ userId, isActive, reason }: { userId: string; isActive: boolean; reason: string }) =>
      setUserAccountStatus(userId, isActive, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['superAdminUsers'] }),
  });
  const postMutation = useMutation({
    mutationFn: ({ postId, action, reason }: { postId: string; action: 'REMOVE' | 'RESTORE'; reason: string }) =>
      moderateWorkPost(postId, action, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['superAdminPosts'] }),
  });
  const officialPostMutation = useMutation({
    mutationFn: () => createOfficialWorkPost(form),
    onSuccess: () => {
      setForm({ title: '', description: '', category: 'OTHER' });
      queryClient.invalidateQueries({ queryKey: ['superAdminPosts'] });
    },
  });
  const codingModerationMutation = useMutation({
    mutationFn: ({ id, isActive, reason }: { id: string; isActive: boolean; reason: string }) =>
      patchDocument(COLLECTIONS.CODING_QUESTIONS, id, { isActive, moderationReason: reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['superAdminCodingQuestions'] }),
  });
  const networkModerationMutation = useMutation({
    mutationFn: ({ id, isActive, reason }: { id: string; isActive: boolean; reason: string }) =>
      patchDocument(COLLECTIONS.NETWORK_POSTS, id, { isActive, moderationReason: reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['superAdminNetworkPosts'] }),
  });
  const profileReportMutation = useMutation({
    mutationFn: (id: string) => patchDocument(COLLECTIONS.PROFILE_REPORTS, id, { status: 'RESOLVED' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['superAdminProfileReports'] }),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    officialPostMutation.mutate();
  };

  return (
    <>
      <h1 className="page-title">Super Admin Control Centre</h1>
      <p className="page-subtitle">Official posts, user safety actions, and reversible Build-board moderation.</p>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2>Publish an official post</h2>
        <form onSubmit={onSubmit} className="form-grid">
          <div className="form-field"><label>Title</label><input required maxLength={80} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="form-field"><label>Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="OTHER">General</option><option value="AI_ML">AI / ML</option><option value="WEB">Web</option><option value="MOBILE">Mobile</option><option value="OPEN_SOURCE">Open source</option><option value="RESEARCH">Research</option><option value="DESIGN">Design</option></select></div>
          <div className="form-field form-field-full"><label>Message</label><textarea required minLength={10} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <button className="btn btn-primary" disabled={officialPostMutation.isPending}>Publish official post</button>
        </form>
      </section>

      <h2>Flagged user actions</h2>
      <div className="data-table-wrap">
        <table className="data-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th /></tr></thead><tbody>
          {users.filter((user) => user.role !== 'SUPER_ADMIN').map((user) => <tr key={user.uid}><td>{user.name}<br /><small>{user.email}</small></td><td>{user.role}</td><td>{user.isActive ? 'Active' : 'Disabled'}</td><td><button className="btn btn-secondary" disabled={accountMutation.isPending} onClick={() => { const reason = reasonFor(user.isActive ? 'Flagged for review' : 'Review completed'); if (reason) accountMutation.mutate({ userId: user.uid, isActive: !user.isActive, reason }); }}>{user.isActive ? 'Disable' : 'Restore'}</button></td></tr>)}
        </tbody></table>
      </div>

      <h2 style={{ marginTop: 28 }}>Build post moderation</h2>
      <div className="data-table-wrap">
        <table className="data-table"><thead><tr><th>Post</th><th>Author</th><th>Status</th><th /></tr></thead><tbody>
          {posts.map((post) => <tr key={post.id}><td>{post.title}<br /><small>{post.description}</small></td><td>{post.studentName}</td><td>{post.isActive ? 'Visible' : 'Removed'}</td><td><button className="btn btn-secondary" disabled={postMutation.isPending} onClick={() => { const action = post.isActive ? 'REMOVE' : 'RESTORE'; const reason = reasonFor(action === 'REMOVE' ? 'Inappropriate content' : 'Review completed'); if (reason) postMutation.mutate({ postId: post.id, action, reason }); }}>{post.isActive ? 'Remove' : 'Restore'}</button></td></tr>)}
        </tbody></table>
      </div>

      <h2 style={{ marginTop: 28 }}>Code Together moderation</h2>
      <div className="data-table-wrap">
        <table className="data-table"><thead><tr><th>Question</th><th>Author</th><th>Reports</th><th>Status</th><th /></tr></thead><tbody>
          {codingQuestions.map((question) => <tr key={question.id}><td>{question.title}<br /><small>{question.problemStatement.slice(0, 140)}{question.problemStatement.length > 140 ? '…' : ''}</small></td><td>{question.authorName}</td><td>{question.flagCount}</td><td>{question.isActive ? 'Visible' : 'Removed'}</td><td><button className="btn btn-secondary" disabled={codingModerationMutation.isPending || (question.isActive && question.flagCount === 0)} onClick={() => { const nextActive = !question.isActive; const reason = reasonFor(nextActive ? 'Review completed' : 'Flagged coding content'); if (reason) codingModerationMutation.mutate({ id: question.id, isActive: nextActive, reason }); }}>{question.isActive ? 'Remove' : 'Restore'}</button></td></tr>)}
          {codingQuestions.length === 0 ? <tr><td colSpan={5}>No coding questions posted yet.</td></tr> : null}
        </tbody></table>
      </div>

      <h2 style={{ marginTop: 28 }}>Network feed moderation</h2>
      <div className="data-table-wrap">
        <table className="data-table"><thead><tr><th>Post</th><th>Author</th><th>Reports</th><th>Status</th><th /></tr></thead><tbody>
          {networkPosts.map((post) => <tr key={post.id}><td>{post.title}<br /><small>{post.body.slice(0, 140)}{post.body.length > 140 ? '…' : ''}</small></td><td>{post.authorName}</td><td>{post.flagCount}</td><td>{post.isActive ? 'Visible' : 'Removed'}</td><td><button className="btn btn-secondary" disabled={networkModerationMutation.isPending || (post.isActive && post.flagCount === 0)} onClick={() => { const nextActive = !post.isActive; const reason = reasonFor(nextActive ? 'Review completed' : 'Flagged network content'); if (reason) networkModerationMutation.mutate({ id: post.id, isActive: nextActive, reason }); }}>{post.isActive ? 'Remove' : 'Restore'}</button></td></tr>)}
          {networkPosts.length === 0 ? <tr><td colSpan={5}>No network updates posted yet.</td></tr> : null}
        </tbody></table>
      </div>

      <h2 style={{ marginTop: 28 }}>Profile reports</h2>
      <div className="data-table-wrap">
        <table className="data-table"><thead><tr><th>Reported user</th><th>Reporter</th><th>Reason</th><th>Status</th><th /></tr></thead><tbody>
          {profileReports.map((report) => <tr key={report.id}><td>{report.targetUserId}</td><td>{report.reporterId}</td><td>{report.reason}</td><td>{report.status}</td><td>{report.status === 'OPEN' ? <button className="btn btn-secondary" disabled={profileReportMutation.isPending} onClick={() => profileReportMutation.mutate(report.id)}>Mark resolved</button> : null}</td></tr>)}
          {profileReports.length === 0 ? <tr><td colSpan={5}>No profile reports.</td></tr> : null}
        </tbody></table>
      </div>
    </>
  );
}
