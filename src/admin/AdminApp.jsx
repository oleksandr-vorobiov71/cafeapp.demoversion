import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import LoginForm from './LoginForm'
import OrdersView from './OrdersView'
import MenuEditor from './MenuEditor'
import SettingsView from './SettingsView'
import { useSound } from './useSound'
import { btnGhost } from './ui'

const TABS = [
  ['orders', 'Bestellungen'],
  ['menu', 'Speisekarte bearbeiten'],
  ['settings', 'Einstellungen'],
]

const Center = ({ children }) => (
  <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">{children}</div>
)

export default function AdminApp() {
  const [session, setSession] = useState(undefined) // undefined = wird geladen
  const [isStaff, setIsStaff] = useState(null)
  const [tab, setTab] = useState('orders')
  const [newCount, setNewCount] = useState(0)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const sound = useSound()

  const notify = useCallback((msg, type = 'ok') => {
    setToast({ msg, type })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // Nur Personal (Tabelle "staff") darf hinein – RLS schützt zusätzlich auf Datenbankebene.
  useEffect(() => {
    if (!session) { setIsStaff(null); return }
    supabase.from('staff').select('user_id').eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => setIsStaff(!!data))
  }, [session?.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.title = newCount ? `(${newCount}) Neue Bestellung – Café am Rathaus` : 'Personal – Café am Rathaus'
  }, [newCount])

  const signOut = () => supabase.auth.signOut()

  if (session === undefined || (session && isStaff === null)) return <Center>Lädt …</Center>
  if (!session) return <LoginForm />
  if (!isStaff) {
    return (
      <Center>
        <p className="max-w-sm">Kein Zugriff. Dieses Konto ist nicht für den Personalbereich freigeschaltet.</p>
        <button className={btnGhost} onClick={signOut}>Abmelden</button>
      </Center>
    )
  }

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-30 bg-amber-950 pt-[env(safe-area-inset-top)] text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2">
          <nav className="flex flex-1 gap-1 overflow-x-auto">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`min-h-11 whitespace-nowrap rounded-lg px-4 font-semibold ${tab === id ? 'bg-white text-amber-950' : 'text-amber-100 hover:bg-white/10'}`}
              >
                {label}
                {id === 'orders' && newCount > 0 && (
                  <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{newCount}</span>
                )}
              </button>
            ))}
          </nav>
          <button onClick={sound.toggleMuted} aria-label={sound.muted ? 'Ton einschalten' : 'Ton ausschalten'}
                  className="min-h-11 rounded-lg px-3 text-xl hover:bg-white/10">
            {sound.muted ? '🔕' : '🔔'}
          </button>
          <button onClick={signOut} className="min-h-11 rounded-lg px-3 text-sm text-amber-100 hover:bg-white/10">Abmelden</button>
        </div>
        {!sound.ready && !sound.muted && (
          <button onClick={sound.unlock} className="block w-full bg-amber-500 py-2 text-center font-semibold text-stone-900">
            🔔 Tippen, um den Ton für neue Bestellungen zu aktivieren
          </button>
        )}
      </header>

      {/* Alle Bereiche bleiben gemountet, damit neue Bestellungen auch im Menü-Tab piepen. */}
      <main className="mx-auto max-w-6xl p-3 pb-24">
        <div className={tab === 'orders' ? '' : 'hidden'}>
          <OrdersView chime={sound.chime} onNewCount={setNewCount} notify={notify} />
        </div>
        <div className={tab === 'menu' ? '' : 'hidden'}><MenuEditor notify={notify} /></div>
        <div className={tab === 'settings' ? '' : 'hidden'}><SettingsView notify={notify} /></div>
      </main>

      {toast && (
        <div role="status" className={`fixed inset-x-3 bottom-4 z-50 mx-auto mb-[env(safe-area-inset-bottom)] max-w-md rounded-lg px-4 py-3 text-center font-semibold text-white shadow-lg ${toast.type === 'err' ? 'bg-red-700' : 'bg-emerald-700'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
