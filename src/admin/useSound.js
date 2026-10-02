import { useCallback, useEffect, useRef, useState } from 'react'

// Browser (vor allem iOS/Safari) erlauben Ton erst nach einer Berührung der Seite.
// Deshalb: erster Tap irgendwo → AudioContext freischalten (oder Button im Header).
export function useSound() {
  const ctx = useRef(null)
  const mutedRef = useRef(localStorage.getItem('adminMuted') === '1')
  const [muted, setMuted] = useState(mutedRef.current)
  const [ready, setReady] = useState(false)

  const unlock = useCallback(() => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      ctx.current = ctx.current || new AC()
      const c = ctx.current
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
  }, [])

  useEffect(() => {
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [unlock])

  const chime = useCallback(() => {
    const c = ctx.current
    if (!c || mutedRef.current) return
    if (c.state === 'suspended') c.resume()
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
  }, [])

  const toggleMuted = useCallback(() => {
    mutedRef.current = !mutedRef.current
    localStorage.setItem('adminMuted', mutedRef.current ? '1' : '0')
    setMuted(mutedRef.current)
    if (!mutedRef.current) { unlock(); setTimeout(chime, 150) } // Hörprobe
  }, [unlock, chime])

  return { ready, muted, unlock, chime, toggleMuted }
}
