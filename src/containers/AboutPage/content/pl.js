// About page — Polish. Translation of en.js; keep highlight ids and order identical.
//
// The page title and lead are UI strings (AboutPage.* in src/translations/pl.json);
// everything below them lives here.
//
// `body` is Markdown, rendered through PageBuilder's sanitized markdown processor.

const body = `
Kupowanie używanego sprzętu w sieci często wiąże się z niepewnością, zwłaszcza tam, gdzie płatności odbywają się bezpośrednio między nieznajomymi, a ochrona w razie problemów jest ograniczona. ELOGADE powstało, by rozwiązać ten problem, zapewniając bardziej uporządkowane i bezpieczne środowisko do handlu.

Nasza platforma łączy bezpieczne płatności, ochronę kupujących i przejrzyste zasady, tworząc przestrzeń, w której możesz handlować elektroniką bez obaw. Niezależnie od tego, czy wymieniasz telefon na nowszy, sprzedajesz nieużywanego laptopa, czy szukasz sprzętu w świetnej cenie, ELOGADE sprawia, że cały proces jest prosty i niezawodny.

Zamiast działać jak tradycyjny sklep, ELOGADE funkcjonuje jako niezależna platforma, która łączy kupujących i sprzedających, dostarczając narzędzia, infrastrukturę płatniczą i zabezpieczenia niezbędne do bezpiecznych transakcji.

Skupiając się wyłącznie na elektronice, budujemy wyspecjalizowaną społeczność, w której handel sprzętem jest łatwiejszy, bezpieczniejszy i bardziej przejrzysty dla każdego.
`;

const highlights = [
  {
    id: 'payments',
    title: 'Bezpieczne płatności',
    text: 'Płatności obsługuje Stripe, a środki są przechowywane do zakończenia zamówienia.',
  },
  {
    id: 'protection',
    title: 'Ochrona kupujących',
    text: 'Kupujący mają 48 godzin od doręczenia, by sprawdzić przedmiot i zgłosić problem.',
  },
  {
    id: 'rules',
    title: 'Przejrzyste zasady',
    text: 'Jasne standardy ogłoszeń i wszystkie opłaty widoczne przed zapłatą.',
  },
];

export default { body, highlights };
