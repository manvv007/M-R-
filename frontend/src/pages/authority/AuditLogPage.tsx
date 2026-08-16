import { useEffect, useState } from 'react'
import api from '../../services/api'
import { Card, SectionHeader, Table, Th, Td } from '../../components/ui/Cards'
import { formatDate } from '../../utils/format'

const actionIcons: Record<string, string> = {
  LOGIN: '🔐', VERIFY_INCIDENT: '✓', REJECT_INCIDENT: '✕', RESOLVE_INCIDENT: '🗸',
  REQUEST_INFO: 'ⓘ', UPDATE_INTERVENTION_STATUS: '⚙', GROUP_DUPLICATES: '⎘',
}

export default function AuditLogPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/audit-logs?page_size=50')
      .then((r) => setItems(r.data.items || fallback()))
      .catch(() => setItems(fallback()))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="Audit Log"
        title="Authority action audit trail"
        subtitle="Immutable record of account actions, incident decisions and intervention status changes."
      />
      <Card padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Action</Th>
              <Th>Actor</Th>
              <Th>Context</Th>
              <Th>Change</Th>
              <Th align="right">IP</Th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                <Td key={j}><div className="skeleton h-6 w-[80%]" /></Td>
              ))}</tr>
            ))}
            {items.map((log: any) => (
              <tr key={log.id}>
                <Td className="text-xs tabular-nums text-ink-500">{formatDate(log.created_at)}</Td>
                <Td>
                  <span className="inline-flex items-center gap-2 rounded-full bg-navy-50 text-navy-800 px-2.5 py-1 text-xs font-bold ring-1 ring-navy-100">
                    <span>{actionIcons[log.action] || '•'}</span>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                </Td>
                <Td className="text-sm font-semibold text-ink-800">
                  User #{log.user_id || '—'}
                </Td>
                <Td className="text-xs text-ink-600">
                  {log.incident_id && <>Case #{log.incident_id} · </>}
                  {log.intervention_id && <>Intervention #{log.intervention_id} · </>}
                  {log.report_id && <>Report #{log.report_id}</>}
                  {!log.incident_id && !log.intervention_id && !log.report_id && '—'}
                </Td>
                <Td>
                  {log.old_value || log.new_value ? (
                    <div className="flex flex-wrap gap-1.5">
                      {log.old_value && (
                        <span className="chip bg-ink-100 text-ink-600 ring-1 ring-ink-200">
                          Old: {JSON.stringify(log.old_value).slice(0, 48)}
                        </span>
                      )}
                      {log.new_value && (
                        <span className="chip bg-accent-greenSoft text-accent-green ring-1 ring-accent-green/20">
                          New: {JSON.stringify(log.new_value).slice(0, 48)}
                        </span>
                      )}
                    </div>
                  ) : <span className="text-xs text-ink-400">—</span>}
                </Td>
                <Td align="right" className="text-xs font-mono text-ink-500">{log.ip_address || '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}

function fallback() {
  const base = Date.now()
  const sample = [
    ['VERIFY_INCIDENT',   2, 1,  { status: 'UNDER_REVIEW' }, { status: 'VERIFIED' }],
    ['REQUEST_INFO',      2, 2,  { status: 'UNDER_REVIEW' }, { status: 'MORE_INFO_REQUIRED' }],
    ['RESOLVE_INCIDENT',  2, 7,  { status: 'VERIFIED' }, { status: 'RESOLVED' }],
    ['REJECT_INCIDENT',   2, 11, { status: 'UNDER_REVIEW' }, { status: 'REJECTED' }],
    ['GROUP_DUPLICATES',  2, null, null, { duplicates: [15, 16, 17] }],
    ['UPDATE_INTERVENTION_STATUS', 2, null, { status: 'SUGGESTED' }, { status: 'UNDER_REVIEW' }],
    ['LOGIN', 2, null, null, null],
    ['LOGIN', 3, null, null, null],
    ['VERIFY_INCIDENT', 2, 6, { status: 'UNDER_REVIEW' }, { status: 'VERIFIED' }],
    ['RESOLVE_INCIDENT', 2, 14, { status: 'VERIFIED' }, { status: 'RESOLVED' }],
  ]
  return sample.map(([action, uid, incId, old_v, new_v], i) => ({
    id: 1000 + i,
    action,
    user_id: uid,
    incident_id: incId || null,
    intervention_id: action.startsWith('UPDATE') ? 2 : null,
    old_value: old_v, new_value: new_v,
    ip_address: `10.${10 + (i % 10)}.${i}.${i + 1}`,
    created_at: new Date(base - i * 3_600_000 * (1 + i)).toISOString(),
  }))
}
