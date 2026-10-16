import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface DisambiguationCandidate {
  id: string;
  display_name: string;
  category: 'free_weights' | 'cables' | 'machines' | 'accessories';
  image_url: string;
  resistance_curve: string;
  common_gym_brands: string;
  fallback_recommendation: string;
}

// Curated verified fallbacks for instant sub-second resolution or Gemini fallback
const CURATED_MACHINES: Record<string, DisambiguationCandidate[]> = {
  chest: [
    {
      id: 'incline_chest_press_converging',
      display_name: 'Incline Plate-Loaded Chest Press (Converging)',
      category: 'machines',
      image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0577.gif',
      resistance_curve: 'Peak tension in deep lengthened stretch, natural converging joint arc',
      common_gym_brands: 'Hammer Strength / Life Fitness / Prime',
      fallback_recommendation: 'Incline Dumbbell Bench Press',
    },
    {
      id: 'flat_selectorized_chest_press',
      display_name: 'Seated Selectorized Chest Press (Pin-Loaded)',
      category: 'machines',
      image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0577.gif',
      resistance_curve: 'Cam-guided even resistance curve across full active horizontal adduction',
      common_gym_brands: 'Matrix / Cybex / Technogym',
      fallback_recommendation: 'Flat Dumbbell Press / Barbell Bench',
    },
    {
      id: 'pec_deck_flye_machine',
      display_name: 'Pec Deck Machine (Chest Fly)',
      category: 'machines',
      image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0596.gif',
      resistance_curve: 'Maximal tension in the fully shortened adducted chest contraction',
      common_gym_brands: 'Life Fitness / Nautilus / Atlantis',
      fallback_recommendation: 'Cable Crossover / Incline Cable Flye',
    },
  ],
  squat: [
    {
      id: 'linear_hack_squat_45',
      display_name: 'Linear 45° Hack Squat',
      category: 'machines',
      image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0743.gif',
      resistance_curve: 'Peak knee flexion torque at parallel, ultra-high vastus lateralis stretch',
      common_gym_brands: 'Cybex / Rogers Athletic / Prime',
      fallback_recommendation: '45° Leg Press / Smith Machine Squat',
    },
    {
      id: 'sled_leg_press_45',
      display_name: '45° Plate-Loaded Sled Leg Press',
      category: 'machines',
      image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0739.gif',
      resistance_curve: 'Constant linear carriage resistance with adjustable back support',
      common_gym_brands: 'Hammer Strength / Life Fitness / Precor',
      fallback_recommendation: 'Bulgarian Split Squat / Barbell Front Squat',
    },
    {
      id: 'pendulum_squat',
      display_name: 'Pendulum Squat Machine',
      category: 'machines',
      image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0743.gif',
      resistance_curve: 'Counterbalanced arc minimizing lower back shear while overloading rectus femoris',
      common_gym_brands: 'Atlantis / Watson / Prime',
      fallback_recommendation: 'Machine Hack Squat / Leg Extension',
    },
  ],
  row: [
    {
      id: 'chest_supported_tbar_row',
      display_name: '45° Chest-Supported T-Bar Row Machine',
      category: 'machines',
      image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/1349.gif',
      resistance_curve: 'Eliminates lumbar spine spinal erector fatigue; heavy upper back rhomboid bias',
      common_gym_brands: 'Hammer Strength / Arsenal / Cybex',
      fallback_recommendation: 'Incline Dumbbell Row / Seal Row',
    },
    {
      id: 'seated_cable_row_station',
      display_name: 'Seated Low Cable Row Station',
      category: 'machines',
      image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0214.gif',
      resistance_curve: 'Smooth cable tension in both full lat stretch and scapular retraction',
      common_gym_brands: 'Life Fitness / Matrix / Technogym',
      fallback_recommendation: 'Chest-Supported Dumbbell Row',
    },
    {
      id: 'iso_lateral_dy_row',
      display_name: 'Iso-Lateral Low Row (Dorian Style)',
      category: 'machines',
      image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/1349.gif',
      resistance_curve: 'Underhand divergent arc tracking iliac lat fibers with zero lower back strain',
      common_gym_brands: 'Hammer Strength / Prime Fitness',
      fallback_recommendation: 'Single-Arm Cable Lat Row',
    },
  ],
  lat: [
    {
      id: 'mag_grip_lat_pulldown',
      display_name: 'High Pulley Lat Pulldown Station',
      category: 'machines',
      image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/2330.gif',
      resistance_curve: 'Consistent vertical plane tension loading upper back and teres major',
      common_gym_brands: 'Life Fitness / Precor / Technogym',
      fallback_recommendation: 'Pull-Up Bar / Inverted Bodyweight Rows',
    },
    {
      id: 'converging_iso_lat_pulldown',
      display_name: 'Iso-Lateral Plate-Loaded Front Pulldown',
      category: 'machines',
      image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0818.gif',
      resistance_curve: 'Divergent downward arc aligning with iliac lat origin for deep humeral sweep',
      common_gym_brands: 'Hammer Strength / Atlantis / Matrix',
      fallback_recommendation: 'Wide-Grip Lat Pulldown',
    },
  ],
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = (body.query || '').trim();

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY || '';

    // Check fast local pattern matches first
    const qLower = query.toLowerCase();
    let fallbackCandidates: DisambiguationCandidate[] = [];
    if (qLower.includes('chest') || qLower.includes('press') || qLower.includes('pec')) {
      fallbackCandidates = CURATED_MACHINES.chest;
    } else if (qLower.includes('squat') || qLower.includes('leg press') || qLower.includes('hack')) {
      fallbackCandidates = CURATED_MACHINES.squat;
    } else if (qLower.includes('row') || qLower.includes('back')) {
      fallbackCandidates = CURATED_MACHINES.row;
    } else if (qLower.includes('lat') || qLower.includes('pull')) {
      fallbackCandidates = CURATED_MACHINES.lat;
    }

    if (geminiKey) {
      try {
        const prompt = `You are a gym biomechanics equipment mediator for a training app.
An athlete is configuring their gym's available equipment and searched for: "${query}".

Analyze this query and identify 2 to 4 distinct, real gym machine variants (plate-loaded, selectorized, cable attachments, or specialized machines) matching their search.
Return a valid JSON array of objects with this exact structure:
[
  {
    "id": "machine_slug_name",
    "display_name": "Full Descriptive Name (e.g. Incline Plate-Loaded Chest Press (Converging))",
    "category": "machines",
    "image_url": "https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0577.gif",
    "resistance_curve": "Biomechanical description of tension profile across range of motion",
    "common_gym_brands": "Hammer Strength / Matrix / Life Fitness / Cybex",
    "fallback_recommendation": "Alternative free weight or cable movement if unavailable"
  }
]

Use valid ExerciseDB CDN URLs:
- Chest Press / Incline: 0577.gif, 0757.gif, 0314.gif
- Hack Squat / Leg Press: 0743.gif, 0739.gif, 0741.gif, 0755.gif
- Row / T-Bar / Cable Row: 1349.gif, 0214.gif, 0327.gif, 0189.gif
- Lat Pulldown: 2330.gif, 0818.gif, 0673.gif, 0579.gif
- Pec Deck / Rear Delt: 0596.gif, 0601.gif, 0178.gif
- Leg Extension / Leg Curl: 0585.gif, 0599.gif, 0586.gif, 0598.gif
- Calf Machine: 0605.gif, 0594.gif
- Shoulder Press: 0603.gif, 0405.gif, 0765.gif
- Abdominal Crunch Machine: 0595.gif, 0175.gif
- Dip / Pullup Machine: 0009.gif, 0678.gif`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );

        if (geminiRes.ok) {
          const resData = await geminiRes.json();
          const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const sanitized: DisambiguationCandidate[] = parsed.map((c: Record<string, unknown>) => ({
                id: String(c.id || '').toLowerCase().replace(/\s+/g, '_'),
                display_name: String(c.display_name || query),
                category: (['free_weights', 'cables', 'machines', 'accessories'].includes(String(c.category))
                  ? c.category
                  : 'machines') as DisambiguationCandidate['category'],
                image_url: String(c.image_url || 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0577.gif'),
                resistance_curve: String(c.resistance_curve || 'Peak tension in lengthened stretch'),
                common_gym_brands: String(c.common_gym_brands || 'Hammer Strength / Life Fitness'),
                fallback_recommendation: String(c.fallback_recommendation || 'Dumbbell / Cable Alternative'),
              }));

              return NextResponse.json({
                query,
                source: 'gemini-flash',
                candidates: sanitized,
              });
            }
          }
        }
      } catch (geminiError) {
        console.warn('Gemini disambiguation fallback triggered:', geminiError);
      }
    }

    // Default to curated fallback or dynamic generic machine candidate
    const finalCandidates = fallbackCandidates.length > 0 ? fallbackCandidates : [
      {
        id: query.toLowerCase().replace(/\s+/g, '_'),
        display_name: `${query.charAt(0).toUpperCase() + query.slice(1)} Machine`,
        category: 'machines' as const,
        image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0577.gif',
        resistance_curve: 'Cam-guided progressive resistance curve',
        common_gym_brands: 'Life Fitness / Matrix / Hammer Strength',
        fallback_recommendation: 'Free Weight / Cable Equivalent',
      },
    ];

    return NextResponse.json({
      query,
      source: 'curated_catalog',
      candidates: finalCandidates,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
