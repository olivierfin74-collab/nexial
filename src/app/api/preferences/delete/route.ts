import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.id) {
      return NextResponse.json(
        { ok: false, error: 'id obligatoire' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('allocation_preferences_v1')
      .delete()
      .eq('id', body.id)

    if (error) {
      return NextResponse.json(
        { ok: false, error },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'Unknown error' },
      { status: 500 }
    )
  }
}