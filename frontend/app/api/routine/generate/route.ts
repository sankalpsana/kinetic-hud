import { NextResponse } from 'next/server';
import { supabase, DEFAULT_USER_ID, Exercise } from '@/lib/supabase';

const CYCLE = ['PULL_A', 'PUSH_A', 'LEGS_A', 'PULL_B', 'PUSH_B', 'LEGS_B'] as const;
type SplitType = typeof CYCLE[number];

const SPLIT_NAMES: Record<SplitType, string> = {
  PULL_A: 'Pull Day A (Lats & Deep Stretch)',
  PUSH_A: 'Push Day A (Sternal Chest & Long Head)',
  LEGS_A: 'Legs Day A (Quad Dominant)',
  PULL_B: 'Pull Day B (Upper Back & Traps)',
  PUSH_B: 'Push Day B (Clavicular Chest & Lateral Delts)',
  LEGS_B: 'Legs Day B (Posterior Chain & Glutes)',
};

const FOCUS_MAP: Record<SplitType, string> = {
  PULL_A: 'Iliac Lats & Deep Lengthened Stretch Focus',
  PULL_B: 'Upper Back, Rhomboids & Traps Hypertrophy',
  PUSH_A: 'Sternal Pecs & Triceps Long Head Lengthened Focus',
  PUSH_B: 'Clavicular Upper Chest & Lateral Delts Focus',
  LEGS_A: 'Quad Dominant (Vastus Lateralis & Rectus Femoris)',
  LEGS_B: 'Posterior Chain (Hamstrings Lengthened & Glutes)',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id = DEFAULT_USER_ID,
      split_name,
      split_type,
      time_minutes = 45,
      energy_score = 4,
      soreness_flags = [],
    } = body;

    // 1. Determine target split type & rotation
    let targetSplitType: SplitType | null = null;
    if (split_type && CYCLE.includes(split_type.toUpperCase() as SplitType)) {
      targetSplitType = split_type.toUpperCase() as SplitType;
    } else if (split_name) {
      const sNorm = split_name.toUpperCase().replace(/\s+/g, '_');
      for (const c of CYCLE) {
        if (sNorm.includes(c)) {
          targetSplitType = c;
          break;
        }
      }
      if (!targetSplitType) {
        const prefix = sNorm.split('_')[0];
        for (const c of CYCLE) {
          if (c.startsWith(prefix)) {
            if (sNorm.includes('B') && c.endsWith('_B')) {
              targetSplitType = c;
              break;
            } else if (!sNorm.includes('B') && c.endsWith('_A')) {
              targetSplitType = c;
              break;
            }
          }
        }
      }
    }

    if (!targetSplitType) {
      // Query last completed session from Supabase to advance the cycle
      const { data: lastSess } = await supabase
        .from('workout_sessions')
        .select('split_type, created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastSess && lastSess.length > 0 && lastSess[0].split_type) {
        const lastType = lastSess[0].split_type.toUpperCase() as SplitType;
        const idx = CYCLE.indexOf(lastType);
        targetSplitType = idx !== -1 ? CYCLE[(idx + 1) % CYCLE.length] : 'PULL_A';
      } else {
        targetSplitType = 'PULL_A';
      }
    }

    const [primarySplit, splitRotation] = targetSplitType.split('_') as ['PUSH' | 'PULL' | 'LEGS', 'A' | 'B'];
    const displaySplitName = SPLIT_NAMES[targetSplitType] || `${primarySplit} Day ${splitRotation}`;

    // 2. Fetch available equipment
    const { data: eqData } = await supabase
      .from('user_equipment')
      .select('equipment_tag, is_available')
      .eq('user_id', user_id);

    const availableTags = new Set(
      (eqData || []).filter((e) => e.is_available).map((e) => e.equipment_tag)
    );
    if (availableTags.size === 0) {
      ['barbell', 'dumbbells', 'squat_rack', 'adjustable_bench', 'cable_crossover', 'lat_pulldown', 'cable_row', 'leg_press', 'leg_extension_curl', 'hack_squat', 'smith_machine'].forEach((t) => availableTags.add(t));
    }

    // 3. Hard SQL Filtering: primary_split = :split AND split_rotation = :rotation
    const { data: exData, error: exError } = await supabase
      .from('exercises')
      .select('*')
      .eq('primary_split', primarySplit)
      .eq('split_rotation', splitRotation);

    if (exError) {
      return NextResponse.json({ error: exError.message }, { status: 500 });
    }

    const candidateExercises: Exercise[] = exData || [];
    const adjustments: string[] = [];
    const flagsLower = (soreness_flags as string[]).map((f) => f.toLowerCase());
    const hasLowerBack = flagsLower.some((f) => f.includes('back') || f.includes('spine') || f.includes('lumbar'));
    const hasShoulder = flagsLower.some((f) => f.includes('shoulder'));

    // Biomechanical substitution
    const filtered: Array<Exercise & { substitution_applied?: string }> = [];
    for (const ex of candidateExercises) {
      const stressFlags = ex.joint_stress_flags || [];
      const eqTag = ex.equipment_tag;

      if (hasLowerBack && stressFlags.includes('axial_spine')) {
        const { data: subs } = await supabase
          .from('exercises')
          .select('*')
          .eq('primary_split', primarySplit)
          .eq('stability_tier', 'S');

        const safeSub = (subs || []).find((s) => !(s.joint_stress_flags || []).includes('axial_spine'));
        if (safeSub && safeSub.id !== ex.id) {
          const applied = `Axial Spine Offload: Replaced ${ex.canonical_name} with ${safeSub.canonical_name} to eliminate lumbar shearing.`;
          adjustments.push(applied);
          filtered.push({ ...safeSub, substitution_applied: applied });
          continue;
        } else {
          adjustments.push(`Axial Spine Warning: ${ex.canonical_name} omitted due to lumbar soreness.`);
          continue;
        }
      }

      if (hasShoulder && stressFlags.includes('shoulder')) {
        const { data: subs } = await supabase
          .from('exercises')
          .select('*')
          .eq('primary_split', primarySplit)
          .eq('stability_tier', 'S');

        const safeSub = (subs || []).find((s) => !(s.joint_stress_flags || []).includes('shoulder'));
        if (safeSub) {
          const applied = `Shoulder Protection: Replaced ${ex.canonical_name} with ${safeSub.canonical_name} in scapular plane.`;
          adjustments.push(applied);
          filtered.push({ ...safeSub, substitution_applied: applied });
          continue;
        }
      }

      if (eqTag && !availableTags.has(eqTag)) {
        const { data: subs } = await supabase
          .from('exercises')
          .select('*')
          .eq('primary_split', primarySplit);

        const availableSub = (subs || []).find((s) => availableTags.has(s.equipment_tag) && s.id !== ex.id);
        if (availableSub) {
          const applied = `Equipment Auto-Swap: ${ex.canonical_name} (${eqTag} unavailable) replaced with ${availableSub.canonical_name}.`;
          adjustments.push(applied);
          filtered.push({ ...availableSub, substitution_applied: applied });
          continue;
        }
      }

      filtered.push(ex);
    }

    // 4. Volume Prescription Rule: Strictly 2–3 hard working sets (0–2 RIR)
    const maxExercises = time_minutes <= 45 ? 4 : 5;
    const selectedExercises = filtered.slice(0, maxExercises);

    let energyMode = 'Standard Hypertrophy Target (1–2 RIR, 3 sets)';
    let setsPerExercise = 3;

    if (energy_score <= 2) {
      energyMode = 'Deload Mode (0–1 RIR reserve, 2 sets prescribed)';
      setsPerExercise = 2;
      adjustments.push('Deload Mode: 2 hard working sets prescribed to avoid nervous fatigue.');
    } else if (energy_score >= 4) {
      energyMode = 'High Output Intensity (0–1 RIR, 3 working sets)';
      setsPerExercise = 3;
    }

    // 5. Query user's past weights from set_logs
    const exIds = selectedExercises.map((e) => e.id);
    const pastWeightMap = new Map<string, number>();
    if (exIds.length > 0) {
      const { data: pastLogs } = await supabase
        .from('set_logs')
        .select('exercise_id, weight_kg, reps, created_at')
        .in('exercise_id', exIds)
        .order('created_at', { ascending: false });

      if (pastLogs) {
        for (const log of pastLogs) {
          if (!pastWeightMap.has(log.exercise_id) && log.weight_kg > 0) {
            pastWeightMap.set(log.exercise_id, log.weight_kg);
          }
        }
      }
    }

    const exercises = selectedExercises.map((ex) => {
      let defaultW = pastWeightMap.get(ex.id);
      if (defaultW === undefined) {
        const nameLower = ex.canonical_name.toLowerCase();
        if (nameLower.includes('leg') || nameLower.includes('squat') || nameLower.includes('press')) {
          defaultW = nameLower.includes('leg') || nameLower.includes('squat') ? 60.0 : 35.0;
        } else if (nameLower.includes('row') || nameLower.includes('pulldown') || nameLower.includes('rdl')) {
          defaultW = 40.0;
        } else {
          defaultW = 15.0;
        }
      }

      const isHeavy = (ex.stability_tier === 'S' || ex.stability_tier === 'A') && (ex.canonical_name.toLowerCase().includes('press') || ex.canonical_name.toLowerCase().includes('squat'));

      return {
        exercise_id: ex.id,
        name: ex.canonical_name,
        primary_muscle: ex.primary_muscle,
        movement_pattern: ex.movement_pattern,
        equipment_tag: ex.equipment_tag,
        joint_stress_flags: ex.joint_stress_flags || [],
        gif_url: ex.gif_url,
        biomechanical_cue: ex.biomechanical_cue,
        primary_split: ex.primary_split,
        split_rotation: ex.split_rotation,
        target_division: ex.target_division,
        resistance_profile: ex.resistance_profile,
        stability_tier: ex.stability_tier,
        sets: setsPerExercise,
        target_reps: isHeavy ? '8–10' : '10–12',
        target_weight_kg: defaultW,
        rest_seconds: ex.rest_default_seconds || 120,
        substitution_applied: ex.substitution_applied || null,
      };
    });

    const adjustment_summary = adjustments.length > 0
      ? adjustments.join(' • ')
      : `Deterministic ${displaySplitName} generated with zero cross-muscle contamination.`;

    return NextResponse.json({
      split_type: targetSplitType,
      split_name: displaySplitName,
      focus_subtitle: FOCUS_MAP[targetSplitType] || 'Scientific Hypertrophy Prescription',
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
