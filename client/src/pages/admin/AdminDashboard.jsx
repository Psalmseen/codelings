import { Link } from 'react-router';
import { Activity, BookOpen, Sparkles, Ticket, Users } from 'lucide-react';
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
        <p className="text-sm font-bold text-slate-400">{label}</p>
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
          <StatCard icon={Users} label="Students" value={data.students} tint="bg-grape-100 text-grape-600" />
          <StatCard icon={Activity} label="Active in last 24h" value={data.activeToday} tint="bg-lime-100 text-lime-700" />
          <StatCard
            icon={BookOpen}
            label={`Courses (${data.publishedCourses} live)`}
            value={data.courses}
            tint="bg-sky-100 text-sky-600"
          />
          <StatCard icon={Ticket} label="Pending invites" value={data.pendingInvites} tint="bg-orange-100 text-orange-600" />
        </div>
      )}

      <div className="mt-8 space-y-4">
        <AtRiskList />
        <RemindersCard />
      </div>

      <h2 className="mt-10 mb-4 text-xl font-black">Quick actions</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/admin/courses?new=1" className="card transition hover:border-grape-300">
          <BookOpen className="mb-2 size-7 text-grape-500" />
          <p className="font-black">Build a course</p>
          <p className="text-sm font-semibold text-slate-400">Add modules and lessons step by step</p>
        </Link>
        <Link to="/admin/invites" className="card transition hover:border-grape-300">
          <Ticket className="mb-2 size-7 text-orange-500" />
          <p className="font-black">Invite a student</p>
          <p className="text-sm font-semibold text-slate-400">Share a link by email or WhatsApp</p>
        </Link>
        <Link to="/admin/courses?import=1" className="card transition hover:border-grape-300">
          <Sparkles className="mb-2 size-7 text-flame-500" />
          <p className="font-black">Create a course with Claude</p>
          <p className="text-sm font-semibold text-slate-400">Describe it, let Claude write it, import it in one go</p>
        </Link>
      </div>
    </>
  );
}
