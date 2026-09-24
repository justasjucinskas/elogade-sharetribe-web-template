// FAQ — Polish. Translation of en.js; keep ids and order identical.
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
    title: 'O ELOGADE i naszej odpowiedzialności',
    items: [
      {
        id: 'what-is-elogade',
        question: 'Czym jest ELOGADE?',
        answer: `ELOGADE to platforma C2C (między użytkownikami), na której możesz bezpiecznie kupować i sprzedawać elektronikę w krajach bałtyckich i wybranych krajach UE. Dostarczamy platformę, bezpieczny system płatności oraz wsparcie w razie sporów.`,
      },
      {
        id: 'is-it-safe',
        question: 'Czy kupowanie na ELOGADE jest bezpieczne?',
        answer: `Tak. Płatności są bezpiecznie przetwarzane przez Stripe i wstrzymane do momentu, aż potwierdzisz odbiór przedmiotu lub do czasu automatycznego zakończenia transakcji zgodnie z zasadami platformy.`,
      },
      {
        id: 'warranty',
        question: 'Czy ELOGADE oferuje gwarancję?',
        answer: `Nie. ELOGADE nie udziela gwarancji ani rękojmi.

Jeśli przedmiot posiada gwarancję producenta lub jakikolwiek dokument od sprzedawcy, musi to być wyraźnie zaznaczone w ogłoszeniu.`,
      },
      {
        id: 'cancel-order',
        question: 'Czy mogę anulować zamówienie?',
        answer: `Jeśli sprzedawca nie wysłał jeszcze przedmiotu, zamówienie można anulować, kontaktując się ze wsparciem ELOGADE. Jeśli sprzęt został już wysłany, a pojawił się problem, użyj opcji „Zgłoś spór”.`,
      },
      {
        id: 'seller-does-not-ship',
        question: 'Co, jeśli sprzedawca nie wyśle przedmiotu?',
        answer: `Oczekujemy, że sprzedawcy wyślą przedmiot w deklarowanym czasie. Jeśli sprzedawca tego nie zrobi i nie ma z nim kontaktu, ELOGADE może anulować zamówienie i zwrócić Ci pełną kwotę zgodnie z procedurą płatności na platformie.`,
      },
      {
        id: 'responsible-for',
        question: 'Za co odpowiada ELOGADE?',
        answer: `ELOGADE odpowiada za:

* działanie platformy (wyświetlanie ogłoszeń, wyszukiwanie, proces zakupu),
* organizację procesu płatności zgodnie z regulaminem,
* (jeśli włączone) moderację ogłoszeń i kontrolę publikacji,
* zarządzanie procesem sporów zgodnie z zasadami ELOGADE (decyzje podejmujemy na podstawie dostarczonych dowodów).`,
      },
      {
        id: 'not-responsible-for',
        question: 'Za co ELOGADE NIE odpowiada?',
        answer: `ELOGADE nie odpowiada za:

* faktyczny stan przedmiotu (wady, działanie, kompletność), jeśli sprzedawca zataił te informacje lub podał nieprawdę,
* ważność gwarancji producenta,
* opóźnienia przewoźnika lub zgubione przesyłki (obsługiwane zgodnie z regulaminem przewoźnika), choć możemy pomóc w procesie i dokumentacji,
* wszelkie ustalenia zawarte poza platformą (np. przelewy bankowe lub transakcje gotówkowe).`,
      },
    ],
  },
  {
    id: 'shipping',
    title: 'Wysyłka i dostawa',
    items: [
      {
        id: 'shipping-methods',
        question: 'Jakie są dostępne metody wysyłki?',
        answer: `Zależy to od ogłoszenia i preferencji sprzedawcy. Najczęstsze opcje to:

* paczkomaty (np. Omniva, DPD, LP itp.),
* dostawa kurierem,
* odbiór osobisty (jeśli oferuje go sprzedawca).`,
      },
      {
        id: 'shipping-cost',
        question: 'Ile kosztuje wysyłka?',
        answer: `Dokładny koszt wysyłki jest widoczny przed płatnością podczas finalizacji zakupu. Zależy on od:

* wybranego przewoźnika,
* rozmiaru i wagi paczki,
* metody dostawy.

**Ważne:** ELOGADE nie ustala cen wysyłki — robią to przewoźnicy.`,
      },
      {
        id: 'handling-time',
        question: 'Jak szybko sprzedawca musi wysłać paczkę?',
        answer: `Sprzedawca powinien wysłać przedmiot w ciągu 2 dni roboczych od dokonania płatności (chyba że w ogłoszeniu podano inaczej).`,
      },
      {
        id: 'tracking',
        question: 'Jak mogę śledzić swoją przesyłkę?',
        answer: `Po wysyłce sprzedawca podaje numer nadania (jeśli jest dostępny). Możesz śledzić paczkę bezpośrednio w systemie przewoźnika.`,
      },
      {
        id: 'delayed-or-lost',
        question: 'Co, jeśli wysyłka się opóźnia lub paczka zaginie?',
        answer: `Najpierw sprawdź status śledzenia.

Jeśli status nie zmienia się przez ponad 3 dni robocze, skontaktuj się ze wsparciem ELOGADE, podając numer zamówienia i dane do śledzenia.

W przypadku zagubienia paczki, sprawa jest rozpatrywana zgodnie z regulaminem przewoźnika (reklamacja/odszkodowanie). ELOGADE może pomóc w dokumentacji i komunikacji, ale nie ma wpływu na dochodzenie przewoźnika ani jego ostateczną decyzję.`,
      },
    ],
  },
  {
    id: 'listings',
    title: 'Ogłoszenia, wycena i darmowa pomoc',
    items: [
      {
        id: 'pricing-help',
        question: 'Jak ustalić odpowiednią cenę za mój przedmiot?',
        answer: `Ostateczną cenę ustalasz Ty. Jednak ELOGADE może za darmo pomóc Ci w:

* oszacowaniu wartości rynkowej,
* wpisaniu poprawnej specyfikacji,
* napisaniu jasnego opisu, który zmniejszy ryzyko sporów.`,
      },
      {
        id: 'listing-fee',
        question: 'Czy ELOGADE pobiera opłaty za dodanie ogłoszenia?',
        answer: `Dodanie ogłoszenia może być darmowe (lub zgodne z wybranym modelem). Jeśli obowiązuje prowizja lub opłata serwisowa, jest ona wyraźnie widoczna podczas finalizacji zakupu.`,
      },
    ],
  },
  {
    id: 'protection',
    title: 'Ochrona kupujących i sprzedających',
    items: [
      {
        id: 'buyer-protection',
        question: 'Jak ELOGADE chroni kupujących?',
        answer: `* Wypłata środków dla sprzedawcy następuje dopiero po potwierdzeniu transakcji lub jej automatycznym zakończeniu zgodnie z zasadami platformy (zobacz [Kiedy sprzedawca otrzymuje pieniądze?](#faq-when-paid)).
* Możesz zgłosić spór, jeśli przedmiot jest niezgodny z opisem lub dotrze uszkodzony.
* Zalecamy kupującym nagranie wideo z rozpakowywania paczki jako dowodu w razie problemów.`,
      },
      {
        id: 'seller-protection',
        question: 'Jak ELOGADE chroni sprzedających?',
        answer: `* Kupujący mają ściśle określony czas na zgłoszenie problemów.
* Wymagamy dowodów (zdjęcia/wideo), a decyzje podejmujemy na podstawie dostarczonych informacji.
* Zalecamy sprzedawcom zrobienie zdjęć lub nagranie wideo z pakowania oraz podanie numeru do śledzenia.`,
      },
      {
        id: 'listing-must-include',
        question: 'Co sprzedawca musi zawrzeć w ogłoszeniu?',
        answer: `Aby zwiększyć bezpieczeństwo i zmniejszyć liczbę sporów, musisz:

* podać dokładny model i specyfikację,
* jasno opisać stan i wszelkie wady,
* dodać autentyczne zdjęcia przedmiotu,
* wymienić, co wchodzi w skład zestawu (pudełko, ładowarka, akcesoria).`,
      },
    ],
  },
  {
    id: 'disputes',
    title: 'Spory, terminy i decyzje',
    intro: `Jeśli przedmiot został doręczony, kupujący powinien zgłosić wszelkie problemy w ciągu 48 godzin od potwierdzenia dostawy lub odbioru. Aby zgłosić problem, użyj przycisku „Zgłoś spór” w widoku zamówienia i dokładnie opisz sytuację. W przypadku elektroniki 48 godzin to optymalny czas na sprawdzenie sprzętu, który jednocześnie zapobiega nadużyciom systemu ochrony. Jeśli potrzebujesz dodatkowej pomocy, możesz również skontaktować się ze wsparciem ELOGADE pod adresem [support@elogade.com](mailto:support@elogade.com).`,
    items: [
      {
        id: 'dispute-qualifies',
        question: 'Jakie sytuacje kwalifikują się do otwarcia sporu?',
        answer: `Możesz otworzyć spór, jeśli:

* przedmiot jest niezgodny z opisem (niewłaściwy model/specyfikacja),
* przedmiot dotarł uszkodzony (problem z wysyłką/pakowaniem),
* przedmiot ma ukrytą wadę, o której nie wspomniano w ogłoszeniu,
* brakuje ważnych części/akcesoriów, choć były wymienione.`,
      },
      {
        id: 'dispute-not-qualifies',
        question: 'Co NIE kwalifikuje się do otwarcia sporu?',
        answer: `Zazwyczaj nie obejmujemy:

* zmiany zdania kupującego („nie podoba mi się”, „znalazłem taniej”),
* wad wyraźnie opisanych w ogłoszeniu,
* uszkodzenia przedmiotu przez kupującego po jego otrzymaniu (jeśli dowody na to wskazują),
* modyfikacji/rozłożenia sprzętu po dostawie.`,
      },
      {
        id: 'dispute-evidence',
        question: 'Jakie dowody są potrzebne w przypadku sporu?',
        answer: `Kupujący zazwyczaj dostarczają:

* zdjęcia/wideo pokazujące problem,
* wideo z rozpakowywania paczki (jeśli jest),
* historię wiadomości ze sprzedawcą,
* informacje o śledzeniu przesyłki.

Sprzedający dostarczają:

* zdjęcia/wideo z pakowania,
* dowód stanu przedmiotu przed wysyłką,
* informacje o śledzeniu przesyłki,
* dodatkowe wyjaśnienia.`,
      },
      {
        id: 'buyer-does-not-confirm',
        question: 'Co się stanie, jeśli kupujący nie potwierdzi odbioru?',
        answer: `Jeśli kupujący nie zgłosi żadnego problemu za pomocą funkcji „Zgłoś spór” w wymaganym czasie, transakcja może zostać automatycznie zakończona po standardowym okresie obowiązującym na platformie.

Gdy transakcja zostanie zakończona, może zostać uruchomiony proces wypłaty środków dla sprzedawcy zgodnie z procedurą płatności na platformie.

Jeśli masz jakiekolwiek zastrzeżenia do przedmiotu, musisz otworzyć spór w ciągu 48 godzin od potwierdzenia dostawy lub odbioru.`,
      },
      {
        id: 'elogade-initiates-dispute',
        question: 'Czy ELOGADE może zainicjować spór, jeśli nie ma kontaktu z kupującym?',
        answer: `Tak — jeśli mamy wystarczająco dużo informacji (np. jasne dowody wprowadzenia w błąd, oszustwa lub uszkodzenia). W takim przypadku wypłata zostaje wstrzymana do czasu rozwiązania sprawy.

ELOGADE zastrzega sobie prawo do podjęcia ostatecznej decyzji na podstawie dostępnych dowodów i regulaminu platformy.`,
      },
      {
        id: 'good-faith',
        question: 'Czy użytkownicy muszą działać w dobrej wierze?',
        answer: `Oczekujemy, że wszyscy użytkownicy będą działać w dobrej wierze. Nadużywanie systemu ochrony, fałszywe roszczenia lub próby manipulacji procesem sporu mogą skutkować:

* odrzuceniem roszczenia,
* ograniczeniami konta,
* lub innymi odpowiednimi sankcjami.

ELOGADE zastrzega sobie prawo do podjęcia odpowiednich działań zgodnie z regulaminem platformy.`,
      },
    ],
  },
  {
    id: 'returns',
    title: 'Zwroty i zwrot środków',
    items: [
      {
        id: 'return-process',
        question: 'Jak wygląda proces zwrotu?',
        answer: `Jeśli wynik sporu wymaga zwrotu przedmiotu, proces zazwyczaj wygląda następująco:

1. Kupujący odsyła przedmiot w wyznaczonym terminie (np. 2 dni robocze od wydania decyzji).
2. Kupujący podaje numer do śledzenia przesyłki.
3. Sprzedawca potwierdza odbiór.
4. ELOGADE inicjuje zwrot środków.`,
      },
      {
        id: 'refunds',
        question: 'Jak działają zwroty środków na ELOGADE?',
        answer: `Zwroty środków są przyznawane na podstawie wyników sporu i regulaminu platformy. W zależności od sytuacji może to być zwrot całkowity lub częściowy. Środki są zwracane za pośrednictwem oryginalnej metody płatności przez Stripe i zazwyczaj pojawiają się na koncie w ciągu 5–10 dni roboczych. Szczegółowe informacje znajdziesz w sekcji „Zwroty środków i anulowanie płatności” naszych [Zasad platformy](/p/market-policies#section-6).`,
      },
      {
        id: 'change-of-mind',
        question: 'Czy kupujący mogą zwrócić przedmiot, jeśli po prostu zmienią zdanie?',
        answer: `Zwroty z powodu „zmiany zdania” z reguły nie są obsługiwane na ELOGADE, chyba że sprzedawca wyraźnie oferuje taką możliwość w ogłoszeniu.`,
      },
      {
        id: 'return-shipping',
        question: 'Kto pokrywa koszty wysyłki zwrotnej?',
        answer: `* Jeśli przedmiot był niezgodny z opisem lub miał ukrytą wadę, za wysyłkę zwrotną zazwyczaj odpowiada sprzedawca.
* Jeśli kupujący po prostu zmieni zdanie (i jeśli zwrot jest dopuszczalny), to on pokrywa koszt wysyłki zwrotnej.`,
      },
      {
        id: 'refund-time',
        question: 'Jak długo trwa zwrot środków?',
        answer: `Po zleceniu zwrotu środki zazwyczaj docierają do kupującego w ciągu 5–10 dni roboczych, w zależności od banku lub wydawcy karty.`,
      },
    ],
  },
  {
    id: 'payouts',
    title: 'Wypłaty dla sprzedających',
    items: [
      {
        id: 'when-paid',
        question: 'Kiedy sprzedawca otrzymuje pieniądze?',
        answer: `Środki trafiają do sprzedawcy, gdy:

* kupujący potwierdzi opcją „Otrzymałem zamówienie” lub
* transakcja zostanie zakończona automatycznie 14 dni po statusie „Dostarczono”, jeśli nie zgłoszono sporu.`,
      },
      {
        id: 'stripe-fees',
        question: 'Czy opłaty operacyjne Stripe są uwzględnione w szacowanej wypłacie?',
        answer: `Wyświetlana szacowana kwota wypłaty może nie uwzględniać opłat operacyjnych Stripe. Ostateczna kwota dla sprzedawcy jest obliczana po odliczeniu opłat serwisowych ELOGADE oraz stosownych opłat Stripe od kwoty transakcji.`,
      },
      {
        id: 'dispute-opened',
        question: 'Co się dzieje po otwarciu sporu?',
        answer: `W przypadku otwarcia sporu:

* wypłata dla sprzedawcy zostaje wstrzymana,
* sprawa jest rozpatrywana na podstawie dowodów,
* wynik: zwrot środków / zwrot przedmiotu / inne rozwiązanie oparte na regulaminie.`,
      },
    ],
  },
  {
    id: 'listing-rules',
    title: 'Zasady ogłoszeń i treść',
    items: [
      {
        id: 'listing-review',
        question: 'Czy ELOGADE sprawdza ogłoszenia przed publikacją?',
        answer: `Akceptacja ogłoszeń (zatwierdzenie przez administratora) może być włączona. W takim przypadku ogłoszenie staje się widoczne dopiero po jego zatwierdzeniu.`,
      },
      {
        id: 'prohibited-items',
        question: 'Jakich przedmiotów nie można sprzedawać na ELOGADE?',
        answer: `Zabronione jest wystawianie:

* kradzionych przedmiotów,
* podróbek,
* nielegalnego oprogramowania i licencji,
* przedmiotów zakazanych przez prawo,
* mylących ogłoszeń (błędna specyfikacja, fałszywe zdjęcia).`,
      },
    ],
  },
  {
    id: 'support',
    title: 'Wsparcie i kontakt',
    items: [
      {
        id: 'contact',
        question: 'Jak mogę skontaktować się z ELOGADE?',
        answer: `Napisz do nas na adres [support@elogade.com](mailto:support@elogade.com) i podaj:

* numer zamówienia,
* krótki opis problemu,
* dowody (jeśli są dostępne).`,
      },
    ],
  },
];

export default { sections };
