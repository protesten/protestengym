export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      body_measurements: {
        Row: {
          abdomen_cm: number | null
          arm_cm: number | null
          bicep_left_contracted_cm: number | null
          bicep_left_relaxed_cm: number | null
          bicep_right_contracted_cm: number | null
          bicep_right_relaxed_cm: number | null
          body_fat_pct: number | null
          calf_left_cm: number | null
          calf_right_cm: number | null
          chest_cm: number | null
          created_at: string
          date: string
          hip_cm: number | null
          id: string
          neck_cm: number | null
          notes: string | null
          subgluteal_right_cm: number | null
          thigh_cm: number | null
          thigh_left_contracted_cm: number | null
          thigh_left_relaxed_cm: number | null
          thigh_right_contracted_cm: number | null
          thigh_right_relaxed_cm: number | null
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          abdomen_cm?: number | null
          arm_cm?: number | null
          bicep_left_contracted_cm?: number | null
          bicep_left_relaxed_cm?: number | null
          bicep_right_contracted_cm?: number | null
          bicep_right_relaxed_cm?: number | null
          body_fat_pct?: number | null
          calf_left_cm?: number | null
          calf_right_cm?: number | null
          chest_cm?: number | null
          created_at?: string
          date?: string
          hip_cm?: number | null
          id?: string
          neck_cm?: number | null
          notes?: string | null
          subgluteal_right_cm?: number | null
          thigh_cm?: number | null
          thigh_left_contracted_cm?: number | null
          thigh_left_relaxed_cm?: number | null
          thigh_right_contracted_cm?: number | null
          thigh_right_relaxed_cm?: number | null
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          abdomen_cm?: number | null
          arm_cm?: number | null
          bicep_left_contracted_cm?: number | null
          bicep_left_relaxed_cm?: number | null
          bicep_right_contracted_cm?: number | null
          bicep_right_relaxed_cm?: number | null
          body_fat_pct?: number | null
          calf_left_cm?: number | null
          calf_right_cm?: number | null
          chest_cm?: number | null
          created_at?: string
          date?: string
          hip_cm?: number | null
          id?: string
          neck_cm?: number | null
          notes?: string | null
          subgluteal_right_cm?: number | null
          thigh_cm?: number | null
          thigh_left_contracted_cm?: number | null
          thigh_left_relaxed_cm?: number | null
          thigh_right_contracted_cm?: number | null
          thigh_right_relaxed_cm?: number | null
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          primary_muscle_ids: number[] | null
          secondary_muscle_ids: number[] | null
          tracking_type: Database["public"]["Enums"]["tracking_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          primary_muscle_ids?: number[] | null
          secondary_muscle_ids?: number[] | null
          tracking_type?: Database["public"]["Enums"]["tracking_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          primary_muscle_ids?: number[] | null
          secondary_muscle_ids?: number[] | null
          tracking_type?: Database["public"]["Enums"]["tracking_type"]
          user_id?: string
        }
        Relationships: []
      }
      muscles: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      predefined_exercises: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          primary_muscle_ids: number[] | null
          secondary_muscle_ids: number[] | null
          tracking_type: Database["public"]["Enums"]["tracking_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          primary_muscle_ids?: number[] | null
          secondary_muscle_ids?: number[] | null
          tracking_type?: Database["public"]["Enums"]["tracking_type"]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          primary_muscle_ids?: number[] | null
          secondary_muscle_ids?: number[] | null
          tracking_type?: Database["public"]["Enums"]["tracking_type"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          display_name: string | null
          height_cm: number | null
          id: string
          is_approved: boolean
          preferences: Json | null
          sex: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          height_cm?: number | null
          id?: string
          is_approved?: boolean
          preferences?: Json | null
          sex?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          height_cm?: number | null
          id?: string
          is_approved?: boolean
          preferences?: Json | null
          sex?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      program_weeks: {
        Row: {
          id: string
          notes: string | null
          program_id: string
          routine_id: string | null
          week_number: number
        }
        Insert: {
          id?: string
          notes?: string | null
          program_id: string
          routine_id?: string | null
          week_number: number
        }
        Update: {
          id?: string
          notes?: string | null
          program_id?: string
          routine_id?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_weeks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_weeks_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string
          deload_week: number | null
          id: string
          is_active: boolean
          name: string
          start_date: string | null
          user_id: string
          weeks: number
        }
        Insert: {
          created_at?: string
          deload_week?: number | null
          id?: string
          is_active?: boolean
          name: string
          start_date?: string | null
          user_id: string
          weeks?: number
        }
        Update: {
          created_at?: string
          deload_week?: number | null
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string | null
          user_id?: string
          weeks?: number
        }
        Relationships: []
      }
      routine_exercises: {
        Row: {
          exercise_id: string
          id: string
          order_index: number
          planned_sets: Json | null
          routine_id: string
        }
        Insert: {
          exercise_id: string
          id?: string
          order_index?: number
          planned_sets?: Json | null
          routine_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          order_index?: number
          planned_sets?: Json | null
          routine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_exercises_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      session_exercises: {
        Row: {
          exercise_id: string
          id: string
          order_index: number
          session_id: string
        }
        Insert: {
          exercise_id: string
          id?: string
          order_index?: number
          session_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          order_index?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          routine_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          routine_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          routine_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      sets: {
        Row: {
          created_at: string
          distance_meters: number | null
          duration_seconds: number | null
          id: string
          reps: number | null
          rpe: number | null
          session_exercise_id: string
          set_type: Database["public"]["Enums"]["set_type"]
          weight: number | null
        }
        Insert: {
          created_at?: string
          distance_meters?: number | null
          duration_seconds?: number | null
          id?: string
          reps?: number | null
          rpe?: number | null
          session_exercise_id: string
          set_type?: Database["public"]["Enums"]["set_type"]
          weight?: number | null
        }
        Update: {
          created_at?: string
          distance_meters?: number | null
          duration_seconds?: number | null
          id?: string
          reps?: number | null
          rpe?: number | null
          session_exercise_id?: string
          set_type?: Database["public"]["Enums"]["set_type"]
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sets_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "session_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_program: { Args: { _program_id: string }; Returns: boolean }
      owns_routine: { Args: { _routine_id: string }; Returns: boolean }
      owns_session: { Args: { _session_id: string }; Returns: boolean }
      owns_session_exercise: { Args: { _se_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      set_type: "warmup" | "approach" | "work"
      tracking_type: "weight_reps" | "reps_only" | "time_only" | "distance_time"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      set_type: ["warmup", "approach", "work"],
      tracking_type: ["weight_reps", "reps_only", "time_only", "distance_time"],
    },
  },
} as const
