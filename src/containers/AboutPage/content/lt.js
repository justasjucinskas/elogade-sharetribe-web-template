// About page — Lithuanian. Translation of en.js; keep highlight ids and order identical.
//
// The page title and lead are UI strings (AboutPage.* in src/translations/lt.json);
// everything below them lives here.
//
// `body` is Markdown, rendered through PageBuilder's sanitized markdown processor.

const body = `
Naudotos technikos pirkimas internetu dažnai kelia neapibrėžtumą, ypač platformose, kur atsiskaitoma tiesiogiai tarp nepažįstamų žmonių, o iškilus problemoms apsauga yra minimali. ELOGADE buvo sukurta šiai problemai spręsti, pristatant labiau struktūrizuotą ir saugesnę rinkos patirtį.

Mūsų platforma sujungia saugų mokėjimų apdorojimą, pirkėjų apsaugą bei skaidrias sandorių taisykles, kad sukurtų aplinką, kurioje vartotojai gali prekiauti elektronika su didesniu pasitikėjimu. Nesvarbu, ar norite atsinaujinti telefoną, parduoti nebenaudojamą nešiojamąjį kompiuterį, ar ieškote geresnio technikos pasiūlymo – ELOGADE daro šį procesą paprastą ir patikimą.

Vietoj įprasto mažmenininko vaidmens ELOGADE veikia kaip nepriklausoma prekyvietė, jungianti pirkėjus bei pardavėjus ir suteikianti įrankius, mokėjimų infrastruktūrą bei apsaugos priemones, būtinas saugiems sandoriams užtikrinti.

Sutelkdami dėmesį būtent į elektroniką, siekiame sukurti specializuotą bendruomenę, kurioje prekyba elektronika būtų lengvesnė, saugesnė ir skaidresnė kiekvienam.
`;

const highlights = [
  {
    id: 'payments',
    title: 'Saugūs mokėjimai',
    text: 'Mokėjimus apdoroja „Stripe“, o pinigai saugomi, kol užsakymas įvykdomas.',
  },
  {
    id: 'protection',
    title: 'Pirkėjo apsauga',
    text: 'Per 48 valandas nuo pristatymo pirkėjai gali patikrinti prekę ir pranešti apie problemą.',
  },
  {
    id: 'rules',
    title: 'Skaidrios taisyklės',
    text: 'Aiškūs skelbimų reikalavimai, o visi mokesčiai parodomi prieš apmokant.',
  },
];

export default { body, highlights };
