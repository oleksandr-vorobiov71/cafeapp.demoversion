import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { btnPrimary, btnGhost, inputCls, Switch } from './ui'
import ItemModal from './ItemModal'

const fmt = (n) => Number(n).toFixed(2).replace('.', ',')

// Preis direkt in der Zeile ändern: Enter oder Feld verlassen = speichern
function PriceInput({ value, onSave }) {
  const [text, setText] = useState(fmt(value))
  useEffect(() => setText(fmt(value)), [value])
  function commit() {
    const n = parseFloat(text.replace(',', '.'))
    if (!Number.isFinite(n) || n < 0 || n > 9999.99) { setText(fmt(value)); return }
    const rounded = Math.round(n * 100) / 100
    setText(fmt(rounded))
    if (Math.round(value * 100) !== Math.round(rounded * 100)) onSave(rounded)
  }
  return (
    <div className="flex items-center gap-1">
      <input
        inputMode="decimal" aria-label="Preis" value={text}
        onChange={(e) => setText(e.target.value)} onBlur={commit} onFocus={(e) => e.target.select()}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className={`${inputCls} !w-24 text-right`}
      />
      <span className="text-stone-500">€</span>
    </div>
  )
}

export default function MenuEditor({ notify }) {
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | Gericht

  const load = useCallback(async () => {
    const [c, i] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('menu_items').select('*').order('sort_order'),
    ])
    if (c.error || i.error) notify('Speisekarte konnte nicht geladen werden.', 'err')
    else { setCategories(c.data); setItems(i.data) }
    setLoading(false)
  }, [notify])

  useEffect(() => { load() }, [load])

  async function patchItem(id, patch, okMsg) {
    const prev = items
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)))
    const { error } = await supabase.from('menu_items').update(patch).eq('id', id)
    if (error) { setItems(prev); notify('Speichern fehlgeschlagen.', 'err') }
    else if (okMsg) notify(okMsg)
  }

  async function addCategory() {
    const de = window.prompt('Name der neuen Kategorie (Deutsch):')?.trim()
    if (!de) return
    const en = window.prompt('Name der Kategorie (Englisch):', de)?.trim() || de
    const sort_order = Math.max(0, ...categories.map((c) => c.sort_order)) + 1
    const { error } = await supabase.from('categories').insert({ name_de: de, name_en: en, sort_order })
    if (error) notify('Kategorie konnte nicht angelegt werden (Name schon vorhanden?).', 'err')
    else { notify('Kategorie angelegt.'); load() }
  }

  const q = search.trim().toLowerCase()
  const match = (i) => !q || i.name_de.toLowerCase().includes(q) || (i.name_en || '').toLowerCase().includes(q)

  if (loading) return <p className="p-6 text-center text-stone-500">Lädt …</p>

  return (
    <section>
      <div className="mb-4 flex flex-wrap gap-2">
        <input className={`${inputCls} flex-1 basis-48`} type="search" placeholder="Suchen …" value={search}
               onChange={(e) => setSearch(e.target.value)} />
        <button className={btnPrimary} onClick={() => setEditing('new')}>+ Neues Gericht</button>
        <button className={btnGhost} onClick={addCategory}>+ Kategorie</button>
      </div>

      {categories.map((c) => {
        const list = items.filter((i) => i.category_id === c.id && match(i))
        if (!list.length && q) return null
        return (
          <div key={c.id} className="mb-6">
            <h2 className="mb-2 text-lg font-bold">{c.name_de}</h2>
            {list.length === 0 && <p className="text-sm text-stone-500">Noch keine Gerichte in dieser Kategorie.</p>}
            <div className="space-y-2">
              {list.map((i) => (
                <div key={i.id} className={`flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 shadow-sm ${i.is_available ? '' : 'bg-stone-100'}`}>
                  {i.image_url
                    ? <img src={i.image_url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-2xl">☕</div>}
                  <div className="min-w-0 flex-1 basis-40">
                    <div className="truncate font-semibold">{i.name_de}</div>
                    <div className="truncate text-sm text-stone-500">{i.name_en}</div>
                  </div>
                  <PriceInput value={Number(i.price)} onSave={(p) => patchItem(i.id, { price: p }, 'Preis gespeichert.')} />
                  <div className="flex items-center gap-2">
                    <Switch checked={i.is_available} label={`${i.name_de}: verfügbar`}
                            onChange={(v) => patchItem(i.id, { is_available: v }, v ? 'Wieder verfügbar.' : 'Als ausverkauft markiert.')} />
                    <span className={`w-24 text-sm font-semibold ${i.is_available ? 'text-emerald-700' : 'text-red-700'}`}>
                      {i.is_available ? 'Verfügbar' : 'Ausverkauft'}
                    </span>
                  </div>
                  <button className={btnGhost} onClick={() => setEditing(i)}>Bearbeiten</button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {editing && (
        <ItemModal
          item={editing === 'new' ? null : editing}
          categories={categories}
          items={items}
          notify={notify}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </section>
  )
}
