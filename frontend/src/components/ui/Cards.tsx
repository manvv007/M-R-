import { ReactNode } from 'react'
import { cn } from '../../utils/format'

export function StatCard({
  label, value, sub, icon, tone = 'default', trend,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  tone?: 'default' | 'navy' | 'warn' | 'danger' | 'success' | 'violet'
  trend?: { up?: boolean; value: string; label?: string }
}) {
  const toneBg: Record<string, string> = {
    default: 'bg-ink-50 text-ink-600 ring-ink-200',
    navy:    'bg-navy-50 text-navy-700 ring-navy-100',
    warn:    'bg-accent-amberSoft text-accent-amber ring-amber-200',
    danger:  'bg-accent-redSoft text-accent-red ring-red-100',
    success: 'bg-accent-greenSoft text-accent-green ring-emerald-200',
    violet:  'bg-violet-50 text-violet-700 ring-violet-100',
  }
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
          <div className="mt-1.5 text-2xl font-bold tracking-tight text-ink-900 sm:text-[28px]">
            {value}
          </div>
          {sub && <div className="mt-1 text-xs text-ink-500">{sub}</div>}
          {trend && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-2 py-0.5 text-[11px] font-semibold text-ink-600 ring-1 ring-ink-100">
              <span className={trend.up ? 'text-accent-green' : 'text-accent-red'}>
                {trend.up ? '▲' : '▼'}
              </span>
              {trend.value}
              {trend.label && <span className="text-ink-400">{trend.label}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1',
            toneBg[tone],
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

export function SectionHeader({
  title, subtitle, actions, kicker,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  kicker?: string
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {kicker && <div className="kicker mb-1.5">{kicker}</div>}
        <h2 className="text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ children, className, padded = true, as = 'div' }: {
  children: ReactNode
  className?: string
  padded?: boolean
  as?: 'div' | 'section'
}) {
  const Tag = as as any
  return (
    <Tag className={cn('card', padded && 'p-5 sm:p-6', className)}>
      {children}
    </Tag>
  )
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('w-full overflow-hidden rounded-xl ring-1 ring-black/5 bg-white', className)}>
      <div className="w-full overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          {children}
        </table>
      </div>
    </div>
  )
}

export function Th({ children, className, align = 'left' }: {
  children: ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}) {
  return (
    <th
      className={cn(
        'bg-ink-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
    >
      {children}
    </th>
  )
}

export function Td({ children, className, align = 'left', padY = 'py-3.5' }: {
  children?: ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
  padY?: string
}) {
  return (
    <td
      className={cn(
        'border-t border-ink-100 px-4 text-ink-800 align-middle',
        padY,
        align === 'right' && 'text-right tabular-nums',
        align === 'center' && 'text-center',
        className
      )}
    >
      {children}
    </td>
  )
}

export function DemoRibbon({ text = 'DEMO MODE — SYNTHETIC DATA' }: { text?: string }) {
  return (
    <div className="demo-banner text-[11px] font-bold uppercase tracking-[0.18em] text-amber-100/90 py-2 text-center">
      <span className="inline-flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 pulse-alert" />
        {text}
      </span>
    </div>
  )
}

export function Disclaimer({ children, tone = 'info', className }: {
  children: ReactNode
  tone?: 'info' | 'ai' | 'sim'
  className?: string
}) {
  const palette = {
    info: 'bg-accent-blueSoft text-navy-800 ring-navy-100',
    ai:   'bg-violet-50 text-violet-800 ring-violet-100',
    sim:  'bg-ink-100 text-ink-700 ring-ink-200',
  }[tone]
  return (
    <div className={cn(
      'flex gap-3 rounded-xl px-4 py-3 text-xs ring-1',
      palette,
      className,
    )}>
      <svg className="mt-0.5 shrink-0 text-current opacity-70" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
      </svg>
      <div className="leading-relaxed">{children}</div>
    </div>
  )
}

export function Tabs({
  tabs, active, onChange,
}: {
  tabs: { id: string; label: string; count?: number }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-ink-100/70 p-1">
      {tabs.map((t) => {
        const isActive = t.id === active
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition',
              isActive
                ? 'bg-white text-ink-900 shadow-sm ring-1 ring-black/5'
                : 'text-ink-600 hover:text-ink-900'
            )}
          >
            {t.label}
            {typeof t.count === 'number' && (
              <span className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-bold',
                isActive ? 'bg-navy-50 text-navy-700' : 'bg-white/70 text-ink-500'
              )}>
                {t.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export { StatusBadge, EmptyState, ConfirmDialog } from './Badges'
