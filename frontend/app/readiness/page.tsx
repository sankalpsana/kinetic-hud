'use client';

import { useState, useEffect, useId } from 'react';
import { useRouter } from 'next/navigation';
import HUDHeader from '@/components/HUDHeader';
import { supabase } from '@/lib/supabase';

interface SoreSpot {
  id: string;
  label: string;
  protected: boolean;
}

export default function ReadinessPage() {
  const router = useRouter();
  const timeSliderId = useId();

  const [timeMinutes, setTimeMinutes] = useState<number>(45);
  const [energyScore, setEnergyScore] = useState<number>(4);
  const [sorenessText, setSorenessText] = useState<string>('');
  const [splitName, setSplitName] = useState<string>('Pull Day A');
  const [estimatedFinish, setEstimatedFinish] = useState<string>('--:--');
  const [lastSessionInfo, setLastSessionInfo] = useState<string | null>(null);

  // Dynamic exercise count description
  const getExerciseCountBadge = (mins: number) => {
    if (mins <= 35) return '3–4 exercises (Express)';
    if (mins <= 50) return mins <= 45 ? '4–5 exercises (Standard)' : '5 exercises';
    if (mins <= 70) return mins <= 60 ? '5–6 exercises (Complete)' : '6 exercises';
    return '6–7 exercises (Maximum Hypertrophy)';
  };

  const appendQuickTag = (tag: string) => {
    const cleanTag = tag.replace(/^\+\s*/, '');
    setSorenessText((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return cleanTag;
      if (trimmed.toLowerCase().includes(cleanTag.toLowerCase())) return prev;
      return `${trimmed}, ${cleanTag}`;
    });
  };

  // Fetch last completed session from Supabase to auto-suggest next split
  useEffect(() => {
    async function fetchLastSession() {
      try {
        const { data } = await supabase
          .from('workout_sessions')
          .select('split_type, split_name, created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const CYCLE = ['PULL_A', 'PUSH_A', 'LEGS_A', 'PULL_B', 'PUSH_B', 'LEGS_B'] as const;
        const SPLIT_LABEL_MAP: Record<string, string> = {
          PULL_A: 'Pull Day A',
          PUSH_A: 'Push Day A',
          LEGS_A: 'Legs Day A',
          PULL_B: 'Pull Day B',
          PUSH_B: 'Push Day B',
          LEGS_B: 'Legs Day B',
        };

        if (data?.split_type) {
          const lastType = data.split_type.toUpperCase();
          const idx = CYCLE.indexOf(lastType as typeof CYCLE[number]);
          const nextType = idx !== -1 ? CYCLE[(idx + 1) % CYCLE.length] : 'PULL_A';
          const nextLabel = SPLIT_LABEL_MAP[nextType] || 'Pull Day A';

          setSplitName(nextLabel);
          setLastSessionInfo(`Last logged: ${data.split_name || lastType} • Rotation suggests ${nextLabel}`);
        }
      } catch (e) {
        console.warn('Could not read last session from Supabase:', e);
      }
    }
    fetchLastSession();
  }, []);

  useEffect(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + timeMinutes);
    setEstimatedFinish(
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    );
  }, [timeMinutes]);

  // Energy feedback text
  const getEnergyFeedback = () => {
    switch (energyScore) {
      case 1:
        return 'Low Energy • Deload Protocol (Volume -30%)';
      case 2:
        return 'Fair Energy • Moderate Volume & Controlled RPE';
      case 3:
        return 'Good Energy • Standard Hypertrophy Target';
      case 4:
        return 'High Energy • Normal Intensity Target';
      case 5:
        return 'Peak Energy • Overdrive Protocol (PR Attempt Ready)';
      default:
        return 'Standard Protocol';
    }
  };

  // Dynamic preview text
  const getAdjustmentPreview = () => {
    const list: string[] = [];
    const textLower = sorenessText.toLowerCase();

    if (textLower.includes('back') || textLower.includes('spine') || textLower.includes('deadlift') || textLower.includes('lumbar')) {
      list.push('Spinal axial load swapped for chest-supported / machine variations');
    }
    if (textLower.includes('shoulder') || textLower.includes('rotator') || textLower.includes('click') || textLower.includes('front delt')) {
      list.push('Wide overhead pressing substituted for scapular plane neutral dumbbell / cable movements');
    }
    if (textLower.includes('knee') || textLower.includes('patella') || textLower.includes('squat')) {
      list.push('Quad knee-shearing deep squats swapped for high-footplate leg press');
    }
    if (textLower.includes('elbow') || textLower.includes('tricep') || textLower.includes('bicep')) {
      list.push('Joint-sparing cable variations with lengthened resistance profile active');
    }

    if (timeMinutes <= 35) {
      list.push('Express protocol: 3–4 movements with 2 hard working sets');
    } else if (timeMinutes >= 75) {
      list.push('Full 6–7 exercise Nippard hypertrophy protocol with specialized isolation finishers');
    }

    if (list.length === 0) {
      return `Targeting ${getExerciseCountBadge(timeMinutes)} across ${splitName}. Standard scientific hypertrophy volume ready.`;
    }
    return list.join(' • ');
  };

  const handleStartWorkout = () => {
    const params = new URLSearchParams({
      time: timeMinutes.toString(),
      energy: energyScore.toString(),
      soreness_text: sorenessText.trim(),
      split: splitName,
    });
    router.push(`/workout?${params.toString()}`);
  };

  return (
    <>
      <HUDHeader title="Readiness" />

      <main className="flex flex-col relative w-full pt-16 pb-28 px-4 max-w-lg mx-auto">
        <div className="flex flex-col w-full space-y-5">
          {/* Header Section */}
          <section className="flex flex-col space-y-1 pt-1">
            <div className="inline-flex items-center gap-2 self-start px-2 py-0.5 rounded-full bg-[#262a34] text-[#4edea3] border border-[#3c4a42]/40">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
              <span className="font-metric text-[10px] tracking-wider uppercase font-semibold">
                Pre-Lift Protocol
              </span>
            </div>
            <h1 className="font-headline text-[28px] font-bold tracking-tight text-[#dfe2ef]">
              Daily Check-in
            </h1>
            <p className="font-body text-[14px] text-[#bbcabf]">
              Quick 10-second check to auto-regulate today&apos;s workout
            </p>
            {lastSessionInfo && (
              <div className="flex items-center gap-2 mt-1 px-3 py-1.5 rounded-lg bg-[#181b25] border border-[#3c4a42]/40 text-[#4edea3] font-metric text-xs">
                <span className="material-symbols-outlined text-[16px]">sync_alt</span>
                <span>{lastSessionInfo}</span>
              </div>
            )}
          </section>

          {/* Split Selector Pill */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {['Pull Day A', 'Push Day A', 'Legs Day A', 'Pull Day B', 'Push Day B', 'Legs Day B'].map((split) => (
              <button
                key={split}
                onClick={() => setSplitName(split)}
                type="button"
                className={`px-3 py-1.5 rounded-lg text-xs font-metric font-semibold whitespace-nowrap transition-all ${
                  splitName === split
                    ? 'bg-[#4edea3] text-[#003824] shadow-md'
                    : 'bg-[#181b25] text-[#86948a] hover:text-[#dfe2ef] border border-[#1F2937]'
                }`}
              >
                {split}
              </button>
            ))}
          </div>

          {/* Section 1: Available Time Selector */}
          <section className="flex flex-col space-y-3 bg-[#181b25] p-4 rounded-xl border border-[#1F2937] shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4edea3] text-[20px]">schedule</span>
                <h2 className="font-headline text-[16px] text-[#dfe2ef] font-semibold">
                  How much time do you have?
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded font-metric text-[11px] bg-[#262a34] text-[#4edea3] border border-[#3c4a42]/60 font-semibold">
                  {getExerciseCountBadge(timeMinutes)}
                </span>
                <span className="px-2.5 py-0.5 rounded font-metric text-xs bg-[#4edea3] text-[#003824] font-bold">
                  {timeMinutes} MIN
                </span>
              </div>
            </div>

            {/* Time Preset Cards Grid */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { time: 30, tag: 'Quick Burn' },
                { time: 45, tag: 'Standard Fit' },
                { time: 60, tag: 'Full Routine' },
                { time: 75, tag: 'High Volume' },
              ].map((card) => {
                const isActive = timeMinutes === card.time;
                return (
                  <button
                    key={card.time}
                    type="button"
                    onClick={() => setTimeMinutes(card.time)}
                    className={`flex flex-col p-3 rounded-lg text-left transition-all border ${
                      isActive
                        ? 'bg-[#10b981] text-[#00422b] border-[#4edea3] shadow-md font-bold'
                        : 'bg-[#1c1f29] hover:bg-[#262a34] text-[#dfe2ef] border-[#1F2937]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-metric text-[20px] font-bold">
                        {card.time === 75 ? '75+' : card.time}
                      </span>
                      <span className="font-metric text-[11px] opacity-80 uppercase tracking-wider">
                        MIN
                      </span>
                    </div>
                    <span className="font-body text-[12px] opacity-90 mt-0.5">
                      {card.tag}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Slider Control */}
            <div className="pt-2 px-1 flex flex-col space-y-1.5">
              <input
                id={timeSliderId}
                type="range"
                min="30"
                max="90"
                step="15"
                value={timeMinutes}
                onChange={(e) => setTimeMinutes(Number(e.target.value))}
                aria-label="Workout duration slider"
                className="w-full h-1.5 bg-[#31353f] rounded-lg appearance-none cursor-pointer accent-[#4edea3]"
              />
              <div className="flex justify-between items-center text-[#86948a] font-metric text-[10px] tracking-wider uppercase">
                <span>30m Express (3–4 ex)</span>
                <span>60m Complete (5–6 ex)</span>
                <span>75m+ Nippard Hypertrophy (6–7 ex)</span>
              </div>
            </div>
          </section>

          {/* Section 2: Energy Level */}
          <section className="flex flex-col space-y-3 bg-[#181b25] p-4 rounded-xl border border-[#1F2937] shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffb95f] text-[20px]">bolt</span>
                <h2 className="font-headline text-[16px] text-[#dfe2ef] font-semibold">
                  Energy Level
                </h2>
              </div>
              <span className="font-metric text-[11px] text-[#86948a] tracking-wider">RATING 1–5</span>
            </div>

            {/* 5 Tap Targets */}
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { score: 1, label: 'Low' },
                { score: 2, label: 'Fair' },
                { score: 3, label: 'Good' },
                { score: 4, label: 'High' },
                { score: 5, label: 'Peak' },
              ].map((item) => {
                const isActive = energyScore === item.score;
                return (
                  <button
                    key={item.score}
                    type="button"
                    onClick={() => setEnergyScore(item.score)}
                    className={`flex flex-col items-center justify-center py-3 rounded-lg transition-all border ${
                      isActive
                        ? 'bg-[#10b981] text-[#00422b] border-[#4edea3] shadow-md font-bold'
                        : 'bg-[#1c1f29] hover:bg-[#262a34] text-[#dfe2ef] border-[#1F2937]'
                    }`}
                  >
                    <span className="font-metric text-[20px] font-bold">{item.score}</span>
                    <span className="font-metric text-[10px] mt-0.5">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Feedback Chip */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1c1f29] border border-[#1F2937]">
              <span className="material-symbols-outlined text-[#4edea3] text-[18px]">verified</span>
              <span className="font-body text-[13px] text-[#dfe2ef] font-medium">
                {getEnergyFeedback()}
              </span>
            </div>
          </section>

          {/* Section 3: Natural Language Soreness & Problem Areas */}
          <section className="flex flex-col space-y-3 bg-[#181b25] p-4 rounded-xl border border-[#1F2937] shadow-md">
            <div className="flex flex-col space-y-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ffb95f] text-[20px]">healing</span>
                  <h2 className="font-headline text-[16px] text-[#dfe2ef] font-semibold">
                    Any soreness or joint fatigue?
                  </h2>
                </div>
                {sorenessText.trim() && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-metric font-bold bg-[#ee9800]/20 text-[#ffb95f] border border-[#ee9800]/40">
                    AUTO-FILTER ACTIVE
                  </span>
                )}
              </div>
              <p className="font-body text-[13px] text-[#bbcabf]">
                Describe any tight joints or strains; AI will adapt movements in real-time
              </p>
            </div>

            {/* Natural Language Soreness Input */}
            <div className="flex flex-col space-y-2">
              <div className="relative">
                <textarea
                  value={sorenessText}
                  onChange={(e) => setSorenessText(e.target.value)}
                  placeholder="e.g., Lower back tight from deadlifts, right shoulder clicks on overhead press"
                  rows={3}
                  className="w-full bg-[#1c1f29] border border-[#1F2937] focus:border-[#4edea3] focus:ring-1 focus:ring-[#4edea3] rounded-lg p-3 text-[13px] text-[#dfe2ef] placeholder-[#86948a] font-body resize-none transition-all outline-none"
                />
                {sorenessText && (
                  <button
                    type="button"
                    onClick={() => setSorenessText('')}
                    className="absolute top-2 right-2 text-[#86948a] hover:text-[#dfe2ef] p-1 rounded-md"
                    title="Clear text"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>

              {/* One-tap Quick Tag Shortcuts */}
              <div className="flex flex-col space-y-1.5 pt-1">
                <span className="font-metric text-[10px] text-[#86948a] uppercase tracking-wider">
                  Quick-Add Soreness Tags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '+ Lower Back',
                    '+ Right Shoulder',
                    '+ Knees / Patella',
                    '+ Elbows',
                    '+ Biceps Tendon',
                    '+ Tight Hamstrings',
                    '+ Groin / Adductors',
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => appendQuickTag(tag)}
                      className="px-2.5 py-1 rounded-full text-xs font-metric font-medium bg-[#262a34] hover:bg-[#31353f] text-[#4edea3] border border-[#3c4a42]/60 active:scale-95 transition-all"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Dynamic Adjustment Callout Preview */}
          <section className="flex flex-col p-3.5 rounded-xl bg-[#262a34]/70 border border-[#ffb95f]/30 space-y-2">
            <div className="flex items-center gap-2 text-[#ffb95f]">
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span className="font-metric text-[11px] font-bold uppercase tracking-wider">
                Live Auto-Regulation Preview
              </span>
            </div>
            <p className="font-body text-[13px] text-[#dfe2ef] leading-relaxed">
              {getAdjustmentPreview()}
            </p>
          </section>

          {/* Section 4: Primary Launch CTA */}
          <section className="flex flex-col space-y-2 pt-2">
            <button
              type="button"
              onClick={handleStartWorkout}
              className="w-full min-h-[54px] py-3.5 px-4 rounded-xl bg-[#4edea3] hover:bg-[#10b981] text-[#003824] font-headline text-[17px] font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-all cursor-pointer"
            >
              <span>Start Workout • {timeMinutes} Mins</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
            <div className="flex items-center justify-center gap-1.5 text-[#86948a] font-metric text-[11px]">
              <span className="material-symbols-outlined text-[14px]">history_toggle_off</span>
              <span>
                Estimated Finish:{' '}
                <strong className="text-[#dfe2ef] font-semibold">{estimatedFinish}</strong>
              </span>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
