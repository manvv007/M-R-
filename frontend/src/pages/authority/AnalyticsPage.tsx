import { useEffect, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import api from '../../services/api'
import { Card, SectionHeader } from '../../components/ui/Cards'

const PALETTE = ['#182646', '#6366F1', '#B42318', '#B9770E', '#067647', '#0EA5E9', '#94A3B8']

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    api.get('/api/analytics').then((r) => setData(r.data)).catch(() => {
      setData(fallback())
    })
  }, [])

  const violations = Object.entries(data?.violations_by_type || {}).map(([k, v]) => ({
    name: k.replace(/_/g, ' '), value: v as number,
  }))
  const hours = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, '0')}:00`,
    incidents: (data?.incidents_by_hour || {})[h] ?? Math.max(0, Math.round(
      2 + 3 * Math.sin((h - 7) / 3.5) ** 2 + 8 * Math.sin((h - 18) / 2.6) ** 2
    ))
  }))
  const avgDay = Object.entries(data?.avg_speed_by_day || {
    Mon: 21, Tue: 19, Wed: 18, Thu: 20, Fri: 16, Sat: 14, Sun: 26
  }).map(([d, v]) => ({ day: d, 'Avg Speed (km/h)': Number(v) }))

  const laneDur = Object.entries(data?.lane_blockage_duration || {}).map(([k, v]) => ({
    bucket: k, incidents: v as number,
  }))

  const parkFreq = Object.entries(data?.illegal_parking_frequency || {}).map(([k, v]) => ({
    corridor: k.length > 18 ? k.slice(0, 17) + '…' : k, incidents: v as number,
  }))

  const hotspotRanking = (data?.hotspot_ranking || []).slice(0, 8).map((h: any, i: number) => ({
    rank: i + 1,
    name: h.name?.length > 22 ? h.name.slice(0, 21) + '…' : (h.name || 'Hotspot'),
    incidents: h.incidents || 10,
  }))

  const resolution = Object.entries(data?.resolution_time || {}).map(([k, v]) => ({
    status: k, minutes: Number(v),
  }))

  const recurring = (data?.recurring_causes || [
    { cause: 'Left-turn lane blockage during peak', incidents: 96, peak: '6-9 PM' },
    { cause: 'Illegal on-carriageway parking near shops', incidents: 142, peak: '11 AM-2 PM' },
    { cause: 'Wrong-side driving at railway crossing', incidents: 43, peak: '8-10 AM' },
    { cause: 'Street vendor encroachment', incidents: 67, peak: '5-8 PM' },
  ]).map((r: any) => ({
    cause: r.cause.length > 34 ? r.cause.slice(0, 33) + '…' : r.cause,
    incidents: r.incidents, peak: r.peak
  }))

  const corridorReports = Object.entries(data?.reports_by_corridor || {
    'Sector 21 Market Road': 142, 'MG Road Boulevard': 88, 'Old Railway Road': 52,
  }).map(([k, v]) => ({ corridor: k.length > 20 ? k.slice(0, 19) + '…' : k, reports: v as number }))

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="Analytics"
        title="Corridor analytics — questions answered with data"
        subtitle="Every chart answers a specific traffic-management question. Demo / synthetic data."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="Violations by type"
          hint="What types of incidents dominate the backlog?">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={violations} dataKey="value" nameKey="name"
                outerRadius={90} innerRadius={40} paddingAngle={2}>
                {violations.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Incidents by hour"
          hint="When should enforcement be deployed?">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={hours} margin={{ top: 10, right: 10, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="#94A3B8" interval={2} />
              <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="incidents" stroke="#182646" strokeWidth={2.5}
                dot={{ r: 2 }} activeDot={{ r: 5 }} fill="#182646" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Average speed by day"
          hint="Is weekend traffic materially different?">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={avgDay} margin={{ top: 10, right: 10, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94A3B8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" domain={[0, 'auto']} />
              <Tooltip />
              <Bar dataKey="Avg Speed (km/h)" fill="#175CD3" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Lane blockage duration"
          hint="How long do turning-lane blockages last?">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={laneDur} margin={{ top: 10, right: 10, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="incidents" fill="#B9770E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Illegal parking by corridor"
          hint="Where are on-carriageway parking reports concentrated?">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={parkFreq} layout="vertical" margin={{ top: 10, right: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94A3B8" allowDecimals={false} />
              <YAxis type="category" dataKey="corridor" tick={{ fontSize: 11 }} stroke="#94A3B8" width={130} />
              <Tooltip />
              <Bar dataKey="incidents" fill="#6366F1" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Hotspot ranking"
          hint="Which junctions should we prioritize first?">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hotspotRanking} layout="vertical" margin={{ top: 10, right: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94A3B8" allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#94A3B8" width={140} />
              <Tooltip />
              <Bar dataKey="incidents" radius={[0, 6, 6, 0]}>
                {hotspotRanking.map((_: any, i: number) => (
                  <Cell key={i} fill={['#B42318', '#EA580C', '#B9770E', '#0EA5E9', '#175CD3', '#182646', '#067647', '#6366F1'][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Resolution time (median minutes)"
          hint="Which statuses slow down case closure?">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={resolution} margin={{ top: 10, right: 10, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <Tooltip />
              <Bar dataKey="minutes" fill="#067647" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Recurring causes"
          hint="What patterns produce the most incidents?">
          <div className="space-y-3">
            {recurring.map((r: any, i: number) => (
              <div key={i}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink-800 truncate">{r.cause}</span>
                  <span className="tabular-nums text-ink-500 ml-2 shrink-0">
                    {r.incidents} · {r.peak}
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-ink-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min(100, (r.incidents / 160) * 100)}%`,
                    background: PALETTE[i % PALETTE.length],
                  }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Reports by corridor"
          hint="Where are citizen reports most active?">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={corridorReports} dataKey="reports" nameKey="corridor"
                outerRadius={95} paddingAngle={3}>
                {corridorReports.map((_, i) => (
                  <Cell key={i} fill={['#182646', '#0EA5E9', '#6366F1'][i % 3]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

function ChartCard({ title, hint, children }: any) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="section-h">{title}</h3>
          <p className="text-xs text-ink-500 mt-0.5">{hint}</p>
        </div>
        <span className="chip bg-amber-50 text-amber-700 ring-1 ring-amber-100">DEMO</span>
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  )
}

function fallback() {
  return {
    violations_by_type: {
      LANE_BLOCKAGE: 96, ILLEGAL_PARKING: 142, WRONG_SIDE: 43,
      LANE_OBSTRUCTION: 67, DANGEROUS_DRIVING: 18, SIGNAL_VIOLATION: 26, OTHER: 12
    },
    lane_blockage_duration: { '0-10s': 18, '10-20s': 32, '20-30s': 29, '30+s': 17 },
    illegal_parking_frequency: {
      'Sector 21 Market Rd': 142, 'MG Road Boulevard': 88, 'Old Railway Rd': 52
    },
    hotspot_ranking: [
      { name: 'Sector 21 Market Jn', incidents: 96 },
      { name: 'Sector 21 Inner Circle', incidents: 84 },
      { name: 'MG Road Metro Jn', incidents: 82 },
      { name: 'Old Railway Crossing', incidents: 55 },
      { name: 'Sector 21 Corridor', incidents: 47 },
      { name: 'MG Road Galleria', incidents: 38 },
    ],
    resolution_time: { VERIFIED: 47, RESOLVED: 320, REJECTED: 22 },
    recurring_causes: [
      { cause: 'Left-turn lane blockage during peak', incidents: 96, peak: '6-9 PM' },
      { cause: 'Illegal on-carriageway parking near shops', incidents: 142, peak: '11 AM-2 PM' },
      { cause: 'Wrong-side driving at railway crossing', incidents: 43, peak: '8-10 AM' },
      { cause: 'Street vendor encroachment (Inner Circle)', incidents: 67, peak: '5-8 PM' },
    ],
    reports_by_corridor: {
      'Sector 21 Market Road': 142, 'MG Road Boulevard': 88, 'Old Railway Road': 52
    },
  }
}
