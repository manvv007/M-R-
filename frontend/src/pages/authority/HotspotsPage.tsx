import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, HeatmapLayer, Circle } from './_mapExports'
import api from '../../services/api'
import { Card, SectionHeader } from '../../components/ui/Cards'
import { SeverityBadge, TypeBadge } from '../../components/ui/Badges'
import { INCIDENT_TYPES, cn } from '../../utils/format'

const VIOLATION_FILTERS = [
  { id: 'ALL', label: 'All types' },
  ...Object.entries(INCIDENT_TYPES).map(([id, label]) => ({ id, label })),
]
const SEVERITY_FILTERS = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export default function HotspotsPage() {
  const [hotspots, setHotspots] = useState<any[]>([])
  const [vType, setVType] = useState('ALL')
  const [severity, setSeverity] = useState('ALL')
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    api.get('/api/hotspots').then((r) => setHotspots(r.data)).catch(() => {
      setHotspots([
        { id: 1, name: 'Sector 21 Market Junction', latitude: 28.4595, longitude: 77.0266,
          type: 'LANE_BLOCKAGE', severity: 'HIGH', incident_count: 96, peak_time: '6 PM - 9 PM',
          main_cause: 'Left-turn lane blockage', avg_speed: 14,
          recommended_intervention: 'Targeted enforcement during peak hours.' },
        { id: 2, name: 'MG Road Metro Junction', latitude: 28.4750, longitude: 77.0780,
          type: 'LANE_BLOCKAGE', severity: 'HIGH', incident_count: 82, peak_time: '6 PM - 9 PM',
          main_cause: 'Turning-lane blockage', avg_speed: 16,
          recommended_intervention: 'Constable on turning approach, peak hours.' },
        { id: 1001, name: 'Sector 21 Market Road Corridor', latitude: 28.4605, longitude: 77.0286,
          type: 'ILLEGAL_PARKING', severity: 'MEDIUM', incident_count: 142, peak_time: '11 AM - 2 PM',
          main_cause: 'On-carriageway parking near shops', avg_speed: 18,
          recommended_intervention: 'Loading zone + tow-van patrol.' },
        { id: 5, name: 'Old Railway Road Crossing', latitude: 28.4680, longitude: 77.0350,
          type: 'WRONG_SIDE', severity: 'CRITICAL', incident_count: 43, peak_time: '8 AM - 10 AM',
          main_cause: 'Wrong-side driving at crossing approach', avg_speed: 16,
          recommended_intervention: 'Physical dividers + signages.' },
      ])
    })
  }, [])

  const filtered = useMemo(() => (
    hotspots.filter((h) => (vType === 'ALL' || h.type === vType))
            .filter((h) => severity === 'ALL' || h.severity === severity)
  ), [hotspots, vType, severity])

  const center: [number, number] = [28.463, 77.044]
  const severityColor: Record<string, string> = {
    LOW: '#0EA5E9', MEDIUM: '#F59E0B', HIGH: '#EA580C', CRITICAL: '#B42318'
  }

  // heatmap = [lat, lng, intensity]
  const heat = filtered.map((h) => [
    h.latitude, h.longitude,
    Math.min(1.0, 0.3 + h.incident_count / 200),
  ])

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="Hotspots"
        title="Hotspot map — violation heatmap + corridor intelligence"
        subtitle="Click a hotspot to view incidents, peak time, main cause and recommended intervention."
      />

      <Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="label">Violation type</div>
            <div className="flex flex-wrap gap-1.5">
              {VIOLATION_FILTERS.map((f) => (
                <button key={f.id} onClick={() => setVType(f.id)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition',
                    vType === f.id
                      ? 'bg-navy-800 text-white ring-navy-800'
                      : 'bg-white text-ink-700 ring-ink-200 hover:bg-ink-50'
                  )}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="label">Severity</div>
            <div className="flex flex-wrap gap-1.5">
              {SEVERITY_FILTERS.map((s) => (
                <button key={s} onClick={() => setSeverity(s)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition',
                    severity === s
                      ? 'bg-navy-800 text-white ring-navy-800'
                      : 'bg-white text-ink-700 ring-ink-200 hover:bg-ink-50'
                  )}>
                  {s === 'ALL' ? 'All severities' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="label">Hotspots shown</div>
            <div className="text-2xl font-extrabold text-ink-900 tabular-nums">{filtered.length}</div>
            <div className="text-xs text-ink-500">Demo synthetic data · Sector 21 region</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Card padded={false} className="overflow-hidden">
            <div className="relative w-full" style={{ height: '620px' }}>
              <MapContainer
                center={center}
                zoom={14}
                scrollWheelZoom
                style={{ height: '100%', width: '100%', borderRadius: 0 }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                  maxZoom={19}
                />
                {/* Heatmap */}
                {(window as any).L && (heat as any).length > 0 && (
                  <HeatmapLayer points={heat as any} radius={35} blur={25} max={1.0} gradient={{
                    0.2: '#22C55E', 0.4: '#FACC15', 0.6: '#F97316', 0.8: '#EF4444', 1.0: '#B42318'
                  }} />
                )}
                {filtered.map((h) => (
                  <Marker
                    key={h.id}
                    position={[h.latitude, h.longitude]}
                    eventHandlers={{ click: () => setSelected(h) }}
                  >
                    <Popup>
                      <div className="text-[13px]">
                        <div className="font-bold text-ink-900">{h.name}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <TypeBadge type={h.type} />
                          <SeverityBadge severity={h.severity} size="sm" />
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                          <div><span className="text-ink-500">Incidents:</span> <b>{h.incident_count}</b></div>
                          <div><span className="text-ink-500">Avg speed:</span> <b>{h.avg_speed} km/h</b></div>
                          <div className="col-span-2"><span className="text-ink-500">Peak:</span> <b>{h.peak_time}</b></div>
                          <div className="col-span-2"><span className="text-ink-500">Main cause:</span> <b>{h.main_cause}</b></div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                {filtered.map((h) => (
                  <Circle
                    key={`c-${h.id}`}
                    center={[h.latitude, h.longitude]}
                    radius={140 + h.incident_count}
                    pathOptions={{
                      color: severityColor[h.severity] || '#F59E0B',
                      weight: 1,
                      fillOpacity: 0.08,
                      opacity: 0.4,
                    }}
                  />
                ))}
              </MapContainer>
              <div className="absolute left-4 top-4 rounded-xl bg-white/95 backdrop-blur px-3 py-2 text-[11px] ring-1 ring-black/5 shadow-card z-[400]">
                <div className="font-bold text-ink-900 mb-1">Severity legend</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {Object.entries(severityColor).map(([k, c]) => (
                    <span key={k} className="inline-flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full" style={{ background: c }} />
                      <span className="text-ink-700 font-semibold capitalize">{k.toLowerCase()}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="absolute right-4 top-4 chip bg-black/60 text-white ring-white/15 z-[400]">
                DEMO · OpenStreetMap · Sector 21 region, Gurugram
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <Card>
            <h3 className="section-h">Selected hotspot</h3>
            {!selected && <p className="mt-2 text-sm text-ink-500">Tap a hotspot marker to view details.</p>}
            {selected && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="text-base font-bold text-ink-900">{selected.name}</h4>
                  <SeverityBadge severity={selected.severity} />
                </div>
                <TypeBadge type={selected.type} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-ink-50 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Incidents</div>
                    <div className="mt-0.5 text-2xl font-extrabold tabular-nums text-ink-900">{selected.incident_count}</div>
                  </div>
                  <div className="rounded-xl bg-ink-50 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Avg speed</div>
                    <div className="mt-0.5 text-2xl font-extrabold tabular-nums text-ink-900">{selected.avg_speed}<span className="text-sm font-semibold ml-0.5 text-ink-500"> km/h</span></div>
                  </div>
                </div>
                <div className="rounded-xl bg-navy-50 p-4 ring-1 ring-navy-100">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-navy-700">Primary cause</div>
                  <div className="mt-1 text-sm font-semibold text-ink-900">{selected.main_cause}</div>
                  <div className="mt-1 text-xs text-ink-500">Peak time: {selected.peak_time}</div>
                </div>
                <div className="rounded-xl bg-accent-greenSoft p-4 ring-1 ring-accent-green/20">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-accent-green">Recommended intervention</div>
                  <div className="mt-1 text-sm font-semibold text-ink-900">{selected.recommended_intervention}</div>
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                    AI recommendation — authority review required
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="section-h">Ranking · Top hotspots</h3>
            <div className="mt-4 divide-y divide-ink-50 rounded-xl ring-1 ring-black/5">
              {[...filtered].sort((a, b) => b.incident_count - a.incident_count).slice(0, 6).map((h, i) => (
                <button key={h.id} onClick={() => setSelected(h)}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-ink-50 transition">
                  <span className="h-7 w-7 rounded-full bg-navy-800 text-white grid place-items-center text-xs font-bold tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink-900 truncate">{h.name}</div>
                    <div className="text-[11px] text-ink-500 flex items-center gap-2">
                      <TypeBadge type={h.type} />
                      <span>· {h.incident_count} incidents</span>
                    </div>
                  </div>
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: severityColor[h.severity] || '#94A3B8' }} />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
