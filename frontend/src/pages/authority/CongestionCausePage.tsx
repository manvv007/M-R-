import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../services/api'
import { Card, SectionHeader, Disclaimer } from '../../components/ui/Cards'
import { SeverityBadge } from '../../components/ui/Badges'

export default function CongestionCausePage() {
  const { id } = useParams()
  const corridorId = Number(id) || 1
  const [data, setData] = useState<any>(null)
  const [corridor, setCorridor] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      api.get(`/api/congestion-cause/${corridorId}`),
      api.get('/api/corridors').catch(() => ({ data: [] })),
    ]).then(([cause, cor]) => {
      setData(cause.data)
      const corridorList = Array.isArray(cor.data) ? cor.data : []
      setCorridor(corridorList.find((c: any) => c.id === corridorId) || { name: cause.data.corridor_name })
    }).catch(() => {
      setData({
        corridor_name: 'Sector 21 Market Road', current_speed: 14, expected_speed: 30,
        congestion_level: 'HIGH',
        cause_breakdown: { 'Lane Blockage': 41, 'Illegal Parking': 34, 'Wrong-Side Driving': 16, 'Other': 9 },
        primary_cause: 'Dedicated left-turn lane blocked during peak hours.',
        suggested_intervention: 'Targeted enforcement during peak hours.',
      })
      setCorridor({ name: 'Sector 21 Market Road' })
    })
  }, [corridorId])

  if (!data) return <Card>Loading congestion analysis…</Card>

  const breakdown = Object.entries(data.cause_breakdown || {}) as [string, number][]
  const palette: Record<string, string> = {
    'Lane Blockage': '#182646',
    'Illegal Parking': '#6366F1',
    'Wrong-Side Driving': '#B42318',
    'Other': '#94A3B8',
  }
  const total = breakdown.reduce((s, [, v]) => s + Number(v), 0) || 1
  const before = Math.round(data.current_speed)
  const after = Math.min(data.expected_speed, Math.round(before * 1.8))

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="Congestion Cause Analysis"
        title={`Why Is ${data.corridor_name} Congested?`}
        subtitle="A breakdown of the root causes contributing to the observed corridor speed deficit."
        actions={
          <>
            <Link to="/dashboard/corridors" className="btn-ghost">← All corridors</Link>
            <Link to="/dashboard/interventions" className="btn-primary">View interventions</Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-accent-redSoft p-4 ring-1 ring-accent-red/15">
              <div className="text-[11px] font-bold uppercase tracking-wider text-accent-red">Current Speed</div>
              <div className="mt-1 flex items-end gap-2">
                <div className="text-3xl font-extrabold tabular-nums text-ink-900">{Number(data.current_speed).toFixed(1)}</div>
                <div className="pb-1 text-sm font-semibold text-ink-500">km/h</div>
              </div>
            </div>
            <div className="rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Expected Speed</div>
              <div className="mt-1 flex items-end gap-2">
                <div className="text-3xl font-extrabold tabular-nums text-ink-900">{data.expected_speed}</div>
                <div className="pb-1 text-sm font-semibold text-ink-500">km/h</div>
              </div>
            </div>
            <div className="rounded-xl bg-accent-amberSoft p-4 ring-1 ring-accent-amber/20">
              <div className="text-[11px] font-bold uppercase tracking-wider text-accent-amber">Congestion Level</div>
              <div className="mt-1.5"><SeverityBadge severity={data.congestion_level} /></div>
            </div>
          </div>

          <div>
            <h3 className="section-h">Cause breakdown</h3>
            <p className="mt-1 text-sm text-ink-500">
              Proportional attribution of the speed deficit across contributing causes.
            </p>
            <div className="mt-4 space-y-4">
              {breakdown.map(([k, v]) => {
                const pct = (Number(v) / total) * 100
                return (
                  <div key={k}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-md" style={{ background: palette[k] || '#64748B' }} />
                        <span className="font-semibold text-ink-900">{k}</span>
                      </div>
                      <span className="font-bold tabular-nums text-ink-700">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="mt-1.5 h-2.5 w-full rounded-full bg-ink-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: palette[k] || '#64748B' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-navy-50 p-5 ring-1 ring-navy-100">
              <div className="kicker !text-navy-700">Primary Cause</div>
              <div className="mt-2 text-base font-bold leading-snug text-ink-900">{data.primary_cause}</div>
            </div>
            <div className="rounded-xl bg-accent-greenSoft p-5 ring-1 ring-accent-green/20">
              <div className="kicker !text-accent-green">Suggested Intervention</div>
              <div className="mt-2 text-base font-bold leading-snug text-ink-900">{data.suggested_intervention}</div>
              <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                AI-generated recommendation — authority review required.
              </div>
            </div>
          </div>

          <Disclaimer tone="sim">
            Attribution breakdown combines lane-blockage detection, citizen reports, and corridor snapshots.
            Numbers are demo-synthetic and shown for prototype illustration purposes only.
          </Disclaimer>
        </Card>

        <Card className="lg:col-span-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="section-h">Traffic Improvement Simulation</h3>
            <span className="chip bg-ink-100 text-ink-700 ring-1 ring-ink-200">
              SIMULATED / ESTIMATED IMPACT
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            A before/after visualization of the estimated effect of suggested interventions.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <SimPanel
              title="Current Situation"
              tone="before"
              speed={before}
              congestion={data.congestion_level}
              items={[
                ['Parked vehicles on carriageway', true],
                ['Blocked dedicated left-turn lane', true],
                ['Congested stop-and-go traffic', true],
                ['Low throughput & long waits', true],
              ]}
              visual={<RoadVisual state="before" />}
            />
            <SimPanel
              title="After Intervention"
              tone="after"
              speed={after}
              congestion={before < 18 ? 'MEDIUM' : 'LOW'}
              items={[
                ['Cleared turning-lane approach', false],
                ['Reduced on-carriageway parking', false],
                ['Smoother through traffic movement', false],
                ['Estimated higher throughput', false],
              ]}
              visual={<RoadVisual state="after" />}
            />
          </div>

          <div className="mt-6 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100 text-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-ink-500">Estimated change</div>
                <div className="mt-0.5 text-xl font-extrabold text-ink-900">
                  {before} → {after} <span className="text-sm font-semibold text-ink-500">km/h</span>
                </div>
              </div>
              <div className="chip bg-accent-greenSoft text-accent-green ring-1 ring-accent-green/20">
                +{Math.round(((after - before) / before) * 100)}% avg speed
              </div>
            </div>
          </div>

          <Link to="/dashboard/interventions" className="btn-primary w-full mt-5">
            Review all recommended interventions →
          </Link>
        </Card>
      </div>
    </div>
  )
}

function SimPanel({ title, tone, speed, congestion, items, visual }: any) {
  return (
    <div className={
      'rounded-xl p-4 ring-1 ' +
      (tone === 'before' ? 'bg-accent-redSoft/40 ring-accent-red/15' : 'bg-accent-greenSoft/50 ring-accent-green/20')
    }>
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wider"
          style={{ color: tone === 'before' ? '#B42318' : '#067647' }}>
          {title}
        </div>
        <SeverityBadge severity={congestion} size="sm" />
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-2xl font-extrabold tabular-nums text-ink-900">{speed}</span>
        <span className="pb-1 text-xs font-semibold text-ink-500">km/h avg</span>
      </div>
      <div className="mt-3 aspect-[16/9] rounded-lg overflow-hidden ring-1 ring-black/5 bg-white">{visual}</div>
      <ul className="mt-3 space-y-1.5 text-[12px]">
        {items.map(([label, bad]: [string, boolean], i: number) => (
          <li key={i} className="flex items-start gap-2">
            <span className={
              'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ' +
              (bad ? 'bg-accent-redSoft text-accent-red' : 'bg-accent-greenSoft text-accent-green')
            } style={{ fontSize: 10 }}>
              {bad ? '✕' : '✓'}
            </span>
            <span className={bad ? 'text-ink-800' : 'text-ink-700'}>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RoadVisual({ state }: { state: 'before' | 'after' }) {
  const bad = state === 'before'
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="320" height="180" fill="#F8FAFC" />
      {/* Grass */}
      <rect x="0" y="0" width="320" height="40" fill="#DCFCE7" opacity="0.55" />
      <rect x="0" y="140" width="320" height="40" fill="#DCFCE7" opacity="0.55" />
      {/* Road */}
      <rect x="0" y="40" width="320" height="100" fill="#1E293B" />
      {/* Lane dashed */}
      {[75, 110, 145].map((y, i) => (
        <line key={i} x1="0" x2="320" y1={y} y2={y} stroke="#FACC15" strokeWidth="2" strokeDasharray="14 14" opacity="0.85" />
      ))}
      {/* Curb */}
      <rect x="0" y="39" width="320" height="1.5" fill="#64748B" />
      <rect x="0" y="139.5" width="320" height="1.5" fill="#64748B" />
      {/* Left highlight — turn lane blocked */}
      {bad && <rect x="0" y="40" width="320" height="35" fill="#F97316" opacity="0.12" />}
      {bad && <rect x="0" y="40" width="320" height="35" fill="none" stroke="#F97316" strokeDasharray="4 4" strokeWidth="1.5" />}
      {/* Parked vehicles on the side */}
      {[
        { x: 12, y: 24, w: 36, h: 14, c: '#334155', parked: true, badOnly: true },
        { x: 64, y: 24, w: 28, h: 14, c: '#175CD3', parked: true, badOnly: true },
        { x: 260, y: 142, w: 32, h: 14, c: '#0F172A', parked: true, badOnly: true },
      ].map((v, i) => (!v.badOnly || bad) && (
        <rect key={i} x={v.x} y={v.y} width={v.w} height={v.h} rx="2" fill={v.c} />
      ))}
      {/* Moving vehicles */}
      {(bad
        ? [
            [20, 50, 34, 22, '#B42318', 'straight-slow'],
            [64, 48, 30, 20, '#1E293B', 'straight-slow'],
            [102, 48, 30, 20, '#33487A', 'blocking-turn'],
            [140, 50, 34, 22, '#0F1A34', 'blocking-turn'],
            [36, 82, 30, 20, '#182646', 'congested'],
            [74, 84, 30, 20, '#24355E', 'congested'],
            [112, 82, 34, 22, '#0F172A', 'congested'],
            [150, 84, 30, 20, '#334155', 'congested'],
            [188, 82, 30, 20, '#182646', 'congested'],
          ]
        : [
            [20, 52, 30, 20, '#182646', 'smooth'],
            [72, 86, 30, 20, '#33487A', 'smooth'],
            [132, 52, 30, 20, '#24355E', 'smooth'],
            [184, 86, 34, 22, '#182646', 'smooth'],
            [244, 52, 30, 20, '#0F172A', 'smooth'],
            [36, 114, 30, 20, '#334155', 'smooth'],
            [120, 114, 30, 20, '#182646', 'smooth'],
            [220, 114, 30, 20, '#24355E', 'smooth'],
          ]
      ).map(([x, y, w, h, c], i) => (
        <rect key={i} x={x as any} y={y as any} width={w as any} height={h as any} rx="2" fill={c as any} />
      ))}
      {/* Warning marker */}
      {bad && (
        <g>
          <rect x="4" y="4" width="148" height="24" rx="6" fill="#FEF3C7" stroke="#F59E0B" />
          <text x="14" y="20" fontSize="11" fontWeight="700" fill="#92400E">⚠ LEFT-TURN LANE BLOCKED</text>
        </g>
      )}
      {!bad && (
        <g>
          <rect x="4" y="4" width="152" height="24" rx="6" fill="#ECFDF3" stroke="#12B76A" />
          <text x="14" y="20" fontSize="11" fontWeight="700" fill="#067647">✓ CLEAR LANES · FLOWING</text>
        </g>
      )}
    </svg>
  )
}
