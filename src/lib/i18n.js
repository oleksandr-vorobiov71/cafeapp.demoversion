export const LANGS = ['de', 'en', 'ua', 'it']

// Feld in der gewählten Sprache; Fallback: en → de (falls Übersetzung in der DB fehlt)
export const pick = (row, field, lang) =>
  row?.[`${field}_${lang}`] || row?.[`${field}_en`] || row?.[`${field}_de`] || ''

const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
export const formatPrice = (n) => eur.format(Number(n) || 0)
