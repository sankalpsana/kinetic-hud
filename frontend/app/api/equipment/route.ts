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
      .eq('user_id', userId)
      .order('category', { ascending: true })
      .order('display_name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let items = data || [];
    if (items.length === 0) {
      const defaults = [
        { user_id: userId, equipment_tag: 'barbell', category: 'free_weights', display_name: 'Barbell & Plates', is_available: true, fallback_recommendation: 'Dumbbells / Smith Machine', image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0085.gif' },
        { user_id: userId, equipment_tag: 'dumbbells', category: 'free_weights', display_name: 'Dumbbells', is_available: true, fallback_recommendation: 'Cable Machine / Kettlebells', image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0313.gif' },
        { user_id: userId, equipment_tag: 'squat_rack', category: 'free_weights', display_name: 'Squat Rack', is_available: true, fallback_recommendation: 'Hack Squat / Leg Press', image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0085.gif' },
        { user_id: userId, equipment_tag: 'adjustable_bench', category: 'free_weights', display_name: 'Bench (Flat / Incline)', is_available: true, fallback_recommendation: 'Floor Press / Stability Ball', image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0314.gif' },
        { user_id: userId, equipment_tag: 'preacher_bench', category: 'free_weights', display_name: 'Preacher Curl Bench', is_available: false, fallback_recommendation: 'Incline DB Curl / Cable Spider Curl', image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0195.gif' },
        { user_id: userId, equipment_tag: 'cable_crossover', category: 'cables', display_name: 'Cable Crossover Station', is_available: true, fallback_recommendation: 'Resistance Bands / Dumbbell Flyes', image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0178.gif' },
        { user_id: userId, equipment_tag: 'lat_pulldown', category: 'machines', display_name: 'Lat Pulldown Station', is_available: true, fallback_recommendation: 'Pull-Up Bar / Inverted Row', image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/2330.gif' },
        { user_id: userId, equipment_tag: 'cable_row', category: 'machines', display_name: 'Seated Cable Row', is_available: true, fallback_recommendation: 'Dumbbell Row / Chest-Supported T-Bar', image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0214.gif' },
        { user_id: userId, equipment_tag: 'hack_squat', category: 'machines', display_name: 'Hack Squat Machine', is_available: false, fallback_recommendation: '45° Leg Press / Belt Squat', image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0743.gif' },
        { user_id: userId, equipment_tag: 'leg_press', category: 'machines', display_name: '45° Leg Press', is_available: true, fallback_recommendation: 'Bulgarian Split Squat / Goblet Squat', image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0739.gif' },
        { user_id: userId, equipment_tag: 'leg_extension_curl', category: 'machines', display_name: 'Leg Curl & Extension', is_available: true, fallback_recommendation: 'DB Romanian Deadlift / Nordic Curl', image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0585.gif' },
        { user_id: userId, equipment_tag: 'machine', category: 'machines', display_name: 'Selectorized / Pin-Loaded Machines', is_available: true, fallback_recommendation: 'Dumbbells / Cable Machine', image_url: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/0577.gif' },
      ];
      await supabase.from('user_equipment').upsert(defaults, { onConflict: 'user_id,equipment_tag' });
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
    const {
      user_id = DEFAULT_USER_ID,
      equipment_tag,
      category = 'machines',
      display_name,
      image_url,
      is_available = true,
      fallback_recommendation,
      resistance_curve,
      common_gym_brands,
      items, // support batch upsert if provided
    } = body;

    if (Array.isArray(items) && items.length > 0) {
      const records = items.map((it: Record<string, unknown>) => ({
        user_id: (it.user_id as string) || user_id,
        equipment_tag: it.equipment_tag,
        category: it.category || 'machines',
        display_name: it.display_name || it.name || it.equipment_tag,
        image_url: it.image_url || null,
        is_available: it.is_available ?? true,
        fallback_recommendation: it.fallback_recommendation || null,
        resistance_curve: it.resistance_curve || null,
        common_gym_brands: it.common_gym_brands || null,
      }));

      const { error } = await supabase
        .from('user_equipment')
        .upsert(records, { onConflict: 'user_id,equipment_tag' });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, count: records.length });
    }

    if (!equipment_tag) {
      return NextResponse.json({ error: 'equipment_tag is required' }, { status: 400 });
    }

    const record = {
      user_id,
      equipment_tag,
      category,
      display_name: display_name || equipment_tag.replace(/_/g, ' '),
      image_url: image_url || null,
      is_available,
      fallback_recommendation: fallback_recommendation || 'Alternative Free Weight / Cable equivalent',
      resistance_curve: resistance_curve || null,
      common_gym_brands: common_gym_brands || null,
    };

    const { error } = await supabase
      .from('user_equipment')
      .upsert(record, { onConflict: 'user_id,equipment_tag' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: record });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
