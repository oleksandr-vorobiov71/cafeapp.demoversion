export const inputCls =
  'w-full min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-amber-800 focus:ring-2 focus:ring-amber-800/30'
const btn =
  'inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-base font-semibold transition active:scale-95 disabled:opacity-50'
export const btnPrimary = `${btn} bg-amber-900 text-white hover:bg-amber-800`
export const btnGhost = `${btn} border border-stone-300 bg-white text-stone-800 hover:bg-stone-50`
export const btnDanger = `${btn} border border-red-300 bg-white text-red-700 hover:bg-red-50`

export function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition ${checked ? 'bg-emerald-600' : 'bg-stone-400'} disabled:opacity-50`}
    >
      <span className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : ''}`} />
    </button>
  )
}
