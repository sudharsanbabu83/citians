import { useQuery } from '@tanstack/react-query';

import { COLLECTIONS, listCollection } from '../lib/firestore';

export function DashboardPage() {
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => listCollection(COLLECTIONS.DEPARTMENTS, 50),
  });
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => listCollection(COLLECTIONS.STUDENTS, 200),
  });
  const { data: odRequests = [] } = useQuery({
    queryKey: ['odRequests'],
    queryFn: () => listCollection(COLLECTIONS.OD_REQUESTS, 200),
  });
  const { data: odPasses = [] } = useQuery({
    queryKey: ['odPasses'],
    queryFn: () => listCollection(COLLECTIONS.OD_PASSES, 200),
  });

  const pending = odRequests.filter((r) => r.status === 'PENDING_HOD_REVIEW').length;
  const activePasses = odPasses.filter((p) => p.status === 'ACTIVE').length;

  return (
    <>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">CampusFlow admin overview</p>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="value">{departments.length}</div>
          <div className="label">Departments</div>
        </div>
        <div className="stat-card">
          <div className="value">{students.length}</div>
          <div className="label">Students</div>
        </div>
        <div className="stat-card">
          <div className="value">{odRequests.length}</div>
          <div className="label">OD Requests</div>
        </div>
        <div className="stat-card">
          <div className="value">{pending}</div>
          <div className="label">Pending review</div>
        </div>
        <div className="stat-card">
          <div className="value">{activePasses}</div>
          <div className="label">Active passes</div>
        </div>
      </div>
    </>
  );
}
