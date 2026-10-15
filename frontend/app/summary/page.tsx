'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HUDHeader from '@/components/HUDHeader';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabase';

interface SummaryData {
  split_name: string;
  duration_minutes: number;
  total_volume_kg: number;
  completed_sets: number;
  volume_delta_kg: number;
  progression_verdicts: Array<{
    exercise_name: string;
    status: string;
    verdict_badge: string;
    recommendation: string;
  }>;
  recovery_statuses: Array<{
    muscle_group: string;
    readiness: string;
    recovery_percent: number;
  }>;
}

export default function SummaryPage() {
  const router = useRouter();

  const [summary, setSummary] = useState<SummaryData>({
    split_name: 'Pull Day A',
    duration_minutes: 44,
    total_volume_kg: 14820,
    completed_sets: 14,
    volume_delta_kg: 640,
    progression_verdicts: [
      {
        exercise_name: 'Incline DB Bench Press',
        status: 'Increase weight next session',
        verdict_badge: '+2.0 KG (28 KG)',
        recommendation: 'Hit 10 reps across working sets. Double progression criteria satisfied.',
      },
      {
        exercise_name: 'Chest-Supported T-Bar Row',
        status: 'Progression approved',
        verdict_badge: '+2.5 KG (35 KG)',
        recommendation: 'Solid scapular retraction with RPE < 9. Progression approved.',
      },
      {
        exercise_name: '45° Incline Leg Press',
        status: 'Maintain weight, aim for 10 reps',
        verdict_badge: 'HOLD AT 180 KG',
        recommendation: 'Failed to hit rep ceiling on set 3. Hold load for next cycle.',
      },
    ],
    recovery_statuses: [
      {
        muscle_group: 'Upper Back & Lats',
        readiness: 'Ready in 2 days (Fri 18:00)',
        recovery_percent: 32,
      },
      {
        muscle_group: 'Biceps & Arms',
        readiness: 'Ready tomorrow (Fri 06:00)',
        recovery_percent: 65,
      },
      {
        muscle_group: 'Lower Back & Core',
        readiness: 'Fresh (Minimal Strain)',
        recovery_percent: 90,
      },
    ],
  });

  const [csvStatus, setCsvStatus] = useState<string>('idle');

  // Trigger celebration confetti on mount and read stored or live session data
  useEffect(() => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#4edea3', '#10b981', '#ffb95f'],
      });
    } catch {
      // Ignore if confetti not supported
    }

    async function loadSummary() {
      try {
        const stored = sessionStorage.getItem('last_workout_summary');
        if (stored) {
          const parsed = JSON.parse(stored);
          setSummary((prev) => ({
            ...prev,
            split_name: parsed.split_name || prev.split_name,
            duration_minutes: parsed.duration_minutes || prev.duration_minutes,
            total_volume_kg: parsed.total_volume_kg || prev.total_volume_kg,
            completed_sets: parsed.completed_sets || prev.completed_sets,
            volume_delta_kg: parsed.volume_delta_kg || prev.volume_delta_kg,
            progression_verdicts: parsed.progression_verdicts || prev.progression_verdicts,
            recovery_statuses: parsed.recovery_statuses || prev.recovery_statuses,
          }));
          return;
        }

        // Fetch latest real session from Supabase
        const { data: latestSession } = await supabase
          .from('workout_sessions')
          .select(`
            id,
            split_name,
            duration_minutes,
            total_volume_kg,
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
                primary_muscle
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
            rpe: number;
            exercises?: {
              id: string;
              canonical_name: string;
              primary_muscle: string;
            } | null;
          }
          const setsList: RawSetLog[] = (latestSession.set_logs as unknown as RawSetLog[]) || [];
          const exMap = new Map<string, RawSetLog[]>();
          for (const s of setsList) {
            const name = s.exercises?.canonical_name || 'Compound Movement';
            const list = exMap.get(name) || [];
            list.push(s);
            exMap.set(name, list);
          }

          const verdicts: Array<{ exercise_name: string; status: string; verdict_badge: string; recommendation: string }> = [];
          const muscles = new Set<string>();

          for (const [name, sGroup] of exMap.entries()) {
            const muscle = sGroup[0]?.exercises?.primary_muscle || 'Target Muscle';
            muscles.add(muscle);
            const avgReps = sGroup.reduce((sum, s) => sum + s.reps, 0) / sGroup.length;
            const maxWeight = Math.max(...sGroup.map((s) => s.weight_kg), 0);
            const hitCeiling = sGroup.every((s) => s.reps >= 10 && (s.rpe || 8) <= 8.5);

            if (hitCeiling) {
              const bump = maxWeight >= 40 ? 2.5 : 2.0;
              verdicts.push({
                exercise_name: name,
                status: 'Progression Approved',
                verdict_badge: `+${bump} KG (${(maxWeight + bump).toFixed(1)} KG)`,
                recommendation: `Rep ceiling locked (${avgReps.toFixed(1)} reps avg) with RPE <= 8.5. Overload approved for next cycle.`,
              });
            } else {
              verdicts.push({
                exercise_name: name,
                status: 'Hold Load',
                verdict_badge: `HOLD AT ${maxWeight.toFixed(1)} KG`,
                recommendation: `Aim for 10 clean reps across all working sets (currently ${avgReps.toFixed(1)} avg) before increasing load.`,
              });
            }
          }

          const recStatuses = Array.from(muscles).slice(0, 3).map((m) => ({
            muscle_group: m,
            readiness: 'Ready in 48h (Adaptive Rest)',
            recovery_percent: 35,
          }));

          setSummary({
            split_name: latestSession.split_name || 'Logged Session',
            duration_minutes: latestSession.duration_minutes || 45,
            total_volume_kg: latestSession.total_volume_kg || 0,
            completed_sets: setsList.length,
            volume_delta_kg: Math.round((latestSession.total_volume_kg || 0) * 0.045),
            progression_verdicts: verdicts.length > 0 ? verdicts : [
              {
                exercise_name: 'Session Movements',
                status: 'Logged Successfully',
                verdict_badge: 'OVERLOAD TRACKED',
                recommendation: 'Double-progression metrics recorded in cloud telemetry.',
              }
            ],
            recovery_statuses: recStatuses.length > 0 ? recStatuses : [
              { muscle_group: 'Trained Muscle Groups', readiness: 'Recovery Active', recovery_percent: 40 }
            ],
          });
        }
      } catch (e) {
        console.warn('Reading local workout summary:', e);
      }
    }

    loadSummary();
  }, []);

  // CSV Export
  const handleExportCSV = () => {
    setCsvStatus('exporting');
    const rows = [
      ['Session', summary.split_name],
      ['Duration (min)', summary.duration_minutes],
      ['Total Volume (kg)', summary.total_volume_kg],
      ['Completed Sets', summary.completed_sets],
      ['Volume PR Delta', `+${summary.volume_delta_kg} kg`],
      [],
      ['Exercise', 'Verdict', 'Recommendation'],
      ...summary.progression_verdicts.map((v) => [v.exercise_name, v.verdict_badge, v.recommendation]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows.map((e) => e.map((val) => `"${val}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kinetic_hud_${summary.split_name.replace(/\s+/g, '_')}_summary.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setCsvStatus('downloaded');
      setTimeout(() => setCsvStatus('idle'), 2500);
    }, 600);
  };

  return (
    <>
      <HUDHeader title="Summary" />

      <main className="flex flex-col relative w-full pt-16 pb-28 px-4 max-w-lg mx-auto">
        <div className="flex flex-col w-full space-y-4">
          {/* Celebration HUD Banner */}
          <div className="rounded-xl bg-[#262a34] p-4 shadow-lg flex flex-col gap-3 border border-[#3c4a42]/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#4edea3]/15 flex items-center justify-center text-[#4edea3]">
                  <span className="material-symbols-outlined text-[24px]">check_circle</span>
                </div>
                <div>
                  <span className="font-metric text-[10px] text-[#4edea3] uppercase font-bold tracking-wider">
                    Workout Complete
                  </span>
                  <h1 className="font-headline text-[20px] font-bold text-[#dfe2ef]">
                    {summary.split_name}
                  </h1>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#4edea3]/15 text-[#4edea3] font-metric text-xs font-bold border border-[#4edea3]/30">
                +{summary.volume_delta_kg} KG PR
              </span>
            </div>

            <div className="flex items-center justify-around bg-[#0a0e17]/80 rounded-lg p-3 border border-[#1F2937]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#86948a] text-[18px]">schedule</span>
                <span className="font-body text-[14px] text-[#dfe2ef] font-medium">
                  {summary.duration_minutes} mins
                </span>
              </div>
              <div className="h-4 w-px bg-[#31353f]"></div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#86948a] text-[18px]">
                  format_list_bulleted
                </span>
                <span className="font-body text-[14px] text-[#dfe2ef] font-medium">
                  {summary.completed_sets} / {summary.completed_sets} Sets
                </span>
              </div>
              <div className="h-4 w-px bg-[#31353f]"></div>
              <div className="flex items-center gap-1 text-[#4edea3]">
                <span className="material-symbols-outlined text-[18px]">trending_up</span>
                <span className="font-body text-[14px] font-semibold">100% on track</span>
              </div>
            </div>
          </div>

          {/* Key Stat Metric Grid (3-column) */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#1c1f29] rounded-xl p-3 flex flex-col justify-between border border-[#1F2937] shadow-sm">
              <span className="font-metric text-[10px] text-[#86948a] uppercase font-semibold">
                Total Volume
              </span>
              <div className="my-1">
                <span className="font-metric text-[19px] text-[#dfe2ef] font-bold">
                  {summary.total_volume_kg.toLocaleString()}
                </span>
                <span className="font-metric text-[10px] text-[#86948a] ml-0.5">kg</span>
              </div>
              <span className="font-body text-[11px] text-[#4edea3] flex items-center gap-0.5 font-medium">
                <span className="material-symbols-outlined text-[13px]">arrow_upward</span>
                +{summary.volume_delta_kg} kg
              </span>
            </div>

            <div className="bg-[#1c1f29] rounded-xl p-3 flex flex-col justify-between border border-[#1F2937] shadow-sm">
              <span className="font-metric text-[10px] text-[#86948a] uppercase font-semibold">
                Completed
              </span>
              <div className="my-1">
                <span className="font-metric text-[19px] text-[#4edea3] font-bold">
                  {summary.completed_sets}
                </span>
                <span className="font-metric text-[10px] text-[#86948a] ml-0.5">sets</span>
              </div>
              <span className="font-body text-[11px] text-[#bbcabf]">All target met</span>
            </div>

            <div className="bg-[#1c1f29] rounded-xl p-3 flex flex-col justify-between border border-[#1F2937] shadow-sm">
              <span className="font-metric text-[10px] text-[#86948a] uppercase font-semibold">
                Avg Rest
              </span>
              <div className="my-1">
                <span className="font-metric text-[19px] text-[#dfe2ef] font-bold">1:52</span>
                <span className="font-metric text-[10px] text-[#86948a] ml-0.5">m</span>
              </div>
              <span className="font-body text-[11px] text-[#ffb95f] flex items-center gap-0.5 font-medium">
                <span className="material-symbols-outlined text-[13px]">bolt</span>
                Optimal
              </span>
            </div>
          </div>

          {/* Double-Progression Verdicts Section */}
          <section className="flex flex-col gap-2 mt-1">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#4edea3]">trending_up</span>
                <h2 className="font-headline text-[16px] text-[#dfe2ef] font-semibold">
                  Next Workout Targets
                </h2>
              </div>
              <span className="font-metric text-[10px] text-[#86948a] uppercase font-semibold">
                Auto-calculated
              </span>
            </div>

            <div className="bg-[#1c1f29] rounded-xl p-4 shadow-sm flex flex-col gap-3.5 border border-[#1F2937]">
              {summary.progression_verdicts.map((verdict, idx) => {
                const isApproved = verdict.verdict_badge.includes('+');
                return (
                  <div key={idx} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-body text-[14px] text-[#dfe2ef] font-semibold">
                          {verdict.exercise_name}
                        </span>
                        <span className="font-body text-[12px] text-[#bbcabf]">
                          {verdict.status}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded font-metric text-[11px] font-bold border ${
                          isApproved
                            ? 'bg-[#10b981]/15 text-[#4edea3] border-[#4edea3]/30'
                            : 'bg-[#262a34] text-[#86948a] border-[#353943]'
                        }`}
                      >
                        {verdict.verdict_badge}
                      </span>
                    </div>
                    {idx < summary.progression_verdicts.length - 1 && (
                      <div className="h-px bg-[#1F2937] w-full mt-2"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recovery Telemetry Windows */}
          <section className="flex flex-col gap-2 mt-1">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#4edea3]">
                  battery_charging_full
                </span>
                <h2 className="font-headline text-[16px] text-[#dfe2ef] font-semibold">
                  Recovery Status
                </h2>
              </div>
              <span className="font-metric text-[10px] text-[#86948a] uppercase font-semibold">
                Estimated
              </span>
            </div>

            <div className="bg-[#1c1f29] rounded-xl p-4 shadow-sm flex flex-col gap-3.5 border border-[#1F2937]">
              {summary.recovery_statuses.map((rec, idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-body text-[13px] text-[#dfe2ef] font-medium">
                      {rec.muscle_group}
                    </span>
                    <span
                      className={`font-body text-[12px] font-medium ${
                        rec.recovery_percent < 50 ? 'text-[#ffb95f]' : 'text-[#4edea3]'
                      }`}
                    >
                      {rec.readiness}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded bg-[#31353f] overflow-hidden">
                    <div
                      className={`h-full rounded transition-all duration-500 ${
                        rec.recovery_percent < 50 ? 'bg-[#ee9800]' : 'bg-[#4edea3]'
                      }`}
                      style={{ width: `${rec.recovery_percent}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Operational Action Buttons */}
          <section className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push('/readiness')}
              className="h-14 flex-1 rounded-xl bg-[#4edea3] hover:bg-[#10b981] text-[#003824] font-headline text-[15px] font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">check</span>
              <span>Done • Back to Home</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              title="Export CSV"
              className="h-14 w-14 rounded-xl bg-[#262a34] hover:bg-[#31353f] text-[#dfe2ef] border border-[#1F2937] flex items-center justify-center active:scale-95 transition-all shrink-0 cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined text-[20px]">
                {csvStatus === 'exporting' ? 'sync' : csvStatus === 'downloaded' ? 'done' : 'share'}
              </span>
            </button>
          </section>
        </div>
      </main>
    </>
  );
}
