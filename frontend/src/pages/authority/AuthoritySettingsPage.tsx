import { Link } from 'react-router-dom'
import { useDemoMode } from '../../contexts/DemoModeContext'
import { useAuth } from '../../contexts/AuthContext'
import { Card, SectionHeader, Disclaimer } from '../../components/ui/Cards'

export default function AuthoritySettingsPage() {
  const { demoMode, toggleDemoMode, setDemoMode } = useDemoMode()
  const { user } = useAuth()
  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="Settings"
        title="Control Center settings"
        subtitle="Demo mode toggle, AI pipeline config and user profile."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="section-h">Demo mode</h3>
          <p className="text-sm text-ink-600 mt-1">
            When enabled, RoadWatch uses synthetic incidents, detections and reports for live presentation.
          </p>
          <div className="mt-5 flex items-center justify-between rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
            <div>
              <div className="text-sm font-bold text-amber-900">
                DEMO MODE — {demoMode ? 'ENABLED' : 'DISABLED'}
              </div>
              <div className="text-xs text-amber-800 mt-0.5">
                Do not confuse synthetic prototype data with real enforcement data.
              </div>
            </div>
            <label className="inline-flex items-center cursor-pointer select-none">
              <input type="checkbox" className="sr-only" checked={demoMode} onChange={toggleDemoMode} />
              <span className="relative">
                <span className="block h-7 w-12 rounded-full transition"
                  style={{ background: demoMode ? '#0F172A' : '#CBD5E1' }} />
                <span className="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform"
                  style={{ transform: `translateX(${demoMode ? '24px' : '0'})` }} />
              </span>
            </label>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[true, false].map((v) => (
              <button key={String(v)} onClick={() => setDemoMode(v)}
                className={'rounded-lg px-3 py-2 text-xs font-semibold ring-1 ' +
                  (demoMode === v ? 'bg-navy-800 text-white ring-navy-800'
                                   : 'bg-white text-ink-700 ring-ink-200 hover:bg-ink-50')}>
                DEMO {v ? 'ON' : 'OFF'}
              </button>
            ))}
            <Link to="/" className="rounded-lg px-3 py-2 text-xs font-semibold text-center ring-1 bg-white text-ink-700 ring-ink-200 hover:bg-ink-50">
              Public site
            </Link>
          </div>
        </Card>

        <Card>
          <h3 className="section-h">AI pipeline configuration</h3>
          <p className="text-sm text-ink-600 mt-1">
            RoadWatch ships with a mock AI analyzer. Configure real YOLO + OCR endpoints after MVP.
          </p>
          <ul className="mt-5 space-y-3 text-sm">
            {[
              ['Vehicle detector model', 'YOLOv8n (mock)', 'Use real ultralytics model'],
              ['OCR / ANPR engine', 'EasyOCR-compatible mock', 'PaddleOCR for Indian plates'],
              ['Lane blockage occupancy threshold', '> 60%', 'Per-lane / per-junction tunable'],
              ['Blockage duration threshold', '10 s', '20+ s = HIGH severity'],
            ].map(([k, v, hint]) => (
              <li key={k} className="flex items-start justify-between gap-3 rounded-lg bg-ink-50 p-3 ring-1 ring-ink-100">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{k}</div>
                  <div className="mt-0.5 font-semibold text-ink-900">{v}</div>
                </div>
                <div className="text-right text-xs text-ink-500 max-w-[42%]">{hint}</div>
              </li>
            ))}
          </ul>
          <Disclaimer tone="sim" className="mt-5">
            MOCK AI MODE — demo outputs are synthetic. Real inference endpoints replace mock pipeline without UI changes.
          </Disclaimer>
        </Card>

        <Card>
          <h3 className="section-h">Signed-in user</h3>
          <div className="mt-4 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-navy-800 text-white grid place-items-center text-2xl font-extrabold ring-2 ring-white shadow-card">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="text-base font-bold text-ink-900">{user?.full_name}</div>
              <div className="text-sm text-ink-600">{user?.email}</div>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-navy-700 ring-1 ring-navy-100">
                {user?.role}
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link to="/dashboard/audit-log" className="btn-secondary !w-full">View my audit actions</Link>
            <Link to="/logout" className="btn-secondary !w-full" onClick={(e) => { e.preventDefault(); localStorage.clear(); location.href = '/login' }}>
              Sign out
            </Link>
          </div>
        </Card>

        <Card>
          <h3 className="section-h">Privacy &amp; responsible use</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-700">
            <li>✓ AI only assists authorized traffic authorities — it never issues challans automatically.</li>
            <li>✓ Final enforcement and review decisions remain with authorized officials.</li>
            <li>✓ Demo number plates shown are synthetic (GJ XX 0000 style) — no real PII is exposed.</li>
            <li>✓ Uploaded evidence is protected by role-based access. Citizens see only their own reports.</li>
          </ul>
          <Disclaimer tone="info" className="mt-4">
            RoadWatch is an AI-assisted decision-support prototype. Refer to SIH documentation for deployment and privacy controls.
          </Disclaimer>
        </Card>
      </div>
    </div>
  )
}
