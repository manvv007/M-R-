import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { cn } from '../utils/format'
import { useAuth } from '../contexts/AuthContext'
import { useDemoMode } from '../contexts/DemoModeContext'
import { useNotifications } from '../contexts/NotificationsContext'
import { DemoRibbon } from './ui/Cards'
import { StatusBadge } from './ui/Badges'

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 40 40" className="shrink-0" aria-hidden>
        <defs>
          <linearGradient id="rw" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#182646" />
            <stop offset="100%" stopColor="#0A1226" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="40" height="40" rx="10" fill="url(#rw)" />
        <path d="M12 27V14l6 6V14h4v13h-4l-6-6v6z" fill="white" opacity="0.95" />
        <circle cx="29" cy="27" r="3" fill="#F59E0B" />
      </svg>
      <div className="leading-tight">
        <div className="font-extrabold tracking-tight text-ink-900 text-[17px]">
          RoadWatch
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">
          Smart Traffic AI
        </div>
      </div>
    </div>
  )
}

function PublicHeader() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const { demoMode, toggleDemoMode } = useDemoMode()
  const { unreadCount } = useNotifications()
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-ink-100">
      {demoMode && <DemoRibbon />}
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link to="/" className="shrink-0"><LogoMark /></Link>
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-ink-700">
          <a href="/#how" className="hover:text-navy-800">How it works</a>
          <a href="/#monitor" className="hover:text-navy-800">What we monitor</a>
          <a href="/#why" className="hover:text-navy-800">Why RoadWatch</a>
        </nav>
        <div className="flex items-center gap-2">
          <button
            className={cn(
              'hidden sm:inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition',
              demoMode
                ? 'bg-accent-amberSoft text-accent-amber border-amber-200 hover:bg-amber-50'
                : 'bg-white text-ink-600 border-ink-200 hover:bg-ink-50'
            )}
            onClick={toggleDemoMode}
            title="Toggle demo data"
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', demoMode ? 'bg-amber-500 pulse-alert' : 'bg-ink-300')} />
            {demoMode ? 'DEMO ON' : 'DEMO OFF'}
          </button>
          {user ? (
            <>
              {user.role === 'citizen' && (
                <Link to="/report" className="btn-primary">
                  Report Issue
                </Link>
              )}
              {(user.role === 'authority' || user.role === 'admin') && (
                <Link to="/dashboard" className="btn-primary">
                  Control Center
                </Link>
              )}
              <div className="relative ml-1">
                <Link to="/my-reports" className="btn-ghost relative">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinecap="round" />
                    <path d="M10 21a2 2 0 0 0 4 0" strokeLinecap="round" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-accent-red text-white text-[10px] font-bold grid place-items-center ring-2 ring-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              </div>
              <button
                className="btn-ghost"
                onClick={() => { logout(); nav('/') }}
                title={`${user.full_name} — ${user.role}`}
              >
                <div className="hidden sm:flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-navy-800 text-white grid place-items-center text-xs font-bold">
                    {user.full_name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium">Sign out</span>
                </div>
                <span className="sm:hidden">Sign out</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Sign in</Link>
              <Link to="/report" className="btn-primary">Report Issue</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="container-page py-10 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <LogoMark />
          <p className="mt-4 max-w-md text-sm text-ink-600 leading-relaxed">
            RoadWatch is an AI-assisted decision-support prototype for Indian traffic authorities.
            It does not automatically issue challans. Final enforcement decisions remain with
            authorized officials.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink-50 px-3 py-1 text-[11px] font-semibold text-ink-600 ring-1 ring-ink-200">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
            Privacy-first architecture · Synthetic demo data · Authority review required
          </div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-ink-500">For Citizens</div>
          <ul className="mt-3 space-y-2 text-sm text-ink-700">
            <li><Link to="/report" className="hover:text-navy-800">Report a road issue</Link></li>
            <li><Link to="/register" className="hover:text-navy-800">Create account</Link></li>
            <li><Link to="/my-reports" className="hover:text-navy-800">Track my reports</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-ink-500">For Authorities</div>
          <ul className="mt-3 space-y-2 text-sm text-ink-700">
            <li><Link to="/login" className="hover:text-navy-800">Control Center login</Link></li>
            <li><Link to="/dashboard/analytics" className="hover:text-navy-800">Corridor analytics</Link></li>
            <li><Link to="/dashboard/hotspots" className="hover:text-navy-800">Hotspot map</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-100">
        <div className="container-page flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 py-5 text-xs text-ink-500">
          <div>© {new Date().getFullYear()} RoadWatch — Built for Smart India Hackathon 2026.</div>
          <div className="flex items-center gap-5">
            <span>Prototype · v1.0.0</span>
            <StatusBadge status="UNDER_REVIEW" size="sm" />
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function AppLayout() {
  const loc = useLocation()
  const isDashboard = loc.pathname.startsWith('/dashboard')
  if (isDashboard) {
    return <DashboardShell />
  }
  return (
    <div className="flex min-h-full flex-col bg-ink-50">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function DashboardShell() {
  const nav = useNavigate()
  const loc = useLocation()
  const { user, logout } = useAuth()
  const { demoMode } = useDemoMode()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [notifOpen, setNotifOpen] = useState(false)

  const links = [
    { id: 'overview',     to: '/dashboard',              label: 'Overview',       icon: 'home' },
    { id: 'live',         to: '/dashboard/live',         label: 'Live Monitoring',icon: 'live' },
    { id: 'incidents',    to: '/dashboard/incidents',    label: 'Incidents',      icon: 'alert' },
    { id: 'reports',      to: '/dashboard/reports',      label: 'Citizen Reports',icon: 'users' },
    { id: 'hotspots',     to: '/dashboard/hotspots',     label: 'Hotspots',       icon: 'fire' },
    { id: 'corridors',    to: '/dashboard/corridors',    label: 'Corridors',      icon: 'road' },
    { id: 'analytics',    to: '/dashboard/analytics',    label: 'Analytics',      icon: 'chart' },
    { id: 'interventions',to: '/dashboard/interventions',label: 'Interventions',  icon: 'plan' },
    { id: 'audit',        to: '/dashboard/audit-log',    label: 'Audit Log',      icon: 'log' },
    { id: 'settings',     to: '/dashboard/settings',     label: 'Settings',       icon: 'gear' },
  ]

  const active = links.find((l) =>
    l.to === '/dashboard' ? loc.pathname === '/dashboard' : loc.pathname.startsWith(l.to)
  )?.id

  function Icon({ name }: { name: string }) {
    const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
    switch (name) {
      case 'home':   return <svg {...common}><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /></svg>
      case 'live':   return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M5 12a7 7 0 0 1 14 0" /><path d="M2 12a10 10 0 0 1 20 0" /></svg>
      case 'alert':  return <svg {...common}><path d="M12 3 2 20h20z" /><path d="M12 10v5M12 18h.01" /></svg>
      case 'users':  return <svg {...common}><circle cx="9" cy="9" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><circle cx="17" cy="9" r="2.5" /><path d="M15 15c4 0 6 2 6 5" /></svg>
      case 'fire':   return <svg {...common}><path d="M12 3s5 6 5 10a5 5 0 0 1-10 0c0-2 1-3 1-3s-1 2 2 3c0-3 0-5 2-8z" /></svg>
      case 'road':   return <svg {...common}><path d="M4 3 7 21M20 3 17 21" /><path d="M12 5v2M12 11v2M12 17v2" /></svg>
      case 'chart':  return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
      case 'plan':   return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 9h8M8 13h5M8 17h8" /></svg>
      case 'log':    return <svg {...common}><path d="M5 4h11l3 3v13H5z" /><path d="M9 11h7M9 15h7" /></svg>
      case 'gear':   return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.7 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
      default: return null
    }
  }

  const Sidebar = (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-navy-900 text-white">
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/5">
        <Link to="/dashboard">
          <div className="flex items-center gap-2.5">
            <svg width="30" height="30" viewBox="0 0 40 40" aria-hidden>
              <rect x="0" y="0" width="40" height="40" rx="10" fill="#182646" stroke="white" strokeOpacity="0.10" />
              <path d="M12 27V14l6 6V14h4v13h-4l-6-6v6z" fill="white" opacity="0.95" />
              <circle cx="29" cy="27" r="3" fill="#F59E0B" />
            </svg>
            <div className="leading-tight">
              <div className="font-extrabold tracking-tight text-white text-[15px]">RoadWatch</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">Control Center</div>
            </div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
          Operations
        </div>
        {links.map((l) => (
          <Link
            key={l.id}
            to={l.to}
            onClick={() => setMobileOpen(false)}
            className={cn('sidebar-link', active === l.id && 'active')}
          >
            <Icon name={l.icon} />
            <span className="truncate">{l.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-white/5">
        <Link to="/" className="sidebar-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 12h13M11 6l-6 6 6 6M21 5v14" />
          </svg>
          <span>Public site</span>
        </Link>
      </div>
    </aside>
  )

  return (
    <div className="min-h-full flex bg-ink-50">
      {Sidebar}
      <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileOpen(false)} style={{ display: mobileOpen ? 'block' : 'none' }}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute left-0 top-0 h-full w-72" onClick={(e) => e.stopPropagation()}>{Sidebar}</div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-ink-100">
          {demoMode && <DemoRibbon text="CONTROL CENTER · DEMO MODE — SYNTHETIC DATA" />}
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              className="lg:hidden btn-ghost -ml-2 !p-2"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-ink-400">
                RoadWatch Control Center
              </div>
              <div className="truncate text-[15px] font-bold text-ink-900">
                {links.find((l) => l.id === active)?.label || 'Overview'}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <Link to="/dashboard/live" className="btn-ghost hidden sm:inline-flex">
                <span className="inline-flex h-2 w-2 rounded-full bg-accent-red pulse-alert" />
                Live
              </Link>
              <div className="relative">
                <button
                  className="btn-ghost relative"
                  onClick={() => setNotifOpen((v) => !v)}
                  aria-label="Notifications"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinecap="round" />
                    <path d="M10 21a2 2 0 0 0 4 0" strokeLinecap="round" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-accent-red text-white text-[10px] font-bold grid place-items-center ring-2 ring-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-[340px] max-w-[calc(100vw-2rem)] card p-0 overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100">
                      <div className="text-sm font-bold text-ink-900">Notifications</div>
                      <button className="text-xs font-semibold text-navy-700 hover:underline" onClick={markAllRead}>
                        Mark all read
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-10 text-sm text-ink-500 text-center">No notifications yet.</div>
                      ) : (
                        notifications.slice(0, 12).map((n) => (
                          <button
                            key={n.id}
                            onClick={() => { markRead(n.id); setNotifOpen(false); if (n.incident_id) nav(`/dashboard/incidents/${n.incident_id}`) }}
                            className={cn(
                              'block w-full text-left px-4 py-3 border-b border-ink-50 hover:bg-ink-50 transition',
                              !n.is_read && 'bg-accent-blueSoft/40'
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ background: n.is_read ? '#CBD5E1' : '#175CD3' }} />
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-ink-900">{n.title}</div>
                                {n.body && <div className="mt-0.5 text-xs text-ink-500 line-clamp-2">{n.body}</div>}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="h-9 w-9 ml-1 rounded-full bg-navy-800 text-white grid place-items-center text-xs font-bold ring-2 ring-white">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-xs leading-tight">
                <div className="font-bold text-ink-900">{user?.full_name}</div>
                <div className="text-ink-500 uppercase tracking-wider text-[10px]">{user?.role}</div>
              </div>
              <button className="btn-ghost" onClick={() => { logout(); nav('/') }} title="Sign out">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="m16 17 5-5-5-5M21 12H9" />
                </svg>
              </button>
            </div>
          </div>
        </header>
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
