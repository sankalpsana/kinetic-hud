import { NextResponse } from 'next/server';
import { supabase, DEFAULT_USER_ID } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface LogSetPayload {
  exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  rpe?: number;
}

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id = DEFAULT_USER_ID,
      split_name = 'Pull Day A',
      split_type = 'PULL_A',
      duration_minutes = 44,
      energy_score = 4,
      soreness_flags = [],
      sets = [],
    } = body;

    const completedSets: LogSetPayload[] = (sets as LogSetPayload[]).filter((s) => s.reps > 0);
    const totalVolume = completedSets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0);
    const totalHardSets = completedSets.length;

    // 1. Insert session record with split_type
    const { data: sessionData, error: sessionErr } = await supabase
      .from('workout_sessions')
      .insert({
        user_id,
        split_name,
        split_type: split_type || 'PULL_A',
        duration_minutes,
        energy_score,
        soreness_flags,
        total_volume_kg: totalVolume,
      })
      .select('id')
      .single();

    if (sessionErr) {
      console.warn('Session save notice:', sessionErr.message);
    }

    const sessionId = sessionData?.id || '00000000-0000-0000-0000-000000000099';

    // 2. Insert set logs
    if (completedSets.length > 0) {
      const records = completedSets.map((s) => ({
        session_id: sessionId,
        exercise_id: s.exercise_id && s.exercise_id.length > 10 ? s.exercise_id : null,
        set_number: s.set_number,
        weight_kg: s.weight_kg,
        reps: s.reps,
        rpe: s.rpe || 8.0,
      }));

      await supabase.from('set_logs').insert(records);
    }

    // 3. Agent 2: Hypertrophy Overload Auditor
    const exerciseSetsMap = new Map<string, LogSetPayload[]>();
    for (const s of completedSets) {
      const eid = s.exercise_id || 'default';
      const list = exerciseSetsMap.get(eid) || [];
      list.push(s);
      exerciseSetsMap.set(eid, list);
    }

    // Fetch exercise details from Supabase
    const { data: exData } = await supabase
      .from('exercises')
      .select('id, canonical_name, primary_muscle, stability_tier, resistance_profile');
    const exLookup = new Map((exData || []).map((e) => [e.id, e]));

    const progressionVerdicts: Array<{ exercise_name: string; status: string; verdict_badge: string; recommendation: string }> = [];
    const trainedMuscles = new Set<string>();

    for (const [eid, sList] of exerciseSetsMap.entries()) {
      const ex = exLookup.get(eid);
      const exName = ex ? ex.canonical_name : 'Logged Movement';
      const muscle = ex ? ex.primary_muscle : 'Primary Muscle';
      trainedMuscles.add(muscle);

      const avgReps = sList.reduce((sum, s) => sum + s.reps, 0) / sList.length;
      const maxWeight = Math.max(...sList.map((s) => s.weight_kg), 0);
      const allHitCeiling = sList.every((s) => s.reps >= 10 && (s.rpe || 8) <= 8.5);

      // Plateau detection: check previous 2 sessions in set_logs
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
          const prevWeights = histSets.slice(0, 4).map((h) => h.weight_kg);
          const prevRpes = histSets.slice(0, 4).map((h) => h.rpe || 8.0);
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
      } else if (allHitCeiling) {
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

    if (trainedMuscles.size === 0) {
      trainedMuscles.add('Prime Movers');
    }

    const recoveryStatuses = Array.from(trainedMuscles).map((muscle) => {
      const hours = RECOVERY_HOURS[muscle] || 48;
      return {
        muscle_group: muscle,
        readiness: `Ready in ${hours}h (Supercompensation Window)`,
        recovery_percent: Math.max(25, 100 - hours),
      };
    });

    recoveryStatuses.push({
      muscle_group: 'Central Nervous System',
      readiness: 'Supercompensated in 24–36h',
      recovery_percent: 85,
    });

    return NextResponse.json({
      session_id: String(sessionId),
      split_name,
      split_type,
      duration_minutes,
      total_volume_kg: Number(totalVolume.toFixed(1)),
      completed_sets: totalHardSets,
      volume_delta_kg: Number((totalVolume * 0.04).toFixed(1)),
      progression_verdicts: progressionVerdicts,
      recovery_statuses: recoveryStatuses,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
