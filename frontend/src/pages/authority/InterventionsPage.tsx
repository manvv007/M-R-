import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { Card, SectionHeader, StatusBadge as SBadge } from '../../components/ui/Cards'
import { SeverityBadge } from '../../components/ui/Badges'
import { cn } from '../../utils/format'

const STATUS_TABS: Record<string, string> = {
  SUGGESTED: 'Suggested',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  IMPLEMENTED: 'Implemented',
}

export default function InterventionsPage() {
  const [items, setItems] = useState<any[]>([])
  const [tab, setTab] = useState<string>('ALL')

  useEffect(() => {
    api.get('/api/interventions').then((r) => setItems(r.data)).catch(() => {
      setItems([
        { id: 1, problem_type: 'LANE_BLOCKAGE', title: 'Peak-hour left-turn lane enforcement at Sector 21 Junction',
          description: '96 recorded incidents of left-turn lane blockage during 6-9 PM peak.',
          evidence_count: 96, peak_hours: '6 PM – 9 PM',
          suggested_action: 'Deploy one traffic constable to left-turn lane approach during 6-9 PM on weekdays.',
          potential_impact: 'Expected 40-50% reduction in lane blockage incidents and improved lane utilization.',
          priority: 'HIGH', status: 'SUGGESTED', estimated_speed_before: 12, estimated_speed_after: 24 },
        { id: 2, problem_type: 'ILLEGAL_PARKING',
          title: 'Parking and loading zone management near Sector 21 shops',
          description: '142 illegal parking reports concentrated near commercial frontage.',
          evidence_count: 142, peak_hours: '11 AM – 2 PM, 5 PM – 8 PM',
          suggested_action: 'Designate a 15-minute loading zone on the service lane and deploy tow-van patrol during peak.',
          potential_impact: 'Reduced on-carriageway parking and improved effective lane width.',
          priority: 'HIGH', status: 'UNDER_REVIEW', estimated_speed_before: 14, estimated_speed_after: 22 },
        { id: 3, problem_type: 'WRONG_SIDE',
          title: 'Wrong-side deterrence at Old Railway Road corridor',
          description: '43 wrong-side incidents causing near-misses at railway crossing approach.',
          evidence_count: 43, peak_hours: '8 AM – 10 AM, 6 PM – 8 PM',
          suggested_action: 'Review physical dividers on corridor and place signages; targeted challan drive for 1 week.',
          potential_impact: 'Reduced accident risk and smoother opposing flow.',
          priority: 'MEDIUM', status: 'SUGGESTED', estimated_speed_before: 16, estimated_speed_after: 25 },
        { id: 4, problem_type: 'LANE_OBSTRUCTION',
          title: 'Vending-zone relocation at Sector 21 Inner Circle',
          description: '67 reports of street vendors occupying carriageway near vegetable market.',
          evidence_count: 67, peak_hours: '5 PM – 8 PM',
          suggested_action: 'Designate off-carriageway vending zone and cordon-off approach with bollards.',
          potential_impact: 'Lane width restored; reduced pedestrian-vehicle conflict.',
          priority: 'MEDIUM', status: 'APPROVED', estimated_speed_before: 15, estimated_speed_after: 23 },
      ])
    })
  }, [])

  const filtered = tab === 'ALL' ? items : items.filter((i) => i.status === tab)

  async function updateStatus(id: number, status: string) {
    try {
      await api.post(`/api/interventions/${id}/status?status=${status}`)
    } catch {}
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)))
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="Recommended Interventions"
        title="Evidence-based, prioritized actions for traffic authorities"
        subtitle="Generated from recurring incident patterns. AI recommendation — authority review required."
      />

      <div className="flex flex-wrap gap-2">
        <TabBtn label="All" active={tab === 'ALL'} onClick={() => setTab('ALL')} count={items.length} />
        {Object.entries(STATUS_TABS).map(([k, label]) => (
          <TabBtn key={k} label={label} active={tab === k} onClick={() => setTab(k)}
            count={items.filter(i => i.status === k).length} />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {filtered.map((it) => (
          <Card key={it.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={it.priority} size="sm" />
                  <SBadge status={it.status} size="sm" />
                  <span className="chip bg-navy-50 text-navy-700 ring-1 ring-navy-100">
                    {String(it.problem_type || '').replace(/_/g, ' ')}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-bold text-ink-900 leading-snug">{it.title}</h3>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Evidence</div>
                <div className="text-xl font-extrabold tabular-nums text-ink-900">{it.evidence_count}</div>
                {it.peak_hours && (
                  <div className="text-[11px] text-ink-500 mt-0.5">Peak: {it.peak_hours}</div>
                )}
              </div>
            </div>
            <p className="mt-3 text-sm text-ink-600">{it.description}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-accent-greenSoft/60 p-4 ring-1 ring-accent-green/20">
                <div className="text-[11px] font-bold uppercase tracking-wider text-accent-green">Suggested Action</div>
                <div className="mt-1 text-sm font-semibold text-ink-900 leading-snug">{it.suggested_action}</div>
              </div>
              <div className="rounded-xl bg-navy-50 p-4 ring-1 ring-navy-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-navy-700">Potential Impact</div>
                <div className="mt-1 text-sm text-ink-800 leading-snug">{it.potential_impact}</div>
                {(it.estimated_speed_before || it.estimated_speed_after) && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Before</div>
                      <div className="text-lg font-extrabold text-ink-900 tabular-nums">
                        {it.estimated_speed_before}<span className="text-[11px] ml-0.5 font-semibold text-ink-500">km/h</span>
                      </div>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#067647" strokeWidth="2" strokeLinecap="round">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-accent-green">Est. After</div>
                      <div className="text-lg font-extrabold tabular-nums text-accent-green">
                        {it.estimated_speed_after}<span className="text-[11px] ml-0.5 font-semibold opacity-80">km/h</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-ink-100">
              {(['UNDER_REVIEW', 'APPROVED', 'IMPLEMENTED'] as const).map((next) => {
                const same = it.status === next
                return (
                  <button key={next}
                    onClick={() => updateStatus(it.id, next)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition',
                      same
                        ? 'bg-navy-800 text-white ring-navy-800'
                        : 'bg-white text-ink-700 ring-ink-200 hover:bg-ink-50'
                    )}>
                    {next.replace(/_/g, ' ')}
                  </button>
                )
              })}
              <Link to="/dashboard/corridors/1/cause" className="ml-auto btn-ghost !py-1.5 text-xs">
                View corridor cause analysis →
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function TabBtn({ label, count, active, onClick }: any) {
  return (
    <button onClick={onClick} className={cn(
      'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition',
      active
        ? 'bg-navy-800 text-white shadow-sm'
        : 'bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50'
    )}>
      {label}
      {typeof count === 'number' && (
        <span className={cn(
          'rounded-full px-2 py-0.5 text-[11px] font-bold',
          active ? 'bg-white/15 text-white' : 'bg-ink-100 text-ink-600'
        )}>
          {count}
        </span>
      )}
    </button>
  )
}
