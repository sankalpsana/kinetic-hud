import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; exerciseId: string }> }
) {
  try {
    const { id: sessionId, exerciseId } = await params;

    const { error } = await supabase
      .from('set_logs')
      .delete()
      .eq('session_id', sessionId)
      .eq('exercise_id', exerciseId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      deleted_exercise_id: exerciseId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
