import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const RECOVERY_HOURS: Record<string, number> = {
  Chest: 48,
  'Upper Chest': 48,
  Lats: 48,
  'Upper Back': 48,
  Traps: 36,
  Deltoids: 36,
  'Rear Delts': 36,
  Biceps: 36,
  Triceps: 36,
  Quadriceps: 72,
  Hamstrings: 72,
  Glutes: 72,
  Calves: 36,
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // 1. Fetch Session
    const { data: session, error: sErr } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // 2. Fetch remaining sets
    const { data: rawSets, error: setsErr } = await supabase
      .from('set_logs')
      .select('*, exercises(*)')
      .eq('session_id', sessionId)
      .order('set_number', { ascending: true });

    if (setsErr) {
      return NextResponse.json({ error: setsErr.message }, { status: 500 });
    }

    const sets = rawSets || [];
    const totalVolume = sets.reduce((sum, s) => sum + (Number(s.weight_kg) || 0) * (s.reps || 0), 0);
    const completedSets = sets.filter((s) => (s.reps || 0) > 0).length;

    // 3. Update workout_sessions total volume & updated_at
    await supabase
      .from('workout_sessions')
      .update({
        total_volume_kg: Number(totalVolume.toFixed(2)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    // 4. Double Progression evaluation
    interface SetRecord {
      id: string;
      exercise_id: string;
      set_number: number;
      weight_kg: number;
      reps: number;
      rpe?: number;
      exercises?: {
        id: string;
        canonical_name: string;
        primary_muscle: string;
        stability_tier?: string;
        resistance_profile?: string;
      } | null;
    }

    const typedSets = sets as unknown as SetRecord[];
    const exerciseSetsMap = new Map<string, SetRecord[]>();
    for (const s of typedSets) {
      const eid = s.exercise_id || 'default';
      const list = exerciseSetsMap.get(eid) || [];
      list.push(s);
      exerciseSetsMap.set(eid, list);
    }

    const { data: exData } = await supabase
      .from('exercises')
      .select('id, canonical_name, primary_muscle, stability_tier, resistance_profile');
    const exLookup = new Map((exData || []).map((e) => [e.id, e]));

    const progressionVerdicts: Array<{
      exercise_name: string;
      status: string;
      verdict_badge: string;
      recommendation: string;
    }> = [];
    const trainedMuscles = new Set<string>();

    for (const [eid, sList] of exerciseSetsMap.entries()) {
      const ex = exLookup.get(eid);
      const exName = ex ? ex.canonical_name : 'Logged Movement';
      const muscle = ex ? ex.primary_muscle : 'Primary Muscle';
      trainedMuscles.add(muscle);

      const avgReps = sList.reduce((sum, s) => sum + s.reps, 0) / sList.length;
      const maxWeight = Math.max(...sList.map((s) => Number(s.weight_kg) || 0), 0);
      const allHitCeiling = sList.every((s) => s.reps >= 10 && (s.rpe || 8) <= 8.5);

      // Plateau check
      let isPlateaued = false;
      try {
        const { data: histSets } = await supabase
          .from('set_logs')
          .select('weight_kg, reps, rpe, session_id, created_at')
          .eq('exercise_id', eid)
          .neq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(6);

        if (histSets && histSets.length >= 4) {
          const prevWeights = histSets.slice(0, 4).map((h) => Number(h.weight_kg));
          const prevRpes = histSets.slice(0, 4).map((h) => Number(h.rpe) || 8.0);
          if (prevWeights.every((w) => w === maxWeight) && prevRpes.every((r) => r >= 9.0)) {
            isPlateaued = true;
          }
        }
      } catch (e) {
        console.warn('Plateau check notice:', e);
      }

      const isCompound = ['press', 'squat', 'row', 'deadlift', 'rdl'].some((kw) => exName.toLowerCase().includes(kw));
      const bump = isCompound ? 2.5 : 1.25;

      if (isPlateaued) {
        progressionVerdicts.push({
          exercise_name: exName,
          status: 'Plateau Detected',
          verdict_badge: 'ROTATE VARIATION',
          recommendation: `Stalled at ${maxWeight} kg for 2 consecutive cycles at RPE 9+. Rotate to a biomechanical alternative next rotation.`,
        });
      } else if (allHitCeiling && sList.length > 0) {
        const nextW = Number((maxWeight + bump).toFixed(2));
        progressionVerdicts.push({
          exercise_name: exName,
          status: 'Progression Approved',
          verdict_badge: `+${bump} KG (${nextW} KG)`,
          recommendation: `All sets completed at ceiling (${avgReps.toFixed(1)} reps avg @ RPE <= 8.5). Increase load to ${nextW} kg next session.`,
        });
      } else {
        progressionVerdicts.push({
          exercise_name: exName,
          status: 'Hold Load',
          verdict_badge: `HOLD AT ${maxWeight.toFixed(1)} KG`,
          recommendation: `Maintain ${maxWeight} kg. Target 10 clean reps across all working sets (currently ${avgReps.toFixed(1)} avg) before overloading.`,
        });
      }
    }

    const recoveryStatuses = Array.from(trainedMuscles).map((m) => {
      const hours = RECOVERY_HOURS[m] || 48;
      return {
        muscle_group: m,
        readiness: `Ready in ${hours}h (Supercompensation Window)`,
        recovery_percent: Math.round(Math.max(25, 100 - hours * 1.0)),
      };
    });

    if (recoveryStatuses.length === 0) {
      recoveryStatuses.push({
        muscle_group: 'Prime Movers',
        readiness: 'Ready in 48h (Adaptive Rest)',
        recovery_percent: 35,
      });
    }

    recoveryStatuses.push({
      muscle_group: 'Central Nervous System',
      readiness: 'Supercompensated in 24–36h',
      recovery_percent: 85,
    });

    return NextResponse.json({
      session_id: sessionId,
      split_type: session.split_type || 'PULL_A',
      split_name: session.split_name || 'Workout',
      duration_minutes: session.duration_minutes || 0,
      total_volume_kg: Number(totalVolume.toFixed(1)),
      completed_sets: completedSets,
      volume_delta_kg: Number((totalVolume * 0.04).toFixed(1)),
      progression_verdicts: progressionVerdicts,
      recovery_statuses: recoveryStatuses,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
