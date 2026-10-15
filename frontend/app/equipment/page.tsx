'use client';

import { useState, useEffect } from 'react';
import HUDHeader from '@/components/HUDHeader';
import { DEFAULT_USER_ID } from '@/lib/supabase';

interface EquipmentItem {
  id?: string;
  equipment_tag: string;
  name: string;
  subtitle: string;
  category: 'free_weights' | 'machines';
  is_available: boolean;
  fallback_recommendation: string;
}

export default function EquipmentPage() {
  const [activePreset, setActivePreset] = useState<'commercial' | 'home' | 'hotel'>('commercial');
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([
    // Free Weights
    {
      equipment_tag: 'barbell',
      name: 'Barbell & Plates',
      subtitle: 'Olympic bar, bumpers & steel collars',
      category: 'free_weights',
      is_available: true,
      fallback_recommendation: 'Dumbbells / Smith Machine',
    },
    {
      equipment_tag: 'dumbbells',
      name: 'Dumbbells',
      subtitle: 'Pairs 2.5kg up to 50kg',
      category: 'free_weights',
      is_available: true,
      fallback_recommendation: 'Cable Machine / Kettlebells',
    },
    {
      equipment_tag: 'squat_rack',
      name: 'Squat Rack',
      subtitle: 'Power cage with safety spotter arms',
      category: 'free_weights',
      is_available: true,
      fallback_recommendation: 'Hack Squat / Leg Press',
    },
    {
      equipment_tag: 'adjustable_bench',
      name: 'Bench (Flat / Incline)',
      subtitle: 'Adjustable 0°–90° angle',
      category: 'free_weights',
      is_available: true,
      fallback_recommendation: 'Floor Press / Stability Ball',
    },
    {
      equipment_tag: 'preacher_bench',
      name: 'Preacher Curl Bench',
      subtitle: 'Targeted arm isolation station',
      category: 'free_weights',
      is_available: false,
      fallback_recommendation: 'Incline Dumbbell Curl / Spider Curl',
    },
    // Cables & Machines
    {
      equipment_tag: 'cable_crossover',
      name: 'Cable Crossover',
      subtitle: 'Dual adjustable pulleys with attachments',
      category: 'machines',
      is_available: true,
      fallback_recommendation: 'Resistance Bands / Dumbbell Flyes',
    },
    {
      equipment_tag: 'lat_pulldown',
      name: 'Lat Pulldown Station',
      subtitle: 'High pulley with wide & neutral grips',
      category: 'machines',
      is_available: true,
      fallback_recommendation: 'Pull-Up Bar / Inverted Row',
    },
    {
      equipment_tag: 'cable_row',
      name: 'Seated Cable Row',
      subtitle: 'Low pulley horizontal pull machine',
      category: 'machines',
      is_available: true,
      fallback_recommendation: 'Dumbbell Row / Chest-Supported T-Bar',
    },
    {
      equipment_tag: 'hack_squat',
      name: 'Hack Squat Machine',
      subtitle: '45-degree angled quad developer',
      category: 'machines',
      is_available: false,
      fallback_recommendation: '45° Leg Press / Belt Squat',
    },
    {
      equipment_tag: 'leg_press',
      name: '45° Leg Press',
      subtitle: 'Heavy sled platform with safety stops',
      category: 'machines',
      is_available: true,
      fallback_recommendation: 'Bulgarian Split Squat / Goblet Squat',
    },
    {
      equipment_tag: 'leg_extension_curl',
      name: 'Leg Curl & Extension',
      subtitle: 'Seated / prone knee flexion station',
      category: 'machines',
      is_available: true,
      fallback_recommendation: 'DB Romanian Deadlift / Nordic Curl',
    },
  ]);

  const [customItemName, setCustomItemName] = useState<string>('');
  const [isSavedFeedback, setIsSavedFeedback] = useState<boolean>(false);

  // Fetch live state from Supabase / API
  useEffect(() => {
    async function fetchInventory() {
      try {
        const res = await fetch(`/api/equipment?user_id=${DEFAULT_USER_ID}`);
        const data = await res.json();
        if (data.equipment && data.equipment.length > 0) {
          setEquipmentList((prev) =>
            prev.map((item) => {
              const remote = data.equipment.find(
                (r: { equipment_tag: string; is_available: boolean; fallback_recommendation?: string }) =>
                  r.equipment_tag === item.equipment_tag
              );
              if (remote) {
                return {
                  ...item,
                  is_available: remote.is_available,
                  fallback_recommendation: remote.fallback_recommendation || item.fallback_recommendation,
                };
              }
              return item;
            })
          );
        }
      } catch (e) {
        console.warn('Using local equipment cache:', e);
      }
    }
    fetchInventory();
  }, []);

  // Toggle item
  const toggleItem = async (tag: string) => {
    const updated = equipmentList.map((item) =>
      item.equipment_tag === tag ? { ...item, is_available: !item.is_available } : item
    );
    setEquipmentList(updated);

    const changed = updated.find((i) => i.equipment_tag === tag);
    if (changed) {
      try {
        await fetch('/api/equipment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: DEFAULT_USER_ID,
            equipment_tag: tag,
            is_available: changed.is_available,
          }),
        });
      } catch (e) {
        console.error('Failed to sync toggle to backend:', e);
      }
    }
  };

  // Preset Selection
  const applyPreset = (preset: 'commercial' | 'home' | 'hotel') => {
    setActivePreset(preset);
    setEquipmentList((prev) =>
      prev.map((item) => {
        if (preset === 'commercial') {
          // Commercial Gym: all available except specialty preacher and hack squat
          return {
            ...item,
            is_available: item.equipment_tag !== 'preacher_bench' && item.equipment_tag !== 'hack_squat',
          };
        } else if (preset === 'home') {
          // Home gym: barbell, dumbbells, rack, bench available; machines off
          const homeTags = ['barbell', 'dumbbells', 'squat_rack', 'adjustable_bench'];
          return {
            ...item,
            is_available: homeTags.includes(item.equipment_tag),
          };
        } else {
          // Hotel: only dumbbells and bench
          const hotelTags = ['dumbbells', 'adjustable_bench'];
          return {
            ...item,
            is_available: hotelTags.includes(item.equipment_tag),
          };
        }
      })
    );
  };

  // Add custom chip
  const handleAddCustom = () => {
    if (!customItemName.trim()) return;
    const cleanTag = customItemName.toLowerCase().replace(/\s+/g, '_');
    setEquipmentList((prev) => [
      ...prev,
      {
        equipment_tag: cleanTag,
        name: customItemName,
        subtitle: 'Custom Gym Addition',
        category: 'free_weights',
        is_available: true,
        fallback_recommendation: 'Dumbbell / Bodyweight Equivalent',
      },
    ]);
    setCustomItemName('');
    setIsSavedFeedback(true);
    setTimeout(() => setIsSavedFeedback(false), 2000);
  };

  const availableCount = equipmentList.filter((i) => i.is_available).length;
  const excludedCount = equipmentList.length - availableCount;

  const freeWeights = equipmentList.filter((i) => i.category === 'free_weights');
  const machines = equipmentList.filter((i) => i.category === 'machines');

  return (
    <>
      <HUDHeader title="Equipment" />

      <main className="flex flex-col relative w-full pt-16 pb-24 px-4 max-w-lg mx-auto">
        <div className="flex flex-col w-full space-y-4">
          {/* Friendly Guidance Header */}
          <div className="flex flex-col gap-1 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#4edea3] text-[20px]">tune</span>
              <span className="font-metric text-[10px] text-[#4edea3] tracking-wider uppercase font-semibold">
                Gear Setup
              </span>
            </div>
            <h1 className="font-headline text-[26px] font-bold text-[#dfe2ef] tracking-tight">
              Gym Equipment
            </h1>
            <p className="font-body text-[13px] text-[#bbcabf] leading-snug">
              Turn off gear your gym doesn&apos;t have. We&apos;ll automatically suggest biomechanical alternatives.
            </p>
          </div>

          {/* Quick Preset Switcher Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'commercial', label: 'Commercial Gym (Full)', icon: 'domain' },
              { id: 'home', label: 'Home / Garage', icon: 'garage' },
              { id: 'hotel', label: 'Hotel / Travel', icon: 'luggage' },
            ].map((p) => {
              const isActive = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id as 'commercial' | 'home' | 'hotel')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full font-metric text-xs uppercase transition-all shadow-md shrink-0 active:scale-95 ${
                    isActive
                      ? 'bg-[#4edea3] text-[#003824] font-bold'
                      : 'bg-[#181b25] text-[#86948a] hover:text-[#dfe2ef] border border-[#1F2937]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Diagnostics / Overview Counters */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#1c1f29] rounded-xl p-3 flex flex-col justify-between border border-[#1F2937] shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-metric text-[10px] text-[#bbcabf] uppercase font-semibold">
                  Available
                </span>
                <span className="material-symbols-outlined text-[#4edea3] text-[18px]">check_circle</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-metric text-[26px] text-[#4edea3] font-bold">
                  {availableCount}
                </span>
                <span className="font-body text-[12px] text-[#bbcabf]">items</span>
              </div>
              <span className="font-body text-[11px] text-[#86948a] mt-0.5">Ready for routines</span>
            </div>

            <div className="bg-[#1c1f29] rounded-xl p-3 flex flex-col justify-between border border-[#1F2937] shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-metric text-[10px] text-[#ffb95f] uppercase font-semibold">
                  Excluded
                </span>
                <span className="material-symbols-outlined text-[#ffb95f] text-[18px]">alt_route</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-metric text-[26px] text-[#ffb95f] font-bold">
                  {excludedCount}
                </span>
                <span className="font-body text-[12px] text-[#bbcabf]">items</span>
              </div>
              <span className="font-body text-[11px] text-[#ffb95f] font-medium mt-0.5">Auto-swapped</span>
            </div>
          </div>

          {/* Free Weights Section */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#bbcabf] text-[18px]">fitness_center</span>
                <h2 className="font-headline text-[16px] text-[#dfe2ef] font-semibold tracking-tight">
                  Free Weights
                </h2>
              </div>
              <span className="font-metric text-[10px] text-[#86948a] uppercase font-semibold">
                {freeWeights.length} ITEMS
              </span>
            </div>

            <div className="bg-[#1c1f29] rounded-xl overflow-hidden border border-[#1F2937] divide-y divide-[#1F2937]">
              {freeWeights.map((item) => (
                <div
                  key={item.equipment_tag}
                  onClick={() => toggleItem(item.equipment_tag)}
                  className={`flex items-center justify-between p-3.5 cursor-pointer transition-colors ${
                    item.is_available ? 'bg-[#1c1f29] hover:bg-[#262a34]' : 'bg-[#181b25] hover:bg-[#1c1f29]'
                  }`}
                >
                  <div className="flex flex-col pr-3">
                    <span
                      className={`font-body text-[14px] font-semibold leading-snug ${
                        item.is_available ? 'text-[#dfe2ef]' : 'text-[#86948a]'
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="font-body text-[12px] text-[#86948a]">{item.subtitle}</span>
                    {!item.is_available && (
                      <div className="flex items-center gap-1 mt-1 text-[#ffb95f] font-body text-[12px] font-medium">
                        <span className="material-symbols-outlined text-[15px] shrink-0">turn_right</span>
                        <span>Auto-swap: {item.fallback_recommendation}</span>
                      </div>
                    )}
                  </div>

                  {/* Toggle Switch */}
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors relative flex items-center ${
                      item.is_available ? 'bg-[#10b981]' : 'bg-[#31353f]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full transition-transform duration-200 shadow-md ${
                        item.is_available
                          ? 'translate-x-5 bg-[#003824]'
                          : 'translate-x-0 bg-[#86948a]'
                      }`}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Cables & Machines Section */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#bbcabf] text-[18px]">precision_manufacturing</span>
                <h2 className="font-headline text-[16px] text-[#dfe2ef] font-semibold tracking-tight">
                  Cables &amp; Machines
                </h2>
              </div>
              <span className="font-metric text-[10px] text-[#86948a] uppercase font-semibold">
                {machines.length} ITEMS
              </span>
            </div>

            <div className="bg-[#1c1f29] rounded-xl overflow-hidden border border-[#1F2937] divide-y divide-[#1F2937]">
              {machines.map((item) => (
                <div
                  key={item.equipment_tag}
                  onClick={() => toggleItem(item.equipment_tag)}
                  className={`flex items-center justify-between p-3.5 cursor-pointer transition-colors ${
                    item.is_available ? 'bg-[#1c1f29] hover:bg-[#262a34]' : 'bg-[#181b25] hover:bg-[#1c1f29]'
                  }`}
                >
                  <div className="flex flex-col pr-3">
                    <span
                      className={`font-body text-[14px] font-semibold leading-snug ${
                        item.is_available ? 'text-[#dfe2ef]' : 'text-[#86948a]'
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="font-body text-[12px] text-[#86948a]">{item.subtitle}</span>
                    {!item.is_available && (
                      <div className="flex items-center gap-1 mt-1 text-[#ffb95f] font-body text-[12px] font-medium">
                        <span className="material-symbols-outlined text-[15px] shrink-0">turn_right</span>
                        <span>Auto-swap: {item.fallback_recommendation}</span>
                      </div>
                    )}
                  </div>

                  {/* Toggle Switch */}
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors relative flex items-center ${
                      item.is_available ? 'bg-[#10b981]' : 'bg-[#31353f]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full transition-transform duration-200 shadow-md ${
                        item.is_available
                          ? 'translate-x-5 bg-[#003824]'
                          : 'translate-x-0 bg-[#86948a]'
                      }`}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Add Custom Gear Input */}
          <section className="flex flex-col gap-2 p-4 bg-[#181b25] rounded-xl border border-[#1F2937]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#4edea3] text-[18px]">add_circle</span>
              <h3 className="font-headline text-[15px] text-[#dfe2ef] font-semibold">
                Add Custom Equipment Chip
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. Safety Squat Bar, Trap Bar, Belt Squat..."
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                className="flex-1 h-11 px-3 bg-[#0f131c] rounded-xl border border-[#353943] text-sm text-[#dfe2ef] focus:outline-none focus:border-[#4edea3]"
              />
              <button
                type="button"
                onClick={handleAddCustom}
                className="h-11 px-4 rounded-xl bg-[#4edea3] hover:bg-[#10b981] text-[#003824] font-headline text-xs font-bold uppercase transition-all"
              >
                Add
              </button>
            </div>
            {isSavedFeedback && (
              <span className="text-xs font-metric text-[#4edea3]">
                Equipment chip recorded into active gym inventory.
              </span>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
