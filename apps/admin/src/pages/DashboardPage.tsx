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
  return (
    <>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Citians admin overview</p>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="value">{departments.length}</div>
          <div className="label">Departments</div>
        </div>
        <div className="stat-card">
          <div className="value">{students.length}</div>
          <div className="label">Students</div>
        </div>
      </div>
    </>
  );
}
