// FAQ — English (source of truth).
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
    title: 'About ELOGADE and responsibility',
    items: [
      {
        id: 'what-is-elogade',
        question: 'What is ELOGADE?',
        answer: `ELOGADE is a C2C (person-to-person) marketplace where users can safely buy and sell electronics across the Baltic region and selected EU countries. We provide the platform, secure payment flow, and dispute support.`,
      },
      {
        id: 'is-it-safe',
        question: 'Is it safe to buy on ELOGADE?',
        answer: `Yes. Payments are processed securely via Stripe and held until the buyer confirms the item is received, or until the transaction completes according to the platform’s completion rules.`,
      },
      {
        id: 'warranty',
        question: 'Does ELOGADE provide a warranty?',
        answer: `No. ELOGADE does not provide warranties or guarantees.

If an item has a manufacturer’s warranty or any document provided by the seller, it must be stated by the seller in the listing.`,
      },
      {
        id: 'cancel-order',
        question: 'Can I cancel an order?',
        answer: `If the seller has not shipped the item yet, the order may be cancelled by contacting ELOGADE support. If the item has already been shipped, please use the “Dispute order” option if there is a problem.`,
      },
      {
        id: 'seller-does-not-ship',
        question: 'What if the seller does not ship the item?',
        answer: `Sellers are expected to ship within the stated handling time. If the seller fails to ship the item and remains unresponsive, ELOGADE may cancel the order and issue a full refund according to the platform’s payment process.`,
      },
      {
        id: 'responsible-for',
        question: 'What is ELOGADE responsible for?',
        answer: `ELOGADE is responsible for:

* the functionality of the platform (listing display, browsing, purchase flow),
* organizing the payment flow according to the rules,
* (when enabled) listing moderation / publishing control,
* administering the dispute process under ELOGADE rules (decisions are based on evidence provided).`,
      },
      {
        id: 'not-responsible-for',
        question: 'What is ELOGADE NOT responsible for?',
        answer: `ELOGADE is not responsible for:

* the actual condition of the item (defects, performance, completeness) if this was misrepresented or hidden by the seller,
* the validity of any manufacturer warranty,
* carrier delays or lost shipments (handled under carrier policies), although we may assist with the process and documentation,
* any agreements made outside the platform (e.g., bank transfer or cash deals).`,
      },
    ],
  },
  {
    id: 'shipping',
    title: 'Shipping and delivery',
    items: [
      {
        id: 'shipping-methods',
        question: 'What shipping methods are available?',
        answer: `It depends on the listing and seller preferences. Common options:

* parcel lockers (e.g., Omniva, DPD, LP, etc.),
* courier delivery,
* local pickup (if offered by the seller).`,
      },
      {
        id: 'shipping-cost',
        question: 'How much does shipping cost?',
        answer: `The exact shipping cost is shown before payment at checkout. It depends on:

* the chosen carrier,
* package size / weight,
* delivery method.

**Important:** ELOGADE does not set shipping prices — carriers do.`,
      },
      {
        id: 'handling-time',
        question: 'How fast does the seller need to ship?',
        answer: `The seller should ship within 2 business days after payment (unless stated otherwise in the listing).`,
      },
      {
        id: 'tracking',
        question: 'How do I track my shipment?',
        answer: `After shipping, the seller provides a tracking number (if available). Buyers can track the parcel in the carrier’s system.`,
      },
      {
        id: 'delayed-or-lost',
        question: 'What if shipping is delayed or the parcel is lost?',
        answer: `Check tracking first.

If there is no tracking progress for more than 3 business days, contact ELOGADE support with your order number and tracking info.

If the parcel is lost, the case is handled under the carrier’s policies (investigation/compensation). ELOGADE may assist with documentation and communication, but does not control the carrier’s investigation or final decision.`,
      },
    ],
  },
  {
    id: 'listings',
    title: 'Listings, pricing and free help',
    items: [
      {
        id: 'pricing-help',
        question: 'How do I set the right price for my item?',
        answer: `The seller sets the final price. However, ELOGADE can help for free with:

* a market price reference,
* entering correct specs,
* writing a clear description to reduce disputes.`,
      },
      {
        id: 'listing-fee',
        question: 'Does ELOGADE charge for creating a listing?',
        answer: `Listing creation may be free (or follow your chosen model). If any commission/service fee applies, it is clearly shown at checkout.`,
      },
    ],
  },
  {
    id: 'protection',
    title: 'Buyer and seller protection',
    items: [
      {
        id: 'buyer-protection',
        question: 'How does ELOGADE protect buyers?',
        answer: `* Seller payouts are initiated only after the transaction is confirmed or automatically completed according to the platform rules (see [When does the seller get paid?](#faq-when-paid)).
* A dispute process is available if the item is not as described or arrives damaged.
* We recommend buyers record an unboxing video as evidence in case of issues.`,
      },
      {
        id: 'seller-protection',
        question: 'How does ELOGADE protect sellers?',
        answer: `* Buyers have a clear time window to report issues.
* Evidence is required (photos/video); decisions are based on the information provided.
* We recommend sellers record packing photos/video and provide tracking.`,
      },
      {
        id: 'listing-must-include',
        question: 'What must the seller include in the listing?',
        answer: `To improve safety and reduce disputes, sellers must:

* state the correct model and specifications,
* clearly describe condition and any defects,
* upload real photos of the item,
* list what’s included (box, charger, accessories).`,
      },
    ],
  },
  {
    id: 'disputes',
    title: 'Disputes, timelines and decisions',
    intro: `If the item has been delivered, the buyer should report any issue within 48 hours of confirmed delivery or pickup. To report a problem, the buyer must use the “Dispute order” button in their order view and clearly describe the issue. For electronics, 48 hours is considered a balanced testing window that allows buyers to properly check the device while helping prevent abuse of the protection system. If the issue requires additional assistance, the buyer may also contact ELOGADE support at [support@elogade.com](mailto:support@elogade.com).`,
    items: [
      {
        id: 'dispute-qualifies',
        question: 'What issues qualify for a dispute?',
        answer: `A dispute may be opened if:

* the item is not as described (wrong model/specs),
* the item arrived damaged (shipping/packing issue),
* the item has an undisclosed defect not mentioned in the listing,
* important parts/accessories are missing despite being listed.`,
      },
      {
        id: 'dispute-not-qualifies',
        question: 'What does NOT qualify for a dispute?',
        answer: `Typically not covered:

* buyer changed their mind (“don’t like it”, “found cheaper”),
* the defect was clearly disclosed in the listing,
* the buyer damaged the item after receiving it (if evidence supports this),
* the item was modified/disassembled after delivery.`,
      },
      {
        id: 'dispute-evidence',
        question: 'What evidence is needed for a dispute?',
        answer: `Buyers typically provide:

* photos/videos showing the issue,
* unboxing video (if available),
* message history with the seller,
* tracking information.

Sellers provide:

* packing photos/videos,
* proof of the item’s condition before shipping,
* tracking information,
* additional explanation.`,
      },
      {
        id: 'buyer-does-not-confirm',
        question: 'What happens if the buyer doesn’t confirm receipt?',
        answer: `If the buyer does not report any issue using the “Dispute order” function within the required timeframe, the transaction may automatically complete after the platform’s standard completion period.

Once the transaction is completed, the seller payout process may be initiated according to the platform’s payment flow.

If the buyer has any concerns about the item, they must open a dispute within 48 hours of confirmed delivery or pickup.`,
      },
      {
        id: 'elogade-initiates-dispute',
        question: 'Can ELOGADE initiate a dispute if the buyer is unresponsive?',
        answer: `Yes — if we have enough information (e.g., clear evidence of misrepresentation/fraud/damage). In that case, the payout is paused until resolution.

ELOGADE reserves the right to make the final determination based on the available evidence and platform policies.`,
      },
      {
        id: 'good-faith',
        question: 'Do users need to act in good faith?',
        answer: `All users are expected to act in good faith. Abuse of the protection system, false claims, or attempts to manipulate the dispute process may result in:

* claim rejection,
* account restrictions,
* or other appropriate measures.

ELOGADE reserves the right to take appropriate action according to platform policies.`,
      },
    ],
  },
  {
    id: 'returns',
    title: 'Returns and refunds',
    items: [
      {
        id: 'return-process',
        question: 'How does the return process work?',
        answer: `If the dispute outcome requires a return, the process is usually as follows:

1. The buyer ships the item back within the required timeframe (e.g., 2 business days after the decision).
2. The buyer provides tracking.
3. The seller confirms delivery.
4. ELOGADE initiates the refund.`,
      },
      {
        id: 'refunds',
        question: 'How do refunds work on ELOGADE?',
        answer: `Refunds are issued based on dispute outcomes and platform rules. Depending on the situation, a full or partial refund may be applied. Refunds are processed via the original payment method through Stripe and typically take 5–10 business days to appear in the buyer’s account. For full details, please refer to the “Refunds & Payment Reversals” section of our [Marketplace Policies](/p/market-policies#section-6).`,
      },
      {
        id: 'change-of-mind',
        question: 'Can buyers return items if they simply change their mind?',
        answer: `Returns based on “change of mind” are generally not supported on ELOGADE unless the seller explicitly offers this option in the listing.`,
      },
      {
        id: 'return-shipping',
        question: 'Who pays for return shipping?',
        answer: `* If the item was not as described / had an undisclosed defect, return shipping is usually the seller’s responsibility.
* If the buyer simply changes their mind (if this is allowed at all), the buyer covers return shipping.`,
      },
      {
        id: 'refund-time',
        question: 'How long does it take to receive a refund?',
        answer: `After a refund is initiated, it usually reaches the buyer in 5–10 business days, depending on the bank/card issuer.`,
      },
    ],
  },
  {
    id: 'payouts',
    title: 'Seller payouts',
    items: [
      {
        id: 'when-paid',
        question: 'When does the seller get paid?',
        answer: `Funds are paid out to the seller when:

* the buyer confirms “I’ve received my order”, or
* the transaction auto-completes 14 days after “Delivered” if no dispute was opened.`,
      },
      {
        id: 'stripe-fees',
        question: 'Are Stripe processing fees included in the payout estimate?',
        answer: `Displayed payout estimates may not include Stripe processing fees. Final seller payouts are calculated after ELOGADE service fees and applicable Stripe payment processing fees are deducted from the transaction amount.`,
      },
      {
        id: 'dispute-opened',
        question: 'What happens if a dispute is opened?',
        answer: `If a dispute is opened:

* the seller payout is paused,
* the case is reviewed based on evidence,
* outcome: refund / return / other resolution based on the rules.`,
      },
    ],
  },
  {
    id: 'listing-rules',
    title: 'Listing rules and content',
    items: [
      {
        id: 'listing-review',
        question: 'Does ELOGADE review listings before publishing?',
        answer: `Listing approval (admin approval) can be enabled. If enabled, a listing becomes visible only after it has been approved.`,
      },
      {
        id: 'prohibited-items',
        question: 'What items are not allowed on ELOGADE?',
        answer: `It is prohibited to list:

* stolen goods,
* counterfeit items,
* illegal software/licenses,
* items restricted by law,
* misleading listings (wrong specs, fake photos).`,
      },
    ],
  },
  {
    id: 'support',
    title: 'Support and contact',
    items: [
      {
        id: 'contact',
        question: 'How do I contact ELOGADE?',
        answer: `Use the “Help / Contact” page (or your support email if listed) and include:

* order number,
* short description of the issue,
* evidence (if available).`,
      },
    ],
  },
];

export default { sections };
