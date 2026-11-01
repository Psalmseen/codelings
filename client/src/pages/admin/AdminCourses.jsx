import { Link, useNavigate, useSearchParams } from 'react-router';
import { Plus, Sparkles } from 'lucide-react';
import CourseForm from '../../components/admin/CourseForm';
import ImportCourse from '../../components/admin/ImportCourse';
import { EmptyState, ErrorState, Modal, PageHeader, PageLoader } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../lib/api';
import { courseGlow } from '../../lib/format';

export function StatusBadge({ status }) {
  return status === 'published' ? (
    <span className="badge bg-lime-400/15 text-lime-300 light:text-lime-700">Live</span>
  ) : (
    <span className="badge bg-tint/10 text-ink-muted">Draft</span>
  );
}

export default function AdminCourses() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data, loading, error, reload } = useFetch('/admin/courses');
  const creating = params.get('new') === '1';
  const importing = params.get('import') === '1';

  async function createCourse(form) {
    const { course } = await api('/admin/courses', { method: 'POST', body: form });
    navigate(`/admin/courses/${course._id}`);
  }

  return (
    <>
      <PageHeader title="Courses" subtitle="Build lesson by lesson, or create a whole course with Claude.">
        <button className="btn btn-secondary" onClick={() => setParams({ import: '1' })}>
          <Sparkles className="size-4" /> Create with Claude
        </button>
        <button className="btn btn-primary" onClick={() => setParams({ new: '1' })}>
          <Plus className="size-4" /> New course
        </button>
      </PageHeader>

      {loading && !data && <PageLoader />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data?.courses.length === 0 && (
        <EmptyState title="No courses yet">
          <button className="btn btn-primary" onClick={() => setParams({ new: '1' })}>
            Create your first course
          </button>
        </EmptyState>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.courses.map((course) => (
          <Link key={course._id} to={`/admin/courses/${course._id}`} className="card transition hover:-translate-y-0.5 hover:border-tint/25">
            <div className="mb-3 flex items-start justify-between">
              <span
                className="flex size-14 items-center justify-center rounded-2xl text-3xl"
                style={courseGlow(course.color)}
              >
                {course.emoji}
              </span>
              <StatusBadge status={course.status} />
            </div>
            <h3 className="text-lg font-black">{course.title}</h3>
            <p className="text-sm font-bold text-ink-muted">
              {course.moduleCount} modules · {course.lessonCount} lessons · {course.studentCount} students
            </p>
          </Link>
        ))}
      </div>

      {importing && (
        <Modal title="Create a course with Claude" wide onClose={() => setParams({})}>
          <ImportCourse onImported={(course) => navigate(`/admin/courses/${course._id}`)} />
        </Modal>
      )}

      {creating && (
        <Modal title="New course" onClose={() => setParams({})}>
          <CourseForm submitLabel="Create course" onSubmit={createCourse} />
        </Modal>
      )}
    </>
  );
}
