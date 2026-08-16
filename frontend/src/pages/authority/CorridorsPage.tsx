import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { Card, SectionHeader, StatCard } from '../../components/ui/Cards'
import { SeverityBadge } from '../../components/ui/Badges'
import { cn } from '../../utils/format'

export default function CorridorsPage() {
  const [list, setList] = useState<any[]>([])
  useEffect(() => {
    api.get('/api/corridors')
      .then((r) => setList(r.data))
      .catch(() => {
        setList([
          { id: 1, name: 'Sector 21 Market Road', avg_speed: 14, expected_speed: 30,
            peak_congestion: '6 PM - 9 PM', illegal_parking_count: 142, lane_blockage_count: 96,
            wrong_side_count: 43, recurring_cause: 'Illegal parking near commercial frontage.',
            recommended_action: 'Evaluate parking/loading zones and targeted enforcement.',
            congestion_level: 'HIGH' },
          { id: 2, name: 'MG Road Boulevard', avg_speed: 22, expected_speed: 40,
            peak_congestion: '6 PM - 8 PM', illegal_parking_count: 88, lane_blockage_count: 74,
            wrong_side_count: 21, recurring_cause: 'Left-turn lane blockage near Metro junction.',
            recommended_action: 'Peak-time deployment on turning-lane approaches.',
            congestion_level: 'MEDIUM' },
          { id: 3, name: 'Old Railway Road', avg_speed: 16, expected_speed: 25,
            peak_congestion: '8 AM - 10 AM, 6 PM - 8 PM', illegal_parking_count: 52,
            lane_blockage_count: 31, wrong_side_count: 43,
            recurring_cause: 'Wrong-side driving and encroachment at crossing.',
            recommended_action: 'Divider review + signages + targeted challan drive.',
            congestion_level: 'HIGH' },
        ])
      })
  }, [])
  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="Corridor Health"
        title="Corridor health overview"
        subtitle="A corridor-level view of recurring congestion patterns and recommended interventions."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {list.map((c) => (
          <StatCard
            key={c.id}
            label={`Avg Speed · ${c.name.split(' ').slice(0, 2).join(' ')}`}
            value={<>{c.avg_speed}<span className="text-sm text-ink-500 font-semibold ml-1">km/h</span></>}
            sub={`Expected ${c.expected_speed} km/h · Peak: ${c.peak_congestion}`}
            tone={c.congestion_level === 'HIGH' ? 'danger' : c.congestion_level === 'MEDIUM' ? 'warn' : 'success'}
            trend={{ up: c.avg_speed > c.expected_speed * 0.66, value: `${Math.round((1 - c.avg_speed / c.expected_speed) * -100)}% vs expected` }}
          />
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => (
          <Card key={c.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="kicker">Corridor #{c.id}</div>
                <h3 className="mt-1 text-lg font-bold text-ink-900 tracking-tight">{c.name}</h3>
              </div>
              <SeverityBadge severity={c.congestion_level} />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-violet-50 p-3 ring-1 ring-violet-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-violet-700">Illegal Parking</div>
                <div className="mt-1 text-xl font-extrabold tabular-nums text-violet-800">{c.illegal_parking_count}</div>
              </div>
              <div className="rounded-xl bg-navy-50 p-3 ring-1 ring-navy-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-navy-700">Lane Blockage</div>
                <div className="mt-1 text-xl font-extrabold tabular-nums text-navy-800">{c.lane_blockage_count}</div>
              </div>
              <div className="rounded-xl bg-rose-50 p-3 ring-1 ring-rose-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Wrong-Side</div>
                <div className="mt-1 text-xl font-extrabold tabular-nums text-rose-800">{c.wrong_side_count}</div>
              </div>
            </div>

            <div className="mt-5 space-y-3 flex-1">
              <div className="rounded-xl bg-accent-amberSoft p-3.5 ring-1 ring-accent-amber/15">
                <div className="text-[10px] font-bold uppercase tracking-wider text-accent-amber">Recurring Cause</div>
                <div className="mt-1 text-sm font-semibold text-ink-900 leading-snug">{c.recurring_cause}</div>
              </div>
              <div className="rounded-xl bg-accent-greenSoft p-3.5 ring-1 ring-accent-green/20">
                <div className="text-[10px] font-bold uppercase tracking-wider text-accent-green">Recommended Action</div>
                <div className="mt-1 text-sm font-semibold text-ink-900 leading-snug">{c.recommended_action}</div>
              </div>
            </div>

            <Link
              to={`/dashboard/corridors/${c.id}/cause`}
              className="btn-secondary mt-5 w-full"
            >
              View congestion analysis →
            </Link>
          </Card>
        ))}
      </div>
    </div>
  )
}
