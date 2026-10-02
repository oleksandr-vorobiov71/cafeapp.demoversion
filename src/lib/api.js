import { supabase } from './supabase'

/* ---------- Menü ---------- */

// Kategorien mit verschachtelten Gerichten: [{ ...category, items: [...] }]
export async function fetchMenu() {
  const [cats, items] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('menu_items').select('*').order('sort_order'),
  ])
  if (cats.error) throw cats.error
  if (items.error) throw items.error
  return cats.data.map((c) => ({
    ...c,
    items: items.data.filter((i) => i.category_id === c.id),
  }))
}

// Live-Updates (Stoppliste, Preise, neue Gerichte). Gibt eine Abmelde-Funktion zurück.
export function subscribeToMenu(onChange) {
  const channel = supabase
    .channel('menu-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, onChange)
    .subscribe()
  return () => supabase.removeChannel(channel)
}

export async function fetchSettings() {
  const { data, error } = await supabase.from('cafe_settings').select('*').eq('id', 1).single()
  if (error) throw error
  return data
}

/* ---------- Bestellung ---------- */

export class OrderError extends Error {
  constructor(code, detail) {
    super(code)
    this.code = code
    this.detail = detail
  }
}

const KNOWN = /^(ORDERS_DISABLED|INVALID_TABLE|INVALID_PAYMENT|INVALID_ITEMS|INVALID_QUANTITY|ITEM_NOT_FOUND|ITEM_UNAVAILABLE|OPTIONS_TOO_LONG)(?::\s*(.*))?$/

function toOrderError(error) {
  const msg = error?.message || ''
  const m = msg.match(KNOWN)
  if (m) return new OrderError(m[1], m[2] || '')
  if (!navigator.onLine || /fetch|network/i.test(msg)) return new OrderError('NETWORK', msg)
  return new OrderError('UNKNOWN', msg)
}

/**
 * cart: [{ id: <menu_items.id (uuid)>, quantity: number, options?: object }]
 * Preise/Summe schickt der Client NICHT – die berechnet place_order() in der Datenbank.
 * Rückgabe: { order_id, order_number, total }
 */
export async function placeOrder({ tableNumber, paymentMethod, comment, cart }) {
  const { data, error } = await supabase.rpc('place_order', {
    p_table_number: tableNumber,
    p_payment_method: paymentMethod, // 'cash' | 'card'
    p_comment: comment || null,
    p_items: cart.map((l) => ({
      menu_item_id: l.id,
      quantity: l.quantity,
      options: l.options ?? {},
    })),
  })
  if (error) throw toOrderError(error)
  return data
}
