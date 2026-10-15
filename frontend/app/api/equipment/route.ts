import { NextResponse } from 'next/server';
import { supabase, DEFAULT_USER_ID } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id') || DEFAULT_USER_ID;

  try {
    const { data, error } = await supabase
      .from('user_equipment')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let items = data || [];
    if (items.length === 0) {
      const defaults = [
        { user_id: userId, equipment_tag: 'barbell', is_available: true, fallback_recommendation: 'Dumbbells / Smith Machine' },
        { user_id: userId, equipment_tag: 'dumbbells', is_available: true, fallback_recommendation: 'Cable Machine / Kettlebells' },
        { user_id: userId, equipment_tag: 'squat_rack', is_available: true, fallback_recommendation: 'Hack Squat / Leg Press' },
        { user_id: userId, equipment_tag: 'adjustable_bench', is_available: true, fallback_recommendation: 'Floor Press / Stability Ball' },
        { user_id: userId, equipment_tag: 'preacher_bench', is_available: false, fallback_recommendation: 'Incline DB Curl / Cable Spider Curl' },
        { user_id: userId, equipment_tag: 'cable_crossover', is_available: true, fallback_recommendation: 'Resistance Bands / Dumbbell Flyes' },
        { user_id: userId, equipment_tag: 'lat_pulldown', is_available: true, fallback_recommendation: 'Pull-Up Bar / Inverted Row' },
        { user_id: userId, equipment_tag: 'cable_row', is_available: true, fallback_recommendation: 'Dumbbell Row / Chest-Supported T-Bar' },
        { user_id: userId, equipment_tag: 'hack_squat', is_available: false, fallback_recommendation: '45° Leg Press / Belt Squat' },
        { user_id: userId, equipment_tag: 'leg_press', is_available: true, fallback_recommendation: 'Bulgarian Split Squat / Goblet Squat' },
        { user_id: userId, equipment_tag: 'leg_extension_curl', is_available: true, fallback_recommendation: 'DB Romanian Deadlift / Nordic Curl' },
      ];
      await supabase.from('user_equipment').upsert(defaults);
      items = defaults;
    }

    const available_count = items.filter((i) => i.is_available).length;
    const excluded_count = items.length - available_count;

    return NextResponse.json({
      user_id: userId,
      available_count,
      excluded_count,
      equipment: items,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id = DEFAULT_USER_ID, equipment_tag, is_available } = body;

    const { error } = await supabase
      .from('user_equipment')
      .update({ is_available })
      .eq('user_id', user_id)
      .eq('equipment_tag', equipment_tag);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, tag: equipment_tag, is_available });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
