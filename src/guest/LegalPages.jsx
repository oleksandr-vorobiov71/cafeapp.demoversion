// Impressum & Datenschutzerklärung für das Gäste-Menü.
// Die Angaben kommen aus den Café-Einstellungen (Verwaltung → Einstellungen).
// Rechtstexte bewusst immer auf Deutsch – in Deutschland ist die deutsche Fassung maßgeblich.

const H = ({ children }) => <h4 className="mt-5 text-sm font-black text-stone-900">{children}</h4>
const P = ({ children }) => <p className="mt-1.5 text-[13px] leading-relaxed text-stone-600">{children}</p>

function Contact({ s }) {
  return (
    <P>
      {s.cafe_name}<br />
      {s.owner_name && <>Inhaber/in: {s.owner_name}<br /></>}
      {s.address && <>{s.address}<br /></>}
      {s.phone && <>Telefon: {s.phone}<br /></>}
      {s.email && <>E-Mail: {s.email}</>}
    </P>
  )
}

function DemoNote({ s }) {
  if (!s.is_demo) return null
  return (
    <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-950">
      Demo-Version: Dieses Café ist fiktiv. Name und Anschrift sind Beispieldaten.
    </div>
  )
}

export function Impressum({ settings }) {
  const s = settings || {}
  return (
    <div>
      <DemoNote s={s} />
      <H>Angaben gemäß § 5 DDG</H>
      <Contact s={s} />
      {s.vat_id && (
        <>
          <H>Umsatzsteuer-ID</H>
          <P>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {s.vat_id}</P>
        </>
      )}
      <H>Verbraucherstreitbeilegung</H>
      <P>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</P>
    </div>
  )
}

export function Datenschutz({ settings }) {
  const s = settings || {}
  return (
    <div>
      <DemoNote s={s} />
      <H>1. Verantwortlicher</H>
      <Contact s={s} />

      <H>2. Welche Daten wir verarbeiten</H>
      <P>
        Für die digitale Speisekarte brauchen Sie weder ein Konto noch eine Anmeldung. Wenn Sie bestellen oder die Bedienung rufen,
        verarbeiten wir nur: Tischnummer, bestellte Artikel und Optionen, Betrag, gewähltes Trinkgeld, Hinweise zur geteilten Rechnung
        und den Zeitpunkt. Wir erheben dabei keine Namen, E-Mail-Adressen oder Zahlungsdaten.
      </P>
      <P>
        Zweck ist die Annahme und Zubereitung Ihrer Bestellung. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertrag bzw.
        vorvertragliche Maßnahmen).
      </P>

      <H>3. Hosting und Datenbank</H>
      <P>
        Die Website wird bei Vercel Inc. (USA) bereitgestellt, Bestellungen werden in einer Datenbank von Supabase Inc. gespeichert.
        Beim Aufruf der Seite verarbeitet der Hoster technisch notwendige Daten wie IP-Adresse, Zeitpunkt und Browsertyp (Server-Logfiles),
        um die Seite sicher auszuliefern. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren und
        stabilen Betrieb). Mit den Anbietern bestehen Verträge zur Auftragsverarbeitung. Soweit Daten in die USA übermittelt werden,
        stützt sich dies auf das EU-US Data Privacy Framework bzw. auf EU-Standardvertragsklauseln.
      </P>

      <H>4. Speicher in Ihrem Browser</H>
      <P>
        Wir speichern in Ihrem Browser (Local Storage) nur Ihre gewählte Sprache und Tischnummer, damit Sie diese nicht erneut wählen
        müssen. Das ist technisch erforderlich (§ 25 Abs. 2 TDDDG). Es werden keine Cookies zu Werbe- oder Analysezwecken gesetzt und kein Tracking eingesetzt.
      </P>

      <H>5. Speicherdauer</H>
      <P>
        Bestelldaten speichern wir nur so lange, wie es für die Abwicklung und gesetzliche Aufbewahrungspflichten erforderlich ist,
        und löschen sie danach.
      </P>

      <H>6. Ihre Rechte</H>
      <P>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie Widerspruch
        gegen die Verarbeitung (Art. 15–21 DSGVO). Wenden Sie sich dazu an die oben genannten Kontaktdaten. Außerdem können Sie sich bei
        einer Datenschutz-Aufsichtsbehörde beschweren, in Baden-Württemberg beim Landesbeauftragten für den Datenschutz und die
        Informationsfreiheit (LfDI).
      </P>
      <P>Stand: Oktober 2026</P>
    </div>
  )
}
