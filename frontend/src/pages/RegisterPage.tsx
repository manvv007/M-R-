import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Card, Disclaimer } from '../components/ui/Cards'

export default function RegisterPage() {
  const { register } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' })
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null); setLoading(true)
    try {
      await register({ ...form, role: 'citizen' })
      setOk(true)
      setTimeout(() => nav('/my-reports'), 300)
    } catch (e: any) {
      const detail = e?.response?.data?.detail || 'Unable to create account.'
      setErr(Array.isArray(detail) ? detail[0]?.msg || 'Invalid input' : detail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-180px)] grid place-items-center py-12 px-4">
      <Card className="w-full max-w-md">
        <div className="mb-6">
          <div className="kicker">Create account</div>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-ink-900">
            Join RoadWatch as a citizen
          </h1>
          <p className="mt-1.5 text-sm text-ink-600">
            Report issues in your area, track their progress, and contribute to less congested roads.
          </p>
        </div>
        {ok && (
          <div className="mb-4 rounded-xl bg-accent-greenSoft text-accent-green ring-1 ring-accent-green/20 px-4 py-3 text-sm">
            Account created. Taking you to your dashboard…
          </div>
        )}
        {err && (
          <div className="mb-4 rounded-xl bg-accent-redSoft text-accent-red ring-1 ring-accent-red/20 px-4 py-3 text-sm">
            {err}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input required className="input"
              value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="e.g. Aarav Sharma" />
          </div>
          <div>
            <label className="label">Email address</label>
            <input required type="email" className="input" autoComplete="email"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com" />
          </div>
          <div>
            <label className="label">Phone number <span className="text-ink-400 font-normal">(optional)</span></label>
            <input className="input" inputMode="tel"
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210" />
          </div>
          <div>
            <label className="label">Password</label>
            <input required type="password" minLength={6} className="input" autoComplete="new-password"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 6 characters" />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create citizen account'}
          </button>
        </form>
        <div className="mt-5 text-sm text-ink-600">
          Already registered? <Link to="/login" className="link font-semibold">Sign in</Link>
        </div>
        <div className="mt-6">
          <Disclaimer tone="ai">
            Synthetic demo data is used throughout the prototype. No real enforcement action is taken by this system automatically.
          </Disclaimer>
        </div>
      </Card>
    </div>
  )
}
