/**
 * Marketing promotion communicated in the UI: the site-wide promo bar (Topbar), the landing
 * hero pill, the sign-up page panel, the "what next" step after sign-up, and the commission
 * hint on the listing pricing step.
 *
 * The current promotion is for sellers only (0% seller commission) and has no end date. The
 * copy never mentions the buyer fee.
 *
 * UI ONLY. The actual commission is configured in Sharetribe Console (Transactions →
 * Commission) — this file only controls what the app says and when it stops saying it.
 *
 * - id: stored when a visitor dismisses the promo bar. A new id shows the bar again to
 *   visitors who dismissed a previous promotion.
 * - startsAt: ISO timestamp, or null to start as soon as this is deployed.
 * - endsAt: ISO timestamp, exclusive, or null for no end date. Set it to end the promotion:
 *   every promo surface hides itself at that moment.
 *
 * Set `promo` to null to switch every promo surface off.
 */
export const promo = {
  id: 'zero-commission-sellers',
  startsAt: null,
  endsAt: null,
};
