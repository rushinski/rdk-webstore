import Stripe from "stripe"; // Imports Stripes SDK call we will instantiate with our secert key to confirm Stripe is configured
import { NextResponse } from "next/server"; // Next.js helper to build HTTP responses in App Router route handlers
import { createClient } from "@supabase/supabase-js"; // Imports factory function for creating Supabase client

import { env } from "@/config/env"; // Imports our env validator

export async function GET() {
  // We have a try catch block so if we have any error we will log it safely
  try {
    // env validation
    const stripeKey = env.STRIPE_SECRET_KEY;
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRole = env.SUPABASE_SERVICE_ROLE_KEY;

    // Stripe readiness check (client init only)
    new Stripe(stripeKey);

    // Supabase basic readiness check. We base our url and service role so we can communicate with the DB
    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    // Simple DB query
    const { error } = await supabase.from("products").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        { ready: false, error: "Supabase query failed", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ready: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";

    return NextResponse.json({ ready: false, error: message }, { status: 500 });
  }
}
