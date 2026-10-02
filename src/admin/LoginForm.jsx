import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { inputCls, btnPrimary } from './ui'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setError('Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.')
    setBusy(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-amber-950 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div className="text-center">
          <div className="text-4xl">☕</div>
          <h1 className="mt-2 text-2xl font-extrabold text-amber-950">Café am Rathaus</h1>
          <p className="text-sm text-stone-500">Personalbereich</p>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">E-Mail</span>
          <input className={inputCls} type="email" autoComplete="username" required value={email}
                 onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Passwort</span>
          <input className={inputCls} type="password" autoComplete="current-password" required value={password}
                 onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <button className={`${btnPrimary} w-full`} disabled={busy}>{busy ? 'Anmelden …' : 'Anmelden'}</button>
      </form>
    </div>
  )
}
