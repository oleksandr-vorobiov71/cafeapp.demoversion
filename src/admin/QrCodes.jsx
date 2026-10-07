import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

// Druckbogen mit einem QR-Code pro Tisch.
// Jeder Code öffnet das Gäste-Menü mit fester Tischnummer: https://…/?table=5
// A4, 6 Karten pro Seite – ausdrucken, ausschneiden, in Tischaufsteller stecken.

const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 10mm; }
  body * { visibility: hidden !important; }
  .qr-print, .qr-print * { visibility: visible !important; }
  .qr-print { position: absolute !important; left: 0 !important; top: 0 !important; right: auto !important; bottom: auto !important;
    width: 100% !important; height: auto !important; overflow: visible !important; padding: 0 !important; background: #fff !important;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .qr-noprint { display: none !important; }
  .qr-card { break-inside: avoid; page-break-inside: avoid; box-shadow: none !important; }
}
`

export default function QrCodes({ tableCount, cafeName, onClose }) {
  const [codes, setCodes] = useState([]) // [{ table, svg }]
  const [error, setError] = useState('')
  const base = window.location.origin

  useEffect(() => {
    let cancelled = false
    const tables = Array.from({ length: Math.max(1, Number(tableCount) || 1) }, (_, i) => i + 1)
    Promise.all(
      tables.map(async (table) => ({
        table,
        svg: await QRCode.toString(`${base}/?table=${table}`, {
          type: 'svg',
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#3A1E0F', light: '#FFFFFF' },
        }),
      }))
    )
      .then((list) => { if (!cancelled) setCodes(list) })
      .catch(() => { if (!cancelled) setError('QR-Codes konnten nicht erstellt werden.') })
    return () => { cancelled = true }
  }, [tableCount, base])

  return (
    <div className="qr-print fixed inset-0 z-50 overflow-y-auto bg-stone-100 p-4 md:p-8">
      <style>{PRINT_CSS}</style>

      <div className="qr-noprint mx-auto mb-6 flex max-w-4xl flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-900">QR-Codes für {tableCount} Tische</h2>
          <p className="text-sm text-stone-600">
            Jeder Code öffnet das Menü mit fester Tischnummer. Tipp: Beim Drucken „Hintergrundgrafiken“ aktivieren.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose}
                  className="min-h-11 rounded-lg border border-stone-300 bg-white px-4 font-semibold text-stone-800">
            Schließen
          </button>
          <button type="button" onClick={() => window.print()} disabled={!codes.length}
                  className="min-h-11 rounded-lg bg-amber-900 px-5 font-semibold text-white disabled:opacity-50">
            Drucken
          </button>
        </div>
      </div>

      {error && <p className="qr-noprint mx-auto max-w-4xl rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      {!codes.length && !error && <p className="qr-noprint text-center text-stone-500">QR-Codes werden erstellt …</p>}

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
        {codes.map(({ table, svg }) => (
          <div key={table}
               className="qr-card flex flex-col items-center rounded-3xl border-2 border-dashed border-stone-300 bg-white p-6 text-center shadow-sm"
               style={{ height: '88mm' }}>
            <div className="text-sm font-bold uppercase tracking-wider text-amber-800">{cafeName}</div>
            <div className="mt-1 text-4xl font-black text-stone-900">Tisch {table}</div>
            <div className="mt-3 h-[44mm] w-[44mm]" dangerouslySetInnerHTML={{ __html: svg }} />
            <div className="mt-3 text-base font-bold text-stone-900">Scannen &amp; bestellen</div>
            <div className="text-xs text-stone-500">Scan &amp; order · Скануйте й замовляйте · Scansiona e ordina</div>
          </div>
        ))}
      </div>
    </div>
  )
}
