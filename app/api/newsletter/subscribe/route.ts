import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/db/supabase';

const SubscribeSchema = z.object({
  email: z.string().email(),
  locale: z.enum(['en', 'es']),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, locale } = SubscribeSchema.parse(body);

    const supabase = getSupabaseServerClient();

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: locale === 'en' ? 'Already subscribed' : 'Ya estás suscrito' },
        { status: 400 }
      );
    }

    // Add subscriber
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: email.toLowerCase(),
        locale,
        subscribed_at: new Date().toISOString(),
        is_active: true,
      });

    if (error) {
      console.error('Newsletter subscription error:', error);
      return NextResponse.json(
        { error: locale === 'en' ? 'Subscription failed' : 'Error en la suscripción' },
        { status: 500 }
      );
    }

    // TODO: Send welcome email with Resend
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'ThotNet Core <newsletter@thotnetcore.com>',
    //   to: email,
    //   subject: locale === 'en' ? 'Welcome to ThotNet Core!' : '¡Bienvenido a ThotNet Core!',
    //   html: `<h1>Welcome!</h1>`,
    // });

    return NextResponse.json({
      message: locale === 'en' ? 'Successfully subscribed!' : '¡Suscripción exitosa!',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
