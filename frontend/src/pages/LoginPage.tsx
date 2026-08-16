import { FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Card, Disclaimer } from '../components/ui/Cards'

export default function LoginPage() {
  const { login } = useAuth()
  const nav = useNavigate()
  const loc = useLocation() as any
  const redirectTo = loc.state?.from || '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      await login(email, password)
      nav(redirectTo, { replace: true })
    } catch (e: any) {
      const detail = e?.response?.data?.detail || 'Invalid credentials. Please try again.'
      setErr(typeof detail === 'string' ? detail : 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-180px)] grid place-items-center py-12 px-4">
      <Card className="w-full max-w-md">
        <div className="mb-6">
          <div className="kicker">Control Center</div>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-ink-900">Sign in to RoadWatch</h1>
          <p className="mt-1.5 text-sm text-ink-600">
            Authority, analyst or citizen — your role unlocks the right dashboard.
          </p>
        </div>
        {err && (
          <div className="mb-4 rounded-xl bg-accent-redSoft text-accent-red ring-1 ring-accent-red/20 px-4 py-3 text-sm">
            {err}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email address</label>
            <input required type="email" className="input" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="name@roadwatch.in" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="label mb-0">Password</label>
              <span className="text-[11px] text-ink-500">Demo creds shown below</span>
            </div>
            <input required type="password" className="input mt-1.5" autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password" />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing you in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={() => { setEmail('authority@roadwatch.in'); setPassword('Authority@123') }}
            className="rounded-xl bg-navy-50 text-navy-800 ring-1 ring-navy-100 px-4 py-3 text-left text-sm hover:bg-navy-100 transition"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-navy-600">Traffic Authority · Quick sign-in</div>
            <div className="mt-0.5 font-semibold">authority@roadwatch.in · Authority@123</div>
          </button>
          <button
            type="button"
            onClick={() => { setEmail('citizen@roadwatch.in'); setPassword('Citizen@123') }}
            className="rounded-xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 px-4 py-3 text-left text-sm hover:bg-emerald-100 transition"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Citizen · Quick sign-in</div>
            <div className="mt-0.5 font-semibold">citizen@roadwatch.in · Citizen@123</div>
          </button>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm">
          <div className="text-ink-600">
            No account? <Link to="/register" className="link font-semibold">Register as citizen</Link>
          </div>
          <Link to="/" className="link font-semibold">← Home</Link>
        </div>
        <div className="mt-6">
          <Disclaimer tone="info">
            RoadWatch is an AI-assisted decision-support prototype. Final enforcement decisions remain with authorized traffic authorities.
          </Disclaimer>
        </div>
      </Card>
    </div>
  )
}
