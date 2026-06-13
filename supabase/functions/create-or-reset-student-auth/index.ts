import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse(
        {
          success: false,
          error: 'Método não permitido.',
        },
        405
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripePricePro = Deno.env.get('STRIPE_PRICE_PRO');
    const stripePricePremium = Deno.env.get('STRIPE_PRICE_PREMIUM');
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';

    if (!supabaseUrl) throw new Error('SUPABASE_URL não configurada.');
    if (!serviceRoleKey) throw new Error('SERVICE_ROLE_KEY não configurada.');
    if (!stripeSecretKey) throw new Error('STRIPE_SECRET_KEY não configurada.');
    if (!stripePricePro) throw new Error('STRIPE_PRICE_PRO não configurado.');
    if (!stripePricePremium) throw new Error('STRIPE_PRICE_PREMIUM não configurado.');

    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      throw new Error('Usuário não autenticado.');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const token = authHeader.replace('Bearer ', '');

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      throw new Error('Sessão inválida.');
    }

    const user = userData.user;

    const body = await req.json();
    const planSlug = String(body.planSlug || '').toLowerCase();

    if (planSlug !== 'pro' && planSlug !== 'premium') {
      throw new Error('Plano inválido.');
    }

    const priceId = planSlug === 'pro' ? stripePricePro : stripePricePremium;

    const { data: trainer, error: trainerError } = await supabaseAdmin
      .from('trainer_profiles')
      .select('*')
      .eq('email', user.email)
      .maybeSingle();

    if (trainerError) {
      throw trainerError;
    }

    if (!trainer) {
      throw new Error('Perfil do personal não encontrado.');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const customer = await stripe.customers.create({
      email: user.email || undefined,
      name: trainer.name || user.email || undefined,
      metadata: {
        trainer_id: trainer.id,
        user_id: user.id,
      },
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/personal/subscription?checkout=success&plan=${planSlug}`,
      cancel_url: `${appUrl}/personal/subscription?checkout=cancel`,
      metadata: {
        trainer_id: trainer.id,
        user_id: user.id,
        plan_slug: planSlug,
      },
      subscription_data: {
        metadata: {
          trainer_id: trainer.id,
          user_id: user.id,
          plan_slug: planSlug,
        },
      },
    });

    return jsonResponse({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error('[CREATE CHECKOUT SESSION]', error);

    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar checkout.',
      },
      400
    );
  }
});