import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { Card, SectionHeader, Table, Th, Td } from '../../components/ui/Cards'
import { SeverityBadge, StatusBadge, TypeBadge } from '../../components/ui/Badges'
import { formatDate, INCIDENT_TYPES } from '../../utils/format'

export default function CitizenReportsPage() {
  const nav = useNavigate()
  const [data, setData] = useState<any>({ items: [], total: 0 })
  useEffect(() => {
    api.get('/api/reports', { params: { page_size: 50 } })
      .then((r) => setData(r.data))
      .catch(() => {})
  }, [])
  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="Citizen Reports"
        title="Reports submitted by citizens"
        subtitle="Tier 2 coverage for market-stretch mid-corridor segments without CCTV."
      />
      <Card padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>Report #</Th>
              <Th>Type</Th>
              <Th>Location</Th>
              <Th>Submitted</Th>
              <Th>Status</Th>
              <Th>Severity</Th>
            </tr>
          </thead>
          <tbody>
            {(data.items || []).map((r: any) => (
              <tr key={r.id} className="hover:bg-navy-50/50 cursor-pointer transition"
                onClick={() => nav(`/dashboard/incidents/${r.incident_id || 1}`)}>
                <Td className="font-mono text-sm font-bold">#{r.id}</Td>
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
                <Td><SeverityBadge severity={r.status === 'AI_PROCESSING' ? 'MEDIUM' : 'LOW'} size="sm" /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <h3 className="section-h">Possible duplicate incident</h3>
        <p className="mt-1 text-sm text-ink-500">
          AI-assisted duplicate detection based on location, timestamp, vehicle and visual similarity.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_1fr] items-center rounded-xl bg-accent-amberSoft p-5 ring-1 ring-accent-amber/20">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-accent-amber">Primary · Case RW-2026-00002</div>
            <div className="mt-1 text-sm font-bold text-ink-900">
              {INCIDENT_TYPES.ILLEGAL_PARKING} — Sector 21 Market Gate
            </div>
            <div className="text-xs text-ink-600 mt-0.5">Submitted 40 min ago · by Demo Citizen · Conf. 91%</div>
          </div>
          <div className="hidden md:block h-full w-px bg-amber-300/60" />
          <div className="hidden md:block h-full w-px bg-amber-300/60" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-accent-amber">4 reports may refer to the same event</div>
            <div className="mt-1 text-sm font-bold text-ink-900">
              Similarity score: 88.5%
            </div>
            <div className="text-xs text-ink-600 mt-0.5">
              Location + timestamp + vehicle match across submissions.
            </div>
          </div>
          <div className="md:col-span-3 flex items-center justify-end gap-2">
            <button className="btn-secondary">Review individually</button>
            <button className="btn-primary">Group reports</button>
          </div>
        </div>
      </Card>
    </div>
  )
}
