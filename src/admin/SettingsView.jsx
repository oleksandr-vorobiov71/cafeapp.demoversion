import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { btnPrimary, btnGhost, inputCls, Switch } from './ui'
import QrCodes from './QrCodes'

export default function SettingsView({ notify }) {
  const [s, setS] = useState(null)
  const [busy, setBusy] = useState(false)
  const [showQr, setShowQr] = useState(false)

  useEffect(() => {
    supabase.from('cafe_settings').select('*').eq('id', 1).single().then(({ data, error }) => {
      if (error) notify('Einstellungen konnten nicht geladen werden.', 'err')
      else setS(data)
    })
  }, [notify])

  if (!s) return <p className="p-6 text-center text-stone-500">Lädt …</p>
  const set = (k, v) => setS((x) => ({ ...x, [k]: v }))

  // Sofort wirksam – z. B. kurz vor Feierabend
  async function toggleOrders(v) {
    set('orders_enabled', v)
    const { error } = await supabase.from('cafe_settings').update({ orders_enabled: v, updated_at: new Date().toISOString() }).eq('id', 1)
    if (error) { set('orders_enabled', !v); notify('Speichern fehlgeschlagen.', 'err') }
    else notify(v ? 'Bestellungen werden angenommen.' : 'Bestellungen pausiert.')
  }

  async function save(e) {
    e.preventDefault()
    const tables = Number(s.table_count)
    if (!Number.isInteger(tables) || tables < 1 || tables > 200) return notify('Anzahl der Tische: 1 bis 200.', 'err')
    setBusy(true)
    const nz = (v) => (v || '').trim() || null
    const { error } = await supabase.from('cafe_settings').update({
      cafe_name: (s.cafe_name || '').trim() || 'Café am Rathaus',
      owner_name: nz(s.owner_name), email: nz(s.email), vat_id: nz(s.vat_id),
      address: nz(s.address), phone: nz(s.phone), opening_hours: nz(s.opening_hours),
      table_count: tables, updated_at: new Date().toISOString(),
    }).eq('id', 1)
    notify(error ? 'Speichern fehlgeschlagen.' : 'Einstellungen gespeichert.', error ? 'err' : 'ok')
    setBusy(false)
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <div className="font-bold">Bestellungen annehmen</div>
          <div className="text-sm text-stone-500">Aus = Gäste können nicht bestellen.</div>
        </div>
        <Switch checked={s.orders_enabled} label="Bestellungen annehmen" onChange={toggleOrders} />
      </div>

      <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <label className="block"><span className="mb-1 block text-sm font-semibold">Name des Cafés</span>
          <input className={inputCls} value={s.cafe_name || ''} onChange={(e) => set('cafe_name', e.target.value)} /></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">Adresse</span>
          <input className={inputCls} value={s.address || ''} onChange={(e) => set('address', e.target.value)} /></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">Telefon</span>
          <input className={inputCls} type="tel" value={s.phone || ''} onChange={(e) => set('phone', e.target.value)} /></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">Öffnungszeiten</span>
          <textarea rows={4} className={inputCls} value={s.opening_hours || ''} onChange={(e) => set('opening_hours', e.target.value)} /></label>
        <div className="border-t border-stone-200 pt-4">
          <div className="font-bold">Impressum</div>
          <div className="text-sm text-stone-500">Pflichtangaben für Impressum und Datenschutz im Gäste-Menü. Name, Adresse und Telefon kommen von oben.</div>
        </div>
        <label className="block"><span className="mb-1 block text-sm font-semibold">Inhaber/in bzw. Firma</span>
          <input className={inputCls} placeholder="z. B. Maria Muster oder Muster GmbH" value={s.owner_name || ''} onChange={(e) => set('owner_name', e.target.value)} /></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">E-Mail</span>
          <input className={inputCls} type="email" value={s.email || ''} onChange={(e) => set('email', e.target.value)} /></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">USt-IdNr. (falls vorhanden)</span>
          <input className={inputCls} placeholder="DE123456789" value={s.vat_id || ''} onChange={(e) => set('vat_id', e.target.value)} /></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">Anzahl der Tische</span>
          <input className={inputCls} type="number" min="1" max="200" inputMode="numeric" value={s.table_count} onChange={(e) => set('table_count', e.target.value)} /></label>
        <button className={`${btnPrimary} w-full`} disabled={busy}>{busy ? 'Speichern …' : 'Speichern'}</button>
      </div>

      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <div className="font-bold">QR-Codes für die Tische</div>
          <div className="text-sm text-stone-500">Ein Code pro Tisch – ausdrucken und auf die Tische stellen. Gäste landen direkt am richtigen Tisch.</div>
        </div>
        <button type="button" className={`${btnGhost} w-full`} onClick={() => setShowQr(true)}>
          QR-Codes anzeigen &amp; drucken
        </button>
      </div>

      {showQr && (
        <QrCodes
          tableCount={Math.min(200, Math.max(1, Number(s.table_count) || 1))}
          cafeName={(s.cafe_name || '').trim() || 'Café am Rathaus'}
          onClose={() => setShowQr(false)}
        />
      )}
    </form>
  )
}
