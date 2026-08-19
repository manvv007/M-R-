import { ReactNode } from 'react'
import { cn } from '../../utils/format'

export function StatusBadge({
  status,
  size = 'md',
}: {
  status: string | null | undefined
  size?: 'sm' | 'md'
}) {
  const s = (status || 'UNKNOWN').toUpperCase().replace(/_/g, '_')
  const cls = (() => {
    switch (s) {
      case 'SUBMITTED':
      case 'ACTIVE':
      case 'SUGGESTED':
        return 'bg-accent-blueSoft text-accent-blue ring-1 ring-accent-blue/20'
      case 'AI_PROCESSING':
      case 'UNDER_REVIEW':
        return 'bg-accent-amberSoft text-accent-amber ring-1 ring-accent-amber/20'
      case 'MORE_INFO_REQUIRED':
      case 'PENDING':
        return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
      case 'VERIFIED':
      case 'APPROVED':
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
      case 'REJECTED':
      case 'CLOSED':
        return 'bg-ink-100 text-ink-700 ring-1 ring-ink-200'
      case 'RESOLVED':
      case 'IMPLEMENTED':
        return 'bg-accent-greenSoft text-accent-green ring-1 ring-accent-green/20'
      default:
        return 'bg-ink-100 text-ink-700 ring-1 ring-ink-200'
    }
  })()
  const label = {
    SUBMITTED: 'Submitted',
    AI_PROCESSING: 'AI Processing',
    UNDER_REVIEW: 'Under Review',
    VERIFIED: 'Verified',
    REJECTED: 'Rejected',
    MORE_INFO_REQUIRED: 'More Info Required',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
    ACTIVE: 'Active',
    SUGGESTED: 'Suggested',
    APPROVED: 'Approved',
    IMPLEMENTED: 'Implemented',
  }[s] || status || '—'
  return (
    <span className={cn(
      'chip',
      cls,
      size === 'sm' ? 'text-[11px] px-2 py-0' : ''
    )}>
      {label}
    </span>
  )
}

export function SeverityBadge({ severity, size = 'md' }: { severity: string | null | undefined; size?: 'sm' | 'md' }) {
  const s = (severity || 'MEDIUM').toUpperCase()
  const map: Record<string, string> = {
    LOW:      'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    MEDIUM:   'bg-accent-amberSoft text-accent-amber ring-1 ring-accent-amber/25',
    HIGH:     'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
    CRITICAL: 'bg-accent-redSoft text-accent-red ring-1 ring-accent-red/20',
  }
  const label = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' }[s] || s
  return (
    <span className={cn('chip', map[s] || map.MEDIUM, size === 'sm' ? 'text-[11px] px-2 py-0' : '')}>
      {label}
    </span>
  )
}

export function PriorityMeter({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) {
  const level = score >= 85 ? 'CRITICAL' : score >= 70 ? 'HIGH' : score >= 45 ? 'MEDIUM' : 'LOW'
  const color = {
    LOW: '#0EA5E9', MEDIUM: '#B9770E', HIGH: '#EA580C', CRITICAL: '#B42318'
  }[level]
  const h = size === 'sm' ? 6 : 8
  return (
    <div className="flex items-center gap-2">
      <div className={cn('rounded-full bg-ink-100 overflow-hidden', size === 'sm' ? 'w-20' : 'w-28')} style={{ height: h }}>
        <div style={{ width: `${Math.max(0, Math.min(100, score))}%`, height: '100%', background: color, borderRadius: 9999 }} />
      </div>
      <span className="text-xs font-semibold text-ink-800 tabular-nums">{score}/100</span>
    </div>
  )
}

export function TypeBadge({ type }: { type: string | null | undefined }) {
  const t = (type || 'OTHER').toUpperCase().replace(/-/g, '_')
  const map: Record<string, { label: string; cls: string }> = {
    LANE_BLOCKAGE:       { label: 'Lane Blockage',       cls: 'bg-navy-50 text-navy-700 ring-1 ring-navy-200' },
    ILLEGAL_PARKING:     { label: 'Illegal Parking',     cls: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' },
    WRONG_SIDE:          { label: 'Wrong-Side Driving',  cls: 'bg-accent-redSoft text-accent-red ring-1 ring-accent-red/15' },
    LANE_OBSTRUCTION:    { label: 'Lane Obstruction',    cls: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' },
    DANGEROUS_DRIVING:   { label: 'Dangerous Driving',   cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' },
    SIGNAL_VIOLATION:    { label: 'Signal Violation',    cls: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' },
    OTHER:               { label: 'Other',               cls: 'bg-ink-100 text-ink-700 ring-1 ring-ink-200' },
  }
  const def = map[t] || map.OTHER
  return <span className={cn('chip', def.cls)}>{def.label}</span>
}

export function SourceBadge({ source }: { source: string | null | undefined }) {
  const s = (source || 'CCTV').toUpperCase()
  const isCitizen = s === 'CITIZEN'
  return (
    <span className={cn(
      'chip',
      isCitizen
        ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
        : 'bg-navy-50 text-navy-700 ring-1 ring-navy-200'
    )}>
      <span className="w-1.5 h-1.5 rounded-full" style={{
        background: isCitizen ? '#6366F1' : '#182646',
      }} />
      {s === 'CITIZEN' ? 'Citizen' : 'CCTV / AI'}
    </span>
  )
}

export function EmptyState({ title, hint, icon, action }: {
  title: string
  hint?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="card px-8 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-500">
        {icon || (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <h3 className="mt-5 text-base font-bold text-ink-900">{title}</h3>
      {hint && <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ConfirmDialog({
  open, onClose, title, message, confirmLabel = 'Confirm',
  onConfirm, tone = 'default',
}: {
  open: boolean
  onClose: () => void
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  tone?: 'default' | 'danger'
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-card-lg p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-ink-900">{title}</h3>
        <p className="mt-2 text-sm text-ink-600">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
            onClick={() => { onConfirm(); onClose() }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
