// FAQ — Lithuanian. Translation of en.js; keep ids and order identical.
//
// Translations live next to this file (lt.js, pl.js) and must keep the same
// section and question ids, in the same order: the ids are the anchors
// (#faq-<id>) that deep links and the table of contents point at, so they are
// locale-independent. Only `title`, `intro`, `question` and `answer` are translated.
//
// `intro` and `answer` are Markdown, rendered through PageBuilder's sanitized
// markdown processor.

const sections = [
  {
    id: 'about',
    title: 'Apie ELOGADE ir atsakomybę',
    items: [
      {
        id: 'what-is-elogade',
        question: 'Kas yra ELOGADE?',
        answer: `ELOGADE yra „C2C“ (tarpusavio) prekyvietė, kurioje naudotojai gali saugiai pirkti ir parduoti elektroniką Baltijos šalyse ir tam tikrose ES valstybėse. Mes suteikiame platformą, saugų mokėjimų procesą ir pagalbą sprendžiant ginčus.`,
      },
      {
        id: 'is-it-safe',
        question: 'Ar saugu pirkti ELOGADE?',
        answer: `Taip. Mokėjimai saugiai apdorojami per „Stripe“ sistemą ir yra pirkėjo lėšų rezerve, kol pirkėjas patvirtina gavęs prekę arba kol sandoris automatiškai užbaigiamas pagal platformos taisykles.`,
      },
      {
        id: 'warranty',
        question: 'Ar ELOGADE suteikia garantiją?',
        answer: `Ne. ELOGADE nesuteikia jokių garantijų ar laidavimų.

Jei prekė turi gamintojo garantiją ar kitą pardavėjo pridedamą dokumentą, pardavėjas privalo tai nurodyti prekės skelbime.`,
      },
      {
        id: 'cancel-order',
        question: 'Ar galiu atšaukti užsakymą?',
        answer: `Jei pardavėjas prekės dar neišsiuntė, užsakymą galima atšaukti susisiekus su ELOGADE pagalbos skyriumi. Jei prekė jau išsiųsta, kilus problemai naudokite parinktį „Užginčyti užsakymą“.`,
      },
      {
        id: 'seller-does-not-ship',
        question: 'Ką daryti, jei pardavėjas neišsiunčia prekės?',
        answer: `Tikimasi, kad pardavėjai išsiųs prekę per nurodytą paruošimo terminą. Jei pardavėjas prekės neišsiunčia ir neatsako į žinutes, ELOGADE gali atšaukti užsakymą ir grąžinti visus pinigus pagal platformos mokėjimo taisykles.`,
      },
      {
        id: 'responsible-for',
        question: 'Už ką yra atsakinga ELOGADE?',
        answer: `ELOGADE yra atsakinga už:

* platformos funkcionalumą (skelbimų rodymą, naršymą, pirkimo procesą),
* mokėjimų srauto organizavimą pagal taisykles,
* skelbimų moderavimą / publikavimo kontrolę (kai ši funkcija įjungta),
* ginčų sprendimo administravimą pagal ELOGADE taisykles (sprendimai priimami remiantis pateiktais įrodymais).`,
      },
      {
        id: 'not-responsible-for',
        question: 'Už ką ELOGADE NĖRA atsakinga?',
        answer: `ELOGADE neatsako už:

* faktinę prekės būklę (defektus, veikimą, komplektaciją), jei pardavėjas ją pateikė klaidingai arba nuslėpė,
* gamintojo garantijos galiojimą,
* siuntų vežėjų vėlavimus ar prarastas siuntas (tai sprendžiama pagal vežėjo taisykles), nors mes galime padėti su dokumentacija ir procesu,
* bet kokius susitarimus, sudarytus už platformos ribų (pvz., tiesioginius banko pavedimus ar atsiskaitymą grynaisiais).`,
      },
    ],
  },
  {
    id: 'shipping',
    title: 'Siuntimas ir pristatymas',
    items: [
      {
        id: 'shipping-methods',
        question: 'Kokie siuntimo būdai yra prieinami?',
        answer: `Tai priklauso nuo skelbimo ir pardavėjo nustatymų. Dažniausi variantai:

* paštomatai (pvz., „Omniva“, „DPD“, „LP“ ir kt.),
* kurjerių pristatymas,
* atsiėmimas gyvai (jei pardavėjas siūlo tokią galimybę).`,
      },
      {
        id: 'shipping-cost',
        question: 'Kiek kainuoja siuntimas?',
        answer: `Tiksli siuntimo kaina parodoma prieš apmokėjimą, užsakymo lange. Ji priklauso nuo:

* pasirinkto vežėjo,
* pakuotės dydžio / svorio,
* pristatymo būdo.

**Svarbu:** ELOGADE nenustato siuntimo kainų – jas nustato patys vežėjai.`,
      },
      {
        id: 'handling-time',
        question: 'Kaip greitai pardavėjas turi išsiųsti prekę?',
        answer: `Pardavėjas turėtų išsiųsti prekę per 2 darbo dienas po apmokėjimo (nebent skelbime nurodyta kitaip).`,
      },
      {
        id: 'tracking',
        question: 'Kaip galiu sekti savo siuntą?',
        answer: `Išsiuntęs prekę, pardavėjas pateikia siuntos sekimo numerį (jei yra). Pirkėjai gali sekti siuntą vežėjo sistemoje.`,
      },
      {
        id: 'delayed-or-lost',
        question: 'Ką daryti, jei siunta vėluoja arba pasiklydo?',
        answer: `Pirmiausia patikrinkite siuntos sekimo informaciją.

Jei siuntos judėjimo nematyti ilgiau nei 3 darbo dienas, susisiekite su ELOGADE pagalbos skyriumi, nurodydami užsakymo numerį ir sekimo informaciją.

Jei siunta prarandama, situacija sprendžiama pagal vežėjo taisykles (atliekamas tyrimas / mokama kompensacija). ELOGADE gali padėti tvarkyti dokumentus ir bendrauti, tačiau nekontroliuoja vežėjo tyrimo eigos ar galutinio sprendimo.`,
      },
    ],
  },
  {
    id: 'listings',
    title: 'Skelbimai, kainodara ir nemokama pagalba',
    items: [
      {
        id: 'pricing-help',
        question: 'Kaip nustatyti tinkamą prekės kainą?',
        answer: `Galutinę kainą nustato pardavėjas. Tačiau ELOGADE gali nemokamai padėti:

* pateikdama rinkos kainos orientyrus,
* padėdama įvesti teisingas specifikacijas,
* padėdama parašyti aiškų aprašymą, kad sumažėtų ginčų tikimybė.`,
      },
      {
        id: 'listing-fee',
        question: 'Ar ELOGADE ima mokestį už skelbimo sukūrimą?',
        answer: `Skelbimo sukūrimas gali būti nemokamas (arba priklausyti nuo jūsų pasirinkto modelio). Jei taikomas koks nors komisinis ar paslaugos mokestis, jis bus aiškiai parodytas atsiskaitant.`,
      },
    ],
  },
  {
    id: 'protection',
    title: 'Pirkėjų ir pardavėjų apsauga',
    items: [
      {
        id: 'buyer-protection',
        question: 'Kaip ELOGADE saugo pirkėjus?',
        answer: `* Išmokos pardavėjui inicijuojamos tik po to, kai sandoris yra patvirtinamas arba automatiškai užbaigiamas pagal platformos taisykles (žr. [Kada pardavėjui išmokami pinigai?](#faq-when-paid)).
* Jei prekė neatitinka aprašymo arba atkeliavo sugadinta, galima pradėti ginčo procesą.
* Rekomenduojame pirkėjams nufilmuoti siuntos išpakavimą – tai pasitarnaus kaip įrodymas kilus problemoms.`,
      },
      {
        id: 'seller-protection',
        question: 'Kaip ELOGADE saugo pardavėjus?',
        answer: `* Pirkėjai turi aiškų laiko tarpą problemoms pranešti.
* Reikalaujama pateikti įrodymus (nuotraukas / vaizdo įrašus); sprendimai priimami remiantis pateikta informacija.
* Rekomenduojame pardavėjams nufotografuoti ar nufilmuoti prekės pakavimo procesą ir pateikti siuntos sekimo numerį.`,
      },
      {
        id: 'listing-must-include',
        question: 'Ką pardavėjas privalo nurodyti skelbime?',
        answer: `Siekdami užtikrinti saugumą ir sumažinti ginčų skaičių, pardavėjai privalo:

* nurodyti teisingą modelį ir specifikacijas,
* aiškiai aprašyti būklę ir bet kokius defektus,
* įkelti tikras prekės nuotraukas,
* išvardyti, kas įeina į komplektaciją (dėžutė, įkroviklis, priedai).`,
      },
    ],
  },
  {
    id: 'disputes',
    title: 'Ginčai, terminai ir sprendimai',
    intro: `Jei prekė buvo pristatyta, pirkėjas apie bet kokią problemą turi pranešti per 48 valandas nuo patvirtinto pristatymo ar atsiėmimo momento. Norėdamas pranešti apie problemą, pirkėjas savo užsakymo lange turi paspausti mygtuką „Užginčyti užsakymą“ ir aiškiai aprašyti situaciją. Elektronikos prekėms 48 valandų laikotarpis laikomas subalansuotu testavimo langu, leidžiančiu pirkėjams tinkamai patikrinti įrenginį ir kartu padedančiu išvengti piktnaudžiavimo apsaugos sistema. Jei problemai išspręsti reikia papildomos pagalbos, pirkėjas taip pat gali kreiptis į ELOGADE pagalbos skyrių adresu [support@elogade.com](mailto:support@elogade.com).`,
    items: [
      {
        id: 'dispute-qualifies',
        question: 'Kokiais atvejais galima iškelti ginčą?',
        answer: `Ginčą galima pradėti, jei:

* prekė neatitinka aprašymo (netinkamas modelis / specifikacijos),
* prekė atvyko sugadinta (siuntimo / pakavimo problema),
* prekė turi neatskleistų defektų, kurie nebuvo paminėti skelbime,
* trūksta svarbių dalių / priedų, nors skelbime buvo nurodyta, kad jie bus.`,
      },
      {
        id: 'dispute-not-qualifies',
        question: 'Kokiais atvejais ginčas NEGALIMAS?',
        answer: `Paprastai apsauga netaikoma, jei:

* pirkėjas tiesiog persigalvojo („nepatinka“, „radau pigiau“),
* defektas buvo aiškiai nurodytas skelbime,
* pirkėjas sugadino prekę jau ją gavęs (jei tai patvirtina įrodymai),
* prekė po pristatymo buvo modifikuota arba išrinkta.`,
      },
      {
        id: 'dispute-evidence',
        question: 'Kokių įrodymų reikia ginčui?',
        answer: `Pirkėjai paprastai pateikia:

* nuotraukas / vaizdo įrašus, rodančius problemą,
* išpakavimo vaizdo įrašą (jei yra),
* žinučių susirašinėjimą su pardavėju,
* siuntos sekimo informaciją.

Pardavėjai pateikia:

* pakavimo nuotraukas / vaizdo įrašus,
* prekės būklės įrodymus prieš išsiunčiant,
* siuntos sekimo informaciją,
* papildomus paaiškinimus.`,
      },
      {
        id: 'buyer-does-not-confirm',
        question: 'Kas nutinka, jei pirkėjas nepatvirtina gavimo?',
        answer: `Jei pirkėjas per nustatytą laiką nepraneša apie jokią problemą naudodamasis funkcija „Užginčyti užsakymą“, sandoris gali būti automatiškai užbaigtas po standartinio platformos sandorio pabaigos laikotarpio.

Užbaigus sandorį, gali būti pradėtas išmokos pardavėjui procesas pagal platformos mokėjimo eigą.

Jei pirkėjui kyla abejonių dėl prekės, jis privalo iškelti ginčą per 48 valandas nuo patvirtinto pristatymo ar atsiėmimo.`,
      },
      {
        id: 'elogade-initiates-dispute',
        question: 'Ar ELOGADE gali inicijuoti ginčą, jei pirkėjas nereaguoja?',
        answer: `Taip – jei turime pakankamai informacijos (pvz., aiškių klaidinimo, sukčiavimo ar sugadinimo įrodymų). Tokiu atveju išmoka sustabdoma, kol bus rasta išeitis.

ELOGADE pasilieka teisę priimti galutinį sprendimą, remdamasi turimais įrodymais ir platformos taisyklėmis.`,
      },
      {
        id: 'good-faith',
        question: 'Ar naudotojai privalo elgtis sąžiningai?',
        answer: `Tikimasi, kad visi naudotojai elgsis sąžiningai. Piktnaudžiavimas apsaugos sistema, melagingi teiginiai ar bandymai manipuliuoti ginčo procesu gali lemti:

* pretenzijos atmetimą,
* paskyros apribojimus,
* kitas atitinkamas priemones.

ELOGADE pasilieka teisę imtis atitinkamų veiksmų pagal platformos taisykles.`,
      },
    ],
  },
  {
    id: 'returns',
    title: 'Grąžinimai ir pinigų grąžinimas',
    items: [
      {
        id: 'return-process',
        question: 'Kaip vyksta grąžinimo procesas?',
        answer: `Jei išsprendus ginčą nusprendžiama, kad prekę reikia grąžinti, procesas dažniausiai vyksta taip:

1. Pirkėjas išsiunčia prekę atgal per nustatytą terminą (pvz., per 2 darbo dienas nuo sprendimo priėmimo).
2. Pirkėjas pateikia siuntos sekimo numerį.
3. Pardavėjas patvirtina siuntos gavimą.
4. ELOGADE inicijuoja pinigų grąžinimą.`,
      },
      {
        id: 'refunds',
        question: 'Kaip veikia pinigų grąžinimas ELOGADE platformoje?',
        answer: `Pinigai grąžinami remiantis ginčo baigtimi ir platformos taisyklėmis. Priklausomai nuo situacijos, gali būti taikomas visiškas arba dalinis pinigų grąžinimas. Pinigai grąžinami į pradinį mokėjimo būdą per „Stripe“ sistemą ir paprastai pirkėjo sąskaitą pasiekia per 5–10 darbo dienų. Norėdami gauti išsamesnės informacijos, žr. mūsų [Prekyvietės taisyklių](/p/market-policies#section-6) skyrių „Pinigų grąžinimas ir mokėjimų atšaukimas“.`,
      },
      {
        id: 'change-of-mind',
        question: 'Ar pirkėjai gali grąžinti prekes tiesiog persigalvoję?',
        answer: `Grąžinimai dėl „persigalvojimo“ ELOGADE platformoje paprastai nėra palaikomi, nebent pardavėjas skelbime aiškiai nurodo tokią galimybę.`,
      },
      {
        id: 'return-shipping',
        question: 'Kas moka už grąžinamą siuntimą?',
        answer: `* Jei prekė neatitiko aprašymo arba turėjo neatskleistų defektų, už grąžinimą paprastai moka pardavėjas.
* Jei pirkėjas tiesiog persigalvoja (jei tai apskritai leidžiama), grąžinimo siuntimo išlaidas dengia pirkėjas.`,
      },
      {
        id: 'refund-time',
        question: 'Kiek laiko užtrunka gauti grąžinamus pinigus?',
        answer: `Inicijavus grąžinimą, pinigai pirkėją paprastai pasiekia per 5–10 darbo dienų, priklausomai nuo banko ar kortelės išdavėjo.`,
      },
    ],
  },
  {
    id: 'payouts',
    title: 'Išmokos pardavėjams',
    items: [
      {
        id: 'when-paid',
        question: 'Kada pardavėjui išmokami pinigai?',
        answer: `Lėšos pardavėjui išmokamos, kai:

* pirkėjas paspaudžia „Pažymėti kaip gautą“, arba
* sandoris automatiškai užbaigiamas praėjus 14 dienų po statuso „Pristatyta“, jei nebuvo iškeltas joks ginčas.`,
      },
      {
        id: 'stripe-fees',
        question: 'Ar į preliminarų išmokos dydį įskaičiuoti „Stripe“ apdorojimo mokesčiai?',
        answer: `Rodomame preliminariame išmokos dydyje „Stripe“ apdorojimo mokesčiai gali būti neįskaičiuoti. Galutinė pardavėjui išmokama suma apskaičiuojama iš sandorio sumos išskaičiavus ELOGADE paslaugų mokesčius ir taikomus „Stripe“ mokėjimų apdorojimo mokesčius.`,
      },
      {
        id: 'dispute-opened',
        question: 'Kas nutinka, jei iškeliamas ginčas?',
        answer: `Jei iškeliamas ginčas:

* išmoka pardavėjui sustabdoma,
* situacija peržiūrima remiantis įrodymais,
* baigtis: pinigų grąžinimas / prekės grąžinimas / kitas sprendimas pagal taisykles.`,
      },
    ],
  },
  {
    id: 'listing-rules',
    title: 'Skelbimų taisyklės ir turinys',
    items: [
      {
        id: 'listing-review',
        question: 'Ar ELOGADE peržiūri skelbimus prieš juos publikuojant?',
        answer: `Skelbimų patvirtinimo (administratoriaus patvirtinimo) funkcija gali būti įjungta. Jei ji įjungta, skelbimas tampa matomas tik po to, kai jį patvirtina administratorius.`,
      },
      {
        id: 'prohibited-items',
        question: 'Kokių daiktų negalima pardavinėti ELOGADE?',
        answer: `Draudžiama kelti skelbimus su:

* vogtais daiktais,
* padirbiniais (kopijomis),
* nelegalia programine įranga / licencijomis,
* įstatymų ribojamais daiktais,
* klaidinančia informacija (neteisingos specifikacijos, netikros nuotraukos).`,
      },
    ],
  },
  {
    id: 'support',
    title: 'Pagalba ir kontaktai',
    items: [
      {
        id: 'contact',
        question: 'Kaip susisiekti su ELOGADE?',
        answer: `Parašykite mums adresu [support@elogade.com](mailto:support@elogade.com) ir pateikite:

* užsakymo numerį,
* trumpą problemos aprašymą,
* įrodymus (jei turite).`,
      },
    ],
  },
];

export default { sections };
