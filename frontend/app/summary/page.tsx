'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HUDHeader from '@/components/HUDHeader';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabase';

interface ProgressionVerdict {
  exercise_name: string;
  status: string;
  verdict_badge: string;
  recommendation: string;
}

interface RecoveryStatus {
  muscle_group: string;
  readiness: string;
  recovery_percent: number;
}

interface SummaryData {
  split_name: string;
  split_type?: string;
  duration_minutes: number;
  completed_sets: number;
  progression_verdicts: ProgressionVerdict[];
  recovery_statuses: RecoveryStatus[];
}

export default function SummaryPage() {
  const router = useRouter();

  const [summary, setSummary] = useState<SummaryData>({
    split_name: 'Pull Day A (Lats & Deep Stretch)',
    split_type: 'PULL_A',
    duration_minutes: 42,
    completed_sets: 12,
    progression_verdicts: [
      {
        exercise_name: 'Chest-Supported Neutral Cable Pulldown',
        status: 'Progression Approved',
        verdict_badge: '+2.5 KG (42.5 KG)',
        recommendation: 'All 3 working sets hit ceiling (10, 10, 10 @ RPE <= 8.5). Overload approved for next cycle.',
      },
      {
        exercise_name: 'Chest-Supported Dumbbell Row',
        status: 'Hold Load',
        verdict_badge: 'HOLD AT 35.0 KG',
        recommendation: 'Target 10 clean reps across all 3 sets (completed 10, 9, 8) before increasing load.',
      },
      {
        exercise_name: 'Incline Dumbbell Curl',
        status: 'Progression Approved',
        verdict_badge: '+1.25 KG (16.25 KG)',
        recommendation: 'Hit rep ceiling across all sets in lengthened stretch. Increase load next rotation.',
      },
      {
        exercise_name: 'Standing Cable Pullover',
        status: 'Hold Load',
        verdict_badge: 'HOLD AT 25.0 KG',
        recommendation: 'Maintain load. Prioritize deep overhead stretch at 0–1 RIR.',
      },
    ],
    recovery_statuses: [
      {
        muscle_group: 'Iliac Lats',
        readiness: 'Ready in 48h (Supercompensation Window)',
        recovery_percent: 35,
      },
      {
        muscle_group: 'Biceps Long Head',
        readiness: 'Ready in 36h (Adaptive Rest)',
        recovery_percent: 55,
      },
      {
        muscle_group: 'Central Nervous System',
        readiness: 'Supercompensated in 24–36h',
        recovery_percent: 85,
      },
    ],
  });

  const [csvStatus, setCsvStatus] = useState<string>('idle');

  useEffect(() => {
    try {
      confetti({
        particleCount: 40,
        spread: 55,
        origin: { y: 0.6 },
        colors: ['#4edea3', '#10b981', '#93c5fd'],
      });
    } catch {
      // Ignore if confetti not supported
    }

    async function loadSummary() {
      try {
        const stored = sessionStorage.getItem('last_workout_summary');
        if (stored) {
          const parsed = JSON.parse(stored);
          setSummary({
            split_name: parsed.split_name || 'Maximum Hypertrophy Session',
            split_type: parsed.split_type || 'PULL_A',
            duration_minutes: parsed.duration_minutes || 42,
            completed_sets: parsed.completed_sets || 12,
            progression_verdicts: parsed.progression_verdicts && parsed.progression_verdicts.length > 0
              ? parsed.progression_verdicts
              : summary.progression_verdicts,
            recovery_statuses: parsed.recovery_statuses && parsed.recovery_statuses.length > 0
              ? parsed.recovery_statuses
              : summary.recovery_statuses,
          });
          return;
        }

        // Fetch latest session from Supabase if direct navigation
        const { data: latestSession } = await supabase
          .from('workout_sessions')
          .select(`
            id,
            split_name,
            split_type,
            duration_minutes,
            created_at,
            set_logs (
              id,
              set_number,
              weight_kg,
              reps,
              rpe,
              exercises (
                id,
                canonical_name,
                primary_muscle,
                stability_tier,
                resistance_profile
              )
            )
          `)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestSession) {
          interface RawSetLog {
            id: string;
            set_number: number;
            weight_kg: number;
            reps: number;
            rpe?: number;
            exercises: {
              id: string;
              canonical_name: string;
              primary_muscle: string;
              stability_tier?: string;
              resistance_profile?: string;
            } | null;
          }

          const rawSets = (latestSession.set_logs || []) as unknown as RawSetLog[];
          const hardSets = rawSets.filter((s) => s.reps > 0);

          const exerciseMap = new Map<string, { name: string; muscle: string; sets: RawSetLog[] }>();
          for (const s of hardSets) {
            const exName = s.exercises?.canonical_name || 'Movement';
            const muscle = s.exercises?.primary_muscle || 'Prime Mover';
            const entry = exerciseMap.get(exName) || { name: exName, muscle, sets: [] };
            entry.sets.push(s);
            exerciseMap.set(exName, entry);
          }

          const dynamicVerdicts: ProgressionVerdict[] = [];
          const trainedMuscles = new Set<string>();

          for (const [, { name, muscle, sets }] of exerciseMap.entries()) {
            trainedMuscles.add(muscle);
            const avgReps = sets.reduce((sum, s) => sum + s.reps, 0) / sets.length;
            const maxW = Math.max(...sets.map((s) => s.weight_kg), 0);
            const allCeiling = sets.every((s) => s.reps >= 10 && (s.rpe || 8.0) <= 8.5);

            const isCompound = ['press', 'squat', 'row', 'deadlift', 'rdl'].some((kw) => name.toLowerCase().includes(kw));
            const bump = isCompound ? 2.5 : 1.25;

            if (allCeiling) {
              const nextW = Number((maxW + bump).toFixed(2));
              dynamicVerdicts.push({
                exercise_name: name,
                status: 'Progression Approved',
                verdict_badge: `+${bump} KG (${nextW} KG)`,
                recommendation: `All sets completed at ceiling (${avgReps.toFixed(1)} reps avg @ RPE <= 8.5). Increase load to ${nextW} kg next session.`,
              });
            } else {
              dynamicVerdicts.push({
                exercise_name: name,
                status: 'Hold Load',
                verdict_badge: `HOLD AT ${maxW.toFixed(1)} KG`,
                recommendation: `Maintain ${maxW} kg. Target 10 clean reps across all working sets (currently ${avgReps.toFixed(1)} avg) before overloading.`,
              });
            }
          }

          const dynamicRecovery: RecoveryStatus[] = Array.from(trainedMuscles).map((m) => ({
            muscle_group: m,
            readiness: 'Ready in 48h (Supercompensation Window)',
            recovery_percent: 35,
          }));
          dynamicRecovery.push({
            muscle_group: 'Central Nervous System',
            readiness: 'Supercompensated in 24–36h',
            recovery_percent: 85,
          });

          setSummary({
            split_name: latestSession.split_name || 'Maximum Hypertrophy Session',
            split_type: latestSession.split_type || 'PULL_A',
            duration_minutes: latestSession.duration_minutes || 42,
            completed_sets: hardSets.length || 12,
            progression_verdicts: dynamicVerdicts.length > 0 ? dynamicVerdicts : summary.progression_verdicts,
            recovery_statuses: dynamicRecovery,
          });
        }
      } catch (e) {
        console.error('Failed to load session summary:', e);
      }
    }
    loadSummary();
  }, []);

  const handleExportCSV = () => {
    try {
      const headers = ['Exercise Name', 'Status', 'Next Cycle Verdict', 'Biomechanical Recommendation'];
      const rows = summary.progression_verdicts.map((v) => [
        `"${v.exercise_name}"`,
        `"${v.status}"`,
        `"${v.verdict_badge}"`,
        `"${v.recommendation.replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `kinetic_hud_${summary.split_type || 'workout'}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setCsvStatus('downloaded');
      setTimeout(() => setCsvStatus('idle'), 3000);
    } catch (err) {
      console.error('CSV export failed:', err);
    }
  };

  return (
    <>
      <HUDHeader title="Athletic Telemetry" />

      <main className="flex flex-col relative w-full pt-16 pb-36 px-4 max-w-lg mx-auto">
        <div className="flex flex-col w-full space-y-4">
          {/* Header Card: Pure Athletic Telemetry */}
          <div className="rounded-xl bg-[#1c1f29] p-4 shadow-lg flex flex-col gap-3 border border-[#1F2937]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#4edea3]/15 flex items-center justify-center text-[#4edea3]">
                  <span className="material-symbols-outlined text-[24px]">verified</span>
                </div>
                <div>
                  <span className="font-metric text-[10px] text-[#4edea3] uppercase font-bold tracking-widest">
                    SESSION LOGGED • HYPERTROPHY AUDIT
                  </span>
                  <h1 className="font-headline text-[19px] font-bold text-[#dfe2ef]">
                    {summary.split_name}
                  </h1>
                </div>
              </div>
            </div>

            {/* Core Actionable Metrics: Duration & Hard Working Sets */}
            <div className="grid grid-cols-2 gap-3 bg-[#0f131c] rounded-xl p-3 border border-[#262a34]">
              <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#181b25]/60">
                <span className="font-metric text-[11px] text-[#86948a] uppercase tracking-wider font-semibold">
                  Session Duration
                </span>
                <span className="font-metric text-2xl font-bold text-[#dfe2ef] mt-0.5">
                  {summary.duration_minutes} <span className="text-sm font-normal text-[#86948a]">MINS</span>
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#181b25]/60">
                <span className="font-metric text-[11px] text-[#86948a] uppercase tracking-wider font-semibold">
                  Hard Working Sets
                </span>
                <span className="font-metric text-2xl font-bold text-[#4edea3] mt-0.5">
                  {summary.completed_sets} <span className="text-sm font-normal text-[#86948a]">SETS</span>
                </span>
                <span className="font-metric text-[10px] text-[#86948a]">0–2 RIR Ceiling</span>
              </div>
            </div>
          </div>

          {/* Actionable Next-Session Targets Section */}
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#4edea3]">bolt</span>
                <h2 className="font-headline text-[16px] text-[#dfe2ef] font-semibold">
                  Actionable Next-Session Targets
                </h2>
              </div>
              <span className="font-metric text-[10px] text-[#86948a] uppercase tracking-wider">
                Double Progression
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {summary.progression_verdicts.map((verdict, idx) => {
                const isApproved = verdict.status.toLowerCase().includes('approved') || verdict.verdict_badge.includes('+');
                const isPlateau = verdict.status.toLowerCase().includes('plateau');

                return (
                  <div
                    key={idx}
                    className={`flex flex-col p-3.5 rounded-xl border transition-all ${
                      isPlateau
                        ? 'bg-[#ef4444]/10 border-[#ef4444]/30'
                        : isApproved
                        ? 'bg-[#181b25] border-[#4edea3]/30 shadow-sm'
                        : 'bg-[#181b25] border-[#353943]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="font-headline text-[15px] text-[#dfe2ef] font-semibold">
                          {verdict.exercise_name}
                        </span>
                        <span className={`font-metric text-[11px] font-bold mt-0.5 ${
                          isPlateau ? 'text-[#ef4444]' : isApproved ? 'text-[#4edea3]' : 'text-[#ffb95f]'
                        }`}>
                          {verdict.status.toUpperCase()}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded font-metric text-xs font-bold shrink-0 border ${
                          isPlateau
                            ? 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/40'
                            : isApproved
                            ? 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/30'
                            : 'bg-[#ffb95f]/15 text-[#ffb95f] border-[#ffb95f]/30'
                        }`}
                      >
                        {verdict.verdict_badge}
                      </span>
                    </div>

                    <p className="font-body text-[12px] text-[#bbcabf] mt-2 leading-relaxed">
                      {verdict.recommendation}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Muscle Recovery Decay Bars */}
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#ffb95f]">hourglass_top</span>
                <h2 className="font-headline text-[16px] text-[#dfe2ef] font-semibold">
                  Muscle Recovery Decay Windows
                </h2>
              </div>
              <span className="font-metric text-[10px] text-[#86948a] uppercase tracking-wider">
                Supercompensation
              </span>
            </div>

            <div className="bg-[#181b25] rounded-xl p-4 border border-[#1F2937] flex flex-col gap-3.5 shadow-sm">
              {summary.recovery_statuses.map((rec, idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-headline font-semibold text-[#dfe2ef]">
                      {rec.muscle_group}
                    </span>
                    <span className="font-metric text-[11px] text-[#bbcabf]">
                      {rec.readiness}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#262a34] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        rec.recovery_percent >= 80
                          ? 'bg-[#4edea3]'
                          : rec.recovery_percent >= 50
                          ? 'bg-[#93c5fd]'
                          : 'bg-[#ffb95f]'
                      }`}
                      style={{ width: `${rec.recovery_percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Clean Sticky Action Dock: Back to Home & Export CSV */}
        <div className="fixed bottom-0 left-0 right-0 p-4 max-w-lg mx-auto bg-gradient-to-t from-[#0f131c] via-[#0f131c]/95 to-transparent z-40">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex-1 h-12 rounded-xl bg-[#262a34] text-[#dfe2ef] font-headline text-xs font-bold flex items-center justify-center gap-2 border border-[#353943] active:scale-95 transition-all hover:bg-[#31353f]"
            >
              <span className="material-symbols-outlined text-[18px]">
                {csvStatus === 'downloaded' ? 'check' : 'file_download'}
              </span>
              <span>{csvStatus === 'downloaded' ? 'CSV EXPORTED' : 'EXPORT CSV'}</span>
            </button>

            <button
              type="button"
              onClick={() => router.push('/readiness')}
              className="flex-[1.5] h-12 rounded-xl bg-[#4edea3] text-[#003824] font-headline text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-[#4edea3]/20"
            >
              <span>DONE • BACK TO HOME</span>
              <span className="material-symbols-outlined text-[18px]">home</span>
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
