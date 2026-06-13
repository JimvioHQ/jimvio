import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await params;
    if (!productId) return NextResponse.json({ success: false, error: 'Missing product id' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('next-auth.session-token')?.value ?? null;

    const insertPayload: any = {
      product_id: productId,
      created_at: new Date().toISOString(),
    };
    if (user) insertPayload.user_id = user.id;
    if (sessionCookie) insertPayload.session_id = sessionCookie;

    const { data, error } = await supabase.from('product_views').insert(insertPayload).select().single();
    if (error) {
      console.error('[recordProductView] supabase error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[recordProductView] error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
