import { Link } from 'react-router';
import { Activity, BookOpen, Inbox, Sparkles, Users } from 'lucide-react';
import { AtRiskList, RemindersCard } from '../../components/admin/AtRiskList';
import { ErrorState, PageHeader, PageLoader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { firstName } from '../../lib/format';

function StatCard({ icon: Icon, label, value, tint }) {
  return (
    <div className="card flex items-center gap-4">
      <span className={`flex size-12 items-center justify-center rounded-2xl ${tint}`}>
        <Icon className="size-6" />
      </span>
      <div>
        <p className="text-2xl font-black">{value}</p>
        <p className="text-sm font-bold text-ink-muted">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch('/admin/stats');

  return (
    <>
      <PageHeader title={`Hi ${firstName(user.name)} 👋`} subtitle="Here's how Codelings is doing." />
      {loading && !data && <PageLoader />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Students" value={data.students} tint="bg-neon-500/20 text-neon-300 light:text-neon-700" />
          <StatCard icon={Activity} label="Active in last 24h" value={data.activeToday} tint="bg-lime-400/15 text-lime-300 light:text-lime-700" />
          <StatCard
            icon={BookOpen}
            label={`Courses (${data.publishedCourses} live)`}
            value={data.courses}
            tint="bg-sky-400/15 text-sky-300 light:text-sky-700"
          />
          <StatCard icon={Inbox} label="Pending applications" value={data.pendingApplications} tint="bg-orange-400/15 text-orange-300 light:text-orange-700" />
        </div>
      )}

      <div className="mt-8 space-y-4">
        <AtRiskList />
        <RemindersCard />
      </div>

      <h2 className="mt-10 mb-4 text-xl font-black">Quick actions</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/admin/courses?new=1" className="card transition hover:border-neon-400/60">
          <BookOpen className="mb-2 size-7 text-neon-400 light:text-neon-600" />
          <p className="font-black">Build a course</p>
          <p className="text-sm font-semibold text-ink-muted">Add modules and lessons step by step</p>
        </Link>
        <Link to="/admin/applications" className="card transition hover:border-neon-400/60">
          <Inbox className="mb-2 size-7 text-orange-400 light:text-orange-600" />
          <p className="font-black">Review applications</p>
          <p className="text-sm font-semibold text-ink-muted">Share your apply link and approve new students</p>
        </Link>
        <Link to="/admin/courses?import=1" className="card transition hover:border-neon-400/60">
          <Sparkles className="mb-2 size-7 text-flame-500" />
          <p className="font-black">Create a course with Claude</p>
          <p className="text-sm font-semibold text-ink-muted">Describe it, let Claude write it, import it in one go</p>
        </Link>
      </div>
    </>
  );
}
