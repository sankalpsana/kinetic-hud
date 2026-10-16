'use client';

import { useState, useEffect } from 'react';
import HUDHeader from '@/components/HUDHeader';
import { supabase, DEFAULT_USER_ID, EquipmentCategory, UserEquipment } from '@/lib/supabase';

interface MachineCandidate {
  id: string;
  display_name: string;
  category: EquipmentCategory;
  image_url: string;
  resistance_curve: string;
  common_gym_brands: string;
  fallback_recommendation?: string;
}

export default function EquipmentPage() {
  const [activePreset, setActivePreset] = useState<'commercial' | 'home' | 'hotel'>('commercial');
  const [equipmentList, setEquipmentList] = useState<UserEquipment[]>([]);
  const [loadingInventory, setLoadingInventory] = useState<boolean>(true);

  // Search & Disambiguation Modal State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [disambiguateCandidates, setDisambiguateCandidates] = useState<MachineCandidate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Manual Gear Add State
  const [manualName, setManualName] = useState<string>('');
  const [manualCategory, setManualCategory] = useState<EquipmentCategory>('machines');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // 1. Initial Load: Read localStorage first, then sync with Supabase
  useEffect(() => {
    // Read cached inventory immediately
    try {
      const cached = localStorage.getItem('kinetic_hud_equipment');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEquipmentList(parsed);
          setLoadingInventory(false);
        }
      }
    } catch (e) {
      console.warn('Failed to parse localStorage equipment cache:', e);
    }

    // Reconcile with Supabase / API
    async function fetchInventory() {
      try {
        const res = await fetch(`/api/equipment?user_id=${DEFAULT_USER_ID}`);
        if (res.ok) {
          const data = await res.json();
          if (data.equipment && data.equipment.length > 0) {
            setEquipmentList(data.equipment);
            localStorage.setItem('kinetic_hud_equipment', JSON.stringify(data.equipment));
          }
        }
      } catch (err) {
        console.warn('Network fetch error, using local cached inventory:', err);
      } finally {
        setLoadingInventory(false);
      }
    }

    fetchInventory();
  }, []);

  // Show a temporary success toast
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // 2. Persist single item to Supabase and localStorage
  const persistItem = async (item: UserEquipment) => {
    try {
      // Direct Supabase upsert
      await supabase.from('user_equipment').upsert(
        {
          user_id: DEFAULT_USER_ID,
          equipment_tag: item.equipment_tag,
          category: item.category,
          display_name: item.display_name,
          image_url: item.image_url,
          is_available: item.is_available,
          fallback_recommendation: item.fallback_recommendation,
          resistance_curve: item.resistance_curve,
          common_gym_brands: item.common_gym_brands,
        },
        { onConflict: 'user_id,equipment_tag' }
      );

      // Also trigger API route to ensure backend consistency
      await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item,
          user_id: DEFAULT_USER_ID,
        }),
      });
    } catch (e) {
      console.error('Error persisting equipment item:', e);
    }
  };

  // Toggle item availability
  const toggleItem = async (tag: string) => {
    const updated = equipmentList.map((item) =>
      item.equipment_tag === tag ? { ...item, is_available: !item.is_available } : item
    );
    setEquipmentList(updated);
    localStorage.setItem('kinetic_hud_equipment', JSON.stringify(updated));

    const changed = updated.find((i) => i.equipment_tag === tag);
    if (changed) {
      await persistItem(changed);
    }
  };

  // Apply Quick Presets
  const applyPreset = async (preset: 'commercial' | 'home' | 'hotel') => {
    setActivePreset(preset);

    const homeTags = ['barbell', 'dumbbells', 'squat_rack', 'adjustable_bench'];
    const hotelTags = ['dumbbells', 'adjustable_bench'];

    const updated = equipmentList.map((item) => {
      let isAvailable = item.is_available;
      if (preset === 'commercial') {
        // Commercial: everything on except preacher bench and hack squat by default
        isAvailable = item.equipment_tag !== 'preacher_bench' && item.equipment_tag !== 'hack_squat';
      } else if (preset === 'home') {
        isAvailable = homeTags.includes(item.equipment_tag);
      } else if (preset === 'hotel') {
        isAvailable = hotelTags.includes(item.equipment_tag);
      }
      return { ...item, is_available: isAvailable };
    });

    setEquipmentList(updated);
    localStorage.setItem('kinetic_hud_equipment', JSON.stringify(updated));
    triggerToast(`Preset applied: ${preset.toUpperCase()}`);

    // Batch sync to API
    try {
      await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: DEFAULT_USER_ID,
          items: updated,
        }),
      });
    } catch (e) {
      console.error('Failed to sync preset batch:', e);
    }
  };

  // Execute Gemini Flash Machine Disambiguation Search
  const handleSearchDisambiguate = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError(null);
    setIsModalOpen(true);

    try {
      const res = await fetch('/api/equipment/search-disambiguate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        throw new Error(`Search failed: HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.candidates && data.candidates.length > 0) {
        setDisambiguateCandidates(data.candidates);
      } else {
        setSearchError('No matching machines found. Try searching "chest press", "hack squat", or "lat row".');
        setDisambiguateCandidates([]);
      }
    } catch (err: unknown) {
      console.error('Disambiguation search failed:', err);
      setSearchError('Could not connect to machine disambiguation service. Please try again.');
      setDisambiguateCandidates([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Select candidate from Gemini Flash Modal
  const handleSelectCandidate = async (cand: MachineCandidate) => {
    const newItem: UserEquipment = {
      user_id: DEFAULT_USER_ID,
      equipment_tag: cand.id,
      category: 'machines',
      display_name: cand.display_name,
      image_url: cand.image_url,
      is_available: true,
      fallback_recommendation: cand.fallback_recommendation || 'Dumbbells / Cable Machine Equivalent',
      resistance_curve: cand.resistance_curve,
      common_gym_brands: cand.common_gym_brands,
    };

    // Filter out if already in list to avoid duplicates
    const filtered = equipmentList.filter((e) => e.equipment_tag !== cand.id);
    const updated = [newItem, ...filtered];

    setEquipmentList(updated);
    localStorage.setItem('kinetic_hud_equipment', JSON.stringify(updated));

    setIsModalOpen(false);
    setSearchQuery('');
    triggerToast(`Added ${cand.display_name} to Cables & Machines`);

    // Immediate Supabase and backend sync
    await persistItem(newItem);
  };

  // Add Manual Gear with Strict Category
  const handleAddManual = async () => {
    if (!manualName.trim()) return;

    const tag = manualName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const newItem: UserEquipment = {
      user_id: DEFAULT_USER_ID,
      equipment_tag: tag,
      category: manualCategory,
      display_name: manualName.trim(),
      image_url:
        manualCategory === 'machines'
          ? 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leverage_Chest_Press/0.jpg'
          : 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg',
      is_available: true,
      fallback_recommendation: 'Alternative Free Weight / Bodyweight equivalent',
      resistance_curve: 'Profile depends on equipment setup',
      common_gym_brands: 'Commercial / Home standard',
    };

    const filtered = equipmentList.filter((e) => e.equipment_tag !== tag);
    const updated = [...filtered, newItem];

    setEquipmentList(updated);
    localStorage.setItem('kinetic_hud_equipment', JSON.stringify(updated));
    setManualName('');
    triggerToast(`Added ${newItem.display_name} under ${getCategoryLabel(manualCategory)}`);

    await persistItem(newItem);
  };

  // Category helpers
  const getCategoryLabel = (cat: EquipmentCategory) => {
    switch (cat) {
      case 'free_weights':
        return 'Free Weights';
      case 'cables':
      case 'machines':
        return 'Cables & Machines';
      case 'accessories':
        return 'Accessories & Benches';
      default:
        return 'Gear';
    }
  };

  const freeWeights = equipmentList.filter((i) => i.category === 'free_weights');
  const cablesAndMachines = equipmentList.filter((i) => i.category === 'cables' || i.category === 'machines');
  const accessories = equipmentList.filter((i) => i.category === 'accessories');

  const availableCount = equipmentList.filter((i) => i.is_available).length;
  const excludedCount = equipmentList.length - availableCount;

  return (
    <>
      <HUDHeader title="Equipment" />

      <main className="flex flex-col relative w-full pt-16 pb-28 px-4 max-w-lg mx-auto">
        <div className="flex flex-col w-full space-y-4">
          {/* Header */}
          <div className="flex flex-col gap-1 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#4edea3] text-[20px]">tune</span>
              <span className="font-metric text-[10px] text-[#4edea3] tracking-wider uppercase font-semibold">
                Gear Setup
              </span>
            </div>
            <h1 className="font-headline text-[26px] font-bold text-[#dfe2ef] tracking-tight">
              Gym Equipment Inventory
            </h1>
            <p className="font-body text-[13px] text-[#bbcabf] leading-snug">
              Turn off gear your gym lacks. The Hypertrophy Engine will dynamically recalculate biomechanically matched exercises.
            </p>
          </div>

          {/* Quick Preset Switcher */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'commercial', label: 'Commercial Gym', icon: 'domain' },
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

          {/* Diagnostics Counters */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#1c1f29] rounded-xl p-3 flex flex-col justify-between border border-[#1F2937] shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-metric text-[10px] text-[#bbcabf] uppercase font-semibold">
                  Available Gear
                </span>
                <span className="material-symbols-outlined text-[#4edea3] text-[18px]">check_circle</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-metric text-[26px] text-[#4edea3] font-bold">
                  {availableCount}
                </span>
                <span className="font-body text-[12px] text-[#bbcabf]">in gym</span>
              </div>
              <span className="font-body text-[11px] text-[#86948a] mt-0.5">Ready for routines</span>
            </div>

            <div className="bg-[#1c1f29] rounded-xl p-3 flex flex-col justify-between border border-[#1F2937] shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-metric text-[10px] text-[#ffb95f] uppercase font-semibold">
                  Excluded Gear
                </span>
                <span className="material-symbols-outlined text-[#ffb95f] text-[18px]">alt_route</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-metric text-[26px] text-[#ffb95f] font-bold">
                  {excludedCount}
                </span>
                <span className="font-body text-[12px] text-[#bbcabf]">swapped</span>
              </div>
              <span className="font-body text-[11px] text-[#ffb95f] font-medium mt-0.5">Auto-substituted</span>
            </div>
          </div>

          {/* VISUAL MACHINE SEARCH (GEMINI FLASH) */}
          <section className="flex flex-col gap-2 p-4 bg-gradient-to-b from-[#181f2b] to-[#121620] rounded-2xl border border-[#2b3548] shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#4edea3]/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#4edea3] text-[18px]">psychology</span>
                </div>
                <div>
                  <h3 className="font-headline text-[15px] text-[#dfe2ef] font-bold tracking-tight">
                    Visual Machine Disambiguation
                  </h3>
                  <p className="font-body text-[11px] text-[#86948a]">
                    Powered by Gemini Flash • Disambiguate converging, leverage, &amp; cable setups
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder='Search machine, e.g. "chest press", "hack squat", "lat row"...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchDisambiguate()}
                  className="w-full h-11 pl-9 pr-3 bg-[#0a0d14] rounded-xl border border-[#2c3343] text-sm text-[#dfe2ef] placeholder-[#656f7d] focus:outline-none focus:border-[#4edea3] focus:ring-1 focus:ring-[#4edea3]"
                />
                <span className="material-symbols-outlined absolute left-2.5 top-3 text-[#656f7d] text-[18px]">
                  search
                </span>
              </div>
              <button
                type="button"
                onClick={handleSearchDisambiguate}
                disabled={isSearching || !searchQuery.trim()}
                className="h-11 px-4 rounded-xl bg-[#4edea3] hover:bg-[#10b981] disabled:opacity-50 text-[#003824] font-headline text-xs font-bold uppercase transition-all flex items-center gap-1.5 shrink-0 shadow-md active:scale-95"
              >
                {isSearching ? (
                  <>
                    <span className="animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
                    <span>Scanning</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                    <span>Find</span>
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Toast Notification */}
          {successToast && (
            <div className="p-3 bg-[#003824] border border-[#4edea3] text-[#4edea3] rounded-xl text-xs font-metric font-semibold flex items-center gap-2 shadow-lg animate-fadeIn">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{successToast}</span>
            </div>
          )}

          {/* 1. Free Weights Section */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4edea3] text-[18px]">fitness_center</span>
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
                  <div className="flex items-center gap-3 pr-2 flex-1 min-w-0">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.display_name}
                        className="w-12 h-12 rounded-lg object-cover bg-[#0a0d14] border border-[#2b3548] shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#252a36] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[#86948a] text-[20px]">fitness_center</span>
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`font-body text-[14px] font-semibold leading-snug truncate ${
                          item.is_available ? 'text-[#dfe2ef]' : 'text-[#86948a]'
                        }`}
                      >
                        {item.display_name}
                      </span>
                      <span className="font-body text-[11px] text-[#86948a] truncate">
                        {item.resistance_curve || item.common_gym_brands || 'Free weight resistance profile'}
                      </span>
                      {!item.is_available && (
                        <div className="flex items-center gap-1 mt-1 text-[#ffb95f] font-body text-[11px] font-medium truncate">
                          <span className="material-symbols-outlined text-[13px] shrink-0">turn_right</span>
                          <span>Auto-swap: {item.fallback_recommendation}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors relative flex items-center shrink-0 ${
                      item.is_available ? 'bg-[#10b981]' : 'bg-[#31353f]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full transition-transform duration-200 shadow-md ${
                        item.is_available ? 'translate-x-5 bg-[#003824]' : 'translate-x-0 bg-[#86948a]'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 2. Cables & Machines Section */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4edea3] text-[18px]">precision_manufacturing</span>
                <h2 className="font-headline text-[16px] text-[#dfe2ef] font-semibold tracking-tight">
                  Cables &amp; Machines
                </h2>
              </div>
              <span className="font-metric text-[10px] text-[#86948a] uppercase font-semibold">
                {cablesAndMachines.length} ITEMS
              </span>
            </div>

            <div className="bg-[#1c1f29] rounded-xl overflow-hidden border border-[#1F2937] divide-y divide-[#1F2937]">
              {cablesAndMachines.map((item) => (
                <div
                  key={item.equipment_tag}
                  onClick={() => toggleItem(item.equipment_tag)}
                  className={`flex items-center justify-between p-3.5 cursor-pointer transition-colors ${
                    item.is_available ? 'bg-[#1c1f29] hover:bg-[#262a34]' : 'bg-[#181b25] hover:bg-[#1c1f29]'
                  }`}
                >
                  <div className="flex items-center gap-3 pr-2 flex-1 min-w-0">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.display_name}
                        className="w-12 h-12 rounded-lg object-cover bg-[#0a0d14] border border-[#2b3548] shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#252a36] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[#86948a] text-[20px]">precision_manufacturing</span>
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`font-body text-[14px] font-semibold leading-snug truncate ${
                          item.is_available ? 'text-[#dfe2ef]' : 'text-[#86948a]'
                        }`}
                      >
                        {item.display_name}
                      </span>
                      <span className="font-body text-[11px] text-[#86948a] truncate">
                        {item.resistance_curve || item.common_gym_brands || 'Guided track / plate-loaded'}
                      </span>
                      {!item.is_available && (
                        <div className="flex items-center gap-1 mt-1 text-[#ffb95f] font-body text-[11px] font-medium truncate">
                          <span className="material-symbols-outlined text-[13px] shrink-0">turn_right</span>
                          <span>Auto-swap: {item.fallback_recommendation}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors relative flex items-center shrink-0 ${
                      item.is_available ? 'bg-[#10b981]' : 'bg-[#31353f]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full transition-transform duration-200 shadow-md ${
                        item.is_available ? 'translate-x-5 bg-[#003824]' : 'translate-x-0 bg-[#86948a]'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Accessories & Benches Section (if any) */}
          {accessories.length > 0 && (
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#4edea3] text-[18px]">sports_gymnastics</span>
                  <h2 className="font-headline text-[16px] text-[#dfe2ef] font-semibold tracking-tight">
                    Accessories &amp; Support Gear
                  </h2>
                </div>
                <span className="font-metric text-[10px] text-[#86948a] uppercase font-semibold">
                  {accessories.length} ITEMS
                </span>
              </div>

              <div className="bg-[#1c1f29] rounded-xl overflow-hidden border border-[#1F2937] divide-y divide-[#1F2937]">
                {accessories.map((item) => (
                  <div
                    key={item.equipment_tag}
                    onClick={() => toggleItem(item.equipment_tag)}
                    className={`flex items-center justify-between p-3.5 cursor-pointer transition-colors ${
                      item.is_available ? 'bg-[#1c1f29] hover:bg-[#262a34]' : 'bg-[#181b25] hover:bg-[#1c1f29]'
                    }`}
                  >
                    <div className="flex items-center gap-3 pr-2 flex-1 min-w-0">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.display_name}
                          className="w-12 h-12 rounded-lg object-cover bg-[#0a0d14] border border-[#2b3548] shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[#252a36] flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[#86948a] text-[20px]">sports_gymnastics</span>
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span
                          className={`font-body text-[14px] font-semibold leading-snug truncate ${
                            item.is_available ? 'text-[#dfe2ef]' : 'text-[#86948a]'
                          }`}
                        >
                          {item.display_name}
                        </span>
                        <span className="font-body text-[11px] text-[#86948a] truncate">
                          {item.resistance_curve || 'Gym accessory'}
                        </span>
                        {!item.is_available && (
                          <div className="flex items-center gap-1 mt-1 text-[#ffb95f] font-body text-[11px] font-medium truncate">
                            <span className="material-symbols-outlined text-[13px] shrink-0">turn_right</span>
                            <span>Auto-swap: {item.fallback_recommendation}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className={`w-12 h-7 rounded-full p-1 transition-colors relative flex items-center shrink-0 ${
                        item.is_available ? 'bg-[#10b981]' : 'bg-[#31353f]'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full transition-transform duration-200 shadow-md ${
                          item.is_available ? 'translate-x-5 bg-[#003824]' : 'translate-x-0 bg-[#86948a]'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Add Custom Gear with Explicit Category Picker */}
          <section className="flex flex-col gap-3 p-4 bg-[#181b25] rounded-xl border border-[#1F2937]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#4edea3] text-[18px]">add_circle</span>
              <h3 className="font-headline text-[15px] text-[#dfe2ef] font-semibold">
                Manual Custom Gear Addition
              </h3>
            </div>
            <p className="font-body text-[12px] text-[#86948a] -mt-1">
              Add any custom bar, specialty dumbbell, attachment, or custom machine with explicit categorization.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="e.g. Safety Squat Bar, Swiss Bar, Belt Squat..."
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddManual()}
                className="sm:col-span-2 h-11 px-3 bg-[#0f131c] rounded-xl border border-[#353943] text-sm text-[#dfe2ef] focus:outline-none focus:border-[#4edea3]"
              />
              <select
                value={manualCategory}
                onChange={(e) => setManualCategory(e.target.value as EquipmentCategory)}
                className="h-11 px-3 bg-[#0f131c] rounded-xl border border-[#353943] text-sm text-[#dfe2ef] focus:outline-none focus:border-[#4edea3]"
              >
                <option value="machines">Cables &amp; Machines</option>
                <option value="free_weights">Free Weights</option>
                <option value="accessories">Accessories</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleAddManual}
              disabled={!manualName.trim()}
              className="w-full h-10 rounded-xl bg-[#262f3e] hover:bg-[#344054] disabled:opacity-50 text-[#dfe2ef] font-headline text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Record to Inventory</span>
            </button>
          </section>
        </div>
      </main>

      {/* FLOATING VISUAL MACHINE DISAMBIGUATION MODAL / DRAWER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#141824] border border-[#2b3548] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#242b3d] flex items-center justify-between bg-[#191f2e]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4edea3] text-[22px]">auto_awesome</span>
                <div>
                  <h3 className="font-headline text-[16px] text-[#dfe2ef] font-bold">
                    Select Your Machine
                  </h3>
                  <p className="font-body text-[11px] text-[#86948a]">
                    Disambiguated options for &ldquo;<span className="text-[#4edea3] font-semibold">{searchQuery}</span>&rdquo;
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#242b3d] text-[#bbcabf] hover:text-white flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Body / Candidates List */}
            <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
              {isSearching && (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                  <span className="animate-spin material-symbols-outlined text-[#4edea3] text-[36px]">
                    progress_activity
                  </span>
                  <p className="font-headline text-sm font-semibold text-[#dfe2ef]">
                    Biomechanics Agent &amp; Gemini Flash analyzing machine geometry...
                  </p>
                  <p className="font-body text-xs text-[#86948a] max-w-xs">
                    Matching resistance profile, converging tracks, and standard gym brand specs.
                  </p>
                </div>
              )}

              {searchError && !isSearching && (
                <div className="p-4 bg-[#2f1b1b] border border-[#ff6e6e]/40 rounded-xl text-center">
                  <p className="font-body text-sm text-[#ff9999]">{searchError}</p>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-3 px-4 py-1.5 rounded-lg bg-[#3d2424] text-xs font-semibold text-[#dfe2ef]"
                  >
                    Close &amp; Refine Query
                  </button>
                </div>
              )}

              {!isSearching &&
                disambiguateCandidates.map((cand) => (
                  <div
                    key={cand.id}
                    onClick={() => handleSelectCandidate(cand)}
                    className="group bg-[#191f2e] hover:bg-[#20273a] border border-[#2b3548] hover:border-[#4edea3] rounded-xl p-3.5 transition-all cursor-pointer shadow-md flex flex-col gap-2.5"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={cand.image_url}
                        alt={cand.display_name}
                        className="w-20 h-20 rounded-lg object-cover bg-[#0a0d14] border border-[#343e54] shrink-0 group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-[#4edea3]/10 text-[#4edea3] font-metric text-[9px] uppercase font-bold tracking-wider">
                            {cand.category}
                          </span>
                          <span className="font-metric text-[9px] text-[#86948a] uppercase">
                            TAG: {cand.id}
                          </span>
                        </div>
                        <h4 className="font-headline text-[15px] font-bold text-[#dfe2ef] group-hover:text-[#4edea3] transition-colors leading-snug mt-1">
                          {cand.display_name}
                        </h4>
                        <p className="font-body text-[11px] text-[#a0afbe] mt-0.5 line-clamp-1">
                          {cand.common_gym_brands}
                        </p>
                      </div>
                    </div>

                    {/* Biomechanical Tension Curve badge */}
                    <div className="bg-[#121620] rounded-lg p-2.5 border border-[#232938] flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center gap-1.5 text-[#4edea3]">
                        <span className="material-symbols-outlined text-[15px]">show_chart</span>
                        <span className="font-headline font-semibold">Resistance Curve:</span>
                        <span className="text-[#dfe2ef]">{cand.resistance_curve}</span>
                      </div>
                      {cand.fallback_recommendation && (
                        <div className="flex items-center gap-1.5 text-[#ffb95f] mt-0.5">
                          <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                          <span className="font-semibold">Auto-Swap:</span>
                          <span className="text-[#bbcabf] truncate">{cand.fallback_recommendation}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="w-full py-2 rounded-lg bg-[#4edea3] hover:bg-[#10b981] text-[#003824] font-headline text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-98"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      <span>Select This Machine</span>
                    </button>
                  </div>
                ))}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#121620] border-t border-[#242b3d] flex items-center justify-between text-xs text-[#86948a]">
              <span>Tapping a card saves it immediately to Cables &amp; Machines.</span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="font-semibold text-[#dfe2ef] hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
