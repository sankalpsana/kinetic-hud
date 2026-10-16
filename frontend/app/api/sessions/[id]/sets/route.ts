import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const { exercise_id, set_number, weight_kg, reps, rpe = 8.0 } = body;

    const record = {
      session_id: sessionId,
      exercise_id,
      set_number: set_number || 1,
      weight_kg: Number(weight_kg) || 0,
      reps: Number(reps) || 0,
      rpe: Number(rpe) || 8.0,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('set_logs')
      .insert(record)
      .select('*, exercises(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, set: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
