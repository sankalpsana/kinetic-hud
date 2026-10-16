import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cuknlybldgmxoqejytyf.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1a25seWJsZGdteG9xZWp5dHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Nzk4MDEsImV4cCI6MjEwNzU1NTgwMX0.vQIvtnaU7wHX8SDgAl0XjGzZsMOPZe4JkR8NvflKiHE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

export type EquipmentCategory = 'free_weights' | 'cables' | 'machines' | 'accessories';

export interface UserEquipment {
  user_id: string;
  equipment_tag: string;
  category: EquipmentCategory;
  display_name: string;
  image_url?: string | null;
  is_available: boolean;
  fallback_recommendation?: string | null;
  resistance_curve?: string | null;
  common_gym_brands?: string | null;
}

export interface Exercise {
  id: string;
  canonical_name: string;
  primary_muscle: string;
  movement_pattern: string;
  equipment_tag: string;
  joint_stress_flags: string[];
  gif_url: string;
  biomechanical_cue: string;
  primary_split: 'PUSH' | 'PULL' | 'LEGS';
  split_rotation: 'A' | 'B';
  target_division: string;
  resistance_profile: 'lengthened' | 'shortened' | 'even';
  stability_tier: 'S' | 'A' | 'B' | 'C';
  rest_default_seconds: number;
  video_url?: string;
  poster_image_url?: string;
  target_muscle_svg_tag?: string;
  tempo_recommendation?: string;
}

export interface WorkoutSession {
  id?: string;
  user_id: string;
  split_name: string;
  split_type: 'PULL_A' | 'PULL_B' | 'PUSH_A' | 'PUSH_B' | 'LEGS_A' | 'LEGS_B';
  duration_minutes: number;
  energy_score: number;
  soreness_flags: string[];
  total_volume_kg: number;
  created_at?: string;
}

export interface SetLog {
  id?: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  rpe: number;
  created_at?: string;
}
