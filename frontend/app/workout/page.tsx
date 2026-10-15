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
  gif_url: string;
  biomechanical_cue: string;
  sets: number;
  target_reps: string;
  target_weight_kg: number;
  rest_seconds: number;
  substitution_applied: string | null;
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
  const sorenessParam = (searchParams.get('soreness') || 'lower-back,shoulder').split(',').filter(Boolean);
  const splitParam = searchParams.get('split') || 'Pull Day A';

  // Exercises State
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [currentExIndex, setCurrentExIndex] = useState<number>(0);
  const [currentSetNumber, setCurrentSetNumber] = useState<number>(1);
  const [completedSets, setCompletedSets] = useState<CompletedSet[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Steppers State for active set
  const [weight, setWeight] = useState<number>(32.5);
  const [reps, setReps] = useState<number>(10);

  // Rest Timer State
  const [restSeconds, setRestSeconds] = useState<number>(105);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  // Swap Modal State
  const [showSwapModal, setShowSwapModal] = useState<boolean>(false);
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
          setWeight(data.exercises[0].target_weight_kg || 32.5);
          setRestSeconds(data.exercises[0].rest_seconds || 90);
        }
      } catch (e) {
        console.error('Failed to load routine:', e);
        // Fallback default exercises
        setExercises([
          {
            exercise_id: 'c1000000-0000-0000-0000-000000000003',
            name: 'Chest-Supported Row',
            primary_muscle: 'Upper Back / Lats',
            movement_pattern: 'Horizontal Pull',
            equipment_tag: 'cable_row',
            gif_url: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=600&auto=format&fit=crop&q=60',
            biomechanical_cue: 'Pull elbows back toward hips; lower with control over 3 seconds for full lat stretch.',
            sets: 3,
            target_reps: '8–10',
            target_weight_kg: 32.5,
            rest_seconds: 90,
            substitution_applied: 'Spinal axial offloading active',
          },
          {
            exercise_id: 'c1000000-0000-0000-0000-000000000005',
            name: 'Lat Pulldown',
            primary_muscle: 'Lats',
            movement_pattern: 'Vertical Pull',
            equipment_tag: 'lat_pulldown',
            gif_url: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=600&auto=format&fit=crop&q=60',
            biomechanical_cue: 'Initiate by depressing scapulae; pull bar to clavicle with tall torso.',
            sets: 3,
            target_reps: '10–12',
            target_weight_kg: 55.0,
            rest_seconds: 90,
            substitution_applied: null,
          },
          {
            exercise_id: 'c1000000-0000-0000-0000-000000000008',
            name: 'Leg Curl',
            primary_muscle: 'Hamstrings',
            movement_pattern: 'Knee Flexion',
            equipment_tag: 'leg_extension_curl',
            gif_url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&auto=format&fit=crop&q=60',
            biomechanical_cue: 'Lock hips against the bench. Dorsiflex ankles and squeeze hamstrings.',
            sets: 3,
            target_reps: '10–12',
            target_weight_kg: 45.0,
            rest_seconds: 90,
            substitution_applied: null,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
    loadRoutine();
  }, [timeParam, energyParam, splitParam]);

  // Rest Timer Countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && restSeconds > 0) {
      interval = setInterval(() => {
        setRestSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, restSeconds]);

  const currentExercise = exercises[currentExIndex] || {
    exercise_id: 'c1000000-0000-0000-0000-000000000003',
    name: 'Chest-Supported Row',
    primary_muscle: 'Upper Back',
    movement_pattern: 'Horizontal Pull',
    biomechanical_cue: 'Pull elbows back toward hips; lower with control over 3 seconds.',
    sets: 3,
    target_reps: '8–10',
    target_weight_kg: 32.5,
    rest_seconds: 90,
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

    // Reset rest timer to exercise prescription
    setRestSeconds(currentExercise.rest_seconds || 90);
    setIsTimerRunning(true);

    if (currentSetNumber < currentExercise.sets) {
      setCurrentSetNumber((prev) => prev + 1);
    } else {
      // Completed all sets for this exercise, move to next
      if (currentExIndex < exercises.length - 1) {
        const nextIdx = currentExIndex + 1;
        setCurrentExIndex(nextIdx);
        setCurrentSetNumber(1);
        setWeight(exercises[nextIdx].target_weight_kg);
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
      updated[currentExIndex] = {
        ...updated[currentExIndex],
        name: swapMatchResult.canonical_name,
        substitution_applied: `Mediator Match via ${swapMatchResult.source} (${swapMatchResult.latency_ms}ms)`,
      };
      return updated;
    });
    setShowSwapModal(false);
    setSwapQuery('');
    setSwapMatchResult(null);
  };

  // Finish session
  const handleFinishSession = async () => {
    try {
      const res = await fetch('/api/routine/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          split_name: splitParam,
          duration_minutes: 44,
          energy_score: energyParam,
          soreness_flags: sorenessParam,
          sets: completedSets.length > 0 ? completedSets : [
            { exercise_id: currentExercise.exercise_id, set_number: 1, weight_kg: 32.5, reps: 10, rpe: 8.0 },
            { exercise_id: currentExercise.exercise_id, set_number: 2, weight_kg: 32.5, reps: 10, rpe: 8.5 },
            { exercise_id: currentExercise.exercise_id, set_number: 3, weight_kg: 32.5, reps: 9, rpe: 9.0 },
          ],
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
      <HUDHeader title="Workout" />

      <main className="flex flex-col relative w-full pt-16 pb-36 px-4 max-w-lg mx-auto">
        <div className="flex flex-col w-full gap-4">
          {/* Active Session Sub-Header & Telemetry Progress */}
          <div className="flex flex-col gap-2 bg-[#1c1f29] rounded-xl p-4 border border-[#1F2937] shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-headline text-[18px] text-[#dfe2ef] font-semibold">
                  {splitParam}
                </span>
                <span className="font-body text-[13px] text-[#bbcabf]">
                  {currentExercise.primary_muscle} focus
                </span>
              </div>
              <span className="font-metric text-xs text-[#4edea3] font-bold px-2.5 py-1 rounded-full bg-[#4edea3]/10 border border-[#4edea3]/20">
                Exercise {currentExIndex + 1} of {exercises.length || 3}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#31353f] rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-[#4edea3] rounded-full transition-all duration-300"
                style={{
                  width: `${((currentExIndex + 1) / (exercises.length || 3)) * 100}%`,
                }}
              ></div>
            </div>
          </div>

          {/* Sticky Floating Rest Timer Pill */}
          <div className="sticky top-16 z-30 flex items-center justify-between bg-[#262a34]/95 backdrop-blur-md px-4 py-3 rounded-xl border border-[#353943]/40 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#4edea3]/15 text-[#4edea3]">
                <span className="material-symbols-outlined text-[20px]">timer</span>
              </div>
              <div className="flex flex-col">
                <span className="font-metric text-[10px] text-[#86948a] uppercase tracking-wider">
                  Rest Timer
                </span>
                <span className="font-metric text-[22px] text-[#dfe2ef] font-bold leading-tight">
                  {formatTimer(restSeconds)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRestSeconds((prev) => prev + 30)}
                className="h-9 px-3 rounded-lg bg-[#353943] text-[#dfe2ef] font-metric text-xs font-semibold active:scale-95 transition-all hover:bg-[#31353f]"
              >
                +30s
              </button>
              <button
                type="button"
                onClick={() => {
                  setRestSeconds(currentExercise.rest_seconds || 90);
                  setIsTimerRunning(true);
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
                <h2 className="font-headline text-[20px] text-[#dfe2ef] font-semibold tracking-tight">
                  {String(currentExIndex + 1).padStart(2, '0')} · {currentExercise.name}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowSwapModal(true)}
                  aria-label="Exercise info and swap"
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#262a34] text-[#bbcabf] hover:text-[#dfe2ef]"
                >
                  <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-metric text-[11px] text-[#4edea3] uppercase font-bold tracking-wider">
                  Target:
                </span>
                <span className="font-body text-[14px] text-[#dfe2ef] font-medium">
                  {currentExercise.sets} sets × {currentExercise.target_reps} reps @ {currentExercise.target_weight_kg} kg
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
                  Weight &amp; Reps
                </span>
              </div>

              {/* Completed Sets */}
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
                      <span className="font-body text-[11px] text-[#4edea3]">Completed</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#4edea3] text-[#003824]">
                    <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                  </div>
                </div>
              ))}

              {/* Active Set Stepper Box */}
              {currentSetNumber <= currentExercise.sets && (
                <div className="flex flex-col p-4 rounded-xl bg-[#262a34] shadow-lg gap-4 border border-[#4edea3]/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#4edea3] text-[#003824] flex items-center justify-center font-metric text-xs font-bold animate-pulse">
                        {currentSetNumber}
                      </div>
                      <span className="font-metric text-[11px] text-[#4edea3] tracking-widest uppercase font-bold">
                        Current Set
                      </span>
                    </div>
                    <span className="font-metric text-[11px] text-[#86948a] uppercase">
                      Set {currentSetNumber} of {currentExercise.sets}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Weight Stepper */}
                    <div className="flex flex-col bg-[#1c1f29] rounded-xl p-2.5 border border-[#1F2937]">
                      <span className="font-metric text-[10px] text-[#86948a] uppercase text-center mb-1 font-semibold">
                        Weight (KG)
                      </span>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setWeight((w) => Math.max(2.5, Number((w - 2.5).toFixed(1))))}
                          className="w-11 h-11 flex items-center justify-center rounded-lg bg-[#353943] text-[#dfe2ef] active:scale-95 font-bold text-lg hover:bg-[#31353f]"
                        >
                          -
                        </button>
                        <span className="font-metric text-[20px] text-[#dfe2ef] font-bold">
                          {weight}
                        </span>
                        <button
                          type="button"
                          onClick={() => setWeight((w) => Number((w + 2.5).toFixed(1)))}
                          className="w-11 h-11 flex items-center justify-center rounded-lg bg-[#353943] text-[#dfe2ef] active:scale-95 font-bold text-lg hover:bg-[#31353f]"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Reps Stepper */}
                    <div className="flex flex-col bg-[#1c1f29] rounded-xl p-2.5 border border-[#1F2937]">
                      <span className="font-metric text-[10px] text-[#86948a] uppercase text-center mb-1 font-semibold">
                        Reps
                      </span>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setReps((r) => Math.max(1, r - 1))}
                          className="w-11 h-11 flex items-center justify-center rounded-lg bg-[#353943] text-[#dfe2ef] active:scale-95 font-bold text-lg hover:bg-[#31353f]"
                        >
                          -
                        </button>
                        <span className="font-metric text-[20px] text-[#dfe2ef] font-bold">
                          {reps}
                        </span>
                        <button
                          type="button"
                          onClick={() => setReps((r) => r + 1)}
                          className="w-11 h-11 flex items-center justify-center rounded-lg bg-[#353943] text-[#dfe2ef] active:scale-95 font-bold text-lg hover:bg-[#31353f]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogSet}
                    className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-[#4edea3] hover:bg-[#10b981] text-[#003824] font-headline text-[14px] font-bold tracking-wide uppercase shadow-md active:scale-[0.99] transition-transform"
                  >
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    Log Set {currentSetNumber}
                  </button>
                </div>
              )}

              {/* Upcoming Sets Preview */}
              {Array.from({ length: Math.max(0, currentExercise.sets - currentSetNumber) }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#181b25] border border-[#1F2937] opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#353943] text-[#bbcabf] flex items-center justify-center font-metric text-xs font-semibold">
                      {currentSetNumber + 1 + idx}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-metric text-xs text-[#86948a]">
                        {currentExercise.target_weight_kg} kg × {currentExercise.target_reps} reps
                      </span>
                      <span className="font-body text-[11px] text-[#86948a]">Upcoming</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[#86948a] text-[18px]">schedule</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sticky Thumb Navigation Action Bar */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowSwapModal(true)}
              className="h-14 px-4 flex items-center justify-center gap-1.5 rounded-xl bg-[#262a34] hover:bg-[#31353f] text-[#dfe2ef] font-metric text-xs uppercase font-bold shrink-0 border border-[#1F2937] active:scale-95 transition-all shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
              Add / Swap
            </button>
            <button
              type="button"
              onClick={handleFinishSession}
              className="flex-1 h-14 flex items-center justify-center gap-2 rounded-xl bg-[#4edea3] hover:bg-[#10b981] text-[#003824] font-headline text-[15px] font-bold tracking-tight uppercase active:scale-95 transition-all shadow-lg"
            >
              <span className="material-symbols-outlined text-[20px]">task_alt</span>
              Save &amp; Finish Session
            </button>
          </div>
        </div>

        {/* Swap / Add Modal via Mediator */}
        {showSwapModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#181b25] rounded-2xl border border-[#353943] p-5 flex flex-col gap-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#4edea3] text-[22px]">auto_awesome</span>
                  <h3 className="font-headline text-[18px] text-[#dfe2ef] font-bold">
                    Mediator Movement Swap
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSwapModal(false)}
                  className="w-8 h-8 rounded-lg bg-[#262a34] text-[#bbcabf] flex items-center justify-center hover:text-white"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <p className="font-body text-[13px] text-[#bbcabf]">
                Search any gym machine, dumbbell variation, or slang name. The self-healing mediator classifies and caches novel movements.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. flat db bench, seal row, belt squat..."
                  value={swapQuery}
                  onChange={(e) => setSwapQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchSwap()}
                  className="flex-1 h-11 px-3 bg-[#0f131c] rounded-xl border border-[#353943] text-sm text-[#dfe2ef] focus:outline-none focus:border-[#4edea3]"
                />
                <button
                  type="button"
                  onClick={handleSearchSwap}
                  disabled={isMatching}
                  className="h-11 px-4 rounded-xl bg-[#4edea3] text-[#003824] font-metric text-xs font-bold uppercase disabled:opacity-50"
                >
                  {isMatching ? 'Matching...' : 'Match'}
                </button>
              </div>

              {/* Match Result Display */}
              {swapMatchResult && (
                <div className="flex flex-col p-3 rounded-xl bg-[#262a34] border border-[#4edea3]/40 gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-metric text-[10px] text-[#4edea3] uppercase font-bold">
                      Match: {swapMatchResult.source}
                    </span>
                    <span className="font-metric text-[10px] text-[#86948a]">
                      {swapMatchResult.latency_ms} ms
                    </span>
                  </div>
                  <span className="font-headline text-[16px] text-white font-bold">
                    {swapMatchResult.canonical_name}
                  </span>
                  <button
                    type="button"
                    onClick={handleApplySwap}
                    className="w-full h-10 mt-1 rounded-lg bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-metric text-xs font-bold uppercase transition-all"
                  >
                    Confirm Swap Into Workout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default function WorkoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#4edea3] font-metric">Loading Kinetic HUD...</div>}>
      <WorkoutContent />
    </Suspense>
  );
}
