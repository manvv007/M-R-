import { Link } from 'react-router-dom'
import { Card, SectionHeader, Disclaimer } from '../components/ui/Cards'
import { INCIDENT_TYPES } from '../utils/format'

type IconProps = { className?: string }

function RoadJunctionVisual() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#0A1226] shadow-card-lg ring-1 ring-black/10">
      {/* Sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#182646] via-[#0F1A34] to-[#0A1226]" />
      {/* Road */}
      <div className="absolute inset-x-[18%] inset-y-0 bg-[#1E293B]">
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2" style={{
          backgroundImage: 'linear-gradient(#facc15 0 14px, transparent 14px 28px)',
          backgroundSize: '2px 28px',
          opacity: 0.85,
        }} />
      </div>
      {/* Horizontal road */}
      <div className="absolute inset-y-[30%] inset-x-0 bg-[#1E293B]">
        <div className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2" style={{
          backgroundImage: 'linear-gradient(90deg, #facc15 0 14px, transparent 14px 28px)',
          backgroundSize: '28px 2px',
          opacity: 0.85,
        }} />
      </div>
      {/* Curbs */}
      <div className="absolute inset-x-[17.5%] top-[29%] h-[2px] bg-[#334155]" />
      <div className="absolute inset-x-[17.5%] bottom-[29%] h-[2px] bg-[#334155]" />
      <div className="absolute left-[17.5%] inset-y-[29.5%] w-[2px] bg-[#334155]" />
      <div className="absolute right-[17.5%] inset-y-[29.5%] w-[2px] bg-[#334155]" />
      {/* Buildings */}
      <div className="absolute left-[3%] top-[8%] w-[10%] h-[22%] rounded-md bg-[#24355E] opacity-80" />
      <div className="absolute left-[3%] bottom-[8%] w-[12%] h-[22%] rounded-md bg-[#33487A] opacity-80" />
      <div className="absolute right-[3%] top-[6%] w-[11%] h-[24%] rounded-md bg-[#24355E] opacity-80" />
      <div className="absolute right-[3%] bottom-[6%] w-[10%] h-[22%] rounded-md bg-[#33487A] opacity-80" />
      {/* Signal heads */}
      {[
        { left: '17%', top: '23%', lit: 'red' },
        { right: '17%', top: '23%', lit: 'green' },
      ].map((pos, i) => (
        <div key={i} className="absolute rounded-lg border-2 border-[#334155] bg-[#0F172A] p-1" style={{ left: (pos as any).left, right: (pos as any).right, top: pos.top }}>
          {['#ef4444', '#facc15', '#22c55e'].map((c, j) => {
            const idx = ['red', 'amber', 'green'].indexOf((pos as any).lit)
            const on = idx === j
            return (
              <div key={j} className="m-0.5 h-3 w-3 rounded-full" style={{
                background: c, opacity: on ? 1 : 0.18,
                boxShadow: on ? `0 0 12px ${c}cc` : undefined,
              }} />
            )
          })}
        </div>
      ))}
      {/* Blocked left-turn lane highlight */}
      <div className="absolute left-[18%] top-[32%] h-[36%] w-[8%] border-2 border-dashed border-[#F97316] rounded-md animate-pulse bg-[#F97316]/10" />
      {/* Vehicles */}
      {[
        { x: '20%', y: '34%', w: 18, h: 30, c: '#B42318' },
        { x: '20%', y: '44%', w: 18, h: 28, c: '#0F172A' },
        { x: '20%', y: '54%', w: 20, h: 32, c: '#1E293B' },
        { x: '28%', y: '34%', w: 18, h: 30, c: '#175CD3' },
        { x: '28%', y: '46%', w: 16, h: 26, c: '#334155' },
        { x: '36%', y: '45%', w: 18, h: 30, c: '#067647' },
        { x: '52%', y: '38%', w: 30, h: 18, c: '#33487A' },
        { x: '64%', y: '38%', w: 28, h: 16, c: '#182646' },
        { x: '44%', y: '54%', w: 28, h: 16, c: '#24355E' },
      ].map((v, i) => (
        <div key={i} className="absolute rounded-md shadow-lg" style={{
          left: v.x, top: v.y, width: `${v.w}px`, height: `${v.h}px`, background: v.c,
          boxShadow: '0 6px 10px -4px rgba(0,0,0,.5)',
        }}>
          <div className="absolute inset-x-[18%] inset-y-[15%] rounded-sm bg-sky-100/70" />
        </div>
      ))}
      {/* AI overlays */}
      <div className="absolute left-[19%] top-[33%] border-2 border-emerald-400/80 rounded-md h-[34%] w-[10%]">
        <span className="absolute -top-5 left-0 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
          Lane 1 · Left-Turn · 84%
        </span>
      </div>
      {/* Detection box around blocked lane vehicles */}
      <div className="absolute left-[18%] top-[33%] border border-[#F97316] rounded-sm h-[30%] w-[12%]" />
      <span className="absolute right-4 top-4 chip bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/30">
        ⚠ LEFT-TURN LANE BLOCKED · 21s
      </span>
      <span className="absolute left-4 bottom-4 chip bg-white/10 text-white/80 ring-1 ring-white/10">
        CCTV · Sector 21 Market Junction · DEMO
      </span>
    </div>
  )
}

function FeatureIcon({ name, className = 'h-5 w-5' }: IconProps & { name: string }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className }
  switch (name) {
    case 'camera': return <svg {...common}><rect x="3" y="6" width="15" height="13" rx="2" /><path d="M18 10l3-2v10l-3-2" /></svg>
    case 'scan':   return <svg {...common}><path d="M4 8V6a2 2 0 0 1 2-2h2M4 16v2a2 2 0 0 0 2 2h2M20 8V6a2 2 0 0 0-2-2h-2M20 16v2a2 2 0 0 1-2 2h-2" /><path d="M3 12h18" /></svg>
    case 'brain':  return <svg {...common}><path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-2 5 3 3 0 0 0 2 5v1a3 3 0 0 0 3 3V4z" /><path d="M15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 2 5 3 3 0 0 1-2 5v1a3 3 0 0 1-3 3V4z" /></svg>
    case 'flag':   return <svg {...common}><path d="M5 21V4" /><path d="M5 4h12l-2 4 2 4H5" /></svg>
    case 'map':    return <svg {...common}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></svg>
    case 'shield': return <svg {...common}><path d="M12 3 4 6v6c0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9V6l-8-3z" /></svg>
    default: return null
  }
}

export default function LandingPage() {
  const monitor = [
    { key: 'ILLEGAL_PARKING' },
    { key: 'LANE_BLOCKAGE' },
    { key: 'WRONG_SIDE' },
    { key: 'SIGNAL_VIOLATION' },
    { key: 'LANE_OBSTRUCTION' },
  ].map((k) => ({ name: INCIDENT_TYPES[k.key as keyof typeof INCIDENT_TYPES] || k.key }))
  monitor.push({ name: 'Other' })

  const why = [
    { title: 'AI-assisted detection',  desc: 'Signal-aware lane logic + vehicle / plate analysis, not just raw counting.', icon: 'brain' },
    { title: 'Citizen participation', desc: 'Coverage where government CCTV doesn\u2019t reach. Mobile-first reporting.', icon: 'flag' },
    { title: 'Faster review',          desc: 'AI pre-analyses evidence so authorities review, not hunt.', icon: 'scan' },
    { title: 'Evidence-based intervention', desc: 'Prioritized interventions with expected impact, not guesswork.', icon: 'camera' },
    { title: 'Traffic hotspot intelligence', desc: 'Heatmaps, peak hours and recurring-cause breakdown by corridor.', icon: 'map' },
    { title: 'Privacy-first architecture', desc: 'No automatic challans. Synthetic plates in demo. Authority review required.', icon: 'shield' },
  ]

  const steps = [
    { n: '01', k: 'Monitor', d: 'Existing CCTV feeds + citizen reports cover junction and mid-corridor gaps.' },
    { n: '02', k: 'Detect',  d: 'Vehicles, lanes, signal states and movement directions — analyzed frame by frame.' },
    { n: '03', k: 'Understand', d: 'Congestion is attributed: lane blockage, illegal parking, wrong-side or other.' },
    { n: '04', k: 'Act',     d: 'Prioritized cases, hotspot intelligence and suggested interventions reach authorities.' },
  ]

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0 -z-0 opacity-[0.35]" aria-hidden>
          <div className="absolute -top-32 -right-20 h-[520px] w-[520px] rounded-full bg-navy-100 blur-3xl" />
          <div className="absolute -bottom-24 -left-10 h-[420px] w-[420px] rounded-full bg-amber-100 blur-3xl" />
        </div>
        <div className="container-page relative py-14 sm:py-20 lg:py-24 grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-navy-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-navy-700 ring-1 ring-navy-100">
              <span className="h-1.5 w-1.5 rounded-full bg-navy-600" />
              Smart India Hackathon 2026 · Student Innovation
            </div>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-ink-900 sm:text-5xl lg:text-[56px]">
              See the problem.
              <span className="block text-navy-700">Understand the cause.</span>
              <span className="block">Improve the road.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-600 sm:text-lg">
              RoadWatch combines computer vision and citizen-generated evidence to identify
              recurring traffic bottlenecks, illegal parking and lane-management problems across
              urban road corridors in Indian cities.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/report" className="btn-primary !px-5 !py-3 text-base">
                Report a Road Issue
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
              </Link>
              <Link to="/login" className="btn-secondary !px-5 !py-3 text-base">
                Authority Dashboard
              </Link>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 text-sm">
              {[
                ['Tier 1', 'Junction CCTV AI'],
                ['Tier 2', 'Citizen Reporting'],
                ['Core USP', 'Congestion-Cause Analysis'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-ink-50 px-4 py-3 ring-1 ring-ink-100">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{k}</div>
                  <div className="mt-0.5 font-bold text-ink-900">{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-5">
            <RoadJunctionVisual />
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="border-y border-ink-100 bg-white">
        <div className="container-page grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
          {[
            ['96',      'Lane-blockage incidents at demo junction'],
            ['142',     'Illegal-parking reports on sample corridor'],
            ['3',       'Priority corridors with recurring patterns'],
            ['41%',     'Congestion attributed to lane blockages'],
          ].map(([n, d]) => (
            <div key={d} className="flex flex-col">
              <div className="text-3xl font-extrabold tracking-tight text-navy-800">{n}</div>
              <div className="mt-1 text-sm text-ink-600">{d}</div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-amber-600">
                DEMO DATA
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="container-page py-16 sm:py-20">
        <SectionHeader
          kicker="How it works"
          title="From CCTV & citizen reports to interventions that reduce congestion"
          subtitle="A two-tier monitoring architecture + congestion-cause analysis, designed for Indian market corridors."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Card key={s.n} className="relative overflow-hidden">
              <div className="absolute -right-2 -top-4 text-7xl font-extrabold text-ink-100 select-none leading-none">
                {s.n}
              </div>
              <div className="relative">
                <div className="flex items-center gap-3">
                  <span className="kicker">{s.n}</span>
                  {i < steps.length - 1 && (
                    <svg width="20" height="20" viewBox="0 0 24 24" className="text-ink-300 hidden md:block" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
                <h3 className="mt-2 text-lg font-bold text-ink-900">{s.k}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{s.d}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* WHAT WE MONITOR */}
      <section id="monitor" className="bg-white border-y border-ink-100">
        <div className="container-page py-16 sm:py-20">
          <SectionHeader
            kicker="What we monitor"
            title="The violations that silently turn a 4-lane road into a 1-lane bottleneck"
            subtitle="RoadWatch focuses on the pattern, not just the individual challan. Recurring hotspots are the real priority."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {monitor.map((m, i) => (
              <div key={m.name} className="flex items-center gap-4 rounded-xl2 bg-ink-50 px-5 py-4 ring-1 ring-ink-100 hover:ring-navy-200 hover:bg-white transition">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-700 ring-1 ring-navy-100 font-extrabold text-lg tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <div className="font-bold text-ink-900">{m.name}</div>
                  <div className="text-xs text-ink-500">Detected across junctions and corridor segments</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY ROADWATCH */}
      <section id="why" className="container-page py-16 sm:py-20">
        <SectionHeader
          kicker="Why RoadWatch"
          title="Built for real Indian cities, not generic AI demos"
          subtitle="From the ground up — existing CCTV reuse, mobile-first citizen reporting, explainable analysis."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {why.map((w) => (
            <Card key={w.title}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-700 ring-1 ring-navy-100">
                <FeatureIcon name={w.icon} />
              </div>
              <h3 className="mt-4 text-base font-bold text-ink-900">{w.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{w.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-16">
        <Card className="overflow-hidden !p-0">
          <div className="grid gap-0 md:grid-cols-12">
            <div className="md:col-span-8 p-8 sm:p-10 bg-navy-900 text-white">
              <div className="kicker !text-amber-300">Try the interactive demo</div>
              <h3 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Walk through the complete RoadWatch control center
              </h3>
              <p className="mt-3 max-w-xl text-sm text-white/70 sm:text-base">
                Live monitoring → Lane blockage detection → Congestion cause → Recommended intervention →
                Before/After simulation. A complete 3-minute story, ready for live demo.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/login" className="btn" style={{ background: 'white', color: '#0A1226' }}>
                  Sign in to Control Center
                </Link>
                <Link to="/report" className="btn-ghost !text-white hover:bg-white/10">
                  Try Citizen Reporting
                </Link>
              </div>
              <div className="mt-6">
                <Disclaimer tone="ai">
                  DEMO AI ANALYSIS — prototype uses synthetic detections for demonstration.
                  Replace mock AI service with YOLO + OCR in production deployment.
                </Disclaimer>
              </div>
            </div>
            <div className="md:col-span-4 p-8 sm:p-10 bg-ink-50 border-t md:border-t-0 md:border-l border-ink-100">
              <div className="text-xs font-bold uppercase tracking-wider text-ink-500">
                Demo credentials
              </div>
              <div className="mt-4 space-y-4">
                <div className="rounded-xl bg-white ring-1 ring-ink-100 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-navy-700">Traffic Authority</div>
                  <div className="mt-2 text-sm text-ink-700">authority@roadwatch.in</div>
                  <div className="text-sm font-mono text-ink-900">Authority@123</div>
                </div>
                <div className="rounded-xl bg-white ring-1 ring-ink-100 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Citizen</div>
                  <div className="mt-2 text-sm text-ink-700">citizen@roadwatch.in</div>
                  <div className="text-sm font-mono text-ink-900">Citizen@123</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}
