import { NextResponse } from 'next/server';
import { supabase, DEFAULT_USER_ID } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || DEFAULT_USER_ID;
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { data: rawSessions, error } = await supabase
      .from('workout_sessions')
      .select(`
        *,
        set_logs (
          *,
          exercises (
            id,
            canonical_name,
            primary_muscle,
            stability_tier,
            resistance_profile,
            gif_url
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    interface RawExercise {
      id: string;
      canonical_name: string;
      primary_muscle: string;
      stability_tier?: string;
      resistance_profile?: string;
      gif_url?: string;
    }

    interface RawSetLog {
      id: string;
      set_number: number;
      weight_kg: number;
      reps: number;
      rpe?: number;
      created_at?: string;
      updated_at?: string;
      exercise_id?: string;
      exercises?: RawExercise | null;
    }

    interface RawSession {
      id: string;
      user_id: string;
      split_name: string;
      split_type?: string;
      duration_minutes?: number;
      energy_score?: number;
      soreness_flags?: string[];
      total_volume_kg?: number;
      created_at?: string;
      updated_at?: string;
      set_logs?: RawSetLog[];
    }

    const formatted = (rawSessions as RawSession[] || []).map((s) => {
      const rawSets = s.set_logs || [];
      const sortedSets = [...rawSets].sort((a, b) => {
        const timeDiff = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        if (timeDiff !== 0) return timeDiff;
        return a.set_number - b.set_number;
      });

      const exerciseMap: Record<string, {
        exercise_id: string;
        canonical_name: string;
        primary_muscle: string;
        stability_tier?: string;
        resistance_profile?: string;
        gif_url?: string;
        sets: Array<{
          id: string;
          set_number: number;
          weight_kg: number;
          reps: number;
          rpe: number;
          created_at?: string;
          updated_at?: string;
        }>;
      }> = {};

      for (const st of sortedSets) {
        const eid = st.exercise_id || 'unassigned';
        if (!exerciseMap[eid]) {
          exerciseMap[eid] = {
            exercise_id: eid,
            canonical_name: st.exercises?.canonical_name || 'Logged Movement',
            primary_muscle: st.exercises?.primary_muscle || 'Target Muscle',
            stability_tier: st.exercises?.stability_tier,
            resistance_profile: st.exercises?.resistance_profile,
            gif_url: st.exercises?.gif_url,
            sets: [],
          };
        }
        exerciseMap[eid].sets.push({
          id: st.id,
          set_number: st.set_number,
          weight_kg: Number(st.weight_kg) || 0,
          reps: st.reps || 0,
          rpe: st.rpe !== undefined && st.rpe !== null ? Number(st.rpe) : 8.0,
          created_at: st.created_at,
          updated_at: st.updated_at,
        });
      }

      return {
        id: s.id,
        user_id: s.user_id,
        split_name: s.split_name,
        split_type: s.split_type,
        duration_minutes: s.duration_minutes || 0,
        energy_score: s.energy_score || 4,
        soreness_flags: s.soreness_flags || [],
        total_volume_kg: Number(s.total_volume_kg) || 0,
        created_at: s.created_at,
        updated_at: s.updated_at,
        exercises: Object.values(exerciseMap),
        total_sets: sortedSets.length,
      };
    });

    return NextResponse.json({
      sessions: formatted,
      total: formatted.length,
      limit,
      offset,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
