import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import { Card, SectionHeader, Table, Th, Td, EmptyState, Tabs } from '../../components/ui/Cards'
import { PriorityMeter, SeverityBadge, SourceBadge, StatusBadge, TypeBadge } from '../../components/ui/Badges'
import { INCIDENT_TYPES, formatDate } from '../../utils/format'

export default function IncidentsPage() {
  const [sp, setSp] = useSearchParams()
  const nav = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const activeType = sp.get('type') || 'ALL'
  const activeStatus = sp.get('status') || 'ALL'

  const types = useMemo(() => {
    const all = Object.keys(INCIDENT_TYPES)
    return [{ id: 'ALL', label: 'All Types', count: data?.total ?? 0 }, ...all.map((k) => ({
      id: k, label: INCIDENT_TYPES[k as keyof typeof INCIDENT_TYPES]
    }))]
  }, [data])

  const statuses = [
    { id: 'ALL', label: 'All Statuses' },
    { id: 'SUBMITTED' }, { id: 'AI_PROCESSING' }, { id: 'UNDER_REVIEW' },
    { id: 'VERIFIED' }, { id: 'REJECTED' }, { id: 'RESOLVED' },
  ].map((s) => ({ id: s.id, label: s.label || s.id }))

  useEffect(() => {
    setLoading(true)
    const q: Record<string, any> = { page: 1, page_size: 50 }
    if (activeType !== 'ALL') q.type = activeType
    if (activeStatus !== 'ALL') q.status = activeStatus
    api.get('/api/incidents', { params: q })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false))
  }, [activeType, activeStatus])

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="Incidents"
        title="All flagged incidents"
        subtitle="AI-detected and citizen-submitted cases, triaged by priority and confidence."
        actions={
          <>
            <Link to="/dashboard/live" className="btn-secondary">Live monitoring</Link>
            <Link to="/dashboard/reports" className="btn-primary">Review citizen reports</Link>
          </>
        }
      />

      <div className="space-y-4">
        <Tabs tabs={types.map(t => ({
          ...t, count: t.id === 'ALL' ? data?.total : undefined
        }))} active={activeType} onChange={(id) => { sp.set('type', id); setSp(sp, { replace: true }) }} />
        <Tabs tabs={statuses} active={activeStatus} onChange={(id) => { sp.set('status', id); setSp(sp, { replace: true }) }} />
      </div>

      <Card padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>Case</Th>
              <Th>Type</Th>
              <Th>Location</Th>
              <Th>Source</Th>
              <Th align="right">Confidence</Th>
              <Th>Priority</Th>
              <Th>Status</Th>
              <Th>Detected</Th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 8 }).map((_, j) => (
                  <Td key={j}><div className="skeleton h-6 w-[80%]" /></Td>
                ))}
              </tr>
            ))}
            {(data?.items || []).map((inc: any) => (
              <tr
                key={inc.id}
                onClick={() => nav(`/dashboard/incidents/${inc.id}`)}
                className="cursor-pointer transition hover:bg-navy-50/50"
              >
                <Td>
                  <div className="flex items-center gap-3">
                    <SeverityBadge severity={inc.severity} size="sm" />
                    <div className="font-mono text-sm font-bold text-ink-900">{inc.case_number}</div>
                  </div>
                </Td>
                <Td><TypeBadge type={inc.type} /></Td>
                <Td>
                  <div className="text-sm font-semibold text-ink-900">
                    {inc.junction?.name || inc.corridor?.name || 'Unknown location'}
                  </div>
                </Td>
                <Td><SourceBadge source={inc.source} /></Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-2">
                    <PriorityMeter score={Math.round(Number(inc.confidence || 0))} size="sm" />
                  </div>
                </Td>
                <Td><PriorityMeter score={inc.priority_score ?? 50} size="sm" /></Td>
                <Td><StatusBadge status={inc.status} size="sm" /></Td>
                <Td className="text-xs text-ink-500 tabular-nums">{formatDate(inc.detected_at)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!loading && (!data?.items || data.items.length === 0) && (
          <EmptyState
            title="No incidents match these filters"
            hint="Try a different type or status tab."
          />
        )}
      </Card>
    </div>
  )
}
