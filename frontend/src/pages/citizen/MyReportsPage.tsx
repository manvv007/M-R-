import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { Card, SectionHeader, Table, Th, Td, EmptyState } from '../../components/ui/Cards'
import { SourceBadge, StatusBadge, TypeBadge } from '../../components/ui/Badges'
import { formatDate, INCIDENT_TYPES } from '../../utils/format'

export default function MyReportsPage() {
  const nav = useNavigate()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/reports').then((r) => {
      setData(r.data.items || [])
    }).catch(() => {
      setData([
        { id: 2, type: 'ILLEGAL_PARKING', status: 'UNDER_REVIEW', location_text: 'Sector 21 Market Gate', submitted_at: new Date(Date.now() - 40 * 60_000).toISOString() },
        { id: 4, type: 'LANE_OBSTRUCTION', status: 'VERIFIED', location_text: 'Sector 21 Inner Circle Vegetable Market', submitted_at: new Date(Date.now() - 120 * 60_000).toISOString() },
        { id: 7, type: 'ILLEGAL_PARKING', status: 'RESOLVED', location_text: 'MG Road Galleria', submitted_at: new Date(Date.now() - 360 * 60_000).toISOString() },
      ])
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="container-page py-8 max-w-5xl">
      <SectionHeader
        kicker="My Reports"
        title="Track your submissions"
        subtitle="Status, AI analysis and authority feedback for each report you submit."
        actions={
          <>
            <Link to="/report" className="btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              Submit new report
            </Link>
          </>
        }
      />

      <Card padded={false} className="mt-6">
        <Table>
          <thead>
            <tr>
              <Th>Report</Th>
              <Th>Type</Th>
              <Th>Location</Th>
              <Th>Submitted</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 5 }).map((__, j) => (
                  <Td key={j}><div className="skeleton h-6 w-[80%]" /></Td>
                ))}
              </tr>
            ))}
            {!loading && data.length === 0 && (
              <tr>
                <Td className="!p-0 border-none">
                  <EmptyState
                    title="No reports yet"
                    hint="Help your city by reporting illegal parking, wrong-side driving, lane obstructions and more."
                    action={<Link to="/report" className="btn-primary">Submit your first report</Link>}
                  />
                </Td>
              </tr>
            )}
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-navy-50/50 cursor-pointer transition"
                onClick={() => nav(`/my-reports/${r.id}`)}>
                <Td>
                  <div className="flex items-center gap-3">
                    <SourceBadge source="CITIZEN" />
                    <div>
                      <div className="font-mono text-sm font-bold text-ink-900">#{r.id}</div>
                      <div className="text-[11px] text-ink-500">Citizen report</div>
                    </div>
                  </div>
                </Td>
                <Td><TypeBadge type={r.type} /></Td>
                <Td>
                  <div className="text-sm font-semibold text-ink-900">{r.location_text || '—'}</div>
                  {r.latitude && (
                    <div className="text-[11px] text-ink-500 font-mono">
                      {Number(r.latitude).toFixed(4)}, {Number(r.longitude).toFixed(4)}
                    </div>
                  )}
                </Td>
                <Td className="text-xs text-ink-500 tabular-nums">{formatDate(r.submitted_at)}</Td>
                <Td><StatusBadge status={r.status} size="sm" /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card className="mt-6">
        <h3 className="section-h">Report statuses</h3>
        <p className="mt-1 text-xs text-ink-500">
          Your report moves through these stages as it's processed by RoadWatch AI and traffic authorities.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['SUBMITTED', 'We received your report and are queueing AI analysis.'],
            ['AI_PROCESSING', 'AI is analyzing vehicle, plates, location and evidence quality.'],
            ['UNDER_REVIEW', 'Traffic authority is reviewing your evidence and analysis.'],
            ['MORE_INFO_REQUIRED', 'Please provide additional details or clearer evidence.'],
            ['VERIFIED', 'Authority confirmed the incident.'],
            ['REJECTED', 'Insufficient evidence or no clear violation.'],
            ['RESOLVED', 'Authority closed the issue with action taken.'],
            ['CLOSED', 'Finalized.'],
          ].map(([k, desc]) => (
            <div key={k} className="rounded-xl bg-white ring-1 ring-black/5 p-4">
              <StatusBadge status={k} />
              <div className="mt-2 text-xs text-ink-600 leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
