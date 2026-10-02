import { useEffect, useState } from 'react'
import { fetchSettings } from '../lib/api'

// Café-Einstellungen: table_count, orders_enabled, Adresse, Öffnungszeiten …
export function useSettings() {
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    let alive = true
    const load = () => fetchSettings().then((s) => alive && setSettings(s)).catch(console.error)
    load()
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return { settings }
}
