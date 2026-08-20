import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../../services/api'
import { Card, SectionHeader, Tabs, Disclaimer } from '../../components/ui/Cards'
import { SeverityBadge, StatusBadge, TypeBadge } from '../../components/ui/Badges'
import { cn } from '../../utils/format'

interface SimFrame {
  junction_id: number
  tick: number
  signal_state: 'RED' | 'GREEN' | 'YELLOW'
  time_in_state: number
  blockage_detected: boolean
  blockage_duration: number
  blockage_lane: number
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  warning: string | null
  total_vehicles: number
  lanes: Array<{ id: number; lane_number: number; type: string; allowed: string; occupancy: number; vehicles: number }>
  vehicles: Array<{
    class: string; bbox: [number, number, number, number]; track_id: string; confidence: number;
    lane_id?: number; direction?: string; movement_conflict?: boolean;
  }>
  is_mock: boolean
  demo_mode: boolean
}

const COLORS: Record<string, string> = {
  car: '#1E293B',
  bike: '#175CD3',
  auto: '#B9770E',
  truck: '#334155',
  bus: '#33487A',
  van: '#0F172A',
}

export default function LiveMonitoringPage() {
  const [junctionId, setJunctionId] = useState<number>(1)
  const [junctions, setJunctions] = useState<any[] | null>(null)
  const [tick, setTick] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [frame, setFrame] = useState<SimFrame | null>(() => localSim(1, 0))
  const [logs, setLogs] = useState<any[]>([])
  const timerRef = useRef<any>(null)

  useEffect(() => {
    api.get('/api/junctions').then((r) => setJunctions(r.data)).catch(() => {
      setJunctions([
        { id: 1, name: 'Sector 21 Market Junction', has_cctv: true, corridor_id: 1 },
      ])
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const fetchFrame = async (t: number) => {
      try {
        const { data } = await api.get(`/api/ai/junction-simulation/${junctionId}?tick=${t}`)
        if (cancelled) return
        setFrame(data as SimFrame)
        if (data.warning) {
          setLogs((prev) => {
            const recent = prev[0]
            if (recent && recent.warn === data.warning && recent.tick === t) return prev
            return [
              { warn: data.warning, tick: t, signal: data.signal_state, severity: data.severity, time: new Date() },
              ...prev,
            ].slice(0, 30)
          })
        }
      } catch {
        // Use local fallback simulation if backend absent
        setFrame(localSim(junctionId, t))
      }
    }
    fetchFrame(tick)
    return () => { cancelled = true }
  }, [junctionId, tick])

  useEffect(() => {
    if (!playing) { if (timerRef.current) clearInterval(timerRef.current); return }
    timerRef.current = setInterval(() => {
      setTick((t) => (t + 1) % 120)
    }, 800)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [playing])

  const signalColor = useMemo(() => {
    if (!frame) return '#475569'
    if (frame.signal_state === 'RED') return '#EF4444'
    if (frame.signal_state === 'YELLOW') return '#FACC15'
    return '#22C55E'
  }, [frame])

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="Live Monitoring"
        title="Junction CCTV analysis — Sector 21 Market"
        subtitle="Signal-aware lane occupancy, vehicle direction and blockage detection (DEMO simulation)."
        actions={
          <>
            <select
              className="input !py-2 !w-auto text-sm"
              value={junctionId}
              onChange={(e) => { setJunctionId(Number(e.target.value)); setTick(0) }}
            >
              {(junctions || []).filter(j => j.has_cctv).map(j => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
            <button
              className={cn('btn-secondary', playing && '!bg-navy-50 !text-navy-700')}
              onClick={() => setPlaying((v) => !v)}
            >
              {playing ? '⏸ Pause' : '▶ Play'}
            </button>
            <button className="btn-ghost" onClick={() => setTick(0)}>↺ Reset cycle</button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8 space-y-5">
          <Card padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-accent-red pulse-alert" />
                  <span className="text-sm font-bold text-ink-900">CAM-SEC21-MKT-01</span>
                </div>
                <span className="chip bg-ink-50 text-ink-600 ring-1 ring-ink-200">
                  {junctions?.find(j => j.id === junctionId)?.name || 'Sector 21 Market Junction'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-slate-900 text-white px-3 py-1.5 ring-1 ring-emerald-500/30">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
                    <span className="text-[11px] font-bold text-red-400">RED (STRAIGHT)</span>
                  </div>
                  <span className="text-white/30">|</span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                    <span className="text-[11px] font-bold text-emerald-400">← ALWAYS GREEN (LEFT)</span>
                  </div>
                </div>
                <span className="text-xs font-mono text-ink-500 tabular-nums">T {String(tick).padStart(3, '0')}/119</span>
              </div>
            </div>

            <JunctionStage frame={frame} />

            <div className="grid grid-cols-2 divide-x divide-ink-100 border-t border-ink-100 md:grid-cols-4">
              {[
                ['MAIN SIGNAL', 'RED (STOP)', '#EF4444'],
                ['LEFT-TURN SIGNAL', '← ALWAYS GREEN', '#10B981'],
                ['LEFT-TURN LANE', (frame?.lanes && frame.lanes[0] && frame.lanes[0].occupancy != null) ? `${Number(frame.lanes[0].occupancy).toFixed(0)}% OCCUPIED` : '—', '#B9770E'],
                ['LANE BLOCKAGE', frame?.blockage_detected ? `DETECTED (${frame.blockage_duration}s)` : 'CLEAR', frame?.blockage_detected ? '#B42318' : '#067647'],
              ].map(([k, v, c]) => (
                <div key={k as string} className="px-4 py-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">{k}</div>
                  <div className="mt-1 text-base font-extrabold tracking-tight flex items-center gap-1" style={{ color: c as string }}>{v}</div>
                </div>
              ))}
            </div>

            {frame?.warning && (
              <div className={cn(
                'flex items-center gap-3 px-5 py-3 border-t',
                frame.severity === 'HIGH'
                  ? 'bg-accent-redSoft text-accent-red border-accent-red/20'
                  : 'bg-accent-amberSoft text-accent-amber border-accent-amber/20'
              )}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3 2 20h20z" />
                  <path d="M12 10v5M12 18h.01" strokeLinecap="round" />
                </svg>
                <div className="flex-1 font-bold">{frame.warning} · {frame.blockage_duration}s · Lane {frame.blockage_lane}</div>
                <SeverityBadge severity={frame.severity} />
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h3 className="section-h">Lane status — per-lane occupancy & vehicle count</h3>
              <div className="text-xs text-ink-500">Thresholds: occupancy &gt; 60%, duration &gt; 10s</div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              {(frame?.lanes || []).map((l) => {
                const atRisk = frame?.signal_state === 'GREEN' && l.type === 'left_turn' && l.occupancy > 60
                const blocked = frame?.blockage_detected && l.id === frame?.blockage_lane
                return (
                  <div key={l.id} className={cn(
                    'rounded-xl p-4 ring-1 transition',
                    blocked ? 'bg-accent-redSoft ring-accent-red/20 pulse-alert'
                      : atRisk ? 'bg-accent-amberSoft ring-accent-amber/20'
                      : 'bg-ink-50 ring-ink-100'
                  )}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Lane {l.lane_number}</div>
                        <div className="mt-0.5 text-sm font-bold text-ink-900 capitalize">{l.type.replace('_', ' ')}</div>
                      </div>
                      <StatusBadge status={blocked ? 'ACTIVE' : atRisk ? 'PENDING' : 'RESOLVED'} size="sm" />
                    </div>
                    <div className="mt-4">
                      <div className="flex items-end justify-between">
                        <span className="text-2xl font-extrabold tracking-tight text-ink-900 tabular-nums">
                          {l.occupancy.toFixed(0)}<span className="text-sm font-semibold text-ink-500 ml-1">%</span>
                        </span>
                        <span className="text-xs text-ink-500">{l.vehicles} veh</span>
                      </div>
                      <div className="mt-1.5 h-2 w-full rounded-full bg-white/70 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, l.occupancy)}%`,
                            background: blocked ? '#B42318' : atRisk ? '#B9770E' : '#33487A'
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-3 text-[11px] text-ink-600">
                      Allowed: <span className="font-semibold capitalize">{l.allowed.replace('_', ' ')}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <Disclaimer tone="sim" className="mt-5">
              SIGNAL-AWARE LANE LOGIC (MOCK): If signal=GREEN, occupancy&gt;60%, movement-conflict vehicles≥3,
              and duration&gt;10s → LANE_BLOCKAGE incident is raised automatically.
            </Disclaimer>
          </Card>
        </div>

        <div className="xl:col-span-4 space-y-5">
          <Card>
            <div className="flex items-center justify-between">
              <h3 className="section-h">Detection timeline</h3>
              <span className="text-xs text-ink-500">Auto-generated events</span>
            </div>
            <div className="mt-4 max-h-[240px] overflow-y-auto divide-y divide-ink-100 rounded-xl ring-1 ring-black/5 bg-white">
              {logs.length === 0 && (
                <div className="px-4 py-10 text-center text-xs text-ink-500">
                  Waiting for lane blockage events during the simulation cycle…
                </div>
              )}
              {logs.map((l, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <SeverityBadge severity={l.severity} size="sm" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink-900">{l.warn}</div>
                    <div className="text-[11px] text-ink-500">
                      Signal {l.signal} · tick {l.tick} · {l.time.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {frame?.blockage_detected && (
              <div className="mt-4 rounded-xl bg-navy-50 p-4 ring-1 ring-navy-100">
                <TypeBadge type="LANE_BLOCKAGE" />
                <div className="mt-2 text-sm font-bold text-ink-900">
                  Incident auto-created
                </div>
                <div className="mt-1 text-xs text-ink-600">
                  Case <span className="font-mono font-bold">RW-2026-{String(100 + tick).slice(-4)}</span> — pending authority review.
                </div>
                <button className="btn-primary w-full mt-4 !py-2 text-sm">Open incident</button>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="section-h">Vehicles tracked ({frame?.total_vehicles ?? 0})</h3>
            <p className="mt-1 text-xs text-ink-500">
              Vehicles in Lane 1 during GREEN are labeled with their intended movement —
              <span className="font-semibold text-accent-red"> STRAIGHT vehicles in LEFT lane = blockage</span>.
            </p>
            <div className="mt-4 space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {(frame?.vehicles || []).slice(0, 16).map((v: any, i: number) => {
                const vCls = String(v.class || v.type || 'car')
                const vLane = v.lane_id || v.lane || 1
                const blocking = vLane === 1 && (v.movement_conflict || (frame?.signal_state === 'GREEN' && v.direction === 'straight'))
                return (
                  <div key={i} className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 ring-1',
                    blocking ? 'bg-accent-redSoft ring-accent-red/15' : 'bg-ink-50 ring-ink-100'
                  )}>
                    <div className="h-8 w-10 rounded-md shrink-0 grid place-items-center text-white text-[10px] font-bold"
                      style={{ background: COLORS[vCls] || '#334155' }}>
                      {vCls.slice(0, 3).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-bold text-ink-900 capitalize">{vCls}</span>
                        <span className="text-[10px] font-mono text-ink-500">{v.track_id}</span>
                        <span className="ml-auto text-[10px] font-bold text-ink-500">
                          Lane {vLane}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                        <span className={cn(
                          'font-semibold capitalize',
                          blocking ? 'text-accent-red' : 'text-ink-600'
                        )}>
                          Direction: {v.direction || 'straight'}{blocking && ' (conflict)'}
                        </span>
                        <span className="text-ink-400">· conf {Math.round((v.confidence || 0.9) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function JunctionStage({ frame }: { frame: SimFrame | null }) {
  const stageW = 900
  const stageH = 560
  const LX1 = 230, LX2 = 345, LX3 = 455, LX4 = 565, LX5 = 670 // lane vertical lines

  return (
    <div className="junction-stage" style={{ aspectRatio: `${stageW} / ${stageH}` }}>
      <div className="road" />
      {/* Horizontal carriageway */}
      <div className="absolute inset-x-0 bg-[#1E293B]" style={{ top: '42%', bottom: '42%',
          backgroundImage: 'repeating-linear-gradient(90deg, #334155 0 50px, #475569 50px 52px)',
          opacity: 0.92
      }} />
      {/* Lane dividers vertical */}
      {[LX2, LX3, LX4].map((x, i) => (
        <div key={i} className="absolute top-0 bottom-0" style={{
          left: `${(x / stageW) * 100}%`,
          width: 2,
          backgroundImage: 'linear-gradient(#facc15 0 14px, transparent 14px 28px)',
          backgroundSize: '2px 28px',
          opacity: 0.8,
        }} />
      ))}
      {/* Lane dividers horizontal */}
      {[258, 302].map((y, i) => (
        <div key={i} className="absolute inset-x-0" style={{
          top: `${(y / stageH) * 100}%`,
          height: 2,
          backgroundImage: 'repeating-linear-gradient(90deg, #facc15 0 14px, transparent 14px 28px)',
          backgroundSize: '28px 2px',
          opacity: 0.8,
        }} />
      ))}
      {/* Curb markers */}
      <div className="absolute inset-y-0" style={{ left: `${(LX1/stageW)*100}%`, width: 2, background: '#64748B', opacity: 0.7 }} />
      <div className="absolute inset-y-0" style={{ left: `${(LX5/stageW)*100}%`, width: 2, background: '#64748B', opacity: 0.7 }} />
      <div className="absolute inset-x-0" style={{ top: `${(235/stageH)*100}%`, height: 2, background: '#64748B', opacity: 0.7 }} />
      <div className="absolute inset-x-0" style={{ top: `${(325/stageH)*100}%`, height: 2, background: '#64748B', opacity: 0.7 }} />

      {/* Lane labels + occupancy overlay for Lane 1 */}
      {[
        { x: (LX1+LX2)/2, label: 'L1 · LEFT', w: frame?.lanes?.[0]?.occupancy ?? 0, tone: frame?.blockage_lane === 1 ? 'blocked' : 'ok' },
        { x: (LX2+LX3)/2, label: 'L2 · STRAIGHT', w: frame?.lanes?.[1]?.occupancy ?? 0, tone: 'ok' },
        { x: (LX3+LX4)/2, label: 'L3 · STRAIGHT', w: frame?.lanes?.[2]?.occupancy ?? 0, tone: 'ok' },
        { x: (LX4+LX5)/2, label: 'L4 · RIGHT', w: frame?.lanes?.[3]?.occupancy ?? 0, tone: 'ok' },
      ].map((l) => (
        <div key={l.label} className="absolute -translate-x-1/2" style={{
          left: `${(l.x / stageW) * 100}%`,
          top: '6px',
        }}>
          <span className={cn(
            'chip',
            l.tone === 'blocked' ? 'bg-accent-redSoft text-accent-red ring-accent-red/20'
              : 'bg-white/10 text-white/80 ring-white/15'
          )}>
            {l.label} · {Math.round(l.w)}%
          </span>
        </div>
      ))}

      {/* Single 4-Aspect Traffic Signal Post (Matching user's traffic signal) */}
      <div 
        className="absolute -translate-x-1/2 z-20 flex flex-col items-center bg-black/90 p-2 rounded-xl ring-2 ring-yellow-500/80 shadow-[0_0_20px_rgba(0,0,0,0.9)] border border-yellow-600/70 select-none"
        style={{
          left: `${((LX1 - 35) / stageW) * 100}%`,
          top: '22%',
        }}
      >
        {/* 1. Main Straight RED Light (GLOWING RED) */}
        <div 
          className="w-7 h-7 rounded-full flex items-center justify-center relative bg-red-600"
          style={{
            boxShadow: '0 0 14px #EF4444, 0 0 25px #EF4444a0, inset 0 0 6px #FCA5A5',
            border: '1px solid #F87171'
          }}
        >
          <span className="text-[7px] font-black text-white tracking-wider">RED</span>
        </div>

        {/* 2. Yellow Light (OFF) */}
        <div className="w-7 h-7 rounded-full bg-slate-900/90 border border-slate-800 my-1 opacity-25" />

        {/* 3. Straight Green Light (OFF) */}
        <div className="w-7 h-7 rounded-full bg-slate-900/90 border border-slate-800 mb-1 opacity-25 flex items-center justify-center">
          <span className="text-white/40 text-[9px]">↑</span>
        </div>

        {/* 4. ALWAYS GREEN LEFT TURN ARROW (Matching User Photo) */}
        <div 
          className="w-7 h-7 rounded-full flex items-center justify-center relative bg-emerald-600"
          style={{
            boxShadow: '0 0 16px #10B981, 0 0 28px #10B981a0, inset 0 0 6px #A7F3D0',
            border: '1.5px solid #34D399'
          }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current drop-shadow-[0_0_6px_#10B981]">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        <span className="text-[7px] font-extrabold text-emerald-400 uppercase tracking-tighter mt-1 text-center leading-none">
          FREE LEFT
        </span>
      </div>

      {/* Blocked lane highlight */}
      {frame?.blockage_detected && (
        <div className="absolute border-2 border-dashed rounded-md pulse-alert"
          style={{
            left: `${(LX1/stageW)*100}%`,
            top: '30%',
            width: `${((LX2-LX1)/stageW)*100}%`,
            height: '40%',
            borderColor: '#F97316',
            background: 'rgba(249, 115, 22, 0.10)',
          }}
        />
      )}

      {/* Vehicles */}
      {(frame?.vehicles || []).map((v: any, i: number) => {
        const vCls = String(v.class || v.type || 'car')
        const vLane = v.lane_id || v.lane || 1
        const blocking = vLane === 1 && (v.movement_conflict || (frame?.signal_state === 'GREEN' && v.direction === 'straight'))
        const laneWidth = LX2 - LX1
        // Assign lane center, with slight stagger per index
        const laneX = [LX1, LX2, LX3, LX4][(vLane - 1) % 4] + laneWidth / 2
        const stagger = (i % 5) * 44
        const vw = vCls === 'truck' || vCls === 'bus' ? 50 : vCls === 'bike' ? 26 : 38
        const vh = vCls === 'truck' || vCls === 'bus' ? 30 : vCls === 'bike' ? 44 : 54
        const topY = 330 + (stagger % 180) - (vCls === 'bike' ? 8 : 0)
        const left = laneX - vw / 2
        return (
          <div key={i} className="vehicle" style={{
            left: `${(left / stageW) * 100}%`,
            top: `${(topY / stageH) * 100}%`,
            width: `${(vw / stageW) * 100}%`,
            height: `${(vh / stageH) * 100}%`,
            background: COLORS[vCls] || '#334155',
            border: blocking ? '2px solid #F97316' : undefined,
            zIndex: blocking ? 10 : 1,
          }}>
            <div className="absolute inset-x-[18%] inset-y-[15%] rounded-sm bg-sky-100/70" />
            {blocking && (
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-accent-red text-white px-1.5 py-0.5 text-[9px] font-bold">
                ⚠ CONFLICT
              </span>
            )}
          </div>
        )
      })}

      {/* Top bar overlays */}
      <span className="absolute left-4 top-4 chip bg-black/40 text-white ring-white/15">
        DEMO · 1920×1080 · 25 fps · Sector 21 Market Junction
      </span>
      <span className="absolute right-4 bottom-4 chip bg-black/40 text-white ring-white/15">
        Mock AI inference · YOLOv8 + LaneNet (simulated)
      </span>
    </div>
  )
}

function localSim(junctionId: number, tick: number): SimFrame {
  const t = tick % 60
  const sig: 'RED' | 'GREEN' = 'RED' // Main signal for straight traffic is ALWAYS RED
  const time_in = t
  const n = Math.min(22, 8 + Math.floor(t / 2))
  const occ1 = Math.min(92, 35 + t * 1.1)
  const blocked = t > 10 && occ1 > 50
  const dur = blocked ? t - 10 : 0
  const lanes = [
    { id: 1, lane_number: 1, type: 'left_turn', allowed: 'left', occupancy: occ1, vehicles: Math.max(1, Math.floor(n * 0.35)) },
    { id: 2, lane_number: 2, type: 'straight', allowed: 'straight', occupancy: Math.min(88, 40 + t * 0.8), vehicles: Math.max(1, Math.floor(n * 0.35)) },
    { id: 3, lane_number: 3, type: 'straight', allowed: 'straight', occupancy: Math.min(75, 30 + t * 0.7), vehicles: Math.floor(n * 0.22) },
    { id: 4, lane_number: 4, type: 'right_turn', allowed: 'right', occupancy: Math.min(45, 15 + t * 0.5), vehicles: Math.floor(n * 0.12) },
  ]
  const types = ['car', 'bike', 'auto', 'car', 'car', 'truck', 'bus', 'van']
  const vehicles: SimFrame['vehicles'] = []
  for (let i = 0; i < n; i++) {
    const cls = types[i % types.length]
    const lane_id = (i % 4) + 1
    vehicles.push({
      class: cls,
      bbox: [0, 0, 0.1, 0.1],
      track_id: `TRK-${1000 + (junctionId * 131 + tick * 17 + i) % 8999}`,
      confidence: 0.82 + (i % 17) / 100,
      lane_id,
      direction: lane_id === 1 && i === 0 ? 'straight' : (lane_id === 2 || lane_id === 3 ? 'straight' : lane_id === 4 ? 'right' : 'left'),
      movement_conflict: lane_id === 1 && i === 0,
    })
  }
  return {
    junction_id: junctionId, tick: t, signal_state: 'RED', time_in_state: time_in,
    blockage_detected: blocked, blockage_duration: dur, blockage_lane: 1,
    severity: blocked ? (dur >= 20 ? 'HIGH' : 'MEDIUM') : 'LOW',
    warning: blocked ? 'LEFT-TURN LANE BLOCKED · Straight car stopped at RED light in FREE LEFT lane' : 'MONITORING FREE LEFT TURN',
    total_vehicles: n, lanes, vehicles, is_mock: true, demo_mode: true,
  }
}
