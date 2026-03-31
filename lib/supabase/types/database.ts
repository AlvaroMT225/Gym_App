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
      achievements: {
        Row: {
          category: Database["public"]["Enums"]["achievement_category"] | null
          created_at: string | null
          criteria: Json | null
          description: string | null
          icon_color: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          points: number | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["achievement_category"] | null
          created_at?: string | null
          criteria?: Json | null
          description?: string | null
          icon_color?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["achievement_category"] | null
          created_at?: string | null
          criteria?: Json | null
          description?: string | null
          icon_color?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points?: number | null
        }
        Relationships: []
      }
      admin_activity_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          gym_id: string | null
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          gym_id?: string | null
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          gym_id?: string | null
          id?: string
          ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_activity_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "admin_activity_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_activity_log_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          gym_id: string | null
          id: string
          is_active: boolean | null
          points_reward: number | null
          start_date: string
          target_type: string | null
          target_value: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          gym_id?: string | null
          id?: string
          is_active?: boolean | null
          points_reward?: number | null
          start_date: string
          target_type?: string | null
          target_value?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          gym_id?: string | null
          id?: string
          is_active?: boolean | null
          points_reward?: number | null
          start_date?: string
          target_type?: string | null
          target_value?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          athlete_id: string
          coach_id: string
          content: string
          created_at: string | null
          id: string
          is_private: boolean | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          coach_id: string
          content: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          coach_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "client_notes_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "client_notes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_alerts: {
        Row: {
          action_url: string | null
          alert_type: string
          athlete_id: string | null
          coach_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          priority: string | null
        }
        Insert: {
          action_url?: string | null
          alert_type: string
          athlete_id?: string | null
          coach_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          priority?: string | null
        }
        Update: {
          action_url?: string | null
          alert_type?: string
          athlete_id?: string | null
          coach_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          priority?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_alerts_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_alerts_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "coach_alerts_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_alerts_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_alerts_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "coach_alerts_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_calendar_events: {
        Row: {
          athlete_id: string | null
          coach_id: string
          created_at: string | null
          description: string | null
          end_time: string | null
          event_date: string
          event_type: string | null
          id: string
          is_recurring: boolean | null
          recurrence_pattern: Json | null
          start_time: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          athlete_id?: string | null
          coach_id: string
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          is_recurring?: boolean | null
          recurrence_pattern?: Json | null
          start_time?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string | null
          coach_id?: string
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          is_recurring?: boolean | null
          recurrence_pattern?: Json | null
          start_time?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_calendar_events_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_calendar_events_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "coach_calendar_events_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_calendar_events_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_calendar_events_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "coach_calendar_events_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_stats: {
        Row: {
          active_clients: number | null
          avg_client_retention_days: number | null
          coach_id: string
          created_at: string | null
          id: string
          total_clients: number | null
          total_proposals_sent: number | null
          total_routines_created: number | null
          updated_at: string | null
        }
        Insert: {
          active_clients?: number | null
          avg_client_retention_days?: number | null
          coach_id: string
          created_at?: string | null
          id?: string
          total_clients?: number | null
          total_proposals_sent?: number | null
          total_routines_created?: number | null
          updated_at?: string | null
        }
        Update: {
          active_clients?: number | null
          avg_client_retention_days?: number | null
          coach_id?: string
          created_at?: string | null
          id?: string
          total_clients?: number | null
          total_proposals_sent?: number | null
          total_routines_created?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_stats_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: true
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_stats_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: true
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "coach_stats_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          athlete_id: string
          coach_id: string
          created_at: string | null
          expires_at: string | null
          granted_at: string | null
          id: string
          is_hidden_by_athlete: boolean | null
          notes: string | null
          revoked_at: string | null
          revoked_reason: string | null
          scope: Database["public"]["Enums"]["consent_scope"][] | null
          status: Database["public"]["Enums"]["consent_status"] | null
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          coach_id: string
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          id?: string
          is_hidden_by_athlete?: boolean | null
          notes?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          scope?: Database["public"]["Enums"]["consent_scope"][] | null
          status?: Database["public"]["Enums"]["consent_status"] | null
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          coach_id?: string
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          id?: string
          is_hidden_by_athlete?: boolean | null
          notes?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          scope?: Database["public"]["Enums"]["consent_scope"][] | null
          status?: Database["public"]["Enums"]["consent_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "consents_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "consents_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          content: string | null
          content_type: string | null
          created_at: string | null
          created_by: string | null
          gym_id: string | null
          id: string
          image_url: string | null
          is_published: boolean | null
          published_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          gym_id?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          published_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          gym_id?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          published_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "content_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level: number | null
          equipment_type: Database["public"]["Enums"]["equipment_type"] | null
          gym_id: string | null
          id: string
          image_url: string | null
          instructions: string | null
          is_compound: boolean | null
          is_public: boolean | null
          machine_id: string | null
          muscle_groups: Database["public"]["Enums"]["muscle_group"][] | null
          name: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: number | null
          equipment_type?: Database["public"]["Enums"]["equipment_type"] | null
          gym_id?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_compound?: boolean | null
          is_public?: boolean | null
          machine_id?: string | null
          muscle_groups?: Database["public"]["Enums"]["muscle_group"][] | null
          name: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: number | null
          equipment_type?: Database["public"]["Enums"]["equipment_type"] | null
          gym_id?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_compound?: boolean | null
          is_public?: boolean | null
          machine_id?: string | null
          muscle_groups?: Database["public"]["Enums"]["muscle_group"][] | null
          name?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_schedules: {
        Row: {
          closes_at: string | null
          created_at: string | null
          day_of_week: number
          gym_id: string
          id: string
          is_closed: boolean | null
          opens_at: string | null
        }
        Insert: {
          closes_at?: string | null
          created_at?: string | null
          day_of_week: number
          gym_id: string
          id?: string
          is_closed?: boolean | null
          opens_at?: string | null
        }
        Update: {
          closes_at?: string | null
          created_at?: string | null
          day_of_week?: number
          gym_id?: string
          id?: string
          is_closed?: boolean | null
          opens_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_schedules_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          settings: Json | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          settings?: Json | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          settings?: Json | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      machine_tutorials: {
        Row: {
          content: string | null
          created_at: string | null
          difficulty_level: number | null
          duration_minutes: number | null
          gif_url: string | null
          id: string
          is_active: boolean | null
          machine_id: string
          order_index: number | null
          steps: Json | null
          title: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          difficulty_level?: number | null
          duration_minutes?: number | null
          gif_url?: string | null
          id?: string
          is_active?: boolean | null
          machine_id: string
          order_index?: number | null
          steps?: Json | null
          title: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          difficulty_level?: number | null
          duration_minutes?: number | null
          gif_url?: string | null
          id?: string
          is_active?: boolean | null
          machine_id?: string
          order_index?: number | null
          steps?: Json | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machine_tutorials_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          created_at: string | null
          description: string | null
          equipment_type: Database["public"]["Enums"]["equipment_type"] | null
          gym_id: string
          id: string
          image_url: string | null
          instructions: string | null
          last_maintenance: string | null
          location: string | null
          manufacturer: string | null
          model: string | null
          muscle_groups: Database["public"]["Enums"]["muscle_group"][] | null
          name: string
          purchase_date: string | null
          settings: Json | null
          status: Database["public"]["Enums"]["machine_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          equipment_type?: Database["public"]["Enums"]["equipment_type"] | null
          gym_id: string
          id?: string
          image_url?: string | null
          instructions?: string | null
          last_maintenance?: string | null
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          muscle_groups?: Database["public"]["Enums"]["muscle_group"][] | null
          name: string
          purchase_date?: string | null
          settings?: Json | null
          status?: Database["public"]["Enums"]["machine_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          equipment_type?: Database["public"]["Enums"]["equipment_type"] | null
          gym_id?: string
          id?: string
          image_url?: string | null
          instructions?: string | null
          last_maintenance?: string | null
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          muscle_groups?: Database["public"]["Enums"]["muscle_group"][] | null
          name?: string
          purchase_date?: string | null
          settings?: Json | null
          status?: Database["public"]["Enums"]["machine_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machines_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          auto_renew: boolean | null
          created_at: string | null
          created_by: string | null
          end_date: string | null
          gym_id: string
          id: string
          notes: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          price_paid: number | null
          profile_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["membership_status"] | null
          updated_at: string | null
        }
        Insert: {
          auto_renew?: boolean | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          gym_id: string
          id?: string
          notes?: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          price_paid?: number | null
          profile_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["membership_status"] | null
          updated_at?: string | null
        }
        Update: {
          auto_renew?: boolean | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          gym_id?: string
          id?: string
          notes?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          price_paid?: number | null
          profile_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["membership_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "memberships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          profile_id: string
          read_at: string | null
          sent_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"] | null
        }
        Insert: {
          body?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          profile_id: string
          read_at?: string | null
          sent_at?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"] | null
        }
        Update: {
          body?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          profile_id?: string
          read_at?: string | null
          sent_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders: {
        Row: {
          id: string
          method: string | null
          payment_id: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          id?: string
          method?: string | null
          payment_id: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          id?: string
          method?: string | null
          payment_id?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          due_date: string | null
          gym_id: string
          id: string
          membership_id: string | null
          method: Database["public"]["Enums"]["payment_method"] | null
          notes: string | null
          paid_at: string | null
          profile_id: string
          reference_code: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          gym_id: string
          id?: string
          membership_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"] | null
          notes?: string | null
          paid_at?: string | null
          profile_id: string
          reference_code?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          gym_id?: string
          id?: string
          membership_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"] | null
          notes?: string | null
          paid_at?: string | null
          profile_id?: string
          reference_code?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "payments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_records: {
        Row: {
          achieved_at: string | null
          created_at: string | null
          exercise_id: string
          id: string
          previous_value: number | null
          profile_id: string
          record_type: string | null
          set_id: string | null
          value: number
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string | null
          exercise_id: string
          id?: string
          previous_value?: number | null
          profile_id: string
          record_type?: string | null
          set_id?: string | null
          value: number
        }
        Update: {
          achieved_at?: string | null
          created_at?: string | null
          exercise_id?: string
          id?: string
          previous_value?: number | null
          profile_id?: string
          record_type?: string | null
          set_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "personal_records_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "workout_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      planned_sessions: {
        Row: {
          athlete_id: string
          coach_id: string
          content: Json | null
          created_at: string | null
          description: string | null
          id: string
          scheduled_at: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          coach_id: string
          content?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          scheduled_at: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          coach_id?: string
          content?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          scheduled_at?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planned_sessions_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_sessions_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "planned_sessions_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "planned_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      points_history: {
        Row: {
          created_at: string | null
          id: string
          points: number
          profile_id: string
          reason: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          points: number
          profile_id: string
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          points?: number
          profile_id?: string
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "points_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "points_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_preferences: {
        Row: {
          created_at: string
          profile_id: string
          rankings_opt_in: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          rankings_opt_in?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          rankings_opt_in?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "profile_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          coach_assigned_at: string | null
          coach_id: string | null
          created_at: string | null
          email: string | null
          emergency_contact: Json | null
          first_name: string | null
          gender: string | null
          gym_id: string | null
          height_cm: number | null
          id: string
          is_active: boolean | null
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          settings: Json | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          coach_assigned_at?: string | null
          coach_id?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact?: Json | null
          first_name?: string | null
          gender?: string | null
          gym_id?: string | null
          height_cm?: number | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          settings?: Json | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          coach_assigned_at?: string | null
          coach_id?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact?: Json | null
          first_name?: string | null
          gender?: string | null
          gym_id?: string | null
          height_cm?: number | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          settings?: Json | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          code: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_type: string | null
          discount_value: number
          expires_at: string | null
          gym_id: string
          id: string
          max_uses: number | null
          min_plan_type: Database["public"]["Enums"]["plan_type"] | null
          starts_at: string | null
          status: Database["public"]["Enums"]["promo_status"] | null
          title: string
          uses_count: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value: number
          expires_at?: string | null
          gym_id: string
          id?: string
          max_uses?: number | null
          min_plan_type?: Database["public"]["Enums"]["plan_type"] | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["promo_status"] | null
          title: string
          uses_count?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number
          expires_at?: string | null
          gym_id?: string
          id?: string
          max_uses?: number | null
          min_plan_type?: Database["public"]["Enums"]["plan_type"] | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["promo_status"] | null
          title?: string
          uses_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          athlete_id: string
          coach_id: string
          content: Json | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          responded_at: string | null
          response_notes: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["proposal_status"] | null
          title: string
          type: Database["public"]["Enums"]["proposal_type"] | null
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          coach_id: string
          content?: Json | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          responded_at?: string | null
          response_notes?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["proposal_status"] | null
          title: string
          type?: Database["public"]["Enums"]["proposal_type"] | null
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          coach_id?: string
          content?: Json | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          responded_at?: string | null
          response_notes?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["proposal_status"] | null
          title?: string
          type?: Database["public"]["Enums"]["proposal_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "proposals_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "proposals_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_scanned_at: string | null
          machine_id: string
          qr_image_url: string | null
          scans_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_scanned_at?: string | null
          machine_id: string
          qr_image_url?: string | null
          scans_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_scanned_at?: string | null
          machine_id?: string
          qr_image_url?: string | null
          scans_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_codes_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking_entries: {
        Row: {
          created_at: string | null
          id: string
          period_end: string | null
          period_start: string | null
          profile_id: string
          rank: number | null
          ranking_id: string
          value: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          profile_id: string
          rank?: number | null
          ranking_id: string
          value?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          profile_id?: string
          rank?: number | null
          ranking_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ranking_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "ranking_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_entries_ranking_id_fkey"
            columns: ["ranking_id"]
            isOneToOne: false
            referencedRelation: "rankings"
            referencedColumns: ["id"]
          },
        ]
      }
      rankings: {
        Row: {
          created_at: string | null
          gym_id: string
          id: string
          is_active: boolean | null
          metric: string
          name: string
          period_type: string | null
        }
        Insert: {
          created_at?: string | null
          gym_id: string
          id?: string
          is_active?: boolean | null
          metric: string
          name: string
          period_type?: string | null
        }
        Update: {
          created_at?: string | null
          gym_id?: string
          id?: string
          is_active?: boolean | null
          metric?: string
          name?: string
          period_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rankings_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_exercises: {
        Row: {
          created_at: string | null
          exercise_id: string
          id: string
          notes: string | null
          order_index: number | null
          reps_target: number | null
          rest_seconds: number | null
          routine_id: string
          sets_target: number | null
          weight_target: number | null
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number | null
          reps_target?: number | null
          rest_seconds?: number | null
          routine_id: string
          sets_target?: number | null
          weight_target?: number | null
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number | null
          reps_target?: number | null
          rest_seconds?: number | null
          routine_id?: string
          sets_target?: number | null
          weight_target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
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
          created_at: string | null
          created_by: string | null
          days_per_week: number | null
          description: string | null
          difficulty_level: number | null
          estimated_duration_minutes: number | null
          gym_id: string | null
          id: string
          is_active: boolean | null
          is_template: boolean | null
          name: string
          profile_id: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          days_per_week?: number | null
          description?: string | null
          difficulty_level?: number | null
          estimated_duration_minutes?: number | null
          gym_id?: string | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          name: string
          profile_id: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          days_per_week?: number | null
          description?: string | null
          difficulty_level?: number | null
          estimated_duration_minutes?: number | null
          gym_id?: string | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          name?: string
          profile_id?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "routines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "routines_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_machines: {
        Row: {
          accessed_at: string | null
          id: string
          machine_id: string
          qr_code_id: string | null
          session_id: string
        }
        Insert: {
          accessed_at?: string | null
          id?: string
          machine_id: string
          qr_code_id?: string | null
          session_id: string
        }
        Update: {
          accessed_at?: string | null
          id?: string
          machine_id?: string
          qr_code_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_machines_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_machines_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "qr_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_machines_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          gym_id: string
          id: string
          permissions: Json | null
          profile_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          gym_id: string
          id?: string
          permissions?: Json | null
          profile_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          gym_id?: string
          id?: string
          permissions?: Json | null
          profile_id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "staff_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "staff_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_roles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "staff_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      template_exercises: {
        Row: {
          created_at: string | null
          exercise_id: string
          id: string
          notes: string | null
          order_index: number | null
          reps_target: number | null
          rest_seconds: number | null
          sets_target: number | null
          template_id: string
          weight_target: number | null
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number | null
          reps_target?: number | null
          rest_seconds?: number | null
          sets_target?: number | null
          template_id: string
          weight_target?: number | null
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number | null
          reps_target?: number | null
          rest_seconds?: number | null
          sets_target?: number | null
          template_id?: string
          weight_target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "template_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_exercises_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          coach_id: string
          created_at: string | null
          days_per_week: number | null
          description: string | null
          difficulty_level: number | null
          estimated_duration_minutes: number | null
          id: string
          is_public: boolean | null
          muscle_groups: Database["public"]["Enums"]["muscle_group"][] | null
          name: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string | null
          days_per_week?: number | null
          description?: string | null
          difficulty_level?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          is_public?: boolean | null
          muscle_groups?: Database["public"]["Enums"]["muscle_group"][] | null
          name: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string | null
          days_per_week?: number | null
          description?: string | null
          difficulty_level?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          is_public?: boolean | null
          muscle_groups?: Database["public"]["Enums"]["muscle_group"][] | null
          name?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "templates_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          profile_id: string
          unlocked_at: string | null
        }
        Insert: {
          achievement_id: string
          id?: string
          profile_id: string
          unlocked_at?: string | null
        }
        Update: {
          achievement_id?: string
          id?: string
          profile_id?: string
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "user_achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenges: {
        Row: {
          challenge_id: string
          completed: boolean | null
          completed_at: string | null
          current_value: number | null
          id: string
          joined_at: string | null
          profile_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean | null
          completed_at?: string | null
          current_value?: number | null
          id?: string
          joined_at?: string | null
          profile_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean | null
          completed_at?: string | null
          current_value?: number | null
          id?: string
          joined_at?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_challenges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_challenges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "user_challenges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_promotions: {
        Row: {
          id: string
          profile_id: string
          promotion_id: string
          used_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          promotion_id: string
          used_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          promotion_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_promotions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_promotions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "user_promotions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_promotions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          achievements_count: number | null
          created_at: string | null
          current_streak: number | null
          id: string
          last_workout_at: string | null
          level: number | null
          longest_streak: number | null
          personal_records_count: number | null
          profile_id: string
          total_points: number | null
          total_reps: number | null
          total_sessions: number | null
          total_sets: number | null
          total_volume_kg: number | null
          updated_at: string | null
        }
        Insert: {
          achievements_count?: number | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_workout_at?: string | null
          level?: number | null
          longest_streak?: number | null
          personal_records_count?: number | null
          profile_id: string
          total_points?: number | null
          total_reps?: number | null
          total_sessions?: number | null
          total_sets?: number | null
          total_volume_kg?: number | null
          updated_at?: string | null
        }
        Update: {
          achievements_count?: number | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_workout_at?: string | null
          level?: number | null
          longest_streak?: number | null
          personal_records_count?: number | null
          profile_id?: string
          total_points?: number | null
          total_reps?: number | null
          total_sessions?: number | null
          total_sets?: number | null
          total_volume_kg?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stats_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "user_stats_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tutorial_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          profile_id: string
          progress_percent: number | null
          tutorial_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          profile_id: string
          progress_percent?: number | null
          tutorial_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          profile_id?: string
          progress_percent?: number | null
          tutorial_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tutorial_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tutorial_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "user_tutorial_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tutorial_progress_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: false
            referencedRelation: "machine_tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          gym_id: string | null
          id: string
          notes: string | null
          profile_id: string
          rating: number | null
          routine_id: string | null
          session_type: string | null
          started_at: string | null
          status: string | null
          total_reps: number | null
          total_sets: number | null
          total_volume_kg: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          gym_id?: string | null
          id?: string
          notes?: string | null
          profile_id: string
          rating?: number | null
          routine_id?: string | null
          session_type?: string | null
          started_at?: string | null
          status?: string | null
          total_reps?: number | null
          total_sets?: number | null
          total_volume_kg?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          gym_id?: string | null
          id?: string
          notes?: string | null
          profile_id?: string
          rating?: number | null
          routine_id?: string | null
          session_type?: string | null
          started_at?: string | null
          status?: string | null
          total_reps?: number | null
          total_sets?: number | null
          total_volume_kg?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "workout_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          exercise_id: string
          id: string
          is_personal_record: boolean | null
          notes: string | null
          origin: Database["public"]["Enums"]["set_origin"] | null
          reps_done: number | null
          rest_seconds: number | null
          rpe: number | null
          session_id: string
          set_number: number
          weight_kg: number | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          exercise_id: string
          id?: string
          is_personal_record?: boolean | null
          notes?: string | null
          origin?: Database["public"]["Enums"]["set_origin"] | null
          reps_done?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          session_id: string
          set_number: number
          weight_kg?: number | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          exercise_id?: string
          id?: string
          is_personal_record?: boolean | null
          notes?: string | null
          origin?: Database["public"]["Enums"]["set_origin"] | null
          reps_done?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          session_id?: string
          set_number?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      athlete_dashboard: {
        Row: {
          achievements_count: number | null
          avatar_url: string | null
          current_streak: number | null
          first_name: string | null
          gym_id: string | null
          id: string | null
          last_name: string | null
          last_workout_at: string | null
          level: number | null
          longest_streak: number | null
          membership_end_date: string | null
          membership_status:
            | Database["public"]["Enums"]["membership_status"]
            | null
          plan_type: Database["public"]["Enums"]["plan_type"] | null
          total_points: number | null
          total_sessions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_clients: {
        Row: {
          athlete_id: string | null
          avatar_url: string | null
          coach_id: string | null
          consent_id: string | null
          consent_status: Database["public"]["Enums"]["consent_status"] | null
          current_streak: number | null
          email: string | null
          expires_at: string | null
          first_name: string | null
          last_name: string | null
          last_workout_at: string | null
          level: number | null
          scope: Database["public"]["Enums"]["consent_scope"][] | null
          total_sessions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "athlete_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "consents_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_points_to_user: {
        Args: {
          p_points: number
          p_profile_id: string
          p_reason?: string
          p_reference_id?: string
          p_reference_type?: string
        }
        Returns: undefined
      }
      check_achievements: { Args: { p_profile_id: string }; Returns: undefined }
      check_expiring_consents: { Args: never; Returns: undefined }
      create_test_user: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_role?: Database["public"]["Enums"]["user_role"]
        }
        Returns: string
      }
      get_user_gym_id: { Args: never; Returns: string }
      has_active_consent: { Args: { p_athlete_id: string }; Returns: boolean }
      increment_promo_uses: {
        Args: { p_promotion_id: string }
        Returns: undefined
      }
      redeem_promotion: {
        Args: { p_code?: string | null; p_promotion_id?: string | null }
        Returns: {
          promotion_id: string
          redeemed_at: string
          uses_count: number
        }[]
      }
      increment_qr_scan: { Args: { p_qr_code: string }; Returns: undefined }
      is_coach: { Args: never; Returns: boolean }
      is_gym_admin: { Args: never; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action: string
          p_admin_id: string
          p_details?: Json
          p_entity_id?: string
          p_entity_type?: string
          p_gym_id: string
          p_ip_address?: string
        }
        Returns: undefined
      }
      same_gym_as: { Args: { p_profile_id: string }; Returns: boolean }
      send_notification: {
        Args: {
          p_body?: string
          p_data?: Json
          p_profile_id: string
          p_title: string
          p_type: Database["public"]["Enums"]["notification_type"]
        }
        Returns: string
      }
    }
    Enums: {
      achievement_category:
        | "consistency"
        | "strength"
        | "volume"
        | "milestone"
        | "social"
      consent_scope:
        | "view_progress"
        | "view_routines"
        | "manage_routines"
        | "view_personal_records"
        | "view_achievements"
        | "full_access"
      consent_status: "pending" | "active" | "revoked" | "expired"
      equipment_type:
        | "machine"
        | "free_weight"
        | "cable"
        | "bodyweight"
        | "cardio"
        | "resistance_band"
      machine_status: "available" | "in_use" | "maintenance" | "out_of_order"
      membership_status:
        | "pending"
        | "active"
        | "inactive"
        | "suspended"
        | "expired"
      muscle_group:
        | "chest"
        | "back"
        | "shoulders"
        | "biceps"
        | "triceps"
        | "arms"
        | "legs"
        | "glutes"
        | "core"
        | "full_body"
        | "cardio"
      notification_type:
        | "workout_reminder"
        | "achievement_unlocked"
        | "payment_due"
        | "consent_expiring"
        | "proposal_received"
        | "system_message"
      payment_method: "cash" | "card" | "transfer" | "app"
      payment_status: "pending" | "paid" | "overdue" | "cancelled" | "refunded"
      plan_type: "basic" | "premium" | "vip" | "custom"
      promo_status: "active" | "inactive" | "expired"
      proposal_status: "draft" | "sent" | "accepted" | "rejected" | "expired"
      proposal_type: "routine" | "goal" | "nutrition"
      set_origin: "manual" | "template" | "ai_suggested"
      user_role: "athlete" | "coach" | "admin" | "super_admin"
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
      achievement_category: [
        "consistency",
        "strength",
        "volume",
        "milestone",
        "social",
      ],
      consent_scope: [
        "view_progress",
        "view_routines",
        "manage_routines",
        "view_personal_records",
        "view_achievements",
        "full_access",
      ],
      consent_status: ["pending", "active", "revoked", "expired"],
      equipment_type: [
        "machine",
        "free_weight",
        "cable",
        "bodyweight",
        "cardio",
        "resistance_band",
      ],
      machine_status: ["available", "in_use", "maintenance", "out_of_order"],
      membership_status: [
        "pending",
        "active",
        "inactive",
        "suspended",
        "expired",
      ],
      muscle_group: [
        "chest",
        "back",
        "shoulders",
        "biceps",
        "triceps",
        "arms",
        "legs",
        "glutes",
        "core",
        "full_body",
        "cardio",
      ],
      notification_type: [
        "workout_reminder",
        "achievement_unlocked",
        "payment_due",
        "consent_expiring",
        "proposal_received",
        "system_message",
      ],
      payment_method: ["cash", "card", "transfer", "app"],
      payment_status: ["pending", "paid", "overdue", "cancelled", "refunded"],
      plan_type: ["basic", "premium", "vip", "custom"],
      promo_status: ["active", "inactive", "expired"],
      proposal_status: ["draft", "sent", "accepted", "rejected", "expired"],
      proposal_type: ["routine", "goal", "nutrition"],
      set_origin: ["manual", "template", "ai_suggested"],
      user_role: ["athlete", "coach", "admin", "super_admin"],
    },
  },
} as const

// ==================== Type aliases ====================
// Shorthand types used by lib/supabase/queries/* and API routes.
// Generated from the Database type using the helpers above.

// Enum types
export type UserRole = Enums<"user_role">
export type PromoStatus = Enums<"promo_status">

// Update types
export type ProfileUpdate = TablesUpdate<"profiles">
export type MachineUpdate = TablesUpdate<"machines">

// Insert types
export type WorkoutSessionInsert = TablesInsert<"workout_sessions">
export type WorkoutSetInsert = TablesInsert<"workout_sets">
export type RoutineInsert = TablesInsert<"routines">
export type RoutineExerciseInsert = TablesInsert<"routine_exercises">
