import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useMenu } from '../hooks/useMenu'
import { useSettings } from '../hooks/useSettings'
import { pick, formatPrice } from '../lib/i18n'
import { orderErrorText } from '../lib/orderErrors'
import { Impressum, Datenschutz } from './LegalPages'

/* ------------------------------------------------------------------
   Demo-Fotos: nur Fallback, wenn in der Admin kein Foto hochgeladen ist.
   Schlüssel = DEUTSCHER Name (name_de), damit es in jeder Sprache passt.
------------------------------------------------------------------- */
const DEFAULT_IMAGES = {
  'Espresso': 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&q=80',
  'Americano': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80',
  'Cappuccino': 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=400&q=80',
  'Latte Macchiato': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&q=80',
  'Flat White': 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=400&q=80',
  'Cold Brew': 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400&q=80',
  'Heiße Schokolade': 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400&q=80',
  'Chai Latte': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&q=80',
  'Pfefferminztee': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&q=80',
  'Apfelstrudel': 'https://images.unsplash.com/photo-1601000938259-9e92002320b2?w=400&q=80',
  'Käsekuchen': 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&q=80',
  'Tiramisu': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80',
  'Brownie': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&q=80',
}
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80'
const imageFor = (item) => item.image_url || DEFAULT_IMAGES[item.name_de] || FALLBACK_IMAGE

const LANG_OPTIONS = [
  { id: 'de', label: 'DE', flag: '🇩🇪' },
  { id: 'en', label: 'EN', flag: '🇬🇧' },
  { id: 'ua', label: 'UA', flag: '🇺🇦' },
  { id: 'it', label: 'IT', flag: '🇮🇹' },
]

/* ------------------------------------------------------------------
   Getränke-Optionen. In die Bestellung wird immer DEUTSCH geschrieben,
   damit das Personal es in der Admin versteht – egal welche Sprache der Gast hat.
------------------------------------------------------------------- */
const OPTION_GROUPS = {
  size: {
    key: 'Größe',
    title: { de: 'Größe', en: 'Size', ua: 'Розмір', it: 'Dimensione' },
    choices: [
      { id: 'Normal', extra: 0, label: { de: 'Normal', en: 'Regular', ua: 'Звичайний', it: 'Normale' } },
      { id: 'Groß', extra: 0.8, label: { de: 'Groß', en: 'Large', ua: 'Великий', it: 'Grande' } },
    ],
  },
  shot: {
    key: 'Größe',
    title: { de: 'Größe', en: 'Size', ua: 'Розмір', it: 'Dimensione' },
    choices: [
      { id: 'Einfach', extra: 0, label: { de: 'Einfach', en: 'Single', ua: 'Одинарний', it: 'Singolo' } },
      { id: 'Doppelt', extra: 1.0, label: { de: 'Doppelt', en: 'Double', ua: 'Подвійний', it: 'Doppio' } },
    ],
  },
  milk: {
    key: 'Milch',
    title: { de: 'Milch', en: 'Milk', ua: 'Молоко', it: 'Latte' },
    choices: [
      { id: 'Vollmilch', extra: 0, label: { de: 'Vollmilch', en: 'Whole milk', ua: 'Коров’яче', it: 'Intero' } },
      { id: 'Hafermilch', extra: 0.5, label: { de: 'Hafermilch', en: 'Oat milk', ua: 'Вівсяне', it: 'Avena' } },
    ],
  },
  syrup: {
    key: 'Sirup',
    title: { de: 'Sirup', en: 'Syrup', ua: 'Сироп', it: 'Sciroppo' },
    choices: [
      { id: 'Kein', extra: 0, label: { de: 'Ohne', en: 'None', ua: 'Без', it: 'Senza' } },
      { id: 'Vanille', extra: 0.4, label: { de: 'Vanille', en: 'Vanilla', ua: 'Ваніль', it: 'Vaniglia' } },
      { id: 'Karamell', extra: 0.4, label: { de: 'Karamell', en: 'Caramel', ua: 'Карамель', it: 'Caramello' } },
    ],
  },
}

// Welche Optionen ein Gericht hat (vorerst anhand des deutschen Namens).
// Später: Optionen pro Gericht in der Datenbank speichern und in der Admin pflegen.
function optionGroupsFor(item) {
  const n = (item?.name_de || '').toLowerCase()
  if (n.includes('espresso') && !n.includes('macchiato')) return ['shot']
  if (n.includes('americano') || n.includes('cold brew')) return ['size', 'syrup']
  if (/cappuccino|latte|flat white|schokolade|kakao|chai/.test(n)) return ['size', 'milk', 'syrup']
  return [] // Tee, Kuchen usw.: ohne Auswahl direkt in den Warenkorb
}

const defaultOptions = (groups) =>
  Object.fromEntries(groups.map((g) => [g, OPTION_GROUPS[g].choices[0].id]))

const choiceOf = (groupId, choiceId) =>
  OPTION_GROUPS[groupId].choices.find((c) => c.id === choiceId) || OPTION_GROUPS[groupId].choices[0]

const extrasFor = (opts) =>
  Object.entries(opts || {}).reduce((sum, [g, c]) => sum + choiceOf(g, c).extra, 0)

// Nur Abweichungen vom Standard, auf Deutsch: { Größe: 'Groß', Milch: 'Hafermilch' }
function optionsForKitchen(opts) {
  const out = {}
  for (const [g, c] of Object.entries(opts || {})) {
    const group = OPTION_GROUPS[g]
    if (c !== group.choices[0].id) out[group.key] = choiceOf(g, c).label.de
  }
  return out
}

const optionsLabel = (opts, lang) =>
  Object.entries(opts || {})
    .filter(([g, c]) => c !== OPTION_GROUPS[g].choices[0].id)
    .map(([g, c]) => choiceOf(g, c).label[lang] || choiceOf(g, c).label.de)
    .join(', ')

const round2 = (n) => Math.round(n * 100) / 100

/* ------------------------------------------------------------------ */

const ALLERGENS = {
  gluten: { de: 'Gluten', en: 'Gluten', ua: 'Глютен', it: 'Glutine' },
  crustaceans: { de: 'Krebstiere', en: 'Crustaceans', ua: 'Ракоподібні', it: 'Crostacei' },
  eggs: { de: 'Eier', en: 'Eggs', ua: 'Яйця', it: 'Uova' },
  fish: { de: 'Fisch', en: 'Fish', ua: 'Риба', it: 'Pesce' },
  peanuts: { de: 'Erdnüsse', en: 'Peanuts', ua: 'Арахіс', it: 'Arachidi' },
  soy: { de: 'Soja', en: 'Soy', ua: 'Соя', it: 'Soia' },
  milk: { de: 'Milch', en: 'Milk', ua: 'Молоко', it: 'Latte' },
  nuts: { de: 'Schalenfrüchte', en: 'Tree nuts', ua: 'Горіхи', it: 'Frutta a guscio' },
  celery: { de: 'Sellerie', en: 'Celery', ua: 'Селера', it: 'Sedano' },
  mustard: { de: 'Senf', en: 'Mustard', ua: 'Гірчиця', it: 'Senape' },
  sesame: { de: 'Sesam', en: 'Sesame', ua: 'Кунжут', it: 'Sesamo' },
  sulphites: { de: 'Sulfite', en: 'Sulphites', ua: 'Сульфіти', it: 'Solfiti' },
  lupin: { de: 'Lupinen', en: 'Lupin', ua: 'Люпин', it: 'Lupini' },
  molluscs: { de: 'Weichtiere', en: 'Molluscs', ua: 'Молюски', it: 'Molluschi' },
}
const TAGS = {
  vegan: { icon: '🌱', de: 'Vegan', en: 'Vegan', ua: 'Веганське', it: 'Vegano' },
  vegetarian: { icon: '🥚', de: 'Vegetarisch', en: 'Vegetarian', ua: 'Вегетаріанське', it: 'Vegetariano' },
}

const TEXTS = {
  de: {
    service: 'Service', serviceTitle: 'Wie können wir helfen?', callWaiter: 'Bedienung rufen', callWaiterSub: 'Jemand kommt an Ihren Tisch.', askBill: 'Rechnung bitte', askBillSub: 'Wir bringen Ihnen die Rechnung.', called: 'Ist unterwegs!', calledDesc: (t) => `Unser Team weiß Bescheid und kommt gleich zu Tisch ${t}.`,
    table: 'Tisch', chooseTable: 'Tisch wählen', tableHint: 'Die Nummer finden Sie auf Ihrem Tisch.', close: 'Schließen', change: 'Ändern',
    forTable: 'Bestellung für', items: 'Positionen', viewOrder: 'Bestellung ansehen',
    summary: 'Ihre Bestellung', tipQ: 'Trinkgeld für das Team?', noTip: 'Ohne',
    split: 'Rechnung teilen', splitAlone: '1 (Allein)', perPerson: 'Pro Person',
    subtotal: 'Zwischensumme', tip: 'Trinkgeld', total: 'Gesamt',
    send: 'Kostenpflichtig bestellen', sending: 'Wird übermittelt …', cancel: 'Abbrechen',
    add: 'Hinzufügen', customize: 'Getränk anpassen', payNote: 'Bezahlung beim Personal',
    allergens: 'Allergene', added: 'Hinzugefügt', soldOut: 'Ausverkauft', all: 'Alle',
    menuError: 'Speisekarte konnte nicht geladen werden.', retry: 'Erneut versuchen',
    soldOutInCart: 'Ausverkauft – bitte entfernen', done: 'Fertig', thankTitle: 'Vielen Dank!',
    thankDesc: (t, n) => `Ihre Bestellung${n ? ` #${n}` : ''} für Tisch ${t} ist eingegangen und wird zubereitet.`,
  },
  en: {
    service: 'Service', serviceTitle: 'How can we help?', callWaiter: 'Call staff', callWaiterSub: 'Someone will come to your table.', askBill: 'Bill, please', askBillSub: 'We’ll bring you the bill.', called: 'On the way!', calledDesc: (t) => `Our team has been notified and will come to table ${t} shortly.`,
    table: 'Table', chooseTable: 'Select your table', tableHint: 'You’ll find the number on your table.', close: 'Close', change: 'Change',
    forTable: 'Order for', items: 'items', viewOrder: 'View order',
    summary: 'Your order', tipQ: 'Add a tip for the team?', noTip: 'None',
    split: 'Split the bill', splitAlone: '1 (Single)', perPerson: 'Per person',
    subtotal: 'Subtotal', tip: 'Tip', total: 'Total',
    send: 'Place order', sending: 'Sending …', cancel: 'Cancel',
    add: 'Add', customize: 'Customize your drink', payNote: 'Payment with our staff',
    allergens: 'Allergens', added: 'Added', soldOut: 'Sold out', all: 'All',
    menuError: 'The menu could not be loaded.', retry: 'Try again',
    soldOutInCart: 'Sold out – please remove', done: 'Done', thankTitle: 'Thank you!',
    thankDesc: (t, n) => `Your order${n ? ` #${n}` : ''} for table ${t} was received and is being prepared.`,
  },
  ua: {
    service: 'Сервіс', serviceTitle: 'Чим можемо допомогти?', callWaiter: 'Покликати офіціанта', callWaiterSub: 'Хтось підійде до вашого столика.', askBill: 'Рахунок, будь ласка', askBillSub: 'Ми принесемо вам рахунок.', called: 'Вже йдемо!', calledDesc: (t) => `Команда отримала сигнал і скоро підійде до столика ${t}.`,
    table: 'Столик', chooseTable: 'Оберіть столик', tableHint: 'Номер вказано на вашому столику.', close: 'Закрити', change: 'Змінити',
    forTable: 'Замовлення для', items: 'позицій', viewOrder: 'Переглянути замовлення',
    summary: 'Ваше замовлення', tipQ: 'Чайові для команди?', noTip: 'Без',
    split: 'Розділити рахунок', splitAlone: '1 (один)', perPerson: 'З особи',
    subtotal: 'Сума', tip: 'Чайові', total: 'Разом',
    send: 'Замовити', sending: 'Надсилаємо …', cancel: 'Скасувати',
    add: 'Додати', customize: 'Налаштуйте напій', payNote: 'Оплата у персоналу',
    allergens: 'Алергени', added: 'Додано', soldOut: 'Немає в наявності', all: 'Усі',
    menuError: 'Не вдалося завантажити меню.', retry: 'Спробувати ще раз',
    soldOutInCart: 'Закінчилось – приберіть, будь ласка', done: 'Готово', thankTitle: 'Дякуємо!',
    thankDesc: (t, n) => `Замовлення${n ? ` №${n}` : ''} для столика ${t} прийнято й уже готується.`,
  },
  it: {
    service: 'Servizio', serviceTitle: 'Come possiamo aiutarti?', callWaiter: 'Chiama il personale', callWaiterSub: 'Qualcuno verrà al tuo tavolo.', askBill: 'Il conto, per favore', askBillSub: 'Ti portiamo il conto.', called: 'Arriviamo!', calledDesc: (t) => `Il team è stato avvisato e arriverà presto al tavolo ${t}.`,
    table: 'Tavolo', chooseTable: 'Scegli il tavolo', tableHint: 'Il numero è indicato sul tuo tavolo.', close: 'Chiudi', change: 'Cambia',
    forTable: 'Ordine per', items: 'articoli', viewOrder: 'Vedi ordine',
    summary: 'Il tuo ordine', tipQ: 'Una mancia per il team?', noTip: 'No',
    split: 'Dividi il conto', splitAlone: '1 (solo)', perPerson: 'A persona',
    subtotal: 'Subtotale', tip: 'Mancia', total: 'Totale',
    send: 'Ordina', sending: 'Invio …', cancel: 'Annulla',
    add: 'Aggiungi', customize: 'Personalizza la bevanda', payNote: 'Pagamento al personale',
    allergens: 'Allergeni', added: 'Aggiunto', soldOut: 'Esaurito', all: 'Tutti',
    menuError: 'Impossibile caricare il menu.', retry: 'Riprova',
    soldOutInCart: 'Esaurito – rimuovilo', done: 'Fatto', thankTitle: 'Grazie!',
    thankDesc: (t, n) => `Il tuo ordine${n ? ` n. ${n}` : ''} per il tavolo ${t} è stato ricevuto ed è in preparazione.`,
  },
}

const TIP_OPTIONS = [
  { type: 'none' },
  { type: 'percent', value: 5 },
  { type: 'percent', value: 10 },
  { type: 'percent', value: 15 },
  { type: 'fixed', value: 1 },
]

const chipCls = (on) =>
  `rounded-2xl border p-3 text-xs font-bold transition ${on ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-700 bg-stone-50'}`

/* ------------------------------------------------------------------ */

/* Kleine Animationen (respektiert „Bewegung reduzieren“ in den Systemeinstellungen) */
const GUEST_CSS = `
@keyframes ga-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes ga-sheet { from { opacity: 0; transform: translateY(32px) } to { opacity: 1; transform: none } }
@keyframes ga-pop { 0% { transform: scale(1) } 35% { transform: scale(.82) } 70% { transform: scale(1.08) } 100% { transform: scale(1) } }
@keyframes ga-badge { from { opacity: 0; transform: scale(.4) } to { opacity: 1; transform: scale(1) } }
.ga-backdrop { animation: ga-fade .2s ease-out both }
.ga-sheet { animation: ga-sheet .32s cubic-bezier(.2,.9,.25,1) both }
.ga-pop { animation: ga-pop .35s ease-out }
.ga-badge { animation: ga-badge .25s cubic-bezier(.2,.9,.25,1.3) both }
@media (prefers-reduced-motion: reduce) {
  .ga-backdrop, .ga-sheet, .ga-pop, .ga-badge { animation: none }
}`

const PlusIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
)
const CloseIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

const BellIcon = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
)
const UserIcon = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
  </svg>
)
const ReceiptIcon = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 2v20l3-2 3 2 2-2 2 2 3-2 3 2V2l-3 2-3-2-2 2-2-2-3 2Z" /><path d="M8 8h8M8 12h8M8 16h5" />
  </svg>
)

// Runder Schließen-Knopf für alle Fenster
const CloseButton = ({ onClick, label }) => (
  <button type="button" onClick={onClick} aria-label={label}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition hover:bg-stone-200 active:scale-90">
    <CloseIcon />
  </button>
)

// Hinzufügen-Knopf: sauber zentriertes Plus, Wipp-Animation beim Antippen,
// Zähler-Badge, wenn das Gericht schon im Warenkorb ist.
function AddButton({ available, count, label, onClick }) {
  const [pops, setPops] = useState(0)
  return (
    <button
      type="button"
      disabled={!available}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); if (!available) return; setPops((n) => n + 1); onClick() }}
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
        available
          ? 'bg-stone-900 text-white shadow-[0_6px_16px_-6px_rgba(28,25,23,0.6)] hover:bg-amber-900'
          : 'bg-stone-100 text-stone-300'
      }`}
    >
      <span key={pops} className={pops ? 'ga-pop flex' : 'flex'}>
        {available ? <PlusIcon className="h-5 w-5" /> : <CloseIcon className="h-4 w-4" />}
      </span>
      {count > 0 && (
        <span key={`b${count}`}
              className="ga-badge absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-stone-900 ring-2 ring-white">
          {count}
        </span>
      )}
    </button>
  )
}

// Tisch wählen: Bottom-Sheet mit Animation, Schließen per X oder Tippen daneben
function TablePicker({ tableCount, current, t, onPick, onClose }) {
  const [picked, setPicked] = useState(current)
  function choose(num) {
    setPicked(String(num))
    setTimeout(() => onPick(String(num)), 180) // kurz die Auswahl zeigen, dann schließen
  }
  return (
    <div className="ga-backdrop fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 backdrop-blur-xs sm:items-center"
         onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ga-sheet w-full max-w-md rounded-[28px] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-stone-200 sm:hidden" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h4 className="text-lg font-black text-stone-900">🪑 {t.chooseTable}</h4>
            <p className="mt-0.5 text-xs font-medium text-stone-500">{t.tableHint}</p>
          </div>
          <CloseButton onClick={onClose} label={t.close} />
        </div>
        <div className="grid max-h-[50vh] grid-cols-4 gap-2.5 overflow-y-auto p-0.5">
          {Array.from({ length: tableCount }, (_, i) => i + 1).map((num) => {
            const on = picked === String(num)
            return (
              <button key={num} type="button" onClick={() => choose(num)}
                      className={`aspect-square rounded-2xl text-lg font-black transition-all duration-200 active:scale-90 ${
                        on ? 'scale-105 bg-stone-900 text-white shadow-lg' : 'bg-stone-100 text-stone-800 hover:bg-stone-200'
                      }`}>
                {num}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Allergens({ item, lang, t }) {
  const tags = (item.tags || []).filter((x) => TAGS[x])
  const allergens = (item.allergens || []).filter((x) => ALLERGENS[x])
  if (!tags.length && !allergens.length) return null
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-semibold text-stone-500">
      {tags.map((x) => (
        <span key={x} className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-emerald-800">
          {TAGS[x].icon} {TAGS[x][lang] || TAGS[x].de}
        </span>
      ))}
      {allergens.length > 0 && (
        <span>{t.allergens}: {allergens.map((x) => ALLERGENS[x][lang] || ALLERGENS[x].de).join(', ')}</span>
      )}
    </div>
  )
}

export default function GuestApp() {
  const { categories, itemsById, status, reload } = useMenu()
  const { settings } = useSettings()

  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('guest_lang')
    return TEXTS[saved] ? saved : 'de'
  })
  const t = TEXTS[lang]
  const [langOpen, setLangOpen] = useState(false)

  // Tisch: kommt im Idealfall aus dem QR-Code (?table=6) und ist dann fest.
  const urlTable = useMemo(() => {
    const p = new URLSearchParams(window.location.search)
    return p.get('table') || p.get('tisch')
  }, [])
  const tableLocked = Boolean(urlTable)
  const [table, setTable] = useState(() => urlTable || localStorage.getItem('guest_table') || '1')
  const [isChangingTable, setIsChangingTable] = useState(false)
  const tableCount = Math.max(1, Number(settings?.table_count) || 12)

  const [activeCategory, setActiveCategory] = useState('all')
  const [cart, setCart] = useState([]) // [{ key, itemId, opts, qty }]
  const [modalItem, setModalItem] = useState(null)
  const [modalOpts, setModalOpts] = useState({})
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [tipOption, setTipOption] = useState(TIP_OPTIONS[0]) // Standard: kein Trinkgeld
  const [splitCount, setSplitCount] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sentOrder, setSentOrder] = useState(null) // { number }
  const [toast, setToast] = useState('')
  const [serviceOpen, setServiceOpen] = useState(false)
  const [legal, setLegal] = useState(null) // null | 'impressum' | 'datenschutz'
  const [serviceBusy, setServiceBusy] = useState(false)
  const [serviceSent, setServiceSent] = useState(false)
  const [serviceError, setServiceError] = useState('')
  const toastTimer = useRef(null)

  const brand = settings?.cafe_name || 'Café am Rathaus'
  const ordersEnabled = settings?.orders_enabled !== false

  useEffect(() => { localStorage.setItem('guest_lang', lang) }, [lang])
  useEffect(() => { if (!tableLocked) localStorage.setItem('guest_table', table) }, [table, tableLocked])
  useEffect(() => { document.title = brand }, [brand])

  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1400)
  }

  const visibleCategories = useMemo(() => categories.filter((c) => c.items.length > 0), [categories])
  const shownCategories = activeCategory === 'all'
    ? visibleCategories
    : visibleCategories.filter((c) => c.id === activeCategory)

  /* ---------- Warenkorb ---------- */

  const unitPrice = (line) => {
    const item = itemsById[line.itemId]
    return item ? round2(Number(item.price) + extrasFor(line.opts)) : 0
  }

  function addLine(itemId, opts) {
    const key = `${itemId}|${JSON.stringify(opts)}`
    setCart((prev) => {
      const found = prev.find((l) => l.key === key)
      if (found) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l))
      return [...prev, { key, itemId, opts, qty: 1 }]
    })
    showToast(`✓ ${t.added}`)
  }

  function changeQty(key, delta) {
    setCart((prev) => {
      const next = prev
        .map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0)
      if (next.length === 0) setIsCheckoutOpen(false)
      return next
    })
  }

  function openItem(item) {
    if (!item.is_available) return
    const groups = optionGroupsFor(item)
    if (groups.length === 0) return addLine(item.id, {})
    setModalItem(item)
    setModalOpts(defaultOptions(groups))
  }

  const cartCount = cart.reduce((s, l) => s + l.qty, 0)
  const countById = cart.reduce((m, l) => ({ ...m, [l.itemId]: (m[l.itemId] || 0) + l.qty }), {})
  const subtotal = round2(cart.reduce((s, l) => s + unitPrice(l) * l.qty, 0))
  const tipAmount = tipOption.type === 'percent'
    ? round2((subtotal * tipOption.value) / 100)
    : tipOption.type === 'fixed' ? tipOption.value : 0
  const total = round2(subtotal + tipAmount)
  const perPerson = splitCount > 1 ? round2(total / splitCount) : null
  const soldOutInCart = cart.some((l) => itemsById[l.itemId] && !itemsById[l.itemId].is_available)

  async function sendOrder() {
    if (!cart.length || submitting || soldOutInCart) return
    if (!ordersEnabled) { setSendError(orderErrorText({ code: 'ORDERS_DISABLED' }, lang)); return }
    setSubmitting(true)
    setSendError('')
    try {
      // Preise rechnet die DATENBANK aus (submit_order) – der Browser schickt nur, WAS bestellt wurde.
      const { data, error } = await supabase.rpc('submit_order', {
        p_table_number: parseInt(table, 10) || 1,
        p_items: cart.map((l) => ({
          menu_item_id: l.itemId,
          quantity: l.qty,
          options: optionsForKitchen(l.opts), // z. B. { Milch: 'Hafermilch' } – immer Deutsch
        })),
        p_tip_type: tipOption.type,
        p_tip_value: tipOption.value || 0,
        p_split: splitCount,
      })
      if (error) throw error
      const order = { order_number: data?.order_number }

      setCart([])
      setTipOption(TIP_OPTIONS[0])
      setSplitCount(1)
      setIsCheckoutOpen(false)
      setSentOrder({ number: order.order_number })
    } catch (err) {
      console.error(err)
      const msg = err?.message || ''
      const known = msg.match(/^(ORDERS_DISABLED|INVALID_TABLE|ITEM_UNAVAILABLE)(?::\s*(.*))?/)
      const offline = !navigator.onLine || /fetch|network/i.test(msg)
      setSendError(orderErrorText(
        known ? { code: known[1], detail: known[2] } : { code: offline ? 'NETWORK' : 'UNKNOWN' },
        lang
      ))
    } finally {
      setSubmitting(false)
    }
  }

  // „Bedienung rufen" / „Rechnung bitte" – landet live in der Verwaltung
  async function callService(kind) {
    if (serviceBusy) return
    setServiceBusy(true)
    setServiceError('')
    const { error } = await supabase
      .from('service_calls')
      .insert({ table_number: parseInt(table, 10) || 1, kind })
    setServiceBusy(false)
    // 23505 = für diesen Tisch läuft schon ein Ruf → für den Gast trotzdem „unterwegs"
    if (error && error.code !== '23505') {
      console.error(error)
      const offline = !navigator.onLine || /fetch|network/i.test(error.message || '')
      setServiceError(orderErrorText({ code: offline ? 'NETWORK' : 'UNKNOWN' }, lang))
      return
    }
    setServiceSent(true)
  }

  function closeService() {
    setServiceOpen(false)
    setServiceSent(false)
    setServiceError('')
  }

  /* ---------- Render ---------- */

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fcf9f5]">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-900 border-t-transparent" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#fcf9f5] p-6 text-center">
        <p className="font-bold text-stone-800">{t.menuError}</p>
        <button onClick={reload} className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-bold text-white">{t.retry}</button>
      </div>
    )
  }

  const currentLang = LANG_OPTIONS.find((l) => l.id === lang)

  return (
    <div className="min-h-screen bg-[#fcf9f5] pb-32 font-sans text-stone-800 antialiased selection:bg-amber-100">
      <style>{GUEST_CSS}</style>

      {/* Kopfzeile */}
      <header className="sticky top-0 z-30 border-b border-amber-900/5 bg-[#fcf9f5]/90 backdrop-blur-md">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center justify-between gap-2">
          <button
            onClick={() => !tableLocked && setIsChangingTable(true)}
            disabled={tableLocked}
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-stone-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-stone-200/50 active:scale-95 transition disabled:active:scale-100"
          >
            <span className="text-amber-800">🪑</span>
            <span>{t.table} <b className="text-amber-950 font-black">{table}</b></span>
            {!tableLocked && <span className="text-[10px] text-stone-400">▼</span>}
          </button>

          <span className="text-sm font-black tracking-tight text-stone-900 truncate">{brand}</span>

          <div className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-stone-800 border border-stone-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              aria-haspopup="listbox"
              aria-expanded={langOpen}
            >
              {currentLang.label} {currentLang.flag} <span className="text-[10px] text-stone-400">▼</span>
            </button>
            {langOpen && (
              <div role="listbox" className="absolute right-0 mt-1.5 w-28 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
                {LANG_OPTIONS.map((l) => (
                  <button
                    key={l.id}
                    role="option"
                    aria-selected={lang === l.id}
                    onClick={() => { setLang(l.id); setLangOpen(false) }}
                    className={`block w-full px-3 py-2 text-left text-xs font-bold ${lang === l.id ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-50'}`}
                  >
                    {l.flag} {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Kategorien aus der Datenbank */}
        <div className="mx-auto max-w-md px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {[{ id: 'all', label: t.all }, ...visibleCategories.map((c) => ({ id: c.id, label: pick(c, 'name', lang) }))].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 ${
                activeCategory === cat.id
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white text-stone-600 border border-stone-200/60 hover:bg-stone-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {!ordersEnabled && (
        <div className="mx-auto max-w-md px-4 pt-4">
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-950">
            {orderErrorText({ code: 'ORDERS_DISABLED' }, lang)}
          </div>
        </div>
      )}

      {/* Speisekarte */}
      <main className="mx-auto max-w-md p-4 space-y-6">
        {shownCategories.map((cat) => (
          <section key={cat.id} className="space-y-3.5">
            {activeCategory === 'all' && (
              <h2 className="px-1 text-base font-black text-stone-900">{pick(cat, 'name', lang)}</h2>
            )}
            {cat.items.map((item) => {
              const name = pick(item, 'name', lang)
              const desc = pick(item, 'description', lang)
              const available = item.is_available
              return (
                <div
                  key={item.id}
                  onClick={() => openItem(item)}
                  className={`group flex items-center gap-3.5 rounded-3xl bg-white p-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-stone-100 transition-all duration-200 ${
                    available ? 'cursor-pointer active:scale-[0.99] hover:border-amber-200/80 hover:shadow-md' : 'opacity-50'
                  }`}
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-stone-100">
                    <img src={imageFor(item)} alt={name} loading="lazy"
                         className={`h-full w-full object-cover ${available ? '' : 'grayscale'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-stone-900 truncate leading-snug">{name}</h3>
                    {desc && <p className="text-xs text-stone-500 mt-0.5 line-clamp-2 font-medium">{desc}</p>}
                    <Allergens item={item} lang={lang} t={t} />
                    <div className="mt-1.5 text-sm font-black text-stone-900">
                      {available ? formatPrice(item.price) : <span className="text-rose-700">{t.soldOut}</span>}
                    </div>
                  </div>

                  <AddButton
                    available={available}
                    count={countById[item.id] || 0}
                    label={`${name} ${t.add}`}
                    onClick={() => openItem(item)}
                  />
                </div>
              )
            })}
          </section>
        ))}
      </main>

      {/* Rechtliches */}
      <footer className="mx-auto max-w-md px-4 pb-4 pt-2 text-center text-xs font-semibold text-stone-500">
        <button type="button" onClick={() => setLegal('impressum')} className="underline-offset-2 hover:underline">Impressum</button>
        <span className="mx-2 text-stone-300">·</span>
        <button type="button" onClick={() => setLegal('datenschutz')} className="underline-offset-2 hover:underline">Datenschutz</button>
      </footer>

      {/* Kurze Bestätigung beim Hinzufügen */}
      {toast && (
        <div className="fixed left-1/2 top-24 z-50 -translate-x-1/2 rounded-full bg-stone-900 px-4 py-2 text-xs font-bold text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Service-Knopf (Bedienung / Rechnung) */}
      <button
        type="button"
        onClick={() => setServiceOpen(true)}
        className={`fixed right-4 z-40 flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-extrabold text-stone-900 shadow-[0_10px_30px_-8px_rgba(28,25,23,0.45)] border border-stone-200 active:scale-95 transition ${cart.length > 0 ? 'bottom-28' : 'bottom-6'}`}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-stone-900"><BellIcon className="h-4 w-4" /></span>
        {t.service}
      </button>

      {/* Warenkorb-Leiste */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
          <div className="mx-auto max-w-md flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-stone-500">{cartCount} {t.items}</div>
              <div className="text-xl font-black text-stone-900">{formatPrice(subtotal)}</div>
            </div>
            <button
              onClick={() => { setSendError(''); setIsCheckoutOpen(true) }}
              className="flex-1 rounded-2xl bg-stone-900 py-3.5 px-5 text-center font-bold text-white shadow-md active:scale-95 transition hover:bg-stone-800"
            >
              {t.viewOrder}
            </button>
          </div>
        </div>
      )}

      {/* Getränk anpassen */}
      {modalItem && (
        <div className="ga-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-xs sm:items-center"
             onMouseDown={(e) => e.target === e.currentTarget && setModalItem(null)}>
          <div className="ga-sheet w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-stone-900">{pick(modalItem, 'name', lang)}</h3>
                <p className="text-xs text-stone-500">{t.customize}</p>
              </div>
              <CloseButton onClick={() => setModalItem(null)} label={t.close} />
            </div>
            <Allergens item={modalItem} lang={lang} t={t} />

            {optionGroupsFor(modalItem).map((g) => {
              const group = OPTION_GROUPS[g]
              return (
                <div key={g} className="mt-4">
                  <div className="text-[11px] font-black uppercase tracking-wider text-stone-500">{group.title[lang]}</div>
                  <div className={`grid gap-2 mt-1.5 ${group.choices.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {group.choices.map((c) => (
                      <button key={c.id} type="button" className={chipCls(modalOpts[g] === c.id)}
                              onClick={() => setModalOpts((o) => ({ ...o, [g]: c.id }))}>
                        {c.label[lang]}
                        {c.extra > 0 && <span className="block text-[10px] opacity-70">+{formatPrice(c.extra)}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}

            <div className="flex gap-2 pt-5">
              <button type="button" onClick={() => setModalItem(null)}
                      className="w-1/3 rounded-2xl border border-stone-200 py-3 text-xs font-bold text-stone-600">
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => { addLine(modalItem.id, modalOpts); setModalItem(null) }}
                className="w-2/3 rounded-2xl bg-stone-900 py-3 text-xs font-bold text-white shadow-md active:scale-95 transition"
              >
                {t.add} · {formatPrice(Number(modalItem.price) + extrasFor(modalOpts))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bestellübersicht */}
      {isCheckoutOpen && (
        <div className="ga-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-xs sm:items-center"
             onMouseDown={(e) => e.target === e.currentTarget && setIsCheckoutOpen(false)}>
          <div className="ga-sheet w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-lg font-black text-stone-900">{t.summary}</h3>
              <CloseButton onClick={() => setIsCheckoutOpen(false)} label={t.close} />
            </div>

            <div className="overflow-y-auto">
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-stone-50 p-3 border border-stone-200/80">
                <div className="flex items-center gap-2">
                  <span className="text-base">📍</span>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{t.forTable}</div>
                    <div className="text-sm font-black text-stone-900">{t.table} {table}</div>
                  </div>
                </div>
                {!tableLocked && (
                  <button onClick={() => setIsChangingTable(true)}
                          className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-stone-800 border border-stone-200 active:scale-95 transition">
                    {t.change}
                  </button>
                )}
              </div>

              {/* Positionen mit Menge */}
              <div className="my-3 space-y-2">
                {cart.map((l) => {
                  const item = itemsById[l.itemId]
                  const soldOut = item && !item.is_available
                  return (
                    <div key={l.key} className="flex items-center justify-between gap-3 border-b border-stone-50 py-1.5 text-sm">
                      <div className="min-w-0">
                        <div className="font-extrabold text-stone-900 truncate">{item ? pick(item, 'name', lang) : '—'}</div>
                        {optionsLabel(l.opts, lang) && <div className="text-xs text-stone-500 font-medium">{optionsLabel(l.opts, lang)}</div>}
                        {soldOut && <div className="text-xs font-bold text-rose-700">{t.soldOutInCart}</div>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="flex items-center rounded-full border border-stone-200">
                          <button onClick={() => changeQty(l.key, -1)} aria-label="−" className="h-8 w-8 font-black text-stone-700">−</button>
                          <span className="w-5 text-center text-xs font-black">{l.qty}</span>
                          <button onClick={() => changeQty(l.key, 1)} aria-label="+" disabled={soldOut} className="h-8 w-8 font-black text-stone-700 disabled:opacity-30">+</button>
                        </div>
                        <span className="w-16 text-right font-black text-stone-900">{formatPrice(unitPrice(l) * l.qty)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Rechnung teilen */}
              <div className="mb-2.5 rounded-2xl bg-stone-50 p-3 border border-stone-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-stone-700">👥 {t.split}</span>
                  {perPerson && (
                    <span className="text-xs font-black text-stone-900 bg-stone-200/70 px-2 py-0.5 rounded-md">
                      {t.perPerson}: {formatPrice(perPerson)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((n) => (
                    <button key={n} type="button" onClick={() => setSplitCount(n)}
                            className={`rounded-xl py-1.5 text-xs font-bold transition ${splitCount === n ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 border border-stone-200'}`}>
                      {n === 1 ? t.splitAlone : n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trinkgeld (Standard: ohne) */}
              <div className="mb-2.5 rounded-2xl bg-stone-50 p-3 border border-stone-200/80">
                <div className="text-xs font-bold text-stone-700 mb-1.5">{t.tipQ}</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {TIP_OPTIONS.map((opt, i) => {
                    const on = tipOption.type === opt.type && tipOption.value === opt.value
                    const label = opt.type === 'none' ? t.noTip : opt.type === 'percent' ? `${opt.value}%` : formatPrice(opt.value)
                    return (
                      <button key={i} type="button" onClick={() => setTipOption(opt)}
                              className={`rounded-xl py-1.5 text-xs font-bold transition ${on ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 border border-stone-200'}`}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Summen */}
              <div className="space-y-1 text-xs text-stone-600 mb-3 px-1">
                <div className="flex justify-between"><span>{t.subtotal}</span><span>{formatPrice(subtotal)}</span></div>
                {tipAmount > 0 && (
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>{t.tip}</span><span>+{formatPrice(tipAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-stone-900 pt-1 border-t border-stone-200">
                  <span>{t.total}</span><span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            {sendError && (
              <div className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">{sendError}</div>
            )}

            <button
              onClick={sendOrder}
              disabled={submitting || soldOutInCart || !ordersEnabled}
              className="w-full rounded-2xl bg-stone-900 py-3.5 text-center font-bold text-white shadow-md active:scale-95 transition disabled:opacity-50 hover:bg-stone-800"
            >
              {submitting ? t.sending : t.send}
            </button>
            <p className="mt-2 text-center text-[11px] font-semibold text-stone-500">💶 {t.payNote}</p>
          </div>
        </div>
      )}

      {/* Tisch wählen (nur ohne QR-Code) */}
      {isChangingTable && (
        <TablePicker
          tableCount={tableCount}
          current={table}
          t={t}
          onPick={(num) => { setTable(num); setIsChangingTable(false) }}
          onClose={() => setIsChangingTable(false)}
        />
      )}

      {/* Impressum / Datenschutz */}
      {legal && (
        <div className="ga-backdrop fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-3 backdrop-blur-xs sm:items-center"
             onMouseDown={(e) => e.target === e.currentTarget && setLegal(null)}>
          <div className="ga-sheet flex max-h-[88vh] w-full max-w-md flex-col rounded-[28px] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <h3 className="text-lg font-black text-stone-900">{legal === 'impressum' ? 'Impressum' : 'Datenschutzerklärung'}</h3>
              <CloseButton onClick={() => setLegal(null)} label={t.close} />
            </div>
            <div className="overflow-y-auto pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
              {legal === 'impressum' ? <Impressum settings={settings} /> : <Datenschutz settings={settings} />}
            </div>
          </div>
        </div>
      )}

      {/* Service-Fenster */}
      {serviceOpen && (
        <div className="ga-backdrop fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 backdrop-blur-xs sm:items-center"
             onMouseDown={(e) => e.target === e.currentTarget && closeService()}>
          <div className="ga-sheet w-full max-w-md rounded-[28px] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-stone-200 sm:hidden" />
            {serviceSent ? (
              <div className="py-4 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-800">✓</div>
                <h3 className="text-lg font-black text-stone-900">{t.called}</h3>
                <p className="mt-1 text-sm font-medium text-stone-500">{t.calledDesc(table)}</p>
                <button type="button" onClick={closeService}
                        className="mt-5 w-full rounded-2xl bg-stone-900 py-3 text-sm font-bold text-white active:scale-95 transition">
                  {t.done}
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-stone-900">{t.serviceTitle}</h3>
                    <p className="mt-0.5 text-xs font-medium text-stone-500">{t.table} {table}</p>
                  </div>
                  <CloseButton onClick={closeService} label={t.close} />
                </div>
                <div className="grid gap-3">
                  {[['waiter', UserIcon, t.callWaiter, t.callWaiterSub], ['bill', ReceiptIcon, t.askBill, t.askBillSub]].map(([kind, Icon, title, sub]) => (
                    <button key={kind} type="button" disabled={serviceBusy} onClick={() => callService(kind)}
                            className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-left transition hover:bg-stone-100 active:scale-[0.98] disabled:opacity-60">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-stone-900"><Icon /></span>
                      <span>
                        <span className="block text-base font-extrabold text-stone-900">{title}</span>
                        <span className="block text-xs font-medium text-stone-500">{sub}</span>
                      </span>
                    </button>
                  ))}
                </div>
                {serviceError && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">{serviceError}</p>}
              </>
            )}
          </div>
        </div>
      )}

      {/* Bestellung gesendet */}
      {sentOrder && (
        <div className="ga-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="ga-sheet w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-800">✓</div>
            <h3 className="text-lg font-black text-stone-900">{t.thankTitle}</h3>
            <p className="mt-1 text-xs text-stone-500 font-medium">{t.thankDesc(table, sentOrder.number)}</p>
            <p className="mt-2 text-xs font-bold text-stone-700">💶 {t.payNote}</p>
            <button type="button" onClick={() => setSentOrder(null)}
                    className="mt-5 w-full rounded-2xl bg-stone-900 py-3 text-xs font-bold text-white shadow-md active:scale-95 transition">
              {t.done}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
