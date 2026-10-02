import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchMenu, subscribeToMenu } from '../lib/api'

export function useMenu() {
  const [categories, setCategories] = useState([])
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const timer = useRef(null)

  const load = useCallback(async () => {
    try {
      setCategories(await fetchMenu())
      setStatus('ready')
    } catch (e) {
      console.error('Menü laden fehlgeschlagen', e)
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error')) // altes Menü behalten
    }
  }, [])

  useEffect(() => {
    load()
    // Änderung in der DB → kurz bündeln (300 ms) → Menü neu laden
    const unsubscribe = subscribeToMenu(() => {
      clearTimeout(timer.current)
      timer.current = setTimeout(load, 300)
    })
    // Handy war im Standby → WebSocket evtl. getrennt → beim Zurückkehren neu laden
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      unsubscribe()
      clearTimeout(timer.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  const itemsById = useMemo(() => {
    const map = {}
    categories.forEach((c) => c.items.forEach((i) => (map[i.id] = i)))
    return map
  }, [categories])

  return { categories, itemsById, status, reload: load }
}
