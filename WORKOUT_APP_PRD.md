# Product Requirement Document (PRD): Adaptive Hypertrophy Engine (Kinetic HUD)

## 1. Executive Summary & Core Value Proposition

An autonomous, adaptive mobile Progressive Web App (PWA) engineered for strength athletes. The system provides real-time workout auto-regulation (protecting sore joints, adapting to time limits, and calculating double progression) paired with an industrial high-contrast cockpit UI ("Kinetic HUD").

---

## 2. Design System: Kinetic HUD Specifications

### Color Tokens (Tailwind & CSS Variables)

- **Canvas / Surface Lowest:** `#0a0e17` / `#0f131c` (Deep Obsidian / Midnight slate)
- **Container Elevated Surfaces:**
  - `surface-container-low`: `#181b25`
  - `surface-container`: `#1c1f29`
  - `surface-container-high`: `#262a34`
  - `surface-container-highest`: `#31353f`
- **Primary Kinetic Accent:** `#4edea3` / `#10b981` (Mint Emerald — progression, completed sets, forward velocity)
- **Secondary Recovery Accent:** `#ffb95f` / `#ee9800` (Warm Amber — fatigue flags, swaps, rest alerts)
- **Tertiary / Joint Stress Alert:** `#ff7a73` / `#ffb4ab` (Crimson — physiological soreness, load reduction)
- **Typography Scale:**
  - Titles: `Space Grotesk` (SemiBold / Bold)
  - Telemetry & Metrics: `JetBrains Mono` (Weights, reps, timers, caps labels)
  - Copy & Cues: `Inter` (Neutral readability)

---

## 3. System Architecture & The 4 Screen Modules

```text
                    [Mobile PWA Client (Kinetic HUD)]
   +-------------------+-------------------+-------------------+
   |                   |                   |                   |
   v                   v                   v                   v
[Screen 1:         [Screen 2:          [Screen 3:          [Screen 4:
 Readiness          Active HUD          Equipment           Session Summary
 Check-in]          Set-Logging]        Profiles]           & Feedback]
   |                   |                   |                   |
   +-------------------+---------+---------+-------------------+
                                 | REST API (FastAPI)
                                 v
                     [Mediator & Coach Engine]
             +-------------------+-------------------+
             |                                       |
             v                                       v
  [Gemini 1.5/2.0 Flash]                  [Database: Supabase / Postgres]
   - Dynamic Auto-Regulation               - pgvector Canonical Matching
   - Double Progression Logic              - Self-Healing Alias Memory
   - Movement Substitution Rules           - Equipment State & Set Logs
```

---

## 4. Frontend Screen Specifications & State Flows

### Screen 1: Pre-Workout Readiness Check-in (`/readiness`)

- **Telemetry Header:** Active status pill `SYS REV 4.2.0 • SYNC 98%`.
- **Time Selection:** Segmented cards for `30 MIN` (Express), `45 MIN` (Standard), `60 MIN` (Full), `75+ MIN` (High Volume) + fine-tune slider (30–90m).
- **Energy Level:** 5-point tactile numeric matrix (1=Low, 2=Fair, 3=Good, 4=High, 5=Peak) with dynamic feedback badge (`Normal Intensity Target` vs `Deload Mode`).
- **Soreness & Problem Areas:** 2-column multi-select grid with auto-protection tags (`Lower Back`, `Right Shoulder`, `Knees`, `Elbows`, `Chest`, `Hamstrings`).
- **Adjustment Callout Preview:** Live natural-language preview explaining substitutions (e.g., *"Deadlifts swapped for Chest-Supported Rows to protect your lower back"*).
- **Primary CTA:** Sticky bottom button `Start Workout • [X] Mins ->` with estimated completion time.

### Screen 2: Active Workout HUD (`/workout`)

- **Sub-Header:** Split title (e.g., `Pull Day A`), focus subtitle, and exercise index badge (`Exercise 2 of 5`) with progress meter.
- **Sticky Rest Timer:** Viewport-pinned pill (`01:45`) with `+30s` button and `restart_alt` icon.
- **Active Exercise Module:**
  - Movement Index: `02 · Chest-Supported Row` + info modal toggle.
  - Prescription Badge: `Target: 3 sets x 8–10 reps @ 32.5 kg`.
  - Biomechanical Form Cue Banner: High-visibility amber card with actionable execution cues.
  - **Set Matrix Grid:**
    - Previous set: Marked completed with checkmark.
    - Active set: Steppers for `Weight (KG)` (`-` / `+` in 2.5kg increments) and `Reps` (`-` / `+` in 1-rep steps).
  - **Confirmation Button:** `Log Set [N]` with instant tactile transition to next set.
- **Bottom Navigation Dock:** Fixed thumb-zone bar with `Add / Swap` and `Save & Finish Session`.

### Screen 3: Equipment Inventory (`/equipment`)

- **Presets Switcher:** Horizontal scroll pills (`Commercial Gym (Full)`, `Home / Garage`, `Hotel / Travel`).
- **Live Counter Diagnostics:** Two metric cards displaying `Available: 15 items` and `Excluded: 4 items (Auto-swapped)`.
- **Equipment Groups:**
  - **Free Weights:** Barbell, Dumbbells, Squat Rack, Adjustable Bench, Preacher Bench.
  - **Cables & Machines:** Cable Crossover, Lat Pulldown, Cable Row, Hack Squat, Leg Press, Leg Extension/Curl.
- **Auto-Swap Indicator:** When a machine is toggled OFF, display the fallback movement (e.g., *Off: Hack Squat -> Auto-swap: Leg Press / Belt Squat*).
- **Custom Equipment Input:** Form field allowing dynamic chip additions (`Safety Squat Bar`, `Trap Bar`).

### Screen 4: Post-Workout Telemetry & Summary (`/summary`)

- **Celebration Banner:** Session duration (`44 mins`), sets completed (`14 / 14`), volume delta (`+640 KG PR`).
- **Key Metrics Grid (3-column):** `Total Volume (kg)`, `Completed Sets`, and `Avg Rest Time (m)`.
- **Auto-Calculated Progression Targets:** Next session targets based on double-progression thresholds (e.g., `+2.5 KG` upgrade vs `HOLD AT 180 KG`).
- **Recovery Status Bars:** Estimated recovery decay timers with percentage bars (`Upper Back: 2 days`, `Biceps: Ready tomorrow`, `Lower Back: Fresh`).
- **Actions:** Primary `Done • Back to Home` and `Export CSV` share button.

---

## 5. PostgreSQL Schema (Supabase)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- User Equipment Inventory
CREATE TABLE user_equipment (
    user_id UUID NOT NULL,
    equipment_tag VARCHAR(50) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    fallback_recommendation VARCHAR(100),
    PRIMARY KEY (user_id, equipment_tag)
);

-- Canonical Exercise Library
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_name VARCHAR(120) NOT NULL UNIQUE,
    primary_muscle VARCHAR(50) NOT NULL,
    movement_pattern VARCHAR(50) NOT NULL,
    equipment_tag VARCHAR(50) NOT NULL,
    joint_stress_flags TEXT[] DEFAULT '{}',
    gif_url TEXT NOT NULL,
    biomechanical_cue TEXT NOT NULL,
    embedding vector(768)
);

-- Self-Healing Alias Cache
CREATE TABLE exercise_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alias_name VARCHAR(120) NOT NULL UNIQUE,
    canonical_id UUID REFERENCES exercises(id) ON DELETE CASCADE
);

-- Workout Session & Performance Ledger
CREATE TABLE workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    split_name VARCHAR(50) NOT NULL,
    duration_minutes INT,
    energy_score INT,
    soreness_flags TEXT[],
    total_volume_kg NUMERIC(8,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE set_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercises(id),
    set_number INT NOT NULL,
    weight_kg NUMERIC(5,2) NOT NULL,
    reps INT NOT NULL,
    rpe NUMERIC(3,1) DEFAULT 8.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 6. Mediator & Auto-Regulation Rules

1. **Spinal Axial Offloading:** If `lower-back` soreness is flagged, exclude exercises tagged with `axial_spine` (Barbell Rows, Conventional/Romanian Deadlifts, Back Squats) and substitute with chest-supported machines, cable rows, or leg presses.
2. **Shoulder / Anterior Impingement:** If `shoulder` soreness is flagged, replace wide-grip straight-bar overhead pressing with neutral-grip dumbbell presses or converging chest press machines.
3. **Session Compression:**
   - If available time <= 30 min: Drop working sets from 3 to 2, trim secondary isolation exercises, and pair antagonist movements into supersets.
   - If available time >= 60 min: Standard 3–4 working sets per movement.
4. **Double Progression Rule:**
   - When all working sets for an exercise hit the prescribed rep ceiling (e.g., 3 sets of 10) at RPE <= 9, increase the next session target by +2.5 kg (isolation) or +5 kg (compound).
   - If reps fail to increase for 2 consecutive sessions at RPE 9+, rotate to a mechanical alternative targeting the same muscle length.
5. **Mediator Resolution Pipeline:**
   - Step 1: SQL check on `exercise_aliases` table (< 2ms).
   - Step 2: If cache miss, invoke Gemini Flash with candidate exercise subset.
   - Step 3: Write confirmed match to `exercise_aliases` table to ensure permanent sub-millisecond future queries.
