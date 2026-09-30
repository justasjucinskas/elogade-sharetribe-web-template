/**
 * Time-limited marketing promotion communicated in the UI: the site-wide promo bar
 * (Topbar), the landing hero pill, the sign-up page panel, the "what next" step after
 * sign-up, and the commission hints on the listing pricing step and at checkout.
 *
 * UI ONLY. The actual commission is configured in Sharetribe Console (Transactions →
 * Commission). Set it to 0% there when the promotion starts and restore it when it ends —
 * this file only controls what the app says and when it stops saying it.
 *
 * - id: stored when a visitor dismisses the promo bar. A new id shows the bar again to
 *   visitors who dismissed a previous promotion.
 * - startsAt: ISO timestamp, or null to start as soon as this is deployed.
 * - endsAt: ISO timestamp, exclusive — midnight (Europe/Vilnius) after the last promo day.
 *   The last day shown in the copy ("until 31 October") is derived from it.
 *
 * Set `promo` to null to switch every promo surface off.
 */
export const promo = {
  id: 'zero-commission-2026-10',
  startsAt: null,
  endsAt: '2026-11-01T00:00:00+02:00',
};
