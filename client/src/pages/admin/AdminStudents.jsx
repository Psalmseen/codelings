import { useState } from 'react';
import { Link } from 'react-router';
import { Flame, Plus, X, Zap } from 'lucide-react';
import { EmptyState, ErrorState, PageHeader, PageLoader } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../lib/api';
import { percent, timeAgo } from '../../lib/format';
import { tierOf } from '../../lib/leagues';

function CohortSelect({ cohorts, value, onChange, className = '' }) {
  return (
    <select className={`input py-2 text-sm ${className}`} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">No cohort (self-paced)</option>
      {cohorts.map((cohort) => (
        <option key={cohort._id} value={cohort._id}>
          {cohort.name}
        </option>
      ))}
    </select>
  );
}

function EnrolControl({ student, courses, onDone }) {
  const toast = useToast();
  const available = courses.filter((c) => !student.enrollments.some((e) => e.courseId === c._id));
  const [courseId, setCourseId] = useState('');
  const [cohortId, setCohortId] = useState(null);
  const cohorts = courses.find((c) => c._id === courseId)?.cohorts ?? [];

  if (available.length === 0) return null;

  async function enrol() {
    try {
      await api(`/admin/students/${student._id}/enrollments`, { method: 'POST', body: { courseId, cohortId } });
      setCourseId('');
      setCohortId(null);
      toast(`${student.name} enrolled`);
      onDone();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <select
        className="input py-2"
        value={courseId}
        onChange={(e) => {
          setCourseId(e.target.value);
          setCohortId(null);
        }}
      >
        <option value="">Add to course…</option>
        {available.map((c) => (
          <option key={c._id} value={c._id}>
            {c.emoji} {c.title}
            {c.status === 'draft' ? ' (draft)' : ''}
          </option>
        ))}
      </select>
      {cohorts.length > 0 && <CohortSelect cohorts={cohorts} value={cohortId} onChange={setCohortId} />}
      <button className="btn btn-secondary btn-sm shrink-0" disabled={!courseId} onClick={enrol}>
        <Plus className="size-4" /> Enrol
      </button>
    </div>
  );
}

export default function AdminStudents() {
  const toast = useToast();
  const students = useFetch('/admin/students');
  const courses = useFetch('/admin/courses');
  const cohortsByCourse = new Map((courses.data?.courses ?? []).map((c) => [c._id, c.cohorts]));

  async function unenrol(student, enrollment) {
    try {
      await api(`/admin/students/${student._id}/enrollments/${enrollment.courseId}`, { method: 'DELETE' });
      toast(`Removed from ${enrollment.title}`);
      students.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function changeCohort(student, enrollment, cohortId) {
    try {
      await api(`/admin/students/${student._id}/enrollments/${enrollment.courseId}`, { method: 'PATCH', body: { cohortId } });
      toast('Cohort updated');
      students.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <>
      <PageHeader title="Students" subtitle="See who's learning and manage their courses.">
        <Link to="/admin/invites" className="btn btn-primary">
          <Plus className="size-4" /> Invite student
        </Link>
      </PageHeader>

      {students.loading && !students.data && <PageLoader />}
      {students.error && <ErrorState error={students.error} onRetry={students.reload} />}
      {students.data?.students.length === 0 && (
        <EmptyState title="No students yet">
          <p className="font-semibold text-slate-400">Send an invite link to get your first learner in.</p>
          <Link to="/admin/invites" className="btn btn-primary">
            Create an invite
          </Link>
        </EmptyState>
      )}

      <div className="space-y-4">
        {students.data?.students.map((student) => {
          const tier = tierOf(student.league?.tier);
          return (
            <div key={student._id} className="card">
              <div className="mb-4 flex flex-wrap items-center gap-4">
                <span className="flex size-12 items-center justify-center rounded-full bg-neon-500/20 text-lg font-black text-neon-300">
                  {student.name[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black">{student.name}</p>
                  <p className="truncate text-sm font-semibold text-slate-400">
                    {student.email} · last seen {timeAgo(student.lastSeenAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3 font-black">
                  <span className="badge py-1 text-white" style={{ backgroundColor: tier.color }} title="League">
                    {tier.emoji} {tier.name}
                  </span>
                  <span className="flex items-center gap-1 text-flame-500" title="Current streak">
                    <Flame className="size-5" fill="currentColor" /> {student.streak.current}
                  </span>
                  <span className="flex items-center gap-1 text-sky-400" title={`Level ${student.levelInfo.level}`}>
                    <Zap className="size-5" fill="currentColor" /> {student.xp}
                  </span>
                </div>
              </div>

              <div className="mb-3 space-y-2">
                {student.enrollments.length === 0 && <p className="text-sm font-bold text-orange-400">Not enrolled in any course</p>}
                {student.enrollments.map((enrollment) => {
                  const cohorts = cohortsByCourse.get(enrollment.courseId) ?? [];
                  return (
                    <div key={enrollment.courseId} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[0.03] px-3 py-2">
                      <span className="min-w-0 flex-1 truncate font-extrabold text-slate-300">
                        {enrollment.emoji} {enrollment.title}
                      </span>
                      <span className="text-sm font-black text-slate-400">{percent(enrollment.completed, enrollment.total)}%</span>
                      {cohorts.length > 0 ? (
                        <CohortSelect
                          className="w-auto"
                          cohorts={cohorts}
                          value={enrollment.cohort?._id}
                          onChange={(cohortId) => changeCohort(student, enrollment, cohortId)}
                        />
                      ) : (
                        enrollment.pacing === 'cohort' && <span className="text-xs font-bold text-orange-400">No cohorts yet</span>
                      )}
                      <button
                        className="icon-btn size-8"
                        onClick={() => unenrol(student, enrollment)}
                        aria-label={`Remove from ${enrollment.title}`}
                        title="Remove from course"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {courses.data && <EnrolControl student={student} courses={courses.data.courses} onDone={students.reload} />}
            </div>
          );
        })}
      </div>
    </>
  );
}
