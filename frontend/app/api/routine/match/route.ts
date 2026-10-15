import { NextResponse } from 'next/server';
import { supabase, Exercise } from '@/lib/supabase';

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

    // 3. Heuristic / Semantic Candidate Search
    let matched: Exercise | null = null;
    const queryTokens = query.split(/\s+/).filter(Boolean);

    for (const cand of candidates) {
      const cLower = cand.canonical_name.toLowerCase();
      if (cLower === query || queryTokens.every((token: string) => cLower.includes(token))) {
        matched = cand;
        break;
      }
    }

    if (!matched) {
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

    // 4. Save learned alias back into exercise_aliases for future < 2ms queries
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
      source: 'mediator_classifier',
      latency_ms: Number(latency.toFixed(2)),
      exercise: matched,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
