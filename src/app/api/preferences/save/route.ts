import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const payload = {
      account_scope: body.account_scope ?? 'AUTO',
      asset_name: body.asset_name,
      ticker: body.ticker ?? null,
      preference_type: body.preference_type ?? 'NEUTRAL',
      target_weight:
        body.target_weight === '' || body.target_weight == null
          ? null
          : Number(body.target_weight),
      max_weight:
        body.max_weight === '' || body.max_weight == null
          ? null
          : Number(body.max_weight),
      note: body.note ?? null,
    }

    if (!payload.asset_name || !payload.ticker) {
      return NextResponse.json(
        {
          ok: false,
          error: 'asset_name et ticker sont obligatoires',
        },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('allocation_preferences_v1')
      .insert(payload)

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? 'Unknown error',
      },
      { status: 500 }
    )
  }
}