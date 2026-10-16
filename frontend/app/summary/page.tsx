'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import HUDHeader from '@/components/HUDHeader';
import confetti from 'canvas-confetti';
import { supabase, DEFAULT_USER_ID } from '@/lib/supabase';

interface ProgressionVerdict {
  exercise_name: string;
  status: string;
  verdict_badge: string;
  recommendation: string;
}

interface RecoveryStatus {
  muscle_group: string;
  readiness: string;
  recovery_percent: number;
}

interface SummaryData {
  session_id?: string;
  split_name: string;
  split_type?: string;
  duration_minutes: number;
  completed_sets: number;
  total_volume_kg?: number;
  progression_verdicts: ProgressionVerdict[];
  recovery_statuses: RecoveryStatus[];
}

export interface SessionSet {
  id?: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  rpe: number;
  is_new?: boolean;
}

export interface SessionExercise {
  exercise_id: string;
  canonical_name: string;
  primary_muscle: string;
  stability_tier?: string;
  resistance_profile?: string;
  gif_url?: string;
  sets: SessionSet[];
}

export interface PastSession {
  id: string;
  user_id: string;
  split_name: string;
  split_type?: string;
  duration_minutes: number;
  energy_score: number;
  soreness_flags: string[];
  total_volume_kg: number;
  created_at: string;
  updated_at?: string;
  exercises: SessionExercise[];
  total_sets: number;
}

interface CanonicalExercise {
  id: string;
  canonical_name: string;
  primary_muscle: string;
  movement_pattern?: string;
}

export default function SummaryPage() {
  const router = useRouter();

  // Tab State: 'recap' vs 'history'
  const [activeTab, setActiveTab] = useState<'recap' | 'history'>('recap');

  // Recap State
  const [summary, setSummary] = useState<SummaryData>({
    session_id: undefined,
    split_name: 'Pull Day A (Lats & Deep Stretch)',
    split_type: 'PULL_A',
    duration_minutes: 42,
    completed_sets: 12,
    total_volume_kg: 1850,
    progression_verdicts: [
      {
        exercise_name: 'Chest-Supported Neutral Cable Pulldown',
        status: 'Progression Approved',
        verdict_badge: '+2.5 KG (42.5 KG)',
        recommendation: 'All 3 working sets hit ceiling (10, 10, 10 @ RPE <= 8.5). Overload approved for next cycle.',
      },
      {
        exercise_name: 'Chest-Supported Dumbbell Row',
        status: 'Hold Load',
        verdict_badge: 'HOLD AT 35.0 KG',
        recommendation: 'Target 10 clean reps across all 3 sets (completed 10, 9, 8) before increasing load.',
      },
      {
        exercise_name: 'Incline Dumbbell Curl',
        status: 'Progression Approved',
        verdict_badge: '+1.25 KG (16.25 KG)',
        recommendation: 'Hit rep ceiling across all sets in lengthened stretch. Increase load next rotation.',
      },
      {
        exercise_name: 'Standing Cable Pullover',
        status: 'Hold Load',
        verdict_badge: 'HOLD AT 25.0 KG',
        recommendation: 'Maintain load. Prioritize deep overhead stretch at 0–1 RIR.',
      },
    ],
    recovery_statuses: [
      {
        muscle_group: 'Iliac Lats',
        readiness: 'Ready in 48h (Supercompensation Window)',
        recovery_percent: 35,
      },
      {
        muscle_group: 'Biceps Long Head',
        readiness: 'Ready in 36h (Adaptive Rest)',
        recovery_percent: 55,
      },
      {
        muscle_group: 'Central Nervous System',
        readiness: 'Supercompensated in 24–36h',
        recovery_percent: 85,
      },
    ],
  });

  // History & Logbook State
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [csvStatus, setCsvStatus] = useState<string>('idle');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Canonical Exercises for adding missed exercises
  const [availableExercises, setAvailableExercises] = useState<CanonicalExercise[]>([]);
  const [selectedAddExerciseId, setSelectedAddExerciseId] = useState<string>('');

  // Delete Dialog State
  const [sessionToDelete, setSessionToDelete] = useState<PastSession | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Edit Drawer / Modal State
  const [editingSession, setEditingSession] = useState<PastSession | null>(null);
  const [editFormData, setEditFormData] = useState<{
    split_name: string;
    duration_minutes: number;
    energy_score: number;
    exercises: SessionExercise[];
  } | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // Fetch History Sessions
  const fetchSessions = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/sessions?user_id=${DEFAULT_USER_ID}&limit=30`);
      if (res.ok) {
        const data = await res.json();
        if (data.sessions) {
          setPastSessions(data.sessions);
        }
      }
    } catch (err) {
      console.warn('Failed to load sessions from API:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Fetch Canonical Exercises list once
  useEffect(() => {
    async function loadCanonicalExercises() {
      try {
        const { data } = await supabase
          .from('exercises')
          .select('id, canonical_name, primary_muscle, movement_pattern')
          .order('canonical_name');
        if (data) {
          setAvailableExercises(data);
          if (data.length > 0) setSelectedAddExerciseId(data[0].id);
        }
      } catch (err) {
        console.warn('Failed to fetch canonical exercises:', err);
      }
    }
    loadCanonicalExercises();
  }, []);

  // Initial Load: Confetti + Session recap load + History fetch
  useEffect(() => {
    try {
      confetti({
        particleCount: 40,
        spread: 55,
        origin: { y: 0.6 },
        colors: ['#4edea3', '#10b981', '#93c5fd'],
      });
    } catch {
      // Ignore
    }

    async function loadSummary() {
      try {
        const stored = sessionStorage.getItem('last_workout_summary');
        if (stored) {
          const parsed = JSON.parse(stored);
          setSummary((prev) => ({
            session_id: parsed.session_id,
            split_name: parsed.split_name || prev.split_name,
            split_type: parsed.split_type || prev.split_type,
            duration_minutes: parsed.duration_minutes || prev.duration_minutes,
            completed_sets: parsed.completed_sets || prev.completed_sets,
            total_volume_kg: parsed.total_volume_kg || prev.total_volume_kg,
            progression_verdicts: parsed.progression_verdicts?.length > 0 ? parsed.progression_verdicts : prev.progression_verdicts,
            recovery_statuses: parsed.recovery_statuses?.length > 0 ? parsed.recovery_statuses : prev.recovery_statuses,
          }));
          return;
        }

        // Fetch latest session directly from Supabase if direct navigation
        const { data: latestSession } = await supabase
          .from('workout_sessions')
          .select(`
            id,
            split_name,
            split_type,
            duration_minutes,
            total_volume_kg,
            created_at,
            set_logs (
              id,
              set_number,
              weight_kg,
              reps,
              rpe,
              exercises (
                id,
                canonical_name,
                primary_muscle,
                stability_tier,
                resistance_profile
              )
            )
          `)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestSession) {
          interface RawSetLog {
            id: string;
            set_number: number;
            weight_kg: number;
            reps: number;
            rpe?: number;
            exercises: {
              id: string;
              canonical_name: string;
              primary_muscle: string;
              stability_tier?: string;
              resistance_profile?: string;
            } | null;
          }

          const rawSets = (latestSession.set_logs || []) as unknown as RawSetLog[];
          const hardSets = rawSets.filter((s) => s.reps > 0);

          const exerciseMap = new Map<string, { name: string; muscle: string; sets: RawSetLog[] }>();
          for (const s of hardSets) {
            const exName = s.exercises?.canonical_name || 'Movement';
            const muscle = s.exercises?.primary_muscle || 'Prime Mover';
            const entry = exerciseMap.get(exName) || { name: exName, muscle, sets: [] };
            entry.sets.push(s);
            exerciseMap.set(exName, entry);
          }

          const dynamicVerdicts: ProgressionVerdict[] = [];
          const trainedMuscles = new Set<string>();

          for (const [, { name, muscle, sets }] of exerciseMap.entries()) {
            trainedMuscles.add(muscle);
            const avgReps = sets.reduce((sum, s) => sum + s.reps, 0) / sets.length;
            const maxW = Math.max(...sets.map((s) => Number(s.weight_kg) || 0), 0);
            const allCeiling = sets.every((s) => s.reps >= 10 && (s.rpe || 8.0) <= 8.5);

            const isCompound = ['press', 'squat', 'row', 'deadlift', 'rdl'].some((kw) => name.toLowerCase().includes(kw));
            const bump = isCompound ? 2.5 : 1.25;

            if (allCeiling) {
              const nextW = Number((maxW + bump).toFixed(2));
              dynamicVerdicts.push({
                exercise_name: name,
                status: 'Progression Approved',
                verdict_badge: `+${bump} KG (${nextW} KG)`,
                recommendation: `All sets completed at ceiling (${avgReps.toFixed(1)} reps avg @ RPE <= 8.5). Increase load to ${nextW} kg next session.`,
              });
            } else {
              dynamicVerdicts.push({
                exercise_name: name,
                status: 'Hold Load',
                verdict_badge: `HOLD AT ${maxW.toFixed(1)} KG`,
                recommendation: `Maintain ${maxW} kg. Target 10 clean reps across all working sets (currently ${avgReps.toFixed(1)} avg) before overloading.`,
              });
            }
          }

          const dynamicRecovery: RecoveryStatus[] = Array.from(trainedMuscles).map((m) => ({
            muscle_group: m,
            readiness: 'Ready in 48h (Supercompensation Window)',
            recovery_percent: 35,
          }));
          dynamicRecovery.push({
            muscle_group: 'Central Nervous System',
            readiness: 'Supercompensated in 24–36h',
            recovery_percent: 85,
          });

          setSummary({
            session_id: latestSession.id,
            split_name: latestSession.split_name || 'Maximum Hypertrophy Session',
            split_type: latestSession.split_type || 'PULL_A',
            duration_minutes: latestSession.duration_minutes || 42,
            completed_sets: hardSets.length || 12,
            total_volume_kg: Number(latestSession.total_volume_kg) || 0,
            progression_verdicts: dynamicVerdicts.length > 0 ? dynamicVerdicts : summary.progression_verdicts,
            recovery_statuses: dynamicRecovery,
          });
        }
      } catch (e) {
        console.error('Failed to load session summary:', e);
      }
    }

    loadSummary();
    fetchSessions();
  }, [fetchSessions]);

  // CSV Export
  const handleExportCSV = () => {
    try {
      const headers = ['Exercise Name', 'Status', 'Next Cycle Verdict', 'Biomechanical Recommendation'];
      const rows = summary.progression_verdicts.map((v) => [
        `"${v.exercise_name}"`,
        `"${v.status}"`,
        `"${v.verdict_badge}"`,
        `"${v.recommendation.replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `kinetic_hud_${summary.split_type || 'workout'}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setCsvStatus('downloaded');
      setTimeout(() => setCsvStatus('idle'), 3000);
      showToast('CSV Exported Successfully');
    } catch (err) {
      console.error('CSV export failed:', err);
    }
  };

  // --- CRUD: Delete Session ---
  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionToDelete.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPastSessions((prev) => prev.filter((s) => s.id !== sessionToDelete.id));
        showToast(`Session "${sessionToDelete.split_name}" and linked sets removed`);
        // If the deleted session was currently in the recap, reset session_id
        if (summary.session_id === sessionToDelete.id) {
          setSummary((prev) => ({ ...prev, session_id: undefined }));
        }
      } else {
        showToast('Failed to delete session. Please retry.');
      }
    } catch (err) {
      console.error('Error deleting session:', err);
      showToast('Error deleting session.');
    } finally {
      setIsDeleting(false);
      setSessionToDelete(null);
    }
  };

  // --- CRUD: Open Workout Editor ---
  const handleOpenEdit = (session: PastSession) => {
    setEditingSession(session);
    setEditFormData({
      split_name: session.split_name,
      duration_minutes: session.duration_minutes,
      energy_score: session.energy_score || 4,
      exercises: JSON.parse(JSON.stringify(session.exercises)), // Deep clone
    });
  };

  // --- CRUD: Update Set Values Inline ---
  const handleSetChange = (exerciseIdx: number, setIdx: number, field: 'weight_kg' | 'reps' | 'rpe', value: number) => {
    if (!editFormData) return;
    const nextExercises = [...editFormData.exercises];
    const targetSet = nextExercises[exerciseIdx].sets[setIdx];
    nextExercises[exerciseIdx].sets[setIdx] = {
      ...targetSet,
      [field]: value,
    };
    setEditFormData({ ...editFormData, exercises: nextExercises });
  };

  // --- CRUD: Remove Single Set ---
  const handleRemoveSet = async (exerciseIdx: number, setIdx: number) => {
    if (!editFormData || !editingSession) return;
    const targetSet = editFormData.exercises[exerciseIdx].sets[setIdx];

    // If set exists in DB, delete it via API immediately or when saved
    if (targetSet.id && !targetSet.is_new) {
      try {
        await fetch(`/api/sets/${targetSet.id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Set deletion error:', err);
      }
    }

    const nextExercises = [...editFormData.exercises];
    nextExercises[exerciseIdx].sets.splice(setIdx, 1);
    // Renumber remaining sets
    nextExercises[exerciseIdx].sets = nextExercises[exerciseIdx].sets.map((s, i) => ({
      ...s,
      set_number: i + 1,
    }));

    setEditFormData({ ...editFormData, exercises: nextExercises });
  };

  // --- CRUD: Add Set to Exercise ---
  const handleAddSetToExercise = (exerciseIdx: number) => {
    if (!editFormData) return;
    const nextExercises = [...editFormData.exercises];
    const prevSets = nextExercises[exerciseIdx].sets;
    const lastWeight = prevSets.length > 0 ? prevSets[prevSets.length - 1].weight_kg : 20;

    nextExercises[exerciseIdx].sets.push({
      set_number: prevSets.length + 1,
      weight_kg: lastWeight,
      reps: 10,
      rpe: 8.0,
      is_new: true,
    });

    setEditFormData({ ...editFormData, exercises: nextExercises });
  };

  // --- CRUD: Delete Entire Exercise from Session ---
  const handleRemoveExercise = async (exerciseIdx: number) => {
    if (!editFormData || !editingSession) return;
    const targetExercise = editFormData.exercises[exerciseIdx];

    if (targetExercise.exercise_id) {
      try {
        await fetch(`/api/sessions/${editingSession.id}/exercises/${targetExercise.exercise_id}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.warn('Exercise deletion error:', err);
      }
    }

    const nextExercises = [...editFormData.exercises];
    nextExercises.splice(exerciseIdx, 1);
    setEditFormData({ ...editFormData, exercises: nextExercises });
  };

  // --- CRUD: Add Missed Exercise ---
  const handleAddMissedExercise = () => {
    if (!editFormData || !selectedAddExerciseId) return;
    const exMeta = availableExercises.find((e) => e.id === selectedAddExerciseId);
    if (!exMeta) return;

    // Check if already in exercise list
    const existing = editFormData.exercises.find((e) => e.exercise_id === exMeta.id);
    if (existing) {
      showToast(`${exMeta.canonical_name} already in this session`);
      return;
    }

    const newExercise: SessionExercise = {
      exercise_id: exMeta.id,
      canonical_name: exMeta.canonical_name,
      primary_muscle: exMeta.primary_muscle,
      sets: [
        {
          set_number: 1,
          weight_kg: 20,
          reps: 10,
          rpe: 8.0,
          is_new: true,
        },
      ],
    };

    setEditFormData({
      ...editFormData,
      exercises: [...editFormData.exercises, newExercise],
    });
    showToast(`Added ${exMeta.canonical_name}`);
  };

  // --- CRUD: Save Changes & Trigger Recalculate ---
  const handleSaveEditChanges = async () => {
    if (!editingSession || !editFormData) return;
    setIsSavingEdit(true);

    try {
      const sessionId = editingSession.id;

      // 1. Update session metadata
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          split_name: editFormData.split_name,
          duration_minutes: editFormData.duration_minutes,
          energy_score: editFormData.energy_score,
        }),
      });

      // 2. Persist updated sets and newly added sets
      for (const ex of editFormData.exercises) {
        for (const st of ex.sets) {
          if (st.is_new) {
            await fetch(`/api/sessions/${sessionId}/sets`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                exercise_id: ex.exercise_id,
                set_number: st.set_number,
                weight_kg: st.weight_kg,
                reps: st.reps,
                rpe: st.rpe,
              }),
            });
          } else if (st.id) {
            await fetch(`/api/sets/${st.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                weight_kg: st.weight_kg,
                reps: st.reps,
                rpe: st.rpe,
                set_number: st.set_number,
              }),
            });
          }
        }
      }

      // 3. Trigger recalculate endpoint
      const recalcRes = await fetch(`/api/sessions/${sessionId}/recalculate`, {
        method: 'POST',
      });

      if (recalcRes.ok) {
        const recalcData = await recalcRes.json();
        // Update recap if it's the current session
        if (summary.session_id === sessionId) {
          setSummary({
            session_id: sessionId,
            split_name: recalcData.split_name,
            split_type: recalcData.split_type,
            duration_minutes: recalcData.duration_minutes,
            completed_sets: recalcData.completed_sets,
            total_volume_kg: recalcData.total_volume_kg,
            progression_verdicts: recalcData.progression_verdicts || [],
            recovery_statuses: recalcData.recovery_statuses || [],
          });
        }
      }

      showToast('Workout changes saved and progression recalculated!');
      setEditingSession(null);
      setEditFormData(null);
      fetchSessions();
    } catch (err) {
      console.error('Failed to save workout updates:', err);
      showToast('Error saving changes. Please retry.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Helper date formatter
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <>
      <HUDHeader title="Training Logbook" />

      <main className="flex flex-col relative w-full pt-16 pb-36 px-4 max-w-lg mx-auto">
        <div className="flex flex-col w-full space-y-4">
          {/* Top-Level Tab Switcher */}
          <div className="flex items-center p-1 bg-[#141824] border border-[#242b3d] rounded-2xl shadow-md">
            <button
              type="button"
              onClick={() => setActiveTab('recap')}
              className={`flex-1 py-2.5 rounded-xl font-headline text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'recap'
                  ? 'bg-[#4edea3] text-[#003824] shadow-md'
                  : 'text-[#86948a] hover:text-[#dfe2ef]'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">insights</span>
              <span>Today&apos;s Recap</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('history');
                fetchSessions();
              }}
              className={`flex-1 py-2.5 rounded-xl font-headline text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-[#4edea3] text-[#003824] shadow-md'
                  : 'text-[#86948a] hover:text-[#dfe2ef]'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">history</span>
              <span>History Logbook</span>
              {pastSessions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#003824] text-[#4edea3]">
                  {pastSessions.length}
                </span>
              )}
            </button>
          </div>

          {/* Feedback Toast */}
          {feedbackToast && (
            <div className="p-3 bg-[#003824] border border-[#4edea3] text-[#4edea3] rounded-xl text-xs font-metric font-semibold flex items-center gap-2 shadow-lg animate-fadeIn">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{feedbackToast}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: TODAY'S RECAP                                     */}
          {/* ======================================================== */}
          {activeTab === 'recap' && (
            <>
              {/* Header Card: Pure Athletic Telemetry */}
              <div className="rounded-xl bg-[#1c1f29] p-4 shadow-lg flex flex-col gap-3 border border-[#1F2937]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-[#4edea3]/15 flex items-center justify-center text-[#4edea3]">
                      <span className="material-symbols-outlined text-[24px]">verified</span>
                    </div>
                    <div>
                      <span className="font-metric text-[10px] text-[#4edea3] uppercase font-bold tracking-widest">
                        SESSION LOGGED • HYPERTROPHY AUDIT
                      </span>
                      <h1 className="font-headline text-[19px] font-bold text-[#dfe2ef]">
                        {summary.split_name}
                      </h1>
                    </div>
                  </div>
                </div>

                {/* Core Actionable Metrics */}
                <div className="grid grid-cols-2 gap-3 bg-[#0f131c] rounded-xl p-3 border border-[#262a34]">
                  <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#181b25]/60">
                    <span className="font-metric text-[11px] text-[#86948a] uppercase tracking-wider font-semibold">
                      Session Duration
                    </span>
                    <span className="font-metric text-2xl font-bold text-[#dfe2ef] mt-0.5">
                      {summary.duration_minutes} <span className="text-sm font-normal text-[#86948a]">MINS</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#181b25]/60">
                    <span className="font-metric text-[11px] text-[#86948a] uppercase tracking-wider font-semibold">
                      Hard Working Sets
                    </span>
                    <span className="font-metric text-2xl font-bold text-[#4edea3] mt-0.5">
                      {summary.completed_sets} <span className="text-sm font-normal text-[#86948a]">SETS</span>
                    </span>
                    <span className="font-metric text-[10px] text-[#86948a]">0–2 RIR Ceiling</span>
                  </div>
                </div>

                {/* Quick Edit button for today's session if logged */}
                {summary.session_id && (
                  <button
                    type="button"
                    onClick={() => {
                      const match = pastSessions.find((s) => s.id === summary.session_id);
                      if (match) handleOpenEdit(match);
                      else {
                        setActiveTab('history');
                        showToast('Locate session in History to edit');
                      }
                    }}
                    className="w-full py-2 bg-[#262f3e] hover:bg-[#344054] text-[#dfe2ef] rounded-lg text-xs font-headline font-bold uppercase flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit_note</span>
                    <span>Edit Logged Exercises / Sets</span>
                  </button>
                )}
              </div>

              {/* Actionable Next-Session Targets Section */}
              <section className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#4edea3]">bolt</span>
                    <h2 className="font-headline text-[16px] text-[#dfe2ef] font-semibold">
                      Actionable Next-Session Targets
                    </h2>
                  </div>
                  <span className="font-metric text-[10px] text-[#86948a] uppercase tracking-wider">
                    Double Progression
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {summary.progression_verdicts.map((verdict, idx) => {
                    const isApproved = verdict.status.toLowerCase().includes('approved') || verdict.verdict_badge.includes('+');
                    const isPlateau = verdict.status.toLowerCase().includes('plateau');

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col p-3.5 rounded-xl border transition-all ${
                          isPlateau
                            ? 'bg-[#ef4444]/10 border-[#ef4444]/30'
                            : isApproved
                            ? 'bg-[#181b25] border-[#4edea3]/30 shadow-sm'
                            : 'bg-[#181b25] border-[#353943]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="font-headline text-[15px] text-[#dfe2ef] font-semibold">
                              {verdict.exercise_name}
                            </span>
                            <span className={`font-metric text-[11px] font-bold mt-0.5 ${
                              isPlateau ? 'text-[#ef4444]' : isApproved ? 'text-[#4edea3]' : 'text-[#ffb95f]'
                            }`}>
                              {verdict.status.toUpperCase()}
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded font-metric text-xs font-bold shrink-0 border ${
                              isPlateau
                                ? 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/40'
                                : isApproved
                                ? 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/30'
                                : 'bg-[#ffb95f]/15 text-[#ffb95f] border-[#ffb95f]/30'
                            }`}
                          >
                            {verdict.verdict_badge}
                          </span>
                        </div>

                        <p className="font-body text-[12px] text-[#bbcabf] mt-2 leading-relaxed">
                          {verdict.recommendation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Muscle Recovery Decay Bars */}
              <section className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#ffb95f]">hourglass_top</span>
                    <h2 className="font-headline text-[16px] text-[#dfe2ef] font-semibold">
                      Muscle Recovery Decay Windows
                    </h2>
                  </div>
                  <span className="font-metric text-[10px] text-[#86948a] uppercase tracking-wider">
                    Supercompensation
                  </span>
                </div>

                <div className="bg-[#181b25] rounded-xl p-4 border border-[#1F2937] flex flex-col gap-3.5 shadow-sm">
                  {summary.recovery_statuses.map((rec, idx) => (
                    <div key={idx} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-headline font-semibold text-[#dfe2ef]">
                          {rec.muscle_group}
                        </span>
                        <span className="font-metric text-[11px] text-[#bbcabf]">
                          {rec.readiness}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#262a34] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            rec.recovery_percent >= 80
                              ? 'bg-[#4edea3]'
                              : rec.recovery_percent >= 50
                              ? 'bg-[#93c5fd]'
                              : 'bg-[#ffb95f]'
                          }`}
                          style={{ width: `${rec.recovery_percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ======================================================== */}
          {/* TAB 2: HISTORY LOGBOOK & CRUD MANAGER                    */}
          {/* ======================================================== */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="font-headline text-[17px] text-[#dfe2ef] font-bold tracking-tight">
                    Session Timeline
                  </h2>
                  <p className="font-body text-[12px] text-[#86948a]">
                    Complete history of logged workouts and set telemetry
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchSessions}
                  className="p-2 rounded-lg bg-[#1c2230] text-[#86948a] hover:text-[#4edea3] transition-colors"
                  title="Refresh Timeline"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                </button>
              </div>

              {isLoadingHistory ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3">
                  <span className="animate-spin material-symbols-outlined text-[#4edea3] text-[32px]">
                    progress_activity
                  </span>
                  <span className="font-body text-xs text-[#86948a]">Loading workout history...</span>
                </div>
              ) : pastSessions.length === 0 ? (
                <div className="p-8 text-center bg-[#181b25] border border-[#2b3548] rounded-2xl flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[#86948a] text-[40px]">fitness_center</span>
                  <h3 className="font-headline text-base text-[#dfe2ef] font-semibold">No Logged Sessions Found</h3>
                  <p className="font-body text-xs text-[#86948a] max-w-xs">
                    Complete your first workout to record volume, set metrics, and auto-regulation telemetry.
                  </p>
                </div>
              ) : (
                pastSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-[#1c1f29] rounded-2xl p-4 border border-[#2b3548] shadow-md flex flex-col gap-3 transition-all hover:border-[#4edea3]/40"
                  >
                    {/* Header: Date + Split + Duration */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-[#4edea3]/15 text-[#4edea3] font-metric text-[10px] font-bold uppercase tracking-wider">
                            {session.split_type || 'WORKOUT'}
                          </span>
                          <span className="font-metric text-[11px] text-[#86948a]">
                            {formatDate(session.created_at)}
                          </span>
                        </div>
                        <h3 className="font-headline text-[16px] font-bold text-[#dfe2ef] mt-1">
                          {session.split_name}
                        </h3>
                      </div>

                      {/* Top Action Buttons: Edit & Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(session)}
                          className="w-8 h-8 rounded-lg bg-[#242b3d] hover:bg-[#344054] text-[#bbcabf] hover:text-[#4edea3] flex items-center justify-center transition-colors"
                          title="Edit Workout"
                        >
                          <span className="material-symbols-outlined text-[17px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSessionToDelete(session)}
                          className="w-8 h-8 rounded-lg bg-[#242b3d] hover:bg-[#3d1f24] text-[#bbcabf] hover:text-[#ff6e6e] flex items-center justify-center transition-colors"
                          title="Delete Session"
                        >
                          <span className="material-symbols-outlined text-[17px]">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Stats Ribbon */}
                    <div className="grid grid-cols-3 gap-2 bg-[#121620] rounded-xl p-2.5 border border-[#232938] text-center">
                      <div className="flex flex-col">
                        <span className="font-metric text-[9px] uppercase text-[#86948a] font-semibold">
                          Duration
                        </span>
                        <span className="font-metric text-[13px] font-bold text-[#dfe2ef]">
                          {session.duration_minutes}m
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-metric text-[9px] uppercase text-[#86948a] font-semibold">
                          Volume
                        </span>
                        <span className="font-metric text-[13px] font-bold text-[#4edea3]">
                          {Math.round(session.total_volume_kg)}kg
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-metric text-[9px] uppercase text-[#86948a] font-semibold">
                          Sets Done
                        </span>
                        <span className="font-metric text-[13px] font-bold text-[#dfe2ef]">
                          {session.total_sets}
                        </span>
                      </div>
                    </div>

                    {/* Exercise Chips with Set Summaries */}
                    <div className="flex flex-col gap-1.5 mt-0.5">
                      {session.exercises.map((ex) => (
                        <div
                          key={ex.exercise_id}
                          className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-[#141824] border border-[#232938]"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]" />
                            <span className="font-body text-[#dfe2ef] font-medium truncate">
                              {ex.canonical_name}
                            </span>
                            <span className="text-[10px] text-[#86948a] uppercase font-metric">
                              ({ex.primary_muscle})
                            </span>
                          </div>
                          <span className="font-metric text-[11px] text-[#bbcabf] shrink-0 font-semibold">
                            {ex.sets.length} sets •{' '}
                            {ex.sets.length > 0 ? `${ex.sets[0].weight_kg}kg` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Action Dock (Bottom Bar) */}
        <div className="fixed bottom-0 left-0 right-0 p-4 max-w-lg mx-auto bg-gradient-to-t from-[#0f131c] via-[#0f131c]/95 to-transparent z-40">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex-1 h-12 rounded-xl bg-[#262a34] text-[#dfe2ef] font-headline text-xs font-bold flex items-center justify-center gap-2 border border-[#353943] active:scale-95 transition-all hover:bg-[#31353f]"
            >
              <span className="material-symbols-outlined text-[18px]">
                {csvStatus === 'downloaded' ? 'check' : 'file_download'}
              </span>
              <span>{csvStatus === 'downloaded' ? 'EXPORTED' : 'EXPORT CSV'}</span>
            </button>

            <button
              type="button"
              onClick={() => router.push('/readiness')}
              className="flex-[1.5] h-12 rounded-xl bg-[#4edea3] text-[#003824] font-headline text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-[#4edea3]/20"
            >
              <span>COCKPIT • HOME</span>
              <span className="material-symbols-outlined text-[18px]">home</span>
            </button>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* DELETE CONFIRMATION MODAL                                */}
      {/* ======================================================== */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-[#161a26] border border-[#ff6e6e]/40 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-[#ff6e6e]">
              <div className="w-10 h-10 rounded-full bg-[#ff6e6e]/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">delete_forever</span>
              </div>
              <div>
                <h3 className="font-headline text-base font-bold text-[#dfe2ef]">
                  Delete Session?
                </h3>
                <span className="font-metric text-[11px] text-[#ff9999] uppercase font-semibold">
                  Permanent Cascade Deletion
                </span>
              </div>
            </div>

            <p className="font-body text-xs text-[#bbcabf] leading-relaxed">
              Are you sure you want to permanently delete &ldquo;
              <strong className="text-[#dfe2ef]">{sessionToDelete.split_name}</strong>
              &rdquo; logged on {formatDate(sessionToDelete.created_at)}? All associated set logs and telemetry will be removed.
            </p>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-[#242b3d] hover:bg-[#344054] text-xs font-headline font-bold text-[#dfe2ef] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-[#ef4444] hover:bg-[#dc2626] text-xs font-headline font-bold text-white transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
              >
                {isDeleting ? (
                  <span className="animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
                ) : (
                  <span>Confirm Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* WORKOUT EDITOR MODAL / DRAWER                            */}
      {/* ======================================================== */}
      {editingSession && editFormData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xl bg-[#141824] border border-[#2b3548] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-[#191f2e] border-b border-[#242b3d] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#4edea3]/20 flex items-center justify-center text-[#4edea3]">
                  <span className="material-symbols-outlined text-[20px]">edit_note</span>
                </div>
                <div>
                  <h3 className="font-headline text-[16px] font-bold text-[#dfe2ef]">
                    Edit Workout Session
                  </h3>
                  <span className="font-metric text-[10px] text-[#86948a] uppercase">
                    ID: {editingSession.id.slice(0, 8)} • {formatDate(editingSession.created_at)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingSession(null);
                  setEditFormData(null);
                }}
                className="w-8 h-8 rounded-full bg-[#242b3d] text-[#bbcabf] hover:text-white flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* Session-Level Metadata Inputs */}
              <div className="bg-[#191f2e] p-3 rounded-xl border border-[#2b3548] grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 flex flex-col gap-1">
                  <label className="font-metric text-[10px] text-[#86948a] uppercase font-semibold">
                    Split Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.split_name}
                    onChange={(e) => setEditFormData({ ...editFormData, split_name: e.target.value })}
                    className="h-10 px-3 bg-[#0a0d14] rounded-lg border border-[#2b3548] text-xs text-[#dfe2ef] focus:outline-none focus:border-[#4edea3]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-metric text-[10px] text-[#86948a] uppercase font-semibold">
                    Duration (mins)
                  </label>
                  <input
                    type="number"
                    value={editFormData.duration_minutes}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, duration_minutes: parseInt(e.target.value, 10) || 0 })
                    }
                    className="h-10 px-3 bg-[#0a0d14] rounded-lg border border-[#2b3548] text-xs text-[#dfe2ef] focus:outline-none focus:border-[#4edea3]"
                  />
                </div>
              </div>

              {/* Exercises and Sets List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h4 className="font-headline text-sm font-bold text-[#dfe2ef]">
                    Exercises &amp; Sets
                  </h4>
                  <span className="font-metric text-[10px] text-[#86948a] uppercase">
                    {editFormData.exercises.length} Movements
                  </span>
                </div>

                {editFormData.exercises.map((ex, exIdx) => (
                  <div
                    key={`${ex.exercise_id}-${exIdx}`}
                    className="bg-[#191f2e] border border-[#2b3548] rounded-xl p-3 flex flex-col gap-2.5"
                  >
                    {/* Exercise Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-headline text-[14px] font-bold text-[#dfe2ef]">
                          {ex.canonical_name}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#4edea3]/10 text-[#4edea3] font-metric text-[9px] uppercase font-bold">
                          {ex.primary_muscle}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(exIdx)}
                        className="text-[#ff6e6e] hover:text-[#ff9999] text-xs flex items-center gap-1 font-headline font-semibold"
                        title="Remove Entire Exercise"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    </div>

                    {/* Sets Table */}
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-12 gap-2 px-2 text-[10px] font-metric uppercase text-[#86948a]">
                        <span className="col-span-2">Set</span>
                        <span className="col-span-4">Weight (kg)</span>
                        <span className="col-span-3">Reps</span>
                        <span className="col-span-2">RPE</span>
                        <span className="col-span-1 text-right">Del</span>
                      </div>

                      {ex.sets.map((st, setIdx) => (
                        <div
                          key={st.id || `new-set-${setIdx}`}
                          className="grid grid-cols-12 gap-2 items-center bg-[#0a0d14] p-1.5 rounded-lg border border-[#232938]"
                        >
                          <span className="col-span-2 font-metric text-xs font-bold text-[#dfe2ef] pl-1">
                            #{st.set_number}
                          </span>
                          <input
                            type="number"
                            step="0.5"
                            value={st.weight_kg}
                            onChange={(e) =>
                              handleSetChange(exIdx, setIdx, 'weight_kg', parseFloat(e.target.value) || 0)
                            }
                            className="col-span-4 h-8 px-2 bg-[#161a26] rounded border border-[#2b3548] text-xs font-metric text-[#4edea3] font-bold focus:outline-none focus:border-[#4edea3]"
                          />
                          <input
                            type="number"
                            value={st.reps}
                            onChange={(e) =>
                              handleSetChange(exIdx, setIdx, 'reps', parseInt(e.target.value, 10) || 0)
                            }
                            className="col-span-3 h-8 px-2 bg-[#161a26] rounded border border-[#2b3548] text-xs font-metric text-[#dfe2ef] focus:outline-none focus:border-[#4edea3]"
                          />
                          <input
                            type="number"
                            step="0.5"
                            value={st.rpe}
                            onChange={(e) =>
                              handleSetChange(exIdx, setIdx, 'rpe', parseFloat(e.target.value) || 8.0)
                            }
                            className="col-span-2 h-8 px-2 bg-[#161a26] rounded border border-[#2b3548] text-xs font-metric text-[#bbcabf] focus:outline-none focus:border-[#4edea3]"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveSet(exIdx, setIdx)}
                            className="col-span-1 text-[#86948a] hover:text-[#ff6e6e] flex justify-end"
                            title="Remove Set"
                          >
                            <span className="material-symbols-outlined text-[17px]">close</span>
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Set Button */}
                    <button
                      type="button"
                      onClick={() => handleAddSetToExercise(exIdx)}
                      className="w-full py-1.5 rounded-lg bg-[#232938] hover:bg-[#2c3447] text-[#4edea3] font-headline text-[11px] font-bold uppercase transition-colors flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      <span>Add Set</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Missed Exercise Section */}
              <div className="bg-[#191f2e] p-3.5 rounded-xl border border-[#2b3548] flex flex-col gap-2">
                <span className="font-headline text-xs font-bold text-[#dfe2ef] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#4edea3] text-[16px]">add_circle</span>
                  <span>Record Missed Exercise Retrospectively</span>
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedAddExerciseId}
                    onChange={(e) => setSelectedAddExerciseId(e.target.value)}
                    className="flex-1 h-10 px-3 bg-[#0a0d14] rounded-lg border border-[#2b3548] text-xs text-[#dfe2ef] focus:outline-none focus:border-[#4edea3]"
                  >
                    {availableExercises.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.canonical_name} ({e.primary_muscle})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddMissedExercise}
                    className="h-10 px-3.5 rounded-lg bg-[#262f3e] hover:bg-[#344054] text-[#4edea3] text-xs font-headline font-bold uppercase"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer: Save & Cancel */}
            <div className="p-3 bg-[#121620] border-t border-[#242b3d] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingSession(null);
                  setEditFormData(null);
                }}
                disabled={isSavingEdit}
                className="py-2.5 px-4 rounded-xl bg-[#242b3d] hover:bg-[#344054] text-xs font-headline font-bold text-[#dfe2ef]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditChanges}
                disabled={isSavingEdit}
                className="flex-1 py-2.5 rounded-xl bg-[#4edea3] hover:bg-[#10b981] text-[#003824] text-xs font-headline font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <>
                    <span className="animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
                    <span>Saving &amp; Recalculating...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>Save Changes &amp; Recalculate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
