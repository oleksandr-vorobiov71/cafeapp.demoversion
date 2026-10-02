import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { btnPrimary, btnGhost, btnDanger, inputCls, Switch } from './ui'

const BUCKET = 'menu-images'

const ALLERGENS = {
  gluten: 'Gluten', crustaceans: 'Krebstiere', eggs: 'Eier', fish: 'Fisch', peanuts: 'Erdnüsse',
  soy: 'Soja', milk: 'Milch', nuts: 'Schalenfrüchte', celery: 'Sellerie', mustard: 'Senf',
  sesame: 'Sesam', sulphites: 'Sulfite', lupin: 'Lupinen', molluscs: 'Weichtiere',
}
const TAGS = { vegetarian: 'Vegetarisch', vegan: 'Vegan' }

const pathFromUrl = (url) => url?.split(`/${BUCKET}/`)[1]

// Foto verkleinern (max. 1200 px, JPEG): schnell für Gäste, weit unter dem 5-MB-Limit
async function resizeToJpeg(file, max = 1200) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Bild konnte nicht umgewandelt werden'))), 'image/jpeg', 0.85)
  )
}

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-semibold text-stone-700">{label}</span>
    {children}
  </label>
)
const Chip = ({ on, onClick, children }) => (
  <button type="button" aria-pressed={on} onClick={onClick}
          className={`min-h-10 rounded-full border px-3 text-sm font-medium ${on ? 'border-amber-900 bg-amber-900 text-white' : 'border-stone-300 bg-white text-stone-700'}`}>
    {children}
  </button>
)

export default function ItemModal({ item, categories, items, notify, onClose, onSaved }) {
  const [f, setF] = useState(() => ({
    category_id: item?.category_id ?? categories[0]?.id ?? '',
    name_de: item?.name_de ?? '', name_en: item?.name_en ?? '',
    name_ua: item?.name_ua ?? '', name_it: item?.name_it ?? '',
    description_de: item?.description_de ?? '', description_en: item?.description_en ?? '',
    description_ua: item?.description_ua ?? '', description_it: item?.description_it ?? '',
    price: item ? Number(item.price).toFixed(2).replace('.', ',') : '',
    is_available: item?.is_available ?? true,
    allergens: item?.allergens ?? [], tags: item?.tags ?? [],
    image_url: item?.image_url ?? null,
  }))
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [removeImg, setRemoveImg] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const toggle = (k, v) => set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v])
  const shownImage = preview || (removeImg ? null : f.image_url)

  function onFile(e) {
    const picked = e.target.files?.[0]
    if (!picked) return
    setFile(picked)
    setPreview(URL.createObjectURL(picked))
    setRemoveImg(false)
  }

  const removeStored = (url) => {
    const p = pathFromUrl(url)
    if (p) supabase.storage.from(BUCKET).remove([p]).catch(() => {}) // best effort
  }

  async function save(e) {
    e.preventDefault()
    const price = parseFloat(String(f.price).replace(',', '.'))
    if (!f.name_de.trim()) return setError('Bitte einen deutschen Namen eingeben.')
    if (!f.category_id) return setError('Bitte eine Kategorie wählen.')
    if (!Number.isFinite(price) || price < 0 || price > 9999.99) return setError('Bitte einen gültigen Preis eingeben (z. B. 3,90).')

    setBusy(true)
    setError('')
    let uploaded = null
    try {
      let image_url = removeImg ? null : f.image_url
      if (file) {
        const blob = await resizeToJpeg(file)
        uploaded = `${crypto.randomUUID()}.jpg`
        const up = await supabase.storage.from(BUCKET).upload(uploaded, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
        if (up.error) throw up.error
        image_url = supabase.storage.from(BUCKET).getPublicUrl(uploaded).data.publicUrl
      }
      const nz = (s) => s.trim() || null
      const payload = {
        category_id: f.category_id,
        name_de: f.name_de.trim(), name_en: f.name_en.trim() || f.name_de.trim(),
        name_ua: nz(f.name_ua), name_it: nz(f.name_it),
        description_de: nz(f.description_de), description_en: nz(f.description_en),
        description_ua: nz(f.description_ua), description_it: nz(f.description_it),
        price: Math.round(price * 100) / 100,
        is_available: f.is_available, allergens: f.allergens, tags: f.tags, image_url,
      }
      const nextSort = Math.max(0, ...items.filter((i) => i.category_id === f.category_id).map((i) => i.sort_order)) + 1
      const { error: dbError } = item
        ? await supabase.from('menu_items').update(payload).eq('id', item.id)
        : await supabase.from('menu_items').insert({ ...payload, sort_order: nextSort })
      if (dbError) throw dbError
      if (item?.image_url && item.image_url !== image_url) removeStored(item.image_url)
      notify(item ? 'Gericht gespeichert.' : 'Gericht angelegt.')
      onSaved()
    } catch (err) {
      console.error(err)
      if (uploaded) supabase.storage.from(BUCKET).remove([uploaded]).catch(() => {})
      setError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
      setBusy(false)
    }
  }

  async function del() {
    if (!window.confirm(`„${item.name_de}“ endgültig löschen? Tipp: Mit „Ausverkauft“ bleibt das Gericht erhalten.`)) return
    setBusy(true)
    const { error: dbError } = await supabase.from('menu_items').delete().eq('id', item.id)
    if (dbError) { setBusy(false); return setError('Löschen fehlgeschlagen.') }
    removeStored(item.image_url)
    notify('Gericht gelöscht.')
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 md:items-center" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <form onSubmit={save} className="max-h-[92dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-2xl bg-white p-4 md:rounded-2xl">
        <h2 className="text-xl font-extrabold">{item ? 'Gericht bearbeiten' : 'Neues Gericht'}</h2>

        <Field label="Kategorie">
          <select className={inputCls} value={f.category_id} onChange={(e) => set('category_id', e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name_de}</option>)}
          </select>
        </Field>
        <Field label="Name (Deutsch) *"><input className={inputCls} value={f.name_de} onChange={(e) => set('name_de', e.target.value)} /></Field>
        <Field label="Name (Englisch)"><input className={inputCls} placeholder="leer = wie Deutsch" value={f.name_en} onChange={(e) => set('name_en', e.target.value)} /></Field>
        <Field label="Beschreibung (Deutsch)"><textarea rows={2} className={inputCls} value={f.description_de} onChange={(e) => set('description_de', e.target.value)} /></Field>
        <Field label="Beschreibung (Englisch)"><textarea rows={2} className={inputCls} value={f.description_en} onChange={(e) => set('description_en', e.target.value)} /></Field>
        <Field label="Preis (€) *"><input className={inputCls} inputMode="decimal" placeholder="3,90" value={f.price} onChange={(e) => set('price', e.target.value)} /></Field>

        <div>
          <span className="mb-1 block text-sm font-semibold text-stone-700">Foto</span>
          {shownImage && <img src={shownImage} alt="" className="mb-2 h-40 w-full rounded-xl object-cover" />}
          <div className="flex flex-wrap gap-2">
            <label className={`${btnGhost} cursor-pointer`}>
              {shownImage ? 'Foto ersetzen' : 'Foto auswählen'}
              <input type="file" accept="image/*" className="hidden" onChange={onFile} />
            </label>
            {shownImage && (
              <button type="button" className={btnGhost} onClick={() => { setFile(null); setPreview(null); setRemoveImg(true) }}>Foto entfernen</button>
            )}
          </div>
        </div>

        <div>
          <span className="mb-1 block text-sm font-semibold text-stone-700">Allergene</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ALLERGENS).map(([k, label]) => <Chip key={k} on={f.allergens.includes(k)} onClick={() => toggle('allergens', k)}>{label}</Chip>)}
          </div>
        </div>
        <div>
          <span className="mb-1 block text-sm font-semibold text-stone-700">Ernährung</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TAGS).map(([k, label]) => <Chip key={k} on={f.tags.includes(k)} onClick={() => toggle('tags', k)}>{label}</Chip>)}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-stone-50 p-3">
          <span className="font-semibold">{f.is_available ? 'Verfügbar' : 'Ausverkauft'}</span>
          <Switch checked={f.is_available} label="Verfügbar" onChange={(v) => set('is_available', v)} />
        </div>

        <details className="rounded-xl border border-stone-200 p-3">
          <summary className="cursor-pointer font-semibold">Weitere Sprachen (Українська / Italiano)</summary>
          <div className="mt-3 space-y-3">
            <Field label="Name (UA)"><input className={inputCls} value={f.name_ua} onChange={(e) => set('name_ua', e.target.value)} /></Field>
            <Field label="Beschreibung (UA)"><textarea rows={2} className={inputCls} value={f.description_ua} onChange={(e) => set('description_ua', e.target.value)} /></Field>
            <Field label="Name (IT)"><input className={inputCls} value={f.name_it} onChange={(e) => set('name_it', e.target.value)} /></Field>
            <Field label="Beschreibung (IT)"><textarea rows={2} className={inputCls} value={f.description_it} onChange={(e) => set('description_it', e.target.value)} /></Field>
          </div>
        </details>

        {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-stone-100 bg-white px-4 pb-1 pt-3">
          {item && <button type="button" className={btnDanger} disabled={busy} onClick={del}>Löschen</button>}
          <button type="button" className={`${btnGhost} ml-auto`} disabled={busy} onClick={onClose}>Abbrechen</button>
          <button className={btnPrimary} disabled={busy}>{busy ? 'Speichern …' : 'Speichern'}</button>
        </div>
      </form>
    </div>
  )
}
