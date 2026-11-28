/**
 * Temporary customer-facing maintenance switch for Binance Pay.
 *
 * Keep the provider integration, credentials, webhook verification and
 * settlement handlers intact. This gate only prevents creation of new
 * customer payment sessions while the gateway issue is being investigated.
 * Set the switch to false after an end-to-end production payment test passes.
 */
export const BINANCE_PAY_MAINTENANCE_ENABLED = true;

export const BINANCE_PAY_MAINTENANCE_CODE = "BINANCEPAY_UNAVAILABLE";

export const BINANCE_PAY_MAINTENANCE_MESSAGE =
  "Binance Pay is temporarily under maintenance while our team resolves an issue. We are working to restore the service, and it will be available again soon. Please choose another payment method for now.";

export function binancePayMaintenancePayload() {
  return {
    success: false,
    code: BINANCE_PAY_MAINTENANCE_CODE,
    error: BINANCE_PAY_MAINTENANCE_MESSAGE,
  };
}
