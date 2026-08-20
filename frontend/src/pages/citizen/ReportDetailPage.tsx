import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../services/api'
import { Card, Disclaimer } from '../../components/ui/Cards'
import { StatusBadge, TypeBadge } from '../../components/ui/Badges'
import { formatDate } from '../../utils/format'

export default function ReportDetailPage() {
  const { id } = useParams()
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    api.get(`/api/reports/${id}`).then((r) => setData(r.data)).catch(() => {
      setData({
        report: {
          id, type: 'ILLEGAL_PARKING', status: 'UNDER_REVIEW',
          location_text: 'Sector 21 Market Gate',
          latitude: 28.4595, longitude: 77.0266,
          description: 'Car parked on left-turn approach for 20+ minutes.',
          submitted_at: new Date(Date.now() - 40 * 60_000).toISOString(),
        },
        evidence: [],
        ai_analysis: [{
          analysis_type: 'full', is_mock: true, confidence: 91,
          number_plate: 'GJ05XX0001',
          parking_detected: true, wrong_side_detected: false, blockage_detected: false,
          evidence_quality_score: 92,
          evidence_quality_breakdown: { image_clarity: 94, vehicle_visible: 100, location_available: 100, timestamp_available: 100, context_sufficient: 90, number_plate_readable: 75 },
          vehicle_summary: { count: 1, primary_class: 'Car' },
          selected_frames: [
            { index: 0, label: 'Vehicle approach view' },
            { index: 8, label: 'Road / signal context' },
            { index: 14, label: 'Violation captured' },
            { index: 21, label: 'Number plate close-up' },
          ],
        }]
      })
    })
  }, [id])

  if (!data) return <div className="container-page py-10">Loading report…</div>
  const rep = data.report
  const ai = (data.ai_analysis || [])[0]

  return (
    <div className="container-page py-8 max-w-5xl space-y-6">
      <div>
        <Link to="/my-reports" className="link text-xs font-semibold">← My reports</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="text-2xl font-extrabold tracking-tight text-ink-900">Report #{rep.id}</div>
          <StatusBadge status={rep.status} />
          <TypeBadge type={rep.type} />
          <span className="chip bg-amber-50 text-amber-700 ring-1 ring-amber-200">DEMO DATA</span>
        </div>
        <div className="mt-1 text-xs text-ink-500">
          Submitted {formatDate(rep.submitted_at)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8 space-y-6">
          <div>
            <h3 className="section-h">Details</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info k="Location" v={rep.location_text || '—'} />
              {rep.latitude && (
                <Info k="Coordinates" v={<span className="font-mono">{rep.latitude.toFixed?.(4) ?? rep.latitude}, {rep.longitude?.toFixed?.(4) ?? rep.longitude}</span>} />
              )}
              <Info k="Type" v={<TypeBadge type={rep.type} />} />
              <Info k="Status" v={<StatusBadge status={rep.status} />} />
            </div>
            {rep.description && (
              <div className="mt-4 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100 text-sm text-ink-800">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500 mb-1.5">Your description</div>
                {rep.description}
              </div>
            )}
          </div>

          <div>
            <h3 className="section-h">Evidence</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {((data.evidence && data.evidence.length > 0) ? data.evidence : [{ file_url: '/uploads/evidence_illegal_parking.jpg', file_format: 'jpg', file_size_bytes: 1076905 }]).map((e: any, i: number) => {
                const imgUrl = e.file_url && !e.file_url.includes('demo_') ? e.file_url.replace('/static/evidence/', '/uploads/') : (rep?.type === 'WRONG_SIDE' ? '/uploads/evidence_wrong_side.jpg' : rep?.type === 'ILLEGAL_PARKING' ? '/uploads/evidence_illegal_parking.jpg' : '/uploads/evidence_lane_blockage.jpg');
                return (
                  <div key={i} className="rounded-xl ring-1 ring-black/10 overflow-hidden bg-slate-900 shadow-md group relative">
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={imgUrl}
                        alt={`Evidence photo #${i + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(evt) => {
                          (evt.target as HTMLImageElement).src = '/uploads/evidence_illegal_parking.jpg';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                      <span className="absolute left-3 top-3 chip bg-black/60 backdrop-blur-md text-white font-semibold text-xs">
                        Evidence #{i + 1}
                      </span>
                    </div>
                    <div className="p-3 text-xs text-slate-300 bg-slate-900 flex items-center justify-between border-t border-slate-800 font-mono">
                      <span>{e.file_format?.toUpperCase() || 'JPG'} FILE</span>
                      <span>{Math.round((e.file_size_bytes || 1000000)/1024)} KB</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="section-h">Timeline</h3>
            <ol className="mt-4 relative border-l border-ink-100 ml-3 space-y-5">
              {[
                ['Report received', rep.submitted_at, 'System'],
                ['AI analysis complete', rep.submitted_at, 'RoadWatch AI'],
                ['Under authority review', rep.submitted_at, 'Inspector Sharma'],
              ].map(([t, time, actor], i) => (
                <li key={i} className="pl-5 relative">
                  <span className="absolute -left-[7px] top-1.5 h-3.5 w-3.5 rounded-full bg-navy-700 ring-4 ring-white" />
                  <div className="text-sm font-semibold text-ink-900">{t}</div>
                  <div className="text-[11px] text-ink-500">{actor} · {formatDate(time as string)}</div>
                </li>
              ))}
            </ol>
          </div>
        </Card>

        <Card className="lg:col-span-4 space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="section-h">AI Analysis</h3>
              {ai?.is_mock && (
                <span className="chip bg-violet-50 text-violet-700 ring-1 ring-violet-200">DEMO AI</span>
              )}
            </div>
            <div className="mt-4 grid gap-2.5 text-sm">
              <Row k="Issue" v={<TypeBadge type={rep.type} />} />
              <Row k="Confidence" v={<span className="font-bold tabular-nums">{Number(ai?.confidence || 88).toFixed(0)}%</span>} />
              <Row k="Vehicle" v={<span className="font-semibold capitalize text-ink-900">{ai?.vehicle_summary?.primary_class || 'Car'}</span>} />
              <Row k="Number plate" v={
                <span className="font-mono font-bold text-ink-900">
                  {ai?.number_plate || <span className="font-normal text-ink-400">Not clearly readable</span>}
                </span>
              } />
              <Row k="Evidence quality"
                v={<span className="text-sm font-bold tabular-nums" style={{
                  color: (ai?.evidence_quality_score || 0) >= 75 ? '#067647' : '#B9770E'
                }}>{ai?.evidence_quality_score || 85}/100</span>} />
            </div>
          </div>

          <div className="rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Quality breakdown</div>
              </div>
              <div className="text-3xl font-extrabold tabular-nums text-ink-900">
                {ai?.evidence_quality_score || 92}
              </div>
            </div>
            <ul className="mt-3 space-y-1.5 text-[11px]">
              {Object.entries(ai?.evidence_quality_breakdown || {}).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5 ring-1 ring-ink-100">
                  <span className="capitalize text-ink-600">{(k as string).replace(/_/g, ' ')}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-bold tabular-nums text-ink-800">{Number(v).toFixed(0)}</span>
                    {(Number(v) || 0) >= 80 ? <span className="text-accent-green">✓</span> : <span className="text-accent-amber">△</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <Disclaimer tone="ai">
            AI analysis is advisory only. Traffic authorities perform final verification and enforcement.
          </Disclaimer>

          <Link to="/report" className="btn-secondary w-full">Submit another report</Link>
        </Card>
      </div>
    </div>
  )
}

function Info({ k, v }: any) {
  return (
    <div className="rounded-xl bg-ink-50 px-4 py-3 ring-1 ring-ink-100">
      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{k}</div>
      <div className="mt-0.5 text-sm font-semibold text-ink-900">{v}</div>
    </div>
  )
}
function Row({ k, v }: any) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-ink-50 pb-2 last:border-none">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500 pt-1">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  )
}
