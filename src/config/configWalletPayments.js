/**
 * Apple Pay and Google Pay at checkout (Stripe Payment Request Button).
 * See specs/wallet-payments.md.
 *
 * Build-time flag (REACT_APP_* is inlined into the browser bundle). Off unless 'true'.
 * Turn it on for an environment only after its domain is registered in Stripe
 * (Settings → Payment method domains); the button never shows on unregistered domains anyway.
 */
export const WALLET_PAYMENTS_ENABLED = process.env.REACT_APP_WALLET_PAYMENTS_ENABLED === 'true';
