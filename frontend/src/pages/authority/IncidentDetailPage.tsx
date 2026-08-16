import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import api from '../../services/api'
import { Card, SectionHeader, Disclaimer, ConfirmDialog, DemoRibbon } from '../../components/ui/Cards'
import { PriorityMeter, SeverityBadge, SourceBadge, StatusBadge, TypeBadge } from '../../components/ui/Badges'
import { formatDate, INCIDENT_TYPES } from '../../utils/format'

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [data, setData] = useState<any>(null)
  const [confirm, setConfirm] = useState<{ title: string; message: string; action: () => void } | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  useEffect(() => {
    api.get(`/api/incidents/${id}`)
      .then((r) => setData(r.data))
      .catch(() => setData({ notFound: true }))
  }, [id])

  async function doAction(action: string, label: string) {
    setLoadingAction(action)
    try {
      const endpoints: Record<string, string> = {
        VERIFY: 'verify', REJECT: 'reject', MORE_INFO: 'request-info', RESOLVE: 'resolve'
      }
      await api.post(`/api/incidents/${id}/${endpoints[action]}`)
      const r = await api.get(`/api/incidents/${id}`)
      setData(r.data)
    } finally {
      setLoadingAction(null)
    }
  }

  const inc = data?.incident
  const ai = data?.ai_analysis?.[0]
  const vehicles = data?.vehicles || []

  if (data?.notFound || !inc) {
    return (
      <Card>
        <div className="text-ink-500">Loading incident…</div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <DemoRibbon text={`CASE ${inc.case_number} · SYNTHETIC DEMO DATA`} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/dashboard/incidents" className="link text-xs font-semibold">← All incidents</Link>
          </div>
          <SectionHeader
            kicker={`Case ${inc.case_number}`}
            title={`${INCIDENT_TYPES[inc.type as keyof typeof INCIDENT_TYPES] || inc.type} at ${data.junction?.name || data.corridor?.name || 'unknown location'}`}
            subtitle={inc.description || 'No additional description provided.'}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <TypeBadge type={inc.type} />
            <SeverityBadge severity={inc.severity} />
            <SourceBadge source={inc.source} />
            <StatusBadge status={inc.status} />
            {inc.blockage_duration && (
              <span className="chip bg-ink-50 text-ink-700 ring-1 ring-ink-200">
                Blockage · {inc.blockage_duration}s
              </span>
            )}
            {inc.lane_occupancy && (
              <span className="chip bg-ink-50 text-ink-700 ring-1 ring-ink-200">
                Lane · {Number(inc.lane_occupancy).toFixed(0)}%
              </span>
            )}
            {inc.signal_state && (
              <span className="chip bg-amber-50 text-amber-800 ring-1 ring-amber-200">
                Signal · {inc.signal_state}
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-2 sm:w-[280px]">
          <div className="grid grid-cols-2 gap-3 rounded-xl2 bg-white p-4 ring-1 ring-black/5 shadow-card">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Priority</div>
              <div className="mt-1"><PriorityMeter score={inc.priority_score} size="sm" /></div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">AI Conf.</div>
              <div className="mt-1"><PriorityMeter score={Math.round(Number(inc.confidence || 0))} size="sm" /></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-success flex-1"
              disabled={loadingAction !== null}
              onClick={() => setConfirm({
                title: 'Verify this incident?',
                message: `${inc.case_number} will be marked VERIFIED. This records an audit entry and notifies the citizen reporter (if any).`,
                action: () => doAction('VERIFY', 'Verify'),
              })}
            >✓ Verify</button>
            <button
              className="btn-danger flex-1"
              disabled={loadingAction !== null}
              onClick={() => setConfirm({
                title: 'Reject this incident?',
                message: 'Mark the incident as REJECTED. This records an audit entry and notifies the citizen reporter.',
                action: () => doAction('REJECT', 'Reject'),
              })}
            >✕ Reject</button>
            <button
              className="btn-warn flex-1"
              disabled={loadingAction !== null}
              onClick={() => doAction('MORE_INFO', 'Request info')}
            >ⓘ Request more info</button>
            <button
              className="btn-primary flex-1"
              disabled={loadingAction !== null}
              onClick={() => setConfirm({
                title: 'Mark incident resolved?',
                message: 'Close this incident as resolved. Action is recorded in audit trail.',
                action: () => doAction('RESOLVE', 'Resolve'),
              })}
            >✓ Mark resolved</button>
            {loadingAction && (
              <div className="col-span-2 text-xs text-ink-500">Working… {loadingAction}</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Evidence */}
        <Card className="lg:col-span-8 space-y-6">
          <div>
            <h3 className="section-h">Evidence</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(data.evidence || []).length === 0 && (
                <div className="sm:col-span-2 rounded-xl bg-ink-50 p-6 text-sm text-ink-500 text-center">
                  No evidence files linked.
                </div>
              )}
              {(data.evidence || []).map((e: any, i: number) => (
                <div key={i} className="rounded-xl ring-1 ring-black/5 overflow-hidden">
                  <div className="aspect-video bg-[repeating-linear-gradient(135deg,#0f172a_0_28px,#1e293b_28px_56px)] text-white grid place-items-center relative">
                    <div className="text-center">
                      <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                        {e.file_type === 'video' ? 'VIDEO EVIDENCE' : 'IMAGE EVIDENCE'}
                      </div>
                      <div className="mt-1 text-sm font-mono opacity-90">{e.file_format.toUpperCase()} · {Math.round((e.file_size_bytes || 0)/1024)} KB</div>
                    </div>
                    <span className="absolute left-3 top-3 chip bg-black/40 text-white ring-white/15">
                      Evidence #{i + 1}
                    </span>
                  </div>
                  <div className="p-3 text-xs text-ink-500 flex items-center justify-between">
                    <span>Uploaded {formatDate(e.uploaded_at)}</span>
                    <span className="font-mono">{(e.width_px || '-')}×{(e.height_px || '-')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {ai?.selected_frames?.length > 0 && (
            <div>
              <div className="flex items-center justify-between">
                <h3 className="section-h">AI-selected evidence frames</h3>
                <span className="chip bg-violet-50 text-violet-700 ring-1 ring-violet-200">
                  DEMO AI · Mock selection
                </span>
              </div>
              <div className="mt-4 grid gap-3 grid-cols-2 md:grid-cols-4">
                {ai.selected_frames.map((f: any, i: number) => (
                  <div key={i} className="rounded-xl ring-1 ring-black/5 overflow-hidden bg-white">
                    <div className="aspect-[4/3] grid place-items-center text-white text-xs"
                      style={{ background: ['#0F172A', '#182646', '#1E293B', '#24355E'][i % 4] }}>
                      <div className="text-center">
                        <div className="font-mono font-bold opacity-80">Frame #{f.index || i}</div>
                        <div className="mt-2 opacity-70">{f.label}</div>
                      </div>
                    </div>
                    <div className="p-2.5 text-[11px] text-ink-600">{f.note || f.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="section-h">Audit &amp; timeline</h3>
            <ol className="mt-4 relative border-l border-ink-100 ml-3 space-y-5">
              {[
                ['Case created', inc.detected_at, inc.source],
                ['Evidence uploaded', ai?.completed_at || inc.created_at, 'System'],
                ['Under authority review', inc.updated_at, 'Inspector Sharma'],
              ].filter(([, t]) => t).map(([title, t, actor], i) => (
                <li key={i} className="pl-5 relative">
                  <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-navy-700 ring-4 ring-white" />
                  <div className="text-sm font-semibold text-ink-900">{title}</div>
                  <div className="text-[11px] text-ink-500">{actor} · {formatDate(t as string)}</div>
                </li>
              ))}
            </ol>
          </div>
        </Card>

        {/* Right panel */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <div className="flex items-center justify-between">
              <h3 className="section-h">AI Analysis</h3>
              {ai?.is_mock && (
                <span className="chip bg-violet-50 text-violet-700 ring-1 ring-violet-200">DEMO AI</span>
              )}
            </div>
            <Disclaimer tone="ai" className="mt-3">
              AI-generated analysis — authority review required. Priority supports triage and is not a legal determination.
            </Disclaimer>
            <div className="mt-5 space-y-3 text-sm">
              <Row k="Issue" v={<TypeBadge type={ai?.blockage_detected ? 'LANE_BLOCKAGE' : (inc.type)} />} />
              <Row k="Confidence" v={<span className="font-bold text-ink-900">{Number(ai?.confidence || inc.confidence || 0).toFixed(0)}%</span>} />
              <Row k="Vehicles detected" v={<span className="font-semibold">{inc.vehicle_count || vehicles.length}</span>} />
              {inc.lane && (
                <Row k="Lane" v={`Lane ${inc.lane.number} · ${inc.lane.type.replace('_', ' ')} · allowed ${inc.lane.allowed}`} />
              )}
              {ai?.signal_state && <Row k="Signal at detection" v={<span className="font-bold">{ai.signal_state}</span>} />}
              {ai?.parking_detected != null && (
                <Row k="Parking suspected" v={ai.parking_detected ? 'Yes' : 'No'} />
              )}
              {ai?.wrong_side_detected != null && (
                <Row k="Wrong-side suspected" v={ai.wrong_side_detected ? 'Yes' : 'No'} />
              )}
              {ai?.blockage_detected != null && (
                <Row k="Lane blockage detected" v={ai.blockage_detected ? 'Yes' : 'No'} />
              )}
            </div>
            {ai?.evidence_quality_score != null && (
              <div className="mt-5 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Evidence Quality</div>
                    <div className="text-3xl font-extrabold text-ink-900 tabular-nums mt-0.5">
                      {ai.evidence_quality_score}<span className="text-sm font-semibold text-ink-500 ml-1">/ 100</span>
                    </div>
                    <div className="text-xs font-semibold mt-0.5" style={{
                      color: ai.evidence_quality_score >= 90 ? '#067647'
                        : ai.evidence_quality_score >= 75 ? '#B9770E'
                        : ai.evidence_quality_score >= 50 ? '#EA580C' : '#B42318'
                    }}>
                      {ai.evidence_quality_score >= 90 ? 'Excellent'
                        : ai.evidence_quality_score >= 75 ? 'Good'
                        : ai.evidence_quality_score >= 50 ? 'Poor' : 'Insufficient'}
                    </div>
                  </div>
                  <div className="w-24 h-2 bg-white rounded-full overflow-hidden ring-1 ring-ink-200">
                    <div className="h-full bg-navy-700" style={{ width: `${ai.evidence_quality_score}%` }} />
                  </div>
                </div>
                <ul className="mt-3 grid grid-cols-1 gap-1.5 text-[11px]">
                  {Object.entries(ai.evidence_quality_breakdown || {}).map(([k, v]) => (
                    <li key={k} className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5 ring-1 ring-ink-100">
                      <span className="text-ink-600 capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-ink-800 font-bold tabular-nums">{Number(v).toFixed(0)}</span>
                        {(Number(v) || 0) >= 80
                          ? <span className="text-accent-green">✓</span>
                          : <span className="text-accent-amber">△</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="section-h">Detected vehicles</h3>
            <p className="mt-0.5 text-xs text-ink-500">
              Types, synthetic plates and confidence from mock YOLO inference.
            </p>
            <div className="mt-4 space-y-2">
              {vehicles.length === 0 && (
                <div className="rounded-xl bg-ink-50 p-6 text-center text-sm text-ink-500">No linked vehicle rows.</div>
              )}
              {vehicles.slice(0, 12).map((v: any, i: number) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-black/5">
                  <div className="h-9 w-11 rounded-md bg-navy-800 text-white grid place-items-center text-[10px] font-bold">
                    {(v.vehicle_type || 'VEH').slice(0, 3).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold capitalize text-ink-900">{v.vehicle_type}</span>
                      {v.color && <span className="text-xs text-ink-500">· {v.color}</span>}
                      {v.direction && <span className="text-xs font-semibold text-ink-600 capitalize">· {v.direction.replace('_', ' ')}</span>}
                      {v.is_parked && <span className="chip bg-violet-50 text-violet-700 ring-1 ring-violet-200">parked</span>}
                    </div>
                    <div className="mt-0.5 text-[11px] font-mono text-ink-600">
                      {v.number_plate || <span className="text-ink-400">plate not readable</span>}
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-ink-500 tabular-nums">
                    {Number(v.confidence || 0).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        confirmLabel="Confirm action"
        tone="danger"
        onConfirm={() => confirm?.action()}
      />
    </div>
  )
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-ink-50 pb-2 last:border-none last:pb-0">
      <span className="text-xs font-bold uppercase tracking-wider text-ink-500 pt-1">{k}</span>
      <span className="text-ink-800 text-right">{v}</span>
    </div>
  )
}
