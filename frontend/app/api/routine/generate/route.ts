import { NextResponse } from 'next/server';
import { supabase, DEFAULT_USER_ID, Exercise } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id = DEFAULT_USER_ID,
      split_name = 'Pull Day A',
      time_minutes = 45,
      energy_score = 4,
      soreness_flags = [],
    } = body;

    // 1. Fetch user equipment
    const { data: eqData } = await supabase
      .from('user_equipment')
      .select('equipment_tag, is_available')
      .eq('user_id', user_id);

    const availableTags = new Set(
      (eqData || []).filter((e) => e.is_available).map((e) => e.equipment_tag)
    );

    // 2. Fetch all canonical exercises
    const { data: exData, error: exError } = await supabase
      .from('exercises')
      .select('*');

    if (exError) {
      return NextResponse.json({ error: exError.message }, { status: 500 });
    }

    const allExercises: Exercise[] = exData || [];
    const byName = new Map<string, Exercise>();
    allExercises.forEach((e) => byName.set(e.canonical_name, e));

    const adjustments: string[] = [];
    const flagsLower = (soreness_flags as string[]).map((f) => f.toLowerCase());
    const hasLowerBack = flagsLower.some((f) => f.includes('back'));
    const hasShoulder = flagsLower.some((f) => f.includes('shoulder'));
    const hasKnees = flagsLower.some((f) => f.includes('knee'));

    // Volume sizing by available time
    let targetSets = 3;
    let restSec = 90;
    let maxExercises = 4;

    if (time_minutes <= 30) {
      targetSets = 2;
      restSec = 60;
      maxExercises = 3;
    } else if (time_minutes <= 45) {
      targetSets = 3;
      restSec = 90;
      maxExercises = 4;
    } else if (time_minutes <= 60) {
      targetSets = 3;
      restSec = 105;
      maxExercises = 5;
    } else {
      targetSets = 4;
      restSec = 120;
      maxExercises = 6;
    }

    // Energy regulation
    let energyMode = 'High Energy • Normal Intensity Target';
    if (energy_score <= 2) {
      energyMode = 'Deload Mode';
      targetSets = Math.max(2, targetSets - 1);
      adjustments.push('Deload Mode: Working sets trimmed to prioritize neuromuscular recovery.');
    } else if (energy_score === 3) {
      energyMode = 'Standard Target';
    } else if (energy_score === 4) {
      energyMode = 'High Energy • Normal Intensity Target';
    } else {
      energyMode = 'Peak Overdrive Target';
    }

    const selected: Array<{ exercise: Exercise; defaultWeight: number; reps: string }> = [];
    const splitLower = split_name.toLowerCase();
    let focusSubtitle = 'Chest-supported row focus';

    if (splitLower.includes('pull')) {
      focusSubtitle = 'Chest-supported row & lat development';
      // Exercise 1: Upper Back Row
      if (hasLowerBack || availableTags.has('cable_row')) {
        const row = byName.get('Chest-Supported Row');
        if (row) {
          selected.push({ exercise: row, defaultWeight: 32.5, reps: '8–10' });
          if (hasLowerBack) {
            adjustments.push('Lower Back Protection: Swapped Barbell Rows for Chest-Supported Row to eliminate spinal axial shearing.');
          }
        }
      } else {
        const bbRow = byName.get('Barbell Bent-Over Row') || byName.get('Chest-Supported Row');
        if (bbRow) selected.push({ exercise: bbRow, defaultWeight: 45.0, reps: '8–10' });
      }

      // Exercise 2: Vertical Pull
      const lat = byName.get('Lat Pulldown');
      if (lat) selected.push({ exercise: lat, defaultWeight: 55.0, reps: '10–12' });

      // Exercise 3: Accessory / Hamstring Curl
      const curl = byName.get('Leg Curl');
      if (curl) selected.push({ exercise: curl, defaultWeight: 45.0, reps: '10–12' });

      // Exercise 4: Cable Flyes or additional pull
      const fly = byName.get('Cable Crossover');
      if (fly && selected.length < maxExercises) {
        selected.push({ exercise: fly, defaultWeight: 15.0, reps: '12–15' });
      }
    } else if (splitLower.includes('push')) {
      focusSubtitle = 'Chest hypertrophy & anterior deltoid protection';
      if (hasShoulder) {
        const dbInc = byName.get('Incline DB Press') || byName.get('Neutral-Grip DB Shoulder Press');
        if (dbInc) {
          selected.push({ exercise: dbInc, defaultWeight: 26.0, reps: '8–10' });
          adjustments.push('Shoulder Impingement Flag: Wide barbell presses replaced with 30° Incline DB Press in the scapular plane.');
        }
      } else {
        const bench = byName.get('Barbell Bench Press') || byName.get('Incline DB Press');
        if (bench) selected.push({ exercise: bench, defaultWeight: 70.0, reps: '6–8' });
      }

      const inc = byName.get('Incline DB Press');
      if (inc && selected[0]?.exercise.id !== inc.id) {
        selected.push({ exercise: inc, defaultWeight: 28.0, reps: '8–10' });
      }

      const fly = byName.get('Cable Crossover');
      if (fly) selected.push({ exercise: fly, defaultWeight: 15.0, reps: '12–15' });

      const ohp = hasShoulder ? byName.get('Neutral-Grip DB Shoulder Press') : (byName.get('Overhead Barbell Press') || byName.get('Neutral-Grip DB Shoulder Press'));
      if (ohp && selected.length < maxExercises) {
        selected.push({ exercise: ohp, defaultWeight: 20.0, reps: '10–12' });
      }
    } else {
      // Legs / Lower Body
      focusSubtitle = 'Lower body quad & posterior chain overload';
      if (hasLowerBack || !availableTags.has('hack_squat')) {
        const legPress = byName.get('45° Leg Press');
        if (legPress) {
          selected.push({ exercise: legPress, defaultWeight: 180.0, reps: '8–10' });
          if (hasLowerBack) {
            adjustments.push('Axial Offload: Replaced Barbell Back Squats with 45° Leg Press to eliminate compressive spinal load.');
          }
        }
      } else {
        const hack = byName.get('Hack Squat') || byName.get('45° Leg Press');
        if (hack) selected.push({ exercise: hack, defaultWeight: 140.0, reps: '8–10' });
      }

      const curl = byName.get('Leg Curl');
      if (curl) selected.push({ exercise: curl, defaultWeight: 45.0, reps: '10–12' });

      const bench = byName.get('Incline DB Press') || byName.get('Barbell Bench Press');
      if (bench && selected.length < maxExercises) {
        selected.push({ exercise: bench, defaultWeight: 30.0, reps: '8–10' });
      }
    }

    const capped = selected.slice(0, maxExercises);

    const exercises = capped.map((item) => ({
      exercise_id: item.exercise.id,
      name: item.exercise.canonical_name,
      primary_muscle: item.exercise.primary_muscle,
      movement_pattern: item.exercise.movement_pattern,
      equipment_tag: item.exercise.equipment_tag,
      joint_stress_flags: item.exercise.joint_stress_flags || [],
      gif_url: item.exercise.gif_url,
      biomechanical_cue: item.exercise.biomechanical_cue,
      sets: targetSets,
      target_reps: item.reps,
      target_weight_kg: item.defaultWeight,
      rest_seconds: restSec,
      substitution_applied: hasLowerBack || hasShoulder ? 'Auto-protection active' : null,
    }));

    const adjustment_summary = adjustments.length > 0
      ? adjustments.join(' • ')
      : 'Standard progressive overload protocol configured based on current readiness.';

    return NextResponse.json({
      split_name,
      focus_subtitle: focusSubtitle,
      estimated_duration_min: time_minutes,
      energy_score,
      energy_mode: energyMode,
      adjustment_summary,
      exercises,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
