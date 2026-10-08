import { useCallback, useEffect, useRef, useState } from 'react'

// Klingelton für neue Bestellungen und Rufe der Gäste.
// Datei: public/sounds/bell.mp3. Falls sie nicht lädt, gibt es den alten „Ding-Ding-Ding“.
const BELL_URL = '/sounds/bell.mp3'

function createContext() {
  const AC = window.AudioContext || window.webkitAudioContext
  return AC ? new AC() : null
}

// Browser (vor allem iOS/Safari) erlauben Ton erst nach einer Berührung der Seite.
// Den Klingelton laden und dekodieren wir aber sofort – abspielen erst nach dem Tippen.
export function useSound() {
  const ctx = useRef(null)
  const bell = useRef(null)        // fertiger Klingelton (AudioBuffer)
  const bellLoading = useRef(null) // Promise, solange er noch lädt
  const mutedRef = useRef(localStorage.getItem('adminMuted') === '1')
  const [muted, setMuted] = useState(mutedRef.current)
  const [ready, setReady] = useState(false)

  const getCtx = useCallback(() => {
    if (!ctx.current) ctx.current = createContext()
    return ctx.current
  }, [])

  // Datei laden + dekodieren, sobald die Verwaltung offen ist
  useEffect(() => {
    const c = getCtx()
    if (!c) return
    bellLoading.current = fetch(BELL_URL, { cache: 'no-cache' })
      .then((r) => {
        const type = r.headers.get('content-type') || ''
        if (!r.ok || type.includes('text/html')) throw new Error(`bell.mp3 nicht gefunden (${r.status}, ${type})`)
        return r.arrayBuffer()
      })
      .then((bytes) => new Promise((res, rej) => c.decodeAudioData(bytes, res, rej)))
      .then((buf) => {
        bell.current = buf
        console.info('Klingelton geladen:', buf.duration.toFixed(1), 's')
      })
      .catch((e) => console.warn('Klingelton nicht geladen – Ersatzton wird benutzt.', e))
      .finally(() => { bellLoading.current = null })
  }, [getCtx])

  const unlock = useCallback(() => {
    try {
      const c = getCtx()
      if (!c) return
      const o = c.createOscillator()   // stummer Ton "weckt" iOS-Audio auf
      const g = c.createGain()
      g.gain.value = 0
      o.connect(g).connect(c.destination)
      o.start()
      o.stop(c.currentTime + 0.01)
      Promise.resolve(c.resume()).then(() => setReady(c.state === 'running'))
    } catch (e) {
      console.warn('Audio nicht verfügbar', e)
    }
  }, [getCtx])

  useEffect(() => {
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [unlock])

  const playSynth = (c) => {
    const t0 = c.currentTime
    ;[[880, 0], [1174.66, 0.2], [1567.98, 0.4]].forEach(([freq, dt]) => {
      const o = c.createOscillator()
      const g = c.createGain()
      o.type = 'sine'
      o.frequency.value = freq
      g.gain.setValueAtTime(0.0001, t0 + dt)
      g.gain.exponentialRampToValueAtTime(0.4, t0 + dt + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.6)
      o.connect(g).connect(c.destination)
      o.start(t0 + dt)
      o.stop(t0 + dt + 0.65)
    })
  }

  const playBell = (c) => {
    const src = c.createBufferSource()
    src.buffer = bell.current
    src.connect(c.destination)
    src.start()
  }

  const chime = useCallback(() => {
    const c = ctx.current
    if (!c || mutedRef.current) return
    if (c.state === 'suspended') c.resume()
    if (bell.current) return playBell(c)
    if (bellLoading.current) {
      // lädt noch → kurz warten, dann klingeln
      bellLoading.current.then(() => (bell.current ? playBell(c) : playSynth(c)))
      return
    }
    playSynth(c)
  }, [])

  const toggleMuted = useCallback(() => {
    mutedRef.current = !mutedRef.current
    localStorage.setItem('adminMuted', mutedRef.current ? '1' : '0')
    setMuted(mutedRef.current)
    if (!mutedRef.current) { unlock(); setTimeout(chime, 150) } // Hörprobe
  }, [unlock, chime])

  return { ready, muted, unlock, chime, toggleMuted }
}
