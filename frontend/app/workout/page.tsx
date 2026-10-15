'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import HUDHeader from '@/components/HUDHeader';

interface ExerciseItem {
  exercise_id: string;
  name: string;
  primary_muscle: string;
  movement_pattern: string;
  equipment_tag: string;
  joint_stress_flags?: string[];
  gif_url?: string;
  biomechanical_cue: string;
  primary_split?: string;
  split_rotation?: string;
  target_division?: string;
  resistance_profile?: 'lengthened' | 'shortened' | 'even';
  stability_tier?: 'S' | 'A' | 'B' | 'C';
  sets: number;
  target_reps: string;
  target_weight_kg: number;
  rest_seconds: number;
  substitution_applied?: string | null;
}

interface CompletedSet {
  exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  rpe: number;
}

function WorkoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const timeParam = Number(searchParams.get('time')) || 45;
  const energyParam = Number(searchParams.get('energy')) || 4;
  const sorenessParam = (searchParams.get('soreness') || '').split(',').filter(Boolean);
  const splitParam = searchParams.get('split') || 'Pull Day A';

  // 2-Stage Flow State: 'staging' | 'active'
  const [stage, setStage] = useState<'staging' | 'active'>('staging');

  // Exercises State
  const [splitName, setSplitName] = useState<string>(splitParam);
  const [focusSubtitle, setFocusSubtitle] = useState<string>('Scientific Hypertrophy Prescription');
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [currentExIndex, setCurrentExIndex] = useState<number>(0);
  const [currentSetNumber, setCurrentSetNumber] = useState<number>(1);
  const [completedSets, setCompletedSets] = useState<CompletedSet[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Steppers State for active set
  const [weight, setWeight] = useState<number>(35.0);
  const [reps, setReps] = useState<number>(10);
  const [sessionStartTime] = useState<number>(() => Date.now());

  // Rest Timer State - Starts in IDLE state (isTimerRunning = false)
  const [restSeconds, setRestSeconds] = useState<number>(120);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Swap Modal State
  const [showSwapModal, setShowSwapModal] = useState<boolean>(false);
  const [swapTargetIndex, setSwapTargetIndex] = useState<number>(0);
  const [swapQuery, setSwapQuery] = useState<string>('');
  const [swapMatchResult, setSwapMatchResult] = useState<{ canonical_name: string; latency_ms: number; source: string; exercise: Record<string, unknown> } | null>(null);
  const [isMatching, setIsMatching] = useState<boolean>(false);

  // Load routine from API
  useEffect(() => {
    async function loadRoutine() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/routine/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            time_minutes: timeParam,
            energy_score: energyParam,
            soreness_flags: sorenessParam,
            split_name: splitParam,
          }),
        });
        const data = await res.json();
        if (data.exercises && data.exercises.length > 0) {
          setExercises(data.exercises);
          if (data.split_name) setSplitName(data.split_name);
          if (data.focus_subtitle) setFocusSubtitle(data.focus_subtitle);
          setWeight(data.exercises[0].target_weight_kg || 35.0);
          setRestSeconds(data.exercises[0].rest_seconds || 120);
        }
      } catch (e) {
        console.error('Failed to load routine:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadRoutine();
  }, [timeParam, energyParam, splitParam]);

  // Rest timer countdown - only runs when explicitly started
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && restSeconds > 0) {
      interval = setInterval(() => {
        setRestSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, restSeconds]);

  const currentExercise = exercises[currentExIndex] || {
    exercise_id: 'default',
    name: 'Chest-Supported Row',
    primary_muscle: 'Upper Back / Lats',
    movement_pattern: 'Horizontal Pull',
    equipment_tag: 'cable_row',
    biomechanical_cue: 'Pull elbows back toward hips with chest firmly braced against pad.',
    sets: 3,
    target_reps: '8–10',
    target_weight_kg: 35.0,
    rest_seconds: 120,
    resistance_profile: 'lengthened',
    stability_tier: 'S',
    target_division: 'lats',
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Reordering in Stage 1
  const moveExercise = (index: number, direction: 'up' | 'down') => {
    setExercises((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  // Log active set
  const handleLogSet = () => {
    const newLog: CompletedSet = {
      exercise_id: currentExercise.exercise_id,
      set_number: currentSetNumber,
      weight_kg: weight,
      reps: reps,
      rpe: 8.5,
    };
    setCompletedSets((prev) => [...prev, newLog]);

    // Timer is reset to exercise default but kept in IDLE state (does NOT auto-run)
    setRestSeconds(currentExercise.rest_seconds || 120);
    setIsTimerRunning(false);

    if (currentSetNumber < currentExercise.sets) {
      setCurrentSetNumber((prev) => prev + 1);
    } else {
      // Completed all sets for this exercise, advance to next
      if (currentExIndex < exercises.length - 1) {
        const nextIdx = currentExIndex + 1;
        setCurrentExIndex(nextIdx);
        setCurrentSetNumber(1);
        setWeight(exercises[nextIdx].target_weight_kg);
        setRestSeconds(exercises[nextIdx].rest_seconds || 120);
      }
    }
  };

  // Handle Swap search with Mediator
  const handleSearchSwap = async () => {
    if (!swapQuery.trim()) return;
    setIsMatching(true);
    try {
      const res = await fetch('/api/routine/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: swapQuery }),
      });
      const data = await res.json();
      setSwapMatchResult(data);
    } catch (e) {
      console.error('Swap search failed:', e);
    } finally {
      setIsMatching(false);
    }
  };

  const handleApplySwap = () => {
    if (!swapMatchResult || !swapMatchResult.canonical_name) return;
    setExercises((prev) => {
      const updated = [...prev];
      const target = updated[swapTargetIndex];
      if (target) {
        updated[swapTargetIndex] = {
          ...target,
          name: swapMatchResult.canonical_name,
          substitution_applied: `Mediator Match via ${swapMatchResult.source} (${swapMatchResult.latency_ms}ms)`,
        };
      }
      return updated;
    });
    setShowSwapModal(false);
    setSwapQuery('');
    setSwapMatchResult(null);
  };

  // Finish session
  const handleFinishSession = async () => {
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - sessionStartTime) / 60000));
    const setsToLog = completedSets.length > 0
      ? completedSets
      : [
          {
            exercise_id: currentExercise.exercise_id,
            set_number: 1,
            weight_kg: weight,
            reps: reps,
            rpe: 8.5,
          },
        ];

    try {
      const res = await fetch('/api/routine/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          split_name: splitName,
          split_type: currentExercise.primary_split ? `${currentExercise.primary_split}_${currentExercise.split_rotation || 'A'}` : 'PULL_A',
          duration_minutes: elapsedMinutes,
          energy_score: energyParam,
          soreness_flags: sorenessParam,
          sets: setsToLog,
        }),
      });
      const data = await res.json();
      sessionStorage.setItem('last_workout_summary', JSON.stringify(data));
    } catch (e) {
      console.warn('Logging session locally:', e);
    }
    router.push('/summary');
  };

  const currentExerciseSets = completedSets.filter(
    (s) => s.exercise_id === currentExercise.exercise_id
  );

  return (
    <>
      <HUDHeader title={stage === 'staging' ? 'Routine Staging' : 'Workout Cockpit'} />

      <main className="flex flex-col relative w-full pt-16 pb-36 px-4 max-w-lg mx-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-[#4edea3] border-t-transparent rounded-full animate-spin" />
            <span className="font-metric text-xs text-[#86948a] tracking-wider uppercase">
              Assembling Maximum Hypertrophy Routine...
            </span>
          </div>
        ) : stage === 'staging' ? (
          /* ========================================================= */
          /* STAGE 1: ROUTINE STAGING / OVERVIEW                       */
          /* ========================================================= */
          <div className="flex flex-col w-full gap-4">
            {/* Split Header Banner */}
            <div className="flex flex-col gap-2 bg-[#1c1f29] rounded-xl p-4 border border-[#1F2937] shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-metric text-[10px] text-[#4edea3] tracking-widest uppercase font-bold px-2 py-0.5 rounded bg-[#4edea3]/10 border border-[#4edea3]/20">
                  ● STAGE 1 • HYPERTROPHY STAGING
                </span>
                <span className="font-metric text-xs text-[#bbcabf]">
                  {exercises.length} MOVEMENTS
                </span>
              </div>
              <h1 className="font-headline text-[20px] text-[#dfe2ef] font-bold">
                {splitName}
              </h1>
              <p className="font-body text-[13px] text-[#86948a] leading-relaxed">
                {focusSubtitle}
              </p>
              <div className="flex items-center gap-2 mt-1 pt-2 border-t border-[#262a34]">
                <span className="material-symbols-outlined text-[16px] text-[#4edea3]">science</span>
                <span className="font-body text-[12px] text-[#bbcabf]">
                  Strictly 2–3 hard sets per exercise at 0–2 RIR • Zero junk volume
                </span>
              </div>
            </div>

            {/* Prescribed Movements Cards */}
            <div className="flex flex-col gap-3">
              {exercises.map((ex, idx) => (
                <div
                  key={ex.exercise_id || idx}
                  className="flex flex-col bg-[#181b25] rounded-xl p-4 gap-3 border border-[#1F2937] shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-metric text-sm font-bold text-[#4edea3] w-6">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <h3 className="font-headline text-[16px] text-[#dfe2ef] font-semibold">
                        {ex.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveExercise(idx, 'up')}
                        disabled={idx === 0}
                        aria-label="Move up"
                        className="w-7 h-7 flex items-center justify-center rounded bg-[#262a34] text-[#bbcabf] hover:text-[#dfe2ef] disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveExercise(idx, 'down')}
                        disabled={idx === exercises.length - 1}
                        aria-label="Move down"
                        className="w-7 h-7 flex items-center justify-center rounded bg-[#262a34] text-[#bbcabf] hover:text-[#dfe2ef] disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSwapTargetIndex(idx);
                          setShowSwapModal(true);
                        }}
                        aria-label="Swap exercise"
                        className="w-7 h-7 flex items-center justify-center rounded bg-[#262a34] text-[#4edea3] hover:bg-[#4edea3]/20"
                      >
                        <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                      </button>
                    </div>
                  </div>

                  {/* Scientific Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="font-metric text-[10px] font-bold px-2 py-0.5 rounded bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20">
                      TIER {ex.stability_tier || 'S'} (STABILITY)
                    </span>
                    <span className="font-metric text-[10px] font-bold px-2 py-0.5 rounded bg-[#93c5fd]/10 text-[#93c5fd] border border-[#93c5fd]/20 uppercase">
                      {ex.resistance_profile || 'lengthened'} BIAS
                    </span>
                    {ex.target_division && (
                      <span className="font-metric text-[10px] font-medium px-2 py-0.5 rounded bg-[#353943] text-[#bbcabf] uppercase">
                        {ex.target_division.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  {/* Target Prescription & Rest */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#262a34]">
                    <span className="font-body text-[13px] text-[#dfe2ef] font-medium">
                      <span className="text-[#4edea3] font-bold">{ex.sets} hard sets</span> × {ex.target_reps} reps @ {ex.target_weight_kg} kg
                    </span>
                    <span className="font-metric text-xs text-[#86948a]">
                      Rest: {Math.floor((ex.rest_seconds || 120) / 60)}:00
                    </span>
                  </div>

                  {/* Form Cue */}
                  <p className="font-body text-[12px] text-[#86948a] italic line-clamp-2">
                    &ldquo;{ex.biomechanical_cue}&rdquo;
                  </p>
                </div>
              ))}
            </div>

            {/* Bottom Sticky Action: Start Workout */}
            <div className="fixed bottom-16 left-0 right-0 p-4 max-w-lg mx-auto bg-gradient-to-t from-[#0f131c] via-[#0f131c]/95 to-transparent z-40">
              <button
                type="button"
                onClick={() => {
                  setStage('active');
                  setCurrentExIndex(0);
                  setCurrentSetNumber(1);
                  setWeight(exercises[0]?.target_weight_kg || 35.0);
                  setRestSeconds(exercises[0]?.rest_seconds || 120);
                  setIsTimerRunning(false);
                }}
                className="w-full h-13 rounded-xl bg-[#4edea3] text-[#003824] font-headline text-base font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-[#4edea3]/20"
              >
                <span>START TODAY&apos;S WORKOUT</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* STAGE 2: ACTIVE SET EXECUTION MATRIX                      */
          /* ========================================================= */
          <div className="flex flex-col w-full gap-4">
            {/* Active Session Progress & Stage Switcher */}
            <div className="flex flex-col gap-2 bg-[#1c1f29] rounded-xl p-4 border border-[#1F2937] shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-headline text-[17px] text-[#dfe2ef] font-semibold">
                    {splitName}
                  </span>
                  <span className="font-body text-[12px] text-[#bbcabf]">
                    {currentExercise.primary_muscle} • Tier {currentExercise.stability_tier || 'S'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStage('staging')}
                    className="font-metric text-[11px] text-[#bbcabf] hover:text-[#dfe2ef] px-2 py-1 rounded bg-[#262a34] border border-[#353943]"
                  >
                    Review Routine
                  </button>
                  <span className="font-metric text-xs text-[#4edea3] font-bold px-2 py-1 rounded-full bg-[#4edea3]/10 border border-[#4edea3]/20">
                    {currentExIndex + 1}/{exercises.length}
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-[#31353f] rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-[#4edea3] rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentExIndex + (currentSetNumber - 1) / (currentExercise.sets || 3)) / (exercises.length || 1)) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* REST TIMER: IDLE by default, explicit user tap to start */}
            <div className="sticky top-16 z-30 flex items-center justify-between bg-[#262a34]/95 backdrop-blur-md px-4 py-3 rounded-xl border border-[#353943]/40 shadow-lg">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-9 h-9 rounded-full ${isTimerRunning ? 'bg-[#4edea3]/20 text-[#4edea3] animate-pulse' : 'bg-[#353943] text-[#bbcabf]'}`}>
                  <span className="material-symbols-outlined text-[20px]">
                    {isTimerRunning ? 'timer' : 'timer_off'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-metric text-[10px] text-[#86948a] uppercase tracking-wider">
                    {isTimerRunning ? 'Rest Countdown' : 'Rest Timer (Idle)'}
                  </span>
                  <span className={`font-metric text-[22px] font-bold leading-tight ${isTimerRunning ? 'text-[#4edea3]' : 'text-[#dfe2ef]'}`}>
                    {formatTimer(restSeconds)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTimerRunning((prev) => !prev)}
                  className={`h-9 px-3 rounded-lg font-metric text-xs font-bold transition-all active:scale-95 ${
                    isTimerRunning
                      ? 'bg-[#ffb95f]/20 text-[#ffb95f] border border-[#ffb95f]/30'
                      : 'bg-[#4edea3] text-[#003824] shadow-sm'
                  }`}
                >
                  {isTimerRunning ? 'Pause' : 'Start Rest'}
                </button>
                <button
                  type="button"
                  onClick={() => setRestSeconds((prev) => prev + 30)}
                  className="h-9 px-2.5 rounded-lg bg-[#353943] text-[#dfe2ef] font-metric text-xs font-semibold active:scale-95 transition-all hover:bg-[#31353f]"
                >
                  +30s
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRestSeconds(currentExercise.rest_seconds || 120);
                    setIsTimerRunning(false);
                  }}
                  aria-label="Reset timer"
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#353943] text-[#bbcabf] hover:text-[#dfe2ef] active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                </button>
              </div>
            </div>

            {/* Active Exercise Card */}
            <div className="flex flex-col bg-[#181b25] rounded-xl p-4 gap-4 border border-[#1F2937] shadow-md">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <h2 className="font-headline text-[19px] text-[#dfe2ef] font-semibold tracking-tight">
                    {String(currentExIndex + 1).padStart(2, '0')} · {currentExercise.name}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setSwapTargetIndex(currentExIndex);
                      setShowSwapModal(true);
                    }}
                    aria-label="Exercise info and swap"
                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#262a34] text-[#bbcabf] hover:text-[#dfe2ef]"
                  >
                    <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-metric text-[10px] text-[#4edea3] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#4edea3]/10">
                    TARGET: {currentExercise.sets} sets × {currentExercise.target_reps} reps @ {currentExercise.target_weight_kg} kg
                  </span>
                  <span className="font-metric text-[10px] text-[#93c5fd] uppercase font-semibold px-2 py-0.5 rounded bg-[#93c5fd]/10">
                    {currentExercise.resistance_profile || 'lengthened'}
                  </span>
                </div>
              </div>

              {/* Form Cue Banner */}
              <div className="flex items-start gap-3 bg-[#262a34]/70 p-3 rounded-lg border border-[#ffb95f]/20">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#ffb95f]/15 text-[#ffb95f] shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">lightbulb</span>
                </div>
                <p className="font-body text-[13px] text-[#dfe2ef] leading-snug">
                  <span className="font-semibold text-[#ffb95f]">Form Cue:</span> {currentExercise.biomechanical_cue}
                </p>
              </div>

              {/* Set Log Matrix */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <span className="font-metric text-[10px] text-[#86948a] uppercase tracking-wider font-semibold">
                    Set Matrix
                  </span>
                  <span className="font-metric text-[10px] text-[#86948a] uppercase tracking-wider font-semibold">
                    Completed: {currentExerciseSets.length} of {currentExercise.sets}
                  </span>
                </div>

                {/* Previously Completed Sets */}
                {currentExerciseSets.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#10b981]/10 border border-[#10b981]/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#4edea3] text-[#003824] flex items-center justify-center font-metric text-xs font-bold">
                        {s.set_number}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-metric text-[14px] text-[#dfe2ef] font-semibold">
                          {s.weight_kg} kg × {s.reps} reps
                        </span>
                        <span className="font-body text-[11px] text-[#4edea3]">Locked • 0–2 RIR</span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[#4edea3] text-[20px]">check_circle</span>
                  </div>
                ))}

                {/* Active Set Box */}
                {currentSetNumber <= currentExercise.sets && (
                  <div className="flex flex-col gap-3 p-3.5 rounded-lg bg-[#262a34] border border-[#4edea3]/40 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse" />
                        <span className="font-metric text-xs font-bold text-[#4edea3] uppercase tracking-wider">
                          Current Set {currentSetNumber} of {currentExercise.sets}
                        </span>
                      </div>
                      <span className="font-metric text-[11px] text-[#86948a]">
                        Target: {currentExercise.target_reps} reps
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Weight Stepper */}
                      <div className="flex flex-col gap-1">
                        <span className="font-metric text-[10px] text-[#86948a] uppercase tracking-wider text-center">
                          Weight (kg)
                        </span>
                        <div className="flex items-center justify-between bg-[#181b25] rounded-lg p-1.5 border border-[#353943]">
                          <button
                            type="button"
                            onClick={() => setWeight((prev) => Math.max(0, Number((prev - 2.5).toFixed(1))))}
                            className="w-8 h-8 rounded bg-[#262a34] text-[#dfe2ef] font-bold text-lg flex items-center justify-center active:scale-90"
                          >
                            -
                          </button>
                          <span className="font-metric text-lg font-bold text-[#dfe2ef]">
                            {weight}
                          </span>
                          <button
                            type="button"
                            onClick={() => setWeight((prev) => Number((prev + 2.5).toFixed(1)))}
                            className="w-8 h-8 rounded bg-[#262a34] text-[#dfe2ef] font-bold text-lg flex items-center justify-center active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Reps Stepper */}
                      <div className="flex flex-col gap-1">
                        <span className="font-metric text-[10px] text-[#86948a] uppercase tracking-wider text-center">
                          Reps
                        </span>
                        <div className="flex items-center justify-between bg-[#181b25] rounded-lg p-1.5 border border-[#353943]">
                          <button
                            type="button"
                            onClick={() => setReps((prev) => Math.max(1, prev - 1))}
                            className="w-8 h-8 rounded bg-[#262a34] text-[#dfe2ef] font-bold text-lg flex items-center justify-center active:scale-90"
                          >
                            -
                          </button>
                          <span className="font-metric text-lg font-bold text-[#dfe2ef]">
                            {reps}
                          </span>
                          <button
                            type="button"
                            onClick={() => setReps((prev) => prev + 1)}
                            className="w-8 h-8 rounded bg-[#262a34] text-[#dfe2ef] font-bold text-lg flex items-center justify-center active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleLogSet}
                      className="w-full h-11 rounded-lg bg-[#4edea3] text-[#003824] font-headline text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow"
                    >
                      <span className="material-symbols-outlined text-[18px]">check</span>
                      <span>LOG SET {currentSetNumber}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions: Next / Finish */}
            <div className="flex gap-2">
              {currentExIndex < exercises.length - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const next = currentExIndex + 1;
                    setCurrentExIndex(next);
                    setCurrentSetNumber(1);
                    setWeight(exercises[next]?.target_weight_kg || 35.0);
                    setRestSeconds(exercises[next]?.rest_seconds || 120);
                    setIsTimerRunning(false);
                  }}
                  className="flex-1 h-12 rounded-xl bg-[#262a34] text-[#dfe2ef] font-headline text-sm font-semibold flex items-center justify-center gap-2 border border-[#353943] active:scale-95"
                >
                  <span>Skip to Next Movement</span>
                  <span className="material-symbols-outlined text-[18px]">skip_next</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleFinishSession}
                className="flex-1 h-12 rounded-xl bg-[#4edea3] text-[#003824] font-headline text-sm font-bold flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-[#4edea3]/20"
              >
                <span>Save &amp; Finish Workout</span>
                <span className="material-symbols-outlined text-[18px]">done_all</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Gemini Movement Substitution Modal */}
      {showSwapModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1f29] rounded-2xl border border-[#353943] p-5 w-full max-w-md flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4edea3]">swap_horiz</span>
                <h3 className="font-headline text-[18px] text-[#dfe2ef] font-semibold">
                  Swap Movement
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSwapModal(false);
                  setSwapQuery('');
                  setSwapMatchResult(null);
                }}
                className="w-8 h-8 flex items-center justify-center text-[#bbcabf] hover:text-[#dfe2ef]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="font-body text-[13px] text-[#86948a]">
              Type any gym slang or machine name. The Gemini mediator will resolve the biomechanically optimal canonical alternative.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. seated cable v-bar row, seal row..."
                value={swapQuery}
                onChange={(e) => setSwapQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSwap()}
                className="flex-1 h-11 bg-[#181b25] border border-[#353943] rounded-lg px-3 font-body text-sm text-[#dfe2ef] focus:outline-none focus:border-[#4edea3]"
              />
              <button
                type="button"
                onClick={handleSearchSwap}
                disabled={isMatching || !swapQuery.trim()}
                className="h-11 px-4 rounded-lg bg-[#4edea3] text-[#003824] font-headline text-xs font-bold disabled:opacity-50"
              >
                {isMatching ? 'Resolving...' : 'Match'}
              </button>
            </div>

            {swapMatchResult && (
              <div className="flex flex-col gap-2 p-3 bg-[#181b25] rounded-xl border border-[#4edea3]/30">
                <div className="flex items-center justify-between">
                  <span className="font-headline text-[15px] font-bold text-[#4edea3]">
                    {swapMatchResult.canonical_name}
                  </span>
                  <span className="font-metric text-[10px] text-[#bbcabf] bg-[#262a34] px-2 py-0.5 rounded">
                    {swapMatchResult.source} ({swapMatchResult.latency_ms}ms)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleApplySwap}
                  className="w-full h-10 mt-1 rounded-lg bg-[#4edea3] text-[#003824] font-headline text-xs font-bold"
                >
                  Apply Movement Swap
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function WorkoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0f131c] flex items-center justify-center text-white">
          <div className="w-8 h-8 border-2 border-[#4edea3] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <WorkoutContent />
    </Suspense>
  );
}
