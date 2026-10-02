import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

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
  'Brownie': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&q=80'
}

const CATEGORIES = {
  de: [
    { id: 'all', name: 'Alle' },
    { id: 'coffee', name: 'Kaffee ☕' },
    { id: 'tea', name: 'Tee & Heiß 🫖' },
    { id: 'desserts', name: 'Desserts 🍰' }
  ],
  en: [
    { id: 'all', name: 'All' },
    { id: 'coffee', name: 'Coffee ☕' },
    { id: 'tea', name: 'Tea & Hot 🫖' },
    { id: 'desserts', name: 'Desserts 🍰' }
  ]
}

const TEXTS = {
  de: {
    brand: 'Café am Rathaus',
    table: 'Tisch',
    changeTable: 'Tisch wählen',
    change: 'Ändern',
    forTable: 'Bestellung für',
    close: 'Schließen',
    itemsWord: 'Positionen',
    toOrder: 'Bestellung ansehen',
    orderSummary: 'Bestellübersicht',
    tipQuestion: 'Trinkgeld für das Team?',
    noTip: 'Ohne',
    splitTitle: 'Rechnung teilen',
    splitAlone: '1 (Allein)',
    perPerson: 'Pro Person',
    subtotal: 'Zwischensumme',
    tip: 'Trinkgeld',
    total: 'Gesamtbetrag',
    sendOrder: 'Kostenpflichtig bestellen',
    sending: 'Wird übermittelt...',
    cancel: 'Abbrechen',
    add: 'Hinzufügen',
    extrasTitle: 'Getränk anpassen',
    size: 'Größe',
    sizeNormal: 'Normal',
    sizeLarge: 'Groß (+0,80€)',
    sizeSingle: 'Einfach',
    sizeDouble: 'Doppelt (+1,00€)',
    milk: 'Milch-Option',
    syrup: 'Sirup',
    milkWhole: 'Vollmilch',
    milkOat: 'Hafermilch (+0,50€)',
    syrupNone: 'Kein Sirup',
    syrupVanilla: 'Vanille (+0,40€)',
    syrupCaramel: 'Karamell (+0,40€)',
    thankTitle: 'Vielen Dank!',
    thankDesc: (t) => `Deine Bestellung für Tisch ${t} ist eingegangen und wird zubereitet.`,
    done: 'Fertig'
  },
  en: {
    brand: 'Café am Rathaus',
    table: 'Table',
    changeTable: 'Select Table',
    change: 'Change',
    forTable: 'Order for',
    close: 'Close',
    itemsWord: 'Items',
    toOrder: 'View Order',
    orderSummary: 'Order Summary',
    tipQuestion: 'Add a tip for the team?',
    noTip: 'None',
    splitTitle: 'Split the bill',
    splitAlone: '1 (Single)',
    perPerson: 'Per person',
    subtotal: 'Subtotal',
    tip: 'Tip',
    total: 'Total Amount',
    sendOrder: 'Place Order',
    sending: 'Submitting...',
    cancel: 'Cancel',
    add: 'Add to Order',
    extrasTitle: 'Customize drink',
    size: 'Size',
    sizeNormal: 'Regular',
    sizeLarge: 'Large (+0.80€)',
    sizeSingle: 'Single',
    sizeDouble: 'Double (+1.00€)',
    milk: 'Milk choice',
    syrup: 'Syrup',
    milkWhole: 'Whole Milk',
    milkOat: 'Oat Milk (+0.50€)',
    syrupNone: 'No Syrup',
    syrupVanilla: 'Vanilla (+0.40€)',
    syrupCaramel: 'Caramel (+0.40€)',
    thankTitle: 'Thank you!',
    thankDesc: (t) => `Your order for Table ${t} was received and is being prepared.`,
    done: 'Done'
  }
}

export default function GuestApp() {
  const [lang, setLang] = useState(() => localStorage.getItem('guest_lang') || 'de')
  const [table, setTable] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('table') || params.get('tisch') || localStorage.getItem('guest_table') || '1'
  })
  const [activeCategory, setActiveCategory] = useState('all')
  const [isChangingTable, setIsChangingTable] = useState(false)

  const [menuItems, setMenuItems] = useState([])
  const [cart, setCart] = useState([])
  const [activeModalItem, setActiveModalItem] = useState(null)

  // Опции выбранного напитка
  const [selectedSize, setSelectedSize] = useState('Normal')
  const [selectedMilk, setSelectedMilk] = useState('Vollmilch')
  const [selectedSyrup, setSelectedSyrup] = useState('Kein Sirup')

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [tipOption, setTipOption] = useState({ type: 'percent', value: 10 })
  const [splitCount, setSplitCount] = useState(1)

  const [orderSent, setOrderSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const t = TEXTS[lang]

  useEffect(() => {
    localStorage.setItem('guest_lang', lang)
  }, [lang])

  useEffect(() => {
    localStorage.setItem('guest_table', table)
  }, [table])

  useEffect(() => {
    supabase
      .from('menu_items')
      .select('*')
      .order('id')
      .then(({ data, error }) => {
        if (!error && data) {
          setMenuItems(data)
        }
        setLoading(false)
      })
  }, [])

  const getItemName = (item) => {
    if (lang === 'en' && item.name_en) return item.name_en
    return item.name || item.name_de || item.title || 'Getränk'
  }

  const getItemDesc = (item) => {
    if (lang === 'en' && item.description_en) return item.description_en
    return item.description || item.description_de || ''
  }

  const getItemAvailable = (item) => (item.is_available !== undefined ? item.is_available : (item.available !== undefined ? item.available : true))

  const detectCategory = (item) => {
    const rawCat = (item.category || '').toLowerCase()
    const name = (item.name || item.name_de || '').toLowerCase()

    if (
      rawCat.includes('dessert') ||
      rawCat.includes('kuchen') ||
      name.includes('kuchen') ||
      name.includes('strudel') ||
      name.includes('tiramisu') ||
      name.includes('brownie')
    ) {
      return 'desserts'
    }

    if (
      rawCat.includes('tea') ||
      rawCat.includes('tee') ||
      rawCat.includes('hot') ||
      rawCat.includes('schoko') ||
      name.includes('tee') ||
      name.includes('schokolade') ||
      name.includes('chai') ||
      name.includes('kakao')
    ) {
      return 'tea'
    }

    return 'coffee'
  }

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return menuItems
    return menuItems.filter(item => detectCategory(item) === activeCategory)
  }, [menuItems, activeCategory])

  const isEspresso = (item) => {
    const n = (item?.name || item?.name_de || '').toLowerCase()
    return n.includes('espresso') && !n.includes('macchiato')
  }

  const openItemModal = (item) => {
    if (!getItemAvailable(item)) return
    const cat = detectCategory(item)

    // Десерты добавляем сразу
    if (cat === 'desserts') {
      const itemName = getItemName(item)
      const basePrice = Number(item.price) || 0
      setCart(prev => [...prev, {
        id: item.id,
        name: itemName,
        basePrice,
        totalPrice: basePrice,
        size: null,
        milk: null,
        syrup: null,
        key: `${item.id}-${Date.now()}`
      }])
      return
    }

    setActiveModalItem(item)
    setSelectedSize(isEspresso(item) ? 'Einfach' : 'Normal')
    setSelectedMilk('Vollmilch')
    setSelectedSyrup('Kein Sirup')
  }

  const addToCartWithOptions = () => {
    if (!activeModalItem) return
    let extraPrice = 0

    // Добавочная цена за размер
    if (selectedSize === 'Groß') extraPrice += 0.80
    if (selectedSize === 'Doppelt') extraPrice += 1.00

    // Добавочная цена за молоко и сироп
    if (selectedMilk === 'Hafermilch') extraPrice += 0.50
    if (selectedSyrup !== 'Kein Sirup') extraPrice += 0.40

    const itemName = getItemName(activeModalItem)
    const basePrice = Number(activeModalItem.price) || 0

    const cartEntry = {
      id: activeModalItem.id,
      name: itemName,
      basePrice,
      totalPrice: basePrice + extraPrice,
      size: selectedSize,
      milk: selectedMilk,
      syrup: selectedSyrup,
      key: `${activeModalItem.id}-${selectedSize}-${selectedMilk}-${selectedSyrup}-${Date.now()}`
    }

    setCart(prev => [...prev, cartEntry])
    setActiveModalItem(null)
  }

  const cartSubtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0)

  const tipAmount = (() => {
    if (tipOption.type === 'none') return 0
    if (tipOption.type === 'fixed') return tipOption.value
    if (tipOption.type === 'percent') return Number(((cartSubtotal * tipOption.value) / 100).toFixed(2))
    return 0
  })()

  const finalTotal = cartSubtotal + tipAmount
  const perPersonAmount = splitCount > 1 ? (finalTotal / splitCount).toFixed(2) : null

  const sendOrder = async () => {
    if (cart.length === 0 || submitting) return
    setSubmitting(true)

    try {
      const commentText = splitCount > 1 ? `Geteilt durch ${splitCount} Personen (${perPersonAmount.replace('.', ',')} € p.P.)` : null

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            table_number: parseInt(table) || 1,
            total_amount: finalTotal,
            status: 'new',
            payment_method: 'cash',
            comment: commentText
          }
        ])
        .select()
        .single()

      if (orderError) throw orderError

      const orderItems = cart.map(item => {
        const opts = {}
        if (item.size && item.size !== 'Normal' && item.size !== 'Einfach') opts.Größe = item.size
        if (item.milk && item.milk !== 'Vollmilch') opts.Milch = item.milk
        if (item.syrup && item.syrup !== 'Kein Sirup' && item.syrup !== 'Kein') opts.Sirup = item.syrup

        return {
          order_id: orderData.id,
          item_name: item.name,
          quantity: 1,
          price: item.totalPrice,
          options_json: opts
        }
      })

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      setCart([])
      setIsCheckoutOpen(false)
      setOrderSent(true)
    } catch (err) {
      console.error(err)
      alert('Fehler: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fcf9f5]">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-900 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fcf9f5] pb-32 font-sans text-stone-800 antialiased selection:bg-amber-100">
      
      {/* Шапка */}
      <header className="sticky top-0 z-30 border-b border-amber-900/5 bg-[#fcf9f5]/90 backdrop-blur-md">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center justify-between gap-2">
          <button
            onClick={() => setIsChangingTable(true)}
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-stone-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-stone-200/50 active:scale-95 transition"
          >
            <span className="text-amber-800">🪑</span>
            <span>{t.table} <b className="text-amber-950 font-black">{table}</b></span>
            <span className="text-[10px] text-stone-400">▼</span>
          </button>

          <span className="text-sm font-black tracking-tight text-stone-900 truncate">{t.brand}</span>

          <div className="flex rounded-full bg-stone-200/60 p-0.5 shadow-inner">
            <button
              onClick={() => setLang('de')}
              className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold transition-all duration-200 ${
                lang === 'de' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              DE 🇩🇪
            </button>
            <button
              onClick={() => setLang('en')}
              className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold transition-all duration-200 ${
                lang === 'en' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              EN 🇬🇧
            </button>
          </div>
        </div>

        {/* Категории меню */}
        <div className="mx-auto max-w-md px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {CATEGORIES[lang].map(cat => {
            const isSelected = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 ${
                  isSelected
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white text-stone-600 border border-stone-200/60 hover:bg-stone-50'
                }`}
              >
                {cat.name}
              </button>
            )
          })}
        </div>
      </header>

      {/* Список блюд */}
      <main className="mx-auto max-w-md p-4 space-y-3.5">
        {filteredItems.map(item => {
          const name = getItemName(item)
          const desc = getItemDesc(item)
          const available = getItemAvailable(item)
          const imgSrc = item.image_url || DEFAULT_IMAGES[name] || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80'
          const price = Number(item.price) || 0

          return (
            <div
              key={item.id}
              onClick={() => openItemModal(item)}
              className={`group flex items-center gap-3.5 rounded-3xl bg-white p-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-stone-100 transition-all duration-200 active:scale-[0.99] ${
                !available ? 'opacity-40 grayscale pointer-events-none' : 'cursor-pointer hover:border-amber-200/80 hover:shadow-md'
              }`}
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-stone-100">
                <img
                  src={imgSrc}
                  alt={name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-stone-900 truncate leading-snug">{name}</h3>
                {desc && <p className="text-xs text-stone-500 mt-0.5 line-clamp-1 font-medium">{desc}</p>}
                <div className="mt-2 text-sm font-black text-stone-900">
                  {price.toFixed(2).replace('.', ',')} €
                </div>
              </div>

              <button
                type="button"
                disabled={!available}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold shadow-sm transition-all duration-200 ${
                  available
                    ? 'bg-amber-950 text-white hover:bg-stone-900 active:scale-80'
                    : 'bg-stone-200 text-stone-400'
                }`}
              >
                <span className="text-base leading-none font-bold">
                  {available ? '+' : '✕'}
                </span>
              </button>
            </div>
          )
        })}
      </main>

      {/* Корзина внизу */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/80 p-4 shadow-2xl">
          <div className="mx-auto max-w-md flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-stone-500">{cart.length} {t.itemsWord}</div>
              <div className="text-xl font-black text-stone-900">{cartSubtotal.toFixed(2).replace('.', ',')} €</div>
            </div>
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="flex-1 rounded-2xl bg-stone-900 py-3.5 px-5 text-center font-bold text-white shadow-md active:scale-95 transition hover:bg-stone-800"
            >
              {t.toOrder}
            </button>
          </div>
        </div>
      )}

      {/* Модалка опций напитка с ВЫБОРОМ РАЗМЕРА */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl animate-in fade-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-stone-900">{getItemName(activeModalItem)}</h3>
            <p className="text-xs text-stone-500 mb-4">{t.extrasTitle}</p>

            {/* 1. ВЫБОР РАЗМЕРА (Größe) */}
            <div className="mb-4">
              <label className="text-[11px] font-black uppercase tracking-wider text-stone-500">{t.size}</label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {isEspresso(activeModalItem) ? (
                  [
                    { id: 'Einfach', label: t.sizeSingle },
                    { id: 'Doppelt', label: t.sizeDouble }
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSize(s.id)}
                      className={`rounded-2xl border p-3 text-xs font-bold transition ${selectedSize === s.id ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-700 bg-stone-50'}`}
                    >
                      {s.label}
                    </button>
                  ))
                ) : (
                  [
                    { id: 'Normal', label: t.sizeNormal },
                    { id: 'Groß', label: t.sizeLarge }
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSize(s.id)}
                      className={`rounded-2xl border p-3 text-xs font-bold transition ${selectedSize === s.id ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-700 bg-stone-50'}`}
                    >
                      {s.label}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* 2. ВЫБОР МОЛОКА */}
            <div className="mb-4">
              <label className="text-[11px] font-black uppercase tracking-wider text-stone-500">{t.milk}</label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {[
                  { id: 'Vollmilch', label: t.milkWhole },
                  { id: 'Hafermilch', label: t.milkOat }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMilk(m.id)}
                    className={`rounded-2xl border p-3 text-xs font-bold transition ${selectedMilk === m.id ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-700 bg-stone-50'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. ВЫБОР СИРОПА */}
            <div className="mb-5">
              <label className="text-[11px] font-black uppercase tracking-wider text-stone-500">{t.syrup}</label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {[
                  { id: 'Kein Sirup', label: t.syrupNone },
                  { id: 'Vanille', label: t.syrupVanilla },
                  { id: 'Karamell', label: t.syrupCaramel }
                ].map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSyrup(s.id)}
                    className={`rounded-2xl border p-2.5 text-center text-xs font-bold transition ${selectedSyrup === s.id ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-700 bg-stone-50'}`}
                  >
                    {s.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModalItem(null)}
                className="w-1/3 rounded-2xl border border-stone-200 py-3 text-xs font-bold text-stone-600"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={addToCartWithOptions}
                className="w-2/3 rounded-2xl bg-stone-900 py-3 text-xs font-bold text-white shadow-md active:scale-95 transition"
              >
                {t.add}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Шторка оформления заказа */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl animate-in fade-in slide-in-from-bottom duration-200 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-lg font-black text-stone-900">{t.orderSummary}</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-stone-400 hover:text-stone-700 font-bold text-lg p-1">✕</button>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-2xl bg-stone-50 p-3 border border-stone-200/80">
              <div className="flex items-center gap-2">
                <span className="text-base">📍</span>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{t.forTable}</div>
                  <div className="text-sm font-black text-stone-900">{t.table} {table}</div>
                </div>
              </div>
              <button
                onClick={() => setIsChangingTable(true)}
                className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-stone-800 border border-stone-200 shadow-xs active:scale-95 transition"
              >
                {t.change}
              </button>
            </div>

            {/* Список позиций с отображением размера */}
            <div className="my-2.5 overflow-y-auto max-h-36 space-y-2 pr-1">
              {cart.map((it, idx) => (
                <div key={it.key || idx} className="flex justify-between items-center text-sm py-1 border-b border-stone-50">
                  <div>
                    <span className="font-extrabold text-stone-900">{it.name}</span>
                    <div className="text-xs text-stone-500 font-medium">
                      {[
                        (it.size && it.size !== 'Normal' && it.size !== 'Einfach') ? it.size : null,
                        (it.milk && it.milk !== 'Vollmilch') ? it.milk : null,
                        (it.syrup && it.syrup !== 'Kein Sirup') ? it.syrup : null
                      ].filter(Boolean).join(', ')}
                    </div>
                  </div>
                  <span className="font-black text-stone-900">{it.totalPrice.toFixed(2).replace('.', ',')} €</span>
                </div>
              ))}
            </div>

            {/* Сплит счёта */}
            <div className="mb-2.5 rounded-2xl bg-stone-50 p-3 border border-stone-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-stone-700">👥 {t.splitTitle}</span>
                {splitCount > 1 && (
                  <span className="text-xs font-black text-stone-900 bg-stone-200/70 px-2 py-0.5 rounded-md">
                    {t.perPerson}: {perPersonAmount.replace('.', ',')} €
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { n: 1, label: t.splitAlone },
                  { n: 2, label: '2' },
                  { n: 3, label: '3' },
                  { n: 4, label: '4' }
                ].map(opt => (
                  <button
                    key={opt.n}
                    type="button"
                    onClick={() => setSplitCount(opt.n)}
                    className={`rounded-xl py-1.5 text-xs font-bold transition ${
                      splitCount === opt.n
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'bg-white text-stone-700 border border-stone-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Чаевые */}
            <div className="mb-2.5 rounded-2xl bg-stone-50 p-3 border border-stone-200/80">
              <div className="text-xs font-bold text-stone-700 mb-1.5">{t.tipQuestion}</div>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { type: 'none', label: t.noTip },
                  { type: 'percent', value: 5, label: '5%' },
                  { type: 'percent', value: 10, label: '10%' },
                  { type: 'percent', value: 15, label: '15%' },
                  { type: 'fixed', value: 1.00, label: '1,00 €' }
                ].map((opt, i) => {
                  const isSelected = tipOption.type === opt.type && (opt.value === undefined || tipOption.value === opt.value)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTipOption(opt)}
                      className={`rounded-xl py-1.5 text-xs font-bold transition ${
                        isSelected
                          ? 'bg-stone-900 text-white shadow-xs'
                          : 'bg-white text-stone-700 border border-stone-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Итоги */}
            <div className="space-y-1 text-xs text-stone-600 mb-3 px-1">
              <div className="flex justify-between">
                <span>{t.subtotal}:</span>
                <span>{cartSubtotal.toFixed(2).replace('.', ',')} €</span>
              </div>
              {tipAmount > 0 && (
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>{t.tip}:</span>
                  <span>+{tipAmount.toFixed(2).replace('.', ',')} €</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-stone-900 pt-1 border-t border-stone-200">
                <span>{t.total}:</span>
                <span>{finalTotal.toFixed(2).replace('.', ',')} €</span>
              </div>
            </div>

            {/* Кнопка отправки */}
            <button
              onClick={sendOrder}
              disabled={submitting}
              className="w-full rounded-2xl bg-stone-900 py-3.5 text-center font-bold text-white shadow-md active:scale-95 transition disabled:opacity-50 hover:bg-stone-800"
            >
              {submitting ? t.sending : t.sendOrder}
            </button>
          </div>
        </div>
      )}

      {/* Модалка смены стола */}
      {isChangingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xs rounded-3xl bg-white p-5 shadow-2xl text-center">
            <h4 className="font-extrabold text-stone-900 mb-2">{t.changeTable}</h4>
            <div className="grid grid-cols-4 gap-2 my-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => { setTable(String(num)); setIsChangingTable(false) }}
                  className={`rounded-2xl py-2.5 font-black transition ${table === String(num) ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-800 hover:bg-stone-200'}`}
                >
                  {num}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIsChangingTable(false)}
              className="text-xs text-stone-500 underline"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* Экран успеха */}
      {orderSent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-800">
              ✓
            </div>
            <h3 className="text-lg font-black text-stone-900">{t.thankTitle}</h3>
            <p className="mt-1 text-xs text-stone-500 font-medium">{t.thankDesc(table)}</p>
            <button
              type="button"
              onClick={() => setOrderSent(false)}
              className="mt-5 w-full rounded-2xl bg-stone-900 py-3 text-xs font-bold text-white shadow-md active:scale-95 transition"
            >
              {t.done}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}