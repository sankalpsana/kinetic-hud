'use client';

import AnatomicalSilhouette from './AnatomicalSilhouette';

export interface ExerciseDetailData {
  exercise_id: string;
  name: string;
  primary_muscle: string;
  movement_pattern: string;
  equipment_tag: string;
  joint_stress_flags?: string[];
  gif_url?: string;
  video_url?: string;
  poster_image_url?: string;
  target_muscle_svg_tag?: string;
  tempo_recommendation?: string;
  biomechanical_cue: string;
  resistance_profile?: 'lengthened' | 'shortened' | 'even';
  stability_tier?: 'S' | 'A' | 'B' | 'C';
  target_division?: string;
  sets: number;
  target_reps: string;
  target_weight_kg: number;
  rest_seconds: number;
}

interface ExerciseDetailModalProps {
  exercise: ExerciseDetailData | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ExerciseDetailModal({
  exercise,
  isOpen,
  onClose,
}: ExerciseDetailModalProps) {
  if (!isOpen || !exercise) return null;

  const mediaSrc = exercise.video_url || exercise.gif_url || exercise.poster_image_url || '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-exercise-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-[#141824] rounded-2xl border border-[#353943] shadow-2xl p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Top Bar */}
        <div className="flex items-start justify-between gap-3 border-b border-[#262a34] pb-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-metric text-[10px] uppercase font-bold text-[#4edea3] px-2 py-0.5 rounded bg-[#4edea3]/10 border border-[#4edea3]/20">
                Tier {exercise.stability_tier || 'S'} Stability
              </span>
              <span className="font-metric text-[10px] uppercase font-semibold text-[#93c5fd] px-2 py-0.5 rounded bg-[#93c5fd]/10 border border-[#93c5fd]/20">
                {exercise.resistance_profile || 'lengthened'} Bias
              </span>
            </div>
            <h2 id="modal-exercise-title" className="font-headline text-[20px] font-bold text-[#dfe2ef] mt-1">
              {exercise.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#262a34] text-[#bbcabf] hover:text-[#dfe2ef] active:scale-95 transition-all"
            aria-label="Close form guide"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* High-Resolution Movement Demonstration Video/GIF */}
        <div className="relative w-full h-52 sm:h-64 rounded-xl overflow-hidden bg-white border border-[#262a34] shadow-inner shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaSrc}
            alt={exercise.name}
            className="w-full h-full object-contain"
          />
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-metric text-[#4edea3] font-bold">
            LIVE FORM DEMO
          </div>
        </div>

        {/* Anatomical Muscle Silhouette Targeting */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-metric text-[11px] text-[#86948a] uppercase font-bold tracking-wider">
              Target Muscle Focus
            </span>
            <span className="font-metric text-xs text-[#4edea3] font-bold uppercase">
              {exercise.target_division?.replace(/_/g, ' ') || exercise.primary_muscle}
            </span>
          </div>
          <AnatomicalSilhouette targetMuscle={exercise.target_muscle_svg_tag || exercise.primary_muscle} />
        </div>

        {/* Nippard Science Blueprint: Tempo & Execution */}
        <div className="flex flex-col gap-3 bg-[#181b25] p-4 rounded-xl border border-[#262a34]">
          <div className="flex items-center gap-2 text-[#ffb95f]">
            <span className="material-symbols-outlined text-[18px]">speed</span>
            <h3 className="font-metric text-xs font-bold uppercase tracking-wider">
              Scientific Tempo Protocol
            </h3>
          </div>
          <p className="font-body text-[13px] text-[#dfe2ef] font-medium leading-relaxed bg-[#262a34]/60 p-2.5 rounded-lg border border-[#353943]">
            {exercise.tempo_recommendation || '3s controlled eccentric, 1s lengthened stretch hold, explosive concentric'}
          </p>

          <div className="flex items-center gap-2 text-[#4edea3] pt-1">
            <span className="material-symbols-outlined text-[18px]">fitness_center</span>
            <h3 className="font-metric text-xs font-bold uppercase tracking-wider">
              Biomechanical Execution Cue
            </h3>
          </div>
          <p className="font-body text-[13px] text-[#bbcabf] italic leading-relaxed">
            &ldquo;{exercise.biomechanical_cue}&rdquo;
          </p>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#262a34]">
            <div className="flex flex-col">
              <span className="font-metric text-[10px] text-[#86948a] uppercase">Prescription</span>
              <span className="font-metric text-sm font-bold text-[#dfe2ef]">
                {exercise.sets} sets × {exercise.target_reps} reps
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-metric text-[10px] text-[#86948a] uppercase">Recommended Rest</span>
              <span className="font-metric text-sm font-bold text-[#dfe2ef]">
                {Math.floor(exercise.rest_seconds / 60)}:00 min
              </span>
            </div>
          </div>
        </div>

        {/* Primary Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full h-12 rounded-xl bg-[#4edea3] text-[#003824] font-headline text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-all shadow-lg shadow-[#4edea3]/20"
        >
          <span>GOT IT • BACK TO WORKOUT</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
