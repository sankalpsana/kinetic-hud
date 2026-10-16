'use client';

interface AnatomicalSilhouetteProps {
  targetMuscle?: string;
  className?: string;
}

export default function AnatomicalSilhouette({ targetMuscle = 'quads', className = '' }: AnatomicalSilhouetteProps) {
  const norm = (targetMuscle || '').toLowerCase();

  const isQuads = norm.includes('quad');
  const isHamstrings = norm.includes('hamstring');
  const isGlutes = norm.includes('glute');
  const isLats = norm.includes('lat');
  const isChest = norm.includes('chest') || norm.includes('pec');
  const isDelts = norm.includes('delt') || norm.includes('shoulder');
  const isTriceps = norm.includes('tricep');
  const isBiceps = norm.includes('bicep') || norm.includes('arm');
  const isTraps = norm.includes('trap') || norm.includes('rhomboid') || norm.includes('upper back');
  const isCalves = norm.includes('calf') || norm.includes('calve') || norm.includes('soleus') || norm.includes('gastrocnemius');
  const isAbs = norm.includes('ab') || norm.includes('core');
  const isAdductors = norm.includes('adductor');

  const highlightColor = '#4edea3';
  const baseColor = '#262a34';
  const borderColor = '#353943';

  return (
    <div className={`flex items-center justify-around bg-[#131722] p-3 rounded-xl border border-[#1F2937] ${className}`}>
      {/* Front View */}
      <div className="flex flex-col items-center gap-1">
        <span className="font-metric text-[9px] uppercase tracking-wider text-[#86948a]">Anterior (Front)</span>
        <svg viewBox="0 0 100 200" className="w-24 h-44 drop-shadow-md">
          {/* Head */}
          <circle cx="50" cy="18" r="10" fill={baseColor} stroke={borderColor} strokeWidth="1.5" />
          {/* Neck */}
          <rect x="47" y="28" width="6" height="6" fill={baseColor} />

          {/* Traps */}
          <path
            d="M40 34 L50 31 L60 34 L66 38 L34 38 Z"
            fill={isTraps ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />

          {/* Shoulders / Delts */}
          <ellipse
            cx="29"
            cy="44"
            rx="6"
            ry="9"
            fill={isDelts ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />
          <ellipse
            cx="71"
            cy="44"
            rx="6"
            ry="9"
            fill={isDelts ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />

          {/* Pectorals / Chest */}
          <path
            d="M36 40 Q50 42 64 40 L63 56 Q50 60 37 56 Z"
            fill={isChest ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />

          {/* Biceps */}
          <rect
            x="24"
            y="54"
            width="7"
            height="18"
            rx="3.5"
            fill={isBiceps ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />
          <rect
            x="69"
            y="54"
            width="7"
            height="18"
            rx="3.5"
            fill={isBiceps ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />

          {/* Forearms */}
          <rect x="23" y="74" width="6" height="20" rx="3" fill={baseColor} stroke={borderColor} strokeWidth="1" />
          <rect x="71" y="74" width="6" height="20" rx="3" fill={baseColor} stroke={borderColor} strokeWidth="1" />

          {/* Abs / Abdominals */}
          <rect
            x="42"
            y="60"
            width="16"
            height="26"
            rx="3"
            fill={isAbs ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />

          {/* Pelvis */}
          <path d="M40 88 L60 88 L55 98 L45 98 Z" fill={baseColor} />

          {/* Adductors (Inner Thighs) */}
          <path
            d="M46 100 L50 100 L49 125 L46 125 Z"
            fill={isAdductors ? highlightColor : baseColor}
          />
          <path
            d="M50 100 L54 100 L54 125 L51 125 Z"
            fill={isAdductors ? highlightColor : baseColor}
          />

          {/* Quads (Thighs) */}
          <path
            d="M36 98 L46 98 L44 140 L37 140 Z"
            fill={isQuads ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />
          <path
            d="M54 98 L64 98 L63 140 L56 140 Z"
            fill={isQuads ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />

          {/* Knees */}
          <ellipse cx="40" cy="144" rx="3.5" ry="3.5" fill={baseColor} />
          <ellipse cx="60" cy="144" rx="3.5" ry="3.5" fill={baseColor} />

          {/* Calves (Front Shin / Gastrocnemius edges) */}
          <path
            d="M37 148 L44 148 L43 180 L38 180 Z"
            fill={isCalves ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />
          <path
            d="M56 148 L63 148 L62 180 L57 180 Z"
            fill={isCalves ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />

          {/* Feet */}
          <ellipse cx="40" cy="186" rx="4" ry="2" fill={baseColor} />
          <ellipse cx="60" cy="186" rx="4" ry="2" fill={baseColor} />
        </svg>
      </div>

      {/* Posterior View */}
      <div className="flex flex-col items-center gap-1">
        <span className="font-metric text-[9px] uppercase tracking-wider text-[#86948a]">Posterior (Back)</span>
        <svg viewBox="0 0 100 200" className="w-24 h-44 drop-shadow-md">
          {/* Head */}
          <circle cx="50" cy="18" r="10" fill={baseColor} stroke={borderColor} strokeWidth="1.5" />
          {/* Neck */}
          <rect x="47" y="28" width="6" height="6" fill={baseColor} />

          {/* Upper Traps & Rhomboids */}
          <path
            d="M34 36 L50 32 L66 36 L58 60 L42 60 Z"
            fill={isTraps ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />

          {/* Rear Delts */}
          <ellipse
            cx="29"
            cy="44"
            rx="6"
            ry="8"
            fill={isDelts ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />
          <ellipse
            cx="71"
            cy="44"
            rx="6"
            ry="8"
            fill={isDelts ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />

          {/* Latissimus Dorsi (Lats) */}
          <path
            d="M40 54 L60 54 L56 86 L44 86 Z"
            fill={isLats ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />

          {/* Triceps */}
          <rect
            x="24"
            y="52"
            width="7"
            height="18"
            rx="3.5"
            fill={isTriceps ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />
          <rect
            x="69"
            y="52"
            width="7"
            height="18"
            rx="3.5"
            fill={isTriceps ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />

          {/* Forearms */}
          <rect x="23" y="72" width="6" height="20" rx="3" fill={baseColor} stroke={borderColor} strokeWidth="1" />
          <rect x="71" y="72" width="6" height="20" rx="3" fill={baseColor} stroke={borderColor} strokeWidth="1" />

          {/* Glutes */}
          <path
            d="M38 88 Q50 86 62 88 L60 106 Q50 112 40 106 Z"
            fill={isGlutes ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />

          {/* Hamstrings */}
          <path
            d="M38 108 L47 108 L45 142 L38 142 Z"
            fill={isHamstrings ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />
          <path
            d="M53 108 L62 108 L62 142 L55 142 Z"
            fill={isHamstrings ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />

          {/* Knee crease */}
          <ellipse cx="41" cy="145" rx="3" ry="1.5" fill={baseColor} />
          <ellipse cx="59" cy="145" rx="3" ry="1.5" fill={baseColor} />

          {/* Calves (Gastrocnemius & Soleus) */}
          <path
            d="M36 148 Q33 162 39 178 L43 178 Q45 162 43 148 Z"
            fill={isCalves ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />
          <path
            d="M57 148 Q55 162 57 178 L61 178 Q67 162 64 148 Z"
            fill={isCalves ? highlightColor : baseColor}
            stroke={borderColor}
            strokeWidth="1"
          />

          {/* Heels */}
          <ellipse cx="40" cy="184" rx="3" ry="2" fill={baseColor} />
          <ellipse cx="60" cy="184" rx="3" ry="2" fill={baseColor} />
        </svg>
      </div>
    </div>
  );
}
