/**
 * Frontend PesaPal Integration Helpers
 */

/**
 * Initiates a PesaPal payment by calling the internal API
 * and redirecting the user to the PesaPal hosted page.
 * 
 * @param amount - The transaction amount (e.g., 200)
 * @param email - The buyer's email address
 * @param orderId - Optional internal order ID
 */
export async function handlePesapalPayment(amount: number, email: string, orderId?: string) {
  try {
    const response = await fetch('/api/pesapal/pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        email,
        orderId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to initiate PesaPal payment');
    }

    if (data.redirect_url) {
      // Redirect user to PesaPal's secure hosted payment page
      window.location.href = data.redirect_url;
    } else {
      throw new Error('No redirect URL received from payment gateway');
    }
  } catch (error) {
    console.error('[PesaPal Client]', error);
    throw error;
  }
}
