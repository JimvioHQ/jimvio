import { NextResponse } from 'next/server';
import { getPesapalToken } from '@/lib/pesapal';

export const dynamic = 'force-dynamic';

/**
 * AUTH TOKEN API
 * Endpoint: /api/pesapal/token
 * Method: POST
 * Fetches an access token from PesaPal for use in subsequent requests.
 */
export async function POST() {
  try {
    const token = await getPesapalToken();
    return NextResponse.json({ token });
  } catch (error) {
    console.error('[PesaPal Token API]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch token' },
      { status: 500 }
    );
  }
}
