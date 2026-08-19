export const INCIDENT_TYPES = {
  LANE_BLOCKAGE: 'Lane Blockage',
  ILLEGAL_PARKING: 'Illegal Parking',
  WRONG_SIDE: 'Wrong-Side Driving',
  LANE_OBSTRUCTION: 'Lane Obstruction',
  DANGEROUS_DRIVING: 'Dangerous Driving',
  SIGNAL_VIOLATION: 'Signal Violation',
  OTHER: 'Other',
} as const

export type IncidentTypeKey = keyof typeof INCIDENT_TYPES

export const INCIDENT_SOURCES = {
  CCTV: 'CCTV / AI',
  CITIZEN: 'Citizen Report',
  ANALYST: 'Analyst',
}

export const STATUS_LABELS: Record<string, string> = {
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
}

export const SEVERITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return '—'
  const dt = typeof d === 'string' ? new Date(d) : d
  return dt.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function timeAgo(d: string | Date | null | undefined) {
  if (!d) return '—'
  const dt = typeof d === 'string' ? new Date(d) : d
  const diff = Date.now() - dt.getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d ago`
  return dt.toLocaleDateString()
}

export function cn(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(' ')
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}
