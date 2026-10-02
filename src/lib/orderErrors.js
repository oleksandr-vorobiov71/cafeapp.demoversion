const TEXTS = {
  ORDERS_DISABLED: {
    de: 'Bestellungen sind gerade nicht möglich. Bitte bestellen Sie an der Theke.',
    en: 'Ordering is currently unavailable. Please order at the counter.',
    ua: 'Замовлення наразі недоступні. Будь ласка, замовте на стійці.',
    it: 'Gli ordini non sono al momento disponibili. Ordina al bancone.',
  },
  INVALID_TABLE: {
    de: 'Ungültige Tischnummer.',
    en: 'Invalid table number.',
    ua: 'Невірний номер столика.',
    it: 'Numero del tavolo non valido.',
  },
  ITEM_UNAVAILABLE: {
    de: 'Leider ausverkauft: {name}. Bitte aus der Bestellung entfernen.',
    en: 'Sorry, sold out: {name}. Please remove it from your order.',
    ua: 'На жаль, закінчилось: {name}. Приберіть це з замовлення.',
    it: "Esaurito: {name}. Rimuovilo dall'ordine.",
  },
  NETWORK: {
    de: 'Keine Verbindung. Bitte erneut versuchen.',
    en: 'No connection. Please try again.',
    ua: "Немає з'єднання. Спробуйте ще раз.",
    it: 'Nessuna connessione. Riprova.',
  },
  UNKNOWN: {
    de: 'Etwas ist schiefgelaufen. Bitte erneut versuchen oder an der Theke bestellen.',
    en: 'Something went wrong. Please try again or order at the counter.',
    ua: 'Щось пішло не так. Спробуйте ще раз або замовте на стійці.',
    it: 'Qualcosa è andato storto. Riprova o ordina al bancone.',
  },
}

export function orderErrorText(err, lang = 'de') {
  const code = TEXTS[err?.code] ? err.code : 'UNKNOWN'
  return (TEXTS[code][lang] || TEXTS[code].en).replace('{name}', err?.detail || '')
}
