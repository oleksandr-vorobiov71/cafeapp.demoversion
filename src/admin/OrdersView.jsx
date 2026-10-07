import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/i18n'
import { btnPrimary, btnGhost } from './ui'

const PAY = { cash: 'Barzahlung', card: 'Kartenzahlung' }
const DONE = { completed: 'Ausgegeben', cancelled: 'Storniert' }

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString() }
const clock = (iso) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

function formatOptions(opt) {
  if (!opt) return ''
  if (Array.isArray(opt)) return opt.map(String).join(', ')
  if (typeof opt === 'object') {
    return Object.entries(opt)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
  }
  return String(opt)
}

function groupOrderItems(items) {
  if (!items || !items.length) return []
  const map = new Map()

  for (const it of items) {
    const optStr = JSON.stringify(it.options_json || {})
    const key = `${it.item_name}__${optStr}`

    if (!map.has(key)) {
      map.set(key, {
        id: it.id,
        item_name: it.item_name,
        quantity: Number(it.quantity) || 1,
        options_json: it.options_json,
        price: it.price
      })
    } else {
      const existing = map.get(key)
      existing.quantity += (Number(it.quantity) || 1)
    }
  }

  return Array.from(map.values())
}

function OrderCard({ o, now, onStatus }) {
  const mins = Math.max(0, Math.floor((now - new Date(o.created_at)) / 60000))
  const active = o.status === 'new' || o.status === 'preparing'
  const isUrgent = active && mins >= 12
  const isWarning = active && mins >= 7 && mins < 12

  const itemsSum = (o.order_items || []).reduce((s, it) => s + (Number(it.price) || 0) * (it.quantity || 1), 0)
  const tip = Math.max(0, Number((Number(o.total_amount || 0) - itemsSum).toFixed(2)))
  const groupedItems = useMemo(() => groupOrderItems(o.order_items), [o.order_items])

  const cancel = () => {
    if (window.confirm(`Bestellung #${o.order_number || o.id} (Tisch ${o.table_number}) stornieren?`)) {
      onStatus(o.id, 'cancelled')
    }
  }

  return (
    <article className={`relative flex flex-col rounded-3xl border bg-white p-5 shadow-xs transition-all ${
      isUrgent
        ? 'border-red-500 ring-2 ring-red-400 bg-red-50/15'
        : isWarning
        ? 'border-amber-500 ring-2 ring-amber-300'
        : o.status === 'new'
        ? 'border-amber-500 ring-2 ring-amber-400'
        : 'border-stone-200'
    }`}>
      <header className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black leading-none text-stone-900">Tisch {o.table_number}</span>
            {isUrgent && (
              <span className="animate-pulse rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase text-white tracking-wider">
                Dringend!
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-stone-400 font-semibold">#{o.order_number || o.id} · {clock(o.created_at)} Uhr</div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${
          isUrgent
            ? 'bg-red-100 text-red-700'
            : isWarning
            ? 'bg-amber-100 text-amber-800'
            : active
            ? 'bg-stone-100 text-stone-700'
            : o.status === 'completed'
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-stone-100 text-stone-500'
        }`}>
          {active ? `vor ${mins} Min.` : DONE[o.status] || o.status}
        </span>
      </header>

      <div className="my-2.5 max-h-52 overflow-y-auto pr-1 border-y border-stone-100 py-2.5">
        <ul className="space-y-2 text-sm">
          {groupedItems.map((it) => {
            const opt = formatOptions(it.options_json)
            return (
              <li key={it.id} className="leading-snug">
                <span className="inline-block min-w-6 font-black text-amber-950 text-base">{it.quantity}×</span>{' '}
                <span className="font-bold text-stone-900">{it.item_name}</span>
                {opt && <div className="ml-7 text-xs text-stone-500 font-medium">↳ {opt}</div>}
              </li>
            )
          })}
        </ul>
      </div>

      {o.comment && (
        <div className="mb-3 rounded-xl bg-amber-50/80 px-3 py-2 text-xs font-bold text-amber-950 border border-amber-200/60">
          💬 {o.comment}
        </div>
      )}
      
      <div className="mb-4 mt-auto flex items-center justify-between text-xs text-stone-600 pt-1">
        <div>
          <div className="font-semibold text-stone-800">{PAY[o.payment_method] || o.payment_method || 'Barzahlung'}</div>
          {tip > 0 && <div className="text-[11px] font-black text-emerald-700">inkl. +{tip.toFixed(2).replace('.', ',')} € Trinkgeld</div>}
        </div>
        <span className="text-lg font-black text-stone-900">
          {formatPrice ? formatPrice(o.total_amount) : `${Number(o.total_amount || 0).toFixed(2).replace('.', ',')} €`}
        </span>
      </div>

      <div className="flex gap-2">
        {o.status === 'new' && (
          <>
            <button className={`${btnPrimary} flex-1 text-xs py-2.5 font-black`} onClick={() => onStatus(o.id, 'preparing')}>In Arbeit</button>
            <button className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 active:scale-95 transition" onClick={cancel}>Stornieren</button>
          </>
        )}
        {o.status === 'preparing' && (
          <>
            <button className="flex-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs py-2.5 font-black shadow-sm active:scale-95 transition" onClick={() => onStatus(o.id, 'completed')}>Ausgegeben</button>
            <button className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 active:scale-95 transition" onClick={cancel}>Stornieren</button>
          </>
        )}
        {!active && (
          <button className={`${btnGhost} flex-1 text-xs py-2 font-bold`} onClick={() => onStatus(o.id, 'preparing')}>Zurück in Arbeit</button>
        )}
      </div>
    </article>
  )
}

// Rufe der Gäste: „Bedienung rufen" / „Rechnung bitte"
const CALL = {
  waiter: { label: 'Bedienung gerufen', icon: '🙋' },
  bill: { label: 'Möchte zahlen', icon: '💶' },
}

function ServiceCalls({ chime, notify }) {
  const [calls, setCalls] = useState([])
  const [now, setNow] = useState(Date.now())
  const known = useRef(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('service_calls')
      .select('*')
      .is('resolved_at', null)
      .order('created_at', { ascending: true })
    if (error) { console.error('Rufe laden fehlgeschlagen', error); return }
    const fresh = (data || []).filter((c) => known.current && !known.current.has(c.id))
    known.current = new Set((data || []).map((c) => c.id))
    setCalls(data || [])
    if (fresh.length && chime) chime()
  }, [chime])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('service-calls-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_calls' }, () => load())
      .subscribe()
    const poll = setInterval(load, 20000)
    const tick = setInterval(() => setNow(Date.now()), 15000)
    return () => { supabase.removeChannel(channel); clearInterval(poll); clearInterval(tick) }
  }, [load])

  async function resolve(id) {
    const prev = calls
    setCalls((list) => list.filter((c) => c.id !== id))
    const { error } = await supabase.from('service_calls').update({ resolved_at: new Date().toISOString() }).eq('id', id)
    if (error) { setCalls(prev); if (notify) notify('Konnte nicht als erledigt markiert werden.', 'err') }
  }

  if (!calls.length) return null
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {calls.map((c) => {
        const mins = Math.max(0, Math.floor((now - new Date(c.created_at)) / 60000))
        const meta = CALL[c.kind] || CALL.waiter
        return (
          <div key={c.id} className="flex items-center gap-3 rounded-3xl border-2 border-amber-500 bg-amber-50 p-4 shadow-sm ring-4 ring-amber-200/60 animate-pulse [animation-duration:2.5s]">
            <span className="text-3xl" aria-hidden="true">{meta.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="text-xl font-black leading-tight text-stone-900">Tisch {c.table_number}</div>
              <div className="text-sm font-bold text-amber-900">{meta.label} · vor {mins} Min.</div>
            </div>
            <button type="button" onClick={() => resolve(c.id)}
                    className="min-h-11 rounded-xl bg-stone-900 px-4 text-sm font-bold text-white active:scale-95">
              Erledigt
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default function OrdersView({ chime, onNewCount, notify }) {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('active')
  const [tableFilter, setTableFilter] = useState('all')
  const [now, setNow] = useState(Date.now())
  const [isLive, setIsLive] = useState(false)
  const [keepAwake, setKeepAwake] = useState(localStorage.getItem('adminKeepAwake') === '1')
  const known = useRef(null)
  const timer = useRef(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .or(`status.in.(new,preparing),created_at.gte.${startOfToday()}`)
      .order('created_at', { ascending: true })
    if (error) {
      console.error('Bestellungen laden fehlgeschlagen', error)
      return
    }
    const fresh = (data || []).filter((o) => o.status === 'new' && known.current && !known.current.has(o.id))
    known.current = new Set((data || []).map((o) => o.id))
    setOrders(data || [])
    if (fresh.length && chime) chime()
  }, [chime])

  useEffect(() => {
    load()
    const schedule = () => { clearTimeout(timer.current); timer.current = setTimeout(load, 200) }
    const channel = supabase
      .channel('orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, schedule)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true)
          schedule()
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsLive(false)
        }
      })

    const poll = setInterval(load, 20000)
    const tick = setInterval(() => setNow(Date.now()), 15000)
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll); clearInterval(tick); clearTimeout(timer.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  useEffect(() => {
    if (onNewCount) onNewCount(orders.filter((o) => o.status === 'new').length)
  }, [orders, onNewCount])

  useEffect(() => {
    if (!keepAwake || !('wakeLock' in navigator)) return
    let lock
    const acquire = async () => { try { lock = await navigator.wakeLock.request('screen') } catch { /* ignore */ } }
    acquire()
    const onVisible = () => document.visibilityState === 'visible' && acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => { document.removeEventListener('visibilitychange', onVisible); lock?.release?.() }
  }, [keepAwake])

  function toggleAwake(e) {
    setKeepAwake(e.target.checked)
    localStorage.setItem('adminKeepAwake', e.target.checked ? '1' : '0')
  }

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  async function setStatus(id, status) {
    const prev = orders
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, status } : o)))
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (error) {
      setOrders(prev)
      if (notify) notify('Status konnte nicht geändert werden.', 'err')
    }
  }

  const todayOrders = useMemo(() => {
    return orders.filter(o => o.status === 'completed' && new Date(o.created_at) >= new Date(startOfToday()))
  }, [orders])

  // Umsatz = nur Speisen & Getränke. Trinkgeld ist KEIN Umsatz und wird separat gezeigt.
  const itemsTotal = (o) =>
    (o.order_items || []).reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0)

  const totalRevenue = useMemo(() => {
    return todayOrders.reduce((sum, o) => sum + itemsTotal(o), 0)
  }, [todayOrders])

  const totalTips = useMemo(() => {
    return todayOrders.reduce((sum, o) => sum + Math.max(0, Number(o.total_amount || 0) - itemsTotal(o)), 0)
  }, [todayOrders])

  const activeTablesSet = useMemo(() => {
    const set = new Set()
    orders.forEach(o => {
      if ((o.status === 'new' || o.status === 'preparing') && o.table_number) {
        set.add(Number(o.table_number))
      }
    })
    return set
  }, [orders])

  const availableTables = useMemo(() => {
    const set = new Set()
    orders.forEach(o => { if (o.table_number) set.add(Number(o.table_number)) })
    return Array.from(set).sort((a, b) => a - b)
  }, [orders])

  const visibleOrders = useMemo(() => {
    if (tableFilter === 'all') return orders
    return orders.filter(o => String(o.table_number) === String(tableFilter))
  }, [orders, tableFilter])

  const fresh = visibleOrders.filter((o) => o.status === 'new')
  const cooking = visibleOrders.filter((o) => o.status === 'preparing')
  const archive = visibleOrders.filter((o) => o.status === 'completed' || o.status === 'cancelled').slice().reverse()
  const grid = 'grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3'

  return (
    <section className="space-y-4">
      <ServiceCalls chime={chime} notify={notify} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-3xl border border-stone-200/80 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Umsatz heute <span className="normal-case tracking-normal">(ohne Trinkgeld)</span></div>
          <div className="text-2xl font-black text-stone-900 mt-0.5">{totalRevenue.toFixed(2).replace('.', ',')} €</div>
        </div>
        
        <div className="rounded-3xl border border-stone-200/80 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Ausgegeben</div>
          <div className="text-2xl font-black text-stone-900 mt-0.5">{todayOrders.length} {todayOrders.length === 1 ? 'Bestellung' : 'Bestellungen'}</div>
        </div>

        <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Trinkgeld heute 🪙</div>
          <div className="text-2xl font-black text-emerald-900 mt-0.5">+{totalTips.toFixed(2).replace('.', ',')} €</div>
        </div>

        <div className="flex items-center justify-between rounded-3xl border border-stone-200/80 bg-white p-4 shadow-2xs">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Status</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`h-2.5 w-2.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-xs font-black text-stone-700">{isLive ? 'Live Online' : 'Verbinden...'}</span>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={load}
              title="Aktualisieren"
              className="rounded-2xl border border-stone-200 p-2.5 text-xs font-bold hover:bg-stone-50 active:scale-95 transition"
            >
              🔄
            </button>
            <button
              onClick={toggleFullScreen}
              title="Vollbild"
              className="rounded-2xl border border-stone-200 p-2.5 text-xs font-bold hover:bg-stone-50 active:scale-95 transition"
            >
              ⛶
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-200/80 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {[['active', `Aktive (${fresh.length + cooking.length})`], ['archive', `Archiv heute (${archive.length})`]].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`rounded-full px-4 py-2 text-xs font-black transition ${
                filter === id ? 'bg-stone-900 text-white shadow-xs' : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              {label}
            </button>
          ))}

          {availableTables.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto pl-2">
              <button
                onClick={() => setTableFilter('all')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  tableFilter === 'all' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                Alle Tische
              </button>
              {availableTables.map(t => {
                const hasActive = activeTablesSet.has(t)
                const isSelected = String(tableFilter) === String(t)
                return (
                  <button
                    key={t}
                    onClick={() => setTableFilter(String(t))}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      isSelected
                        ? 'bg-stone-900 text-white'
                        : hasActive
                        ? 'bg-amber-100/80 text-amber-950 border border-amber-300'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    <span>Tisch {t}</span>
                    {hasActive && <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {'wakeLock' in navigator && (
          <label className="flex items-center gap-2 text-xs font-bold text-stone-600 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 rounded accent-stone-900" checked={keepAwake} onChange={toggleAwake} />
            Wach halten
          </label>
        )}
      </div>

      {filter === 'active' ? (
        fresh.length + cooking.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center text-stone-400">
            <div className="text-3xl mb-2">☕</div>
            <div className="font-bold text-stone-700">Keine offenen Bestellungen</div>
            <div className="text-xs text-stone-400 mt-1">Neue Bestellungen erscheinen hier automatisch mit Benachrichtigung</div>
          </div>
        ) : (
          <>
            {fresh.length > 0 && (
              <div className="space-y-2.5">
                <h2 className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  Neu eingegangen ({fresh.length})
                </h2>
                <div className={`${grid} mb-5`}>
                  {fresh.map((o) => <OrderCard key={o.id} o={o} now={now} onStatus={setStatus} />)}
                </div>
              </div>
            )}
            {cooking.length > 0 && (
              <div className="space-y-2.5">
                <h2 className="text-xs font-black uppercase tracking-wider text-stone-500">
                  In Zubereitung ({cooking.length})
                </h2>
                <div className={grid}>
                  {cooking.map((o) => <OrderCard key={o.id} o={o} now={now} onStatus={setStatus} />)}
                </div>
              </div>
            )}
          </>
        )
      ) : archive.length === 0 ? (
        <p className="rounded-3xl bg-white p-10 text-center text-stone-400 font-medium border border-stone-200/80">Heute noch keine abgeschlossenen Bestellungen im Archiv.</p>
      ) : (
        <div className={grid}>
          {archive.map((o) => <OrderCard key={o.id} o={o} now={now} onStatus={setStatus} />)}
        </div>
      )}
    </section>
  )
}