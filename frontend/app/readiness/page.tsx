'use client';

import { useState, useEffect, useId } from 'react';
import { useRouter } from 'next/navigation';
import HUDHeader from '@/components/HUDHeader';

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
  const [soreSpots, setSoreSpots] = useState<SoreSpot[]>([
    { id: 'lower-back', label: 'Lower Back', protected: true },
    { id: 'shoulder', label: 'Right Shoulder', protected: true },
    { id: 'knees', label: 'Knees', protected: false },
    { id: 'elbows', label: 'Elbows', protected: false },
    { id: 'chest', label: 'Chest', protected: false },
    { id: 'hamstrings', label: 'Hamstrings', protected: false },
  ]);
  const [splitName, setSplitName] = useState<string>('Pull Day A');
  const [estimatedFinish, setEstimatedFinish] = useState<string>('--:--');

  useEffect(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + timeMinutes);
    setEstimatedFinish(
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    );
  }, [timeMinutes]);

  // Toggle soreness
  const toggleSpot = (id: string) => {
    setSoreSpots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, protected: !s.protected } : s))
    );
  };

  const protectedCount = soreSpots.filter((s) => s.protected).length;

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
    const hasBack = soreSpots.find((s) => s.id === 'lower-back')?.protected;
    const hasShoulder = soreSpots.find((s) => s.id === 'shoulder')?.protected;
    const hasKnees = soreSpots.find((s) => s.id === 'knees')?.protected;

    if (hasBack) {
      list.push('Deadlifts/Barbell Rows swapped for Chest-Supported Rows to offload axial spine');
    }
    if (hasShoulder) {
      list.push('Wide presses swapped for neutral-grip dumbbell presses in scapular plane');
    }
    if (hasKnees) {
      list.push('Quad knee-shearing deep squats swapped for high-footplate leg press');
    }

    if (timeMinutes <= 30) {
      list.push('Working sets compressed to 2 per exercise (antagonist pairing active)');
    }

    if (list.length === 0) {
      return 'No physiological red flags reported. Standard high-velocity hypertrophy sequence ready.';
    }
    return list.join(' • ');
  };

  const handleStartWorkout = () => {
    const activeSoreness = soreSpots.filter((s) => s.protected).map((s) => s.id);
    const params = new URLSearchParams({
      time: timeMinutes.toString(),
      energy: energyScore.toString(),
      soreness: activeSoreness.join(','),
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
          </section>

          {/* Split Selector Pill */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['Pull Day A', 'Push Day A', 'Leg Day A'].map((split) => (
              <button
                key={split}
                onClick={() => setSplitName(split)}
                type="button"
                className={`px-3 py-1.5 rounded-lg text-xs font-metric font-semibold transition-all ${
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
              <span className="px-2.5 py-0.5 rounded font-metric text-xs bg-[#4edea3] text-[#003824] font-bold">
                {timeMinutes} MIN
              </span>
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
                <span>30m Express</span>
                <span>60m Optimal</span>
                <span>90m Overdrive</span>
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

          {/* Section 3: Soreness & Problem Areas */}
          <section className="flex flex-col space-y-3 bg-[#181b25] p-4 rounded-xl border border-[#1F2937] shadow-md">
            <div className="flex flex-col space-y-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ffb95f] text-[20px]">healing</span>
                  <h2 className="font-headline text-[16px] text-[#dfe2ef] font-semibold">
                    Any sore spots today?
                  </h2>
                </div>
                {protectedCount > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-metric font-bold bg-[#ee9800]/20 text-[#ffb95f] border border-[#ee9800]/40">
                    {protectedCount} PROTECTED
                  </span>
                )}
              </div>
              <p className="font-body text-[13px] text-[#bbcabf]">
                We&apos;ll swap exercises to protect flagged joints
              </p>
            </div>

            {/* Chips / Grid List */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {soreSpots.map((spot) => {
                const isProtected = spot.protected;
                return (
                  <button
                    key={spot.id}
                    type="button"
                    onClick={() => toggleSpot(spot.id)}
                    className={`flex items-center justify-between p-3 rounded-lg text-left transition-all border ${
                      isProtected
                        ? 'bg-[#ee9800]/15 text-[#ffb95f] border-[#ee9800]/50 shadow-sm'
                        : 'bg-[#1c1f29] hover:bg-[#262a34] text-[#dfe2ef] border-[#1F2937]'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-body text-[14px] font-semibold">{spot.label}</span>
                      <span className="font-metric text-[10px] mt-0.5 opacity-80 uppercase tracking-wider">
                        {isProtected ? 'Will protect' : 'Ready'}
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-[18px]">
                      {isProtected ? 'check_circle' : 'add_circle_outline'}
                    </span>
                  </button>
                );
              })}
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
