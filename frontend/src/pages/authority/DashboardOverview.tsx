import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { Card, SectionHeader, StatCard } from '../../components/ui/Cards'
import { PriorityMeter, SeverityBadge, SourceBadge, StatusBadge, TypeBadge } from '../../components/ui/Badges'
import { timeAgo, INCIDENT_TYPES } from '../../utils/format'

interface Stats {
  active_incidents: number
  lane_blockages: number
  illegal_parking_reports: number
  high_risk_hotspots: number
  avg_traffic_speed: number
  demo_mode: boolean
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [activities, setActivities] = useState<any[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get('/api/dashboard/stats'),
      api.get('/api/dashboard/activities'),
    ]).then(([s, a]) => {
      setStats(s.data); setActivities(a.data.items || [])
    }).catch((e) => setErr(e?.message || 'Unable to load dashboard'))
  }, [])

  return (
    <div className="space-y-8">
      <SectionHeader
        kicker="RoadWatch Control Center"
        title="Sector 21 Market Road — Live Overview"
        subtitle="Recurring-cause analytics and priority triage for Indian urban corridors."
        actions={
          <>
            <Link to="/dashboard/live" className="btn-secondary">
              <span className="h-2 w-2 rounded-full bg-accent-red pulse-alert" />
              Live Monitoring
            </Link>
            <Link to="/dashboard/incidents" className="btn-primary">
              Open Incidents
            </Link>
          </>
        }
      />

      {err && (
        <Card className="text-accent-red">
          <p className="font-semibold">{err}</p>
          <p className="mt-1 text-sm text-ink-500">
            Backend offline — frontend falls back to cached/mock views in demo.
          </p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Active Incidents"
          value={stats?.active_incidents ?? '—'}
          tone="navy"
          sub="Submitted · AI Processing · Under Review"
          trend={{ up: true, value: '+12%', label: ' vs yesterday' }}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 3 2 20h20z" /><path d="M12 10v5M12 18h.01" /></svg>}
        />
        <StatCard
          label="Lane Blockages"
          value={stats?.lane_blockages ?? '—'}
          tone="warn"
          sub="Turning-lane occupancy during green"
          trend={{ up: true, value: '+4', label: ' in last 2h' }}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 3 7 21M20 3 17 21" /><path d="M12 5v2M12 11v2M12 17v2" /></svg>}
        />
        <StatCard
          label="Illegal Parking Reports"
          value={stats?.illegal_parking_reports ?? '—'}
          tone="violet"
          sub="Citizen + AI detections"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M8 9h3v6H8zM14 9h3v6h-3z" /></svg>}
        />
        <StatCard
          label="High-Risk Hotspots"
          value={stats?.high_risk_hotspots ?? '—'}
          tone="danger"
          sub="HIGH / CRITICAL severity only"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 3s5 6 5 10a5 5 0 0 1-10 0c0-2 1-3 1-3s-1 2 2 3c0-3 0-5 2-8z" /></svg>}
        />
        <StatCard
          label="Avg Traffic Speed"
          value={stats ? <>{stats.avg_traffic_speed} <span className="text-base font-semibold text-ink-500">km/h</span></> : '—'}
          tone="success"
          sub="Corridor-weighted · last 24 hours"
          trend={{ up: false, value: '−3 km/h', label: ' during peak' }}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 12h4l2-5 6 10 2-5h4" /></svg>}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="section-h">Recent activity feed</h3>
              <p className="text-sm text-ink-500 mt-0.5">
                AI-detected incidents and citizen-submitted reports, newest first.
              </p>
            </div>
            <Link to="/dashboard/incidents" className="btn-ghost text-sm">View all →</Link>
          </div>
          <div className="mt-5 divide-y divide-ink-100 rounded-xl ring-1 ring-black/5 bg-white overflow-hidden">
            {(activities || []).slice(0, 8).map((a: any, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-ink-50 transition">
                <div className="shrink-0">
                  <TypeBadge type={a.type} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                    <Link to={`/dashboard/incidents/${a.id}`} className="truncate hover:underline">
                      {a.case_number} — {INCIDENT_TYPES[a.type as keyof typeof INCIDENT_TYPES] || a.type}
                    </Link>
                    <SeverityBadge severity={a.severity} size="sm" />
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                    <SourceBadge source={a.source} />
                    <span>· {a.location}</span>
                    <span>· {timeAgo(a.detected_at)}</span>
                  </div>
                </div>
                <div className="hidden md:block w-40 shrink-0">
                  <PriorityMeter score={a.priority_score ?? 50} size="sm" />
                </div>
                <div className="hidden sm:block shrink-0">
                  <StatusBadge status={a.status} size="sm" />
                </div>
              </div>
            ))}
            {!activities?.length && (
              <div className="px-4 py-10 text-sm text-ink-500 text-center">No recent activity.</div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="section-h">At a glance</h3>
          <p className="text-sm text-ink-500 mt-0.5">Why Sector 21 is congested today.</p>
          <div className="mt-5 space-y-4">
            {[
              ['Lane Blockage', 41, 'Left-turn approach blocked 6–9 PM', 'bg-navy-50 text-navy-700'],
              ['Illegal Parking', 34, 'Near commercial frontage', 'bg-violet-50 text-violet-700'],
              ['Wrong-Side Driving', 16, 'Railway-road approach', 'bg-rose-50 text-rose-700'],
              ['Other (signals, events)', 9, 'Mixed recurring factors', 'bg-ink-100 text-ink-700'],
            ].map(([label, pct, hint, cls]: any) => (
              <div key={label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-ink-800">{label}</span>
                  <span className="font-bold tabular-nums text-ink-600">{pct}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-ink-100 overflow-hidden">
                  <div className={cls.split(' ')[0] + ' h-full rounded-full'} style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-ink-500">{hint}</div>
              </div>
            ))}
          </div>
          <Link to="/dashboard/corridors/1/cause" className="btn-secondary w-full mt-6">
            View full congestion analysis
          </Link>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="section-h">Primary Cause · Sector 21 Junction</h3>
            <SeverityBadge severity="HIGH" />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-accent-amberSoft p-4 ring-1 ring-accent-amber/15">
              <div className="text-xs font-bold uppercase tracking-wider text-accent-amber">Current Speed</div>
              <div className="mt-1 text-2xl font-extrabold text-ink-900">14 <span className="text-sm font-semibold text-ink-500">km/h</span></div>
              <div className="mt-1 text-[11px] text-ink-500">Expected 30 km/h</div>
            </div>
            <div className="rounded-xl bg-navy-50 p-4 ring-1 ring-navy-100">
              <div className="text-xs font-bold uppercase tracking-wider text-navy-700">Primary Cause</div>
              <div className="mt-1 text-sm font-bold leading-snug text-ink-900">
                Dedicated left-turn lane blocked during peak hours
              </div>
              <div className="mt-2 text-[11px] text-ink-500">7 vehicles · 21 s · 84% occupancy</div>
            </div>
            <div className="rounded-xl bg-accent-greenSoft p-4 ring-1 ring-accent-green/20">
              <div className="text-xs font-bold uppercase tracking-wider text-accent-green">Suggested Intervention</div>
              <div className="mt-1 text-sm font-bold leading-snug text-ink-900">
                Targeted enforcement during peak hours
              </div>
              <div className="mt-2 text-[11px] text-ink-500">6 PM – 9 PM · Mon–Sat</div>
            </div>
          </div>
          <div className="mt-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
              AI-generated recommendation — authority review required.
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h3 className="section-h">Traffic Improvement Simulation</h3>
            <span className="chip bg-ink-100 text-ink-700 ring-1 ring-ink-200">
              SIMULATED / ESTIMATED IMPACT
            </span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-5 ring-1 ring-red-100">
              <div className="text-xs font-bold uppercase tracking-wider text-accent-red">Current Situation</div>
              <ul className="mt-3 space-y-2 text-sm text-ink-700">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent-red" /> Parked vehicles on carriageway</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent-red" /> Blocked dedicated left-turn lane</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent-red" /> Congested stop-and-go flow</li>
              </ul>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Avg Speed</div>
                  <div className="text-2xl font-extrabold text-ink-900">12<span className="text-sm font-semibold text-ink-500 ml-1">km/h</span></div>
                </div>
                <SeverityBadge severity="HIGH" />
              </div>
            </div>
            <div className="rounded-xl bg-white p-5 ring-1 ring-emerald-100">
              <div className="text-xs font-bold uppercase tracking-wider text-accent-green">After Intervention</div>
              <ul className="mt-3 space-y-2 text-sm text-ink-700">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent-green" /> Cleared turning-lane approach</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent-green" /> Reduced on-carriageway parking</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent-green" /> Better movement &amp; throughput</li>
              </ul>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Est. Avg Speed</div>
                  <div className="text-2xl font-extrabold text-ink-900">24<span className="text-sm font-semibold text-ink-500 ml-1">km/h</span></div>
                </div>
                <SeverityBadge severity="MEDIUM" />
              </div>
            </div>
          </div>
          <Link to="/dashboard/interventions" className="btn-secondary w-full mt-5">
            Review all recommended interventions
          </Link>
        </Card>
      </div>
    </div>
  )
}
