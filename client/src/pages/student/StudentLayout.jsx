import { Link, NavLink, Outlet } from 'react-router';
import { Home, Trophy, UserRound } from 'lucide-react';
import { Logo } from '../../components/Mascot';
import NoticeModal from '../../components/NoticeModal';
import StatPills from '../../components/StatPills';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/learn', label: 'Learn', icon: Home, end: true },
  { to: '/learn/league', label: 'League', icon: Trophy },
  { to: '/learn/profile', label: 'Profile', icon: UserRound },
];

const navClass = ({ isActive }) =>
  `flex items-center gap-2 rounded-2xl px-3 py-2 font-extrabold transition ${
    isActive ? 'bg-neon-500/20 text-neon-300' : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
  }`;

export default function StudentLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-dvh pb-24 sm:pb-0">
      {user.role === 'admin' && (
        <div className="bg-night-800 px-4 py-2 text-center text-sm font-bold text-white">
          Student preview: lessons are all unlocked for you.{' '}
          <Link to="/admin" className="underline">
            Back to admin
          </Link>
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-white/10 glass-strong">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-2.5">
          <Link to="/learn" aria-label="Codelings home">
            <span className="hidden md:block">
              <Logo />
            </span>
            <span className="md:hidden">
              <Logo size={32} />
            </span>
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={navClass}>
                <Icon className="size-5" /> {label}
              </NavLink>
            ))}
          </nav>
          <StatPills user={user} />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <Outlet />
      </main>

      {/* Bottom tab bar on phones */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-white/10 glass-strong px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-xs font-extrabold ${isActive ? 'bg-neon-500/10 text-neon-300' : 'text-slate-400'}`
            }
          >
            <Icon className="size-6" />
            {label}
          </NavLink>
        ))}
      </nav>

      {user.role === 'student' && <NoticeModal />}
    </div>
  );
}
