import { NextResponse } from 'next/server';
import { supabase, Exercise } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const startTime = performance.now();
  try {
    const body = await request.json();
    const query = (body.query || '').trim().toLowerCase();

    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
    }

    // 1. Direct sub-millisecond Alias Table Check
    const { data: aliasData } = await supabase
      .from('exercise_aliases')
      .select('canonical_id, exercises(*)')
      .ilike('alias_name', query)
      .limit(1);

    if (aliasData && aliasData.length > 0) {
      const row = aliasData[0];
      const ex = row.exercises as unknown as Exercise;
      const latency = performance.now() - startTime;
      return NextResponse.json({
        query,
        canonical_id: row.canonical_id,
        canonical_name: ex.canonical_name,
        source: 'alias_cache',
        latency_ms: Number(latency.toFixed(2)),
        exercise: ex,
      });
    }

    // 2. Fetch candidates from database
    const { data: allExercises } = await supabase
      .from('exercises')
      .select('*');

    const candidates: Exercise[] = allExercises || [];
    let matched: Exercise | null = null;
    let matchSource = 'mediator_classifier';

    const geminiKey = process.env.GEMINI_API_KEY || '';
    if (geminiKey && candidates.length > 0) {
      try {
        const candidateNames = candidates.map((c) => c.canonical_name);
        const prompt = `You are an expert biomechanical gym exercise mediator.
The athlete searched for exercise: "${query}"
Candidate canonical exercises in our database:
${JSON.stringify(candidateNames, null, 2)}

Task: Identify the single most exact canonical movement match among the candidates for "${query}".
Return a JSON object with:
{"matched_name": "exact name from candidate list"}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey}`,
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
          const geminiData = await geminiRes.json();
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            const found = candidates.find(
              (c) => c.canonical_name.toLowerCase() === String(parsed.matched_name || '').toLowerCase()
            );
            if (found) {
              matched = found;
              matchSource = 'gemini_mediator';
            }
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini match notice:', geminiErr);
      }
    }

    // 4. Heuristic / Semantic Token Search fallback
    if (!matched) {
      const queryTokens = query.split(/\s+/).filter(Boolean);
      for (const cand of candidates) {
        const cLower = cand.canonical_name.toLowerCase();
        if (cLower === query || queryTokens.every((token: string) => cLower.includes(token))) {
          matched = cand;
          break;
        }
      }
    }

    if (!matched) {
      const queryTokens = query.split(/\s+/).filter(Boolean);
      for (const cand of candidates) {
        const cLower = cand.canonical_name.toLowerCase();
        if (queryTokens.some((token: string) => cLower.includes(token))) {
          matched = cand;
          break;
        }
      }
    }

    if (!matched && candidates.length > 0) {
      matched = candidates[0];
    }

    // 5. Self-healing: Write learned alias into exercise_aliases for future < 2ms queries
    if (matched) {
      try {
        await supabase
          .from('exercise_aliases')
          .insert({
            alias_name: query,
            canonical_id: matched.id,
          });
      } catch {
        // Ignore unique conflict
      }
    }

    const latency = performance.now() - startTime;
    return NextResponse.json({
      query,
      canonical_id: matched ? matched.id : null,
      canonical_name: matched ? matched.canonical_name : 'Unknown Movement',
      source: matchSource,
      latency_ms: Number(latency.toFixed(2)),
      exercise: matched,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
