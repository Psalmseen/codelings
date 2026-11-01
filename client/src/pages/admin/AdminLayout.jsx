import { NavLink, Outlet } from 'react-router';
import { BookOpen, LayoutDashboard, LogOut, Ticket, Users } from 'lucide-react';
import { Logo } from '../../components/Mascot';
import ThemeSwitch from '../../components/ThemeSwitch';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/invites', label: 'Invites', icon: Ticket },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="border-b border-tint/10 glass-strong lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:border-r-2 lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-4 lg:px-5">
          <Logo admin />
          <div className="flex gap-1 lg:hidden">
            <ThemeSwitch compact />
            <button className="icon-btn" onClick={logout} aria-label="Sign out">
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 font-extrabold transition ${
                  isActive ? 'bg-neon-500/20 text-neon-300 light:text-neon-700 ring-2 ring-neon-400/30' : 'text-ink-muted hover:bg-tint/10'
                }`
              }
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t-2 border-tint/5 p-4 lg:block">
          <p className="truncate font-extrabold">{user.name}</p>
          <p className="mb-3 truncate text-sm font-semibold text-ink-muted">{user.email}</p>
          <div className="mb-3">
            <ThemeSwitch />
          </div>
          <button className="btn btn-secondary btn-sm w-full" onClick={logout}>
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
