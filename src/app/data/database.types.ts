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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      access_tickets: {
        Row: {
          building_id: string
          created_at: string | null
          current_usage: number | null
          expires_at: string | null
          floor: number | null
          host_id: string | null
          id: string
          invite_code: string
          max_usage: number | null
          pass_type: string
          room_id: string | null
          valid_from: string | null
        }
        Insert: {
          building_id: string
          created_at?: string | null
          current_usage?: number | null
          expires_at?: string | null
          floor?: number | null
          host_id?: string | null
          id?: string
          invite_code: string
          max_usage?: number | null
          pass_type: string
          room_id?: string | null
          valid_from?: string | null
        }
        Update: {
          building_id?: string
          created_at?: string | null
          current_usage?: number | null
          expires_at?: string | null
          floor?: number | null
          host_id?: string | null
          id?: string
          invite_code?: string
          max_usage?: number | null
          pass_type?: string
          room_id?: string | null
          valid_from?: string | null
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          activity_type: string | null
          category: Database["public"]["Enums"]["activity_category"]
          changes: Json | null
          detail: string | null
          entity_id: string | null
          entity_type: string | null
          id: number
          log_type: Database["public"]["Enums"]["activity_log_type"]
          meta: Json | null
          new_data: Json | null
          old_data: Json | null
          site_id: string | null
          status: Database["public"]["Enums"]["activity_status"]
          time: string
          user_id: string
          user_name: string
        }
        Insert: {
          action: string
          activity_type?: string | null
          category: Database["public"]["Enums"]["activity_category"]
          changes?: Json | null
          detail?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          log_type: Database["public"]["Enums"]["activity_log_type"]
          meta?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          site_id?: string | null
          status: Database["public"]["Enums"]["activity_status"]
          time?: string
          user_id: string
          user_name: string
        }
        Update: {
          action?: string
          activity_type?: string | null
          category?: Database["public"]["Enums"]["activity_category"]
          changes?: Json | null
          detail?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          log_type?: Database["public"]["Enums"]["activity_log_type"]
          meta?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          site_id?: string | null
          status?: Database["public"]["Enums"]["activity_status"]
          time?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_activity_site"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "parking_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_activity_site"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_structure_view"
            referencedColumns: ["site_id"]
          },
        ]
      }
      blacklist_records: {
        Row: {
          building_id: string | null
          created_at: string | null
          created_by: string | null
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["blacklist_entity_type"]
          id: string
          identifier_value: string
          reason: string | null
          status: Database["public"]["Enums"]["blacklist_status"] | null
          updated_at: string | null
        }
        Insert: {
          building_id?: string | null
          created_at?: string | null
          created_by?: string | null
          entity_id?: string | null
          entity_type: Database["public"]["Enums"]["blacklist_entity_type"]
          id?: string
          identifier_value: string
          reason?: string | null
          status?: Database["public"]["Enums"]["blacklist_status"] | null
          updated_at?: string | null
        }
        Update: {
          building_id?: string | null
          created_at?: string | null
          created_by?: string | null
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["blacklist_entity_type"]
          id?: string
          identifier_value?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["blacklist_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      buildings: {
        Row: {
          address: string | null
          allowed_user_types: string[] | null
          capacity: number | null
          category: string | null
          close_time: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          lat: number | null
          lng: number | null
          map_x: number | null
          map_y: number | null
          name: string
          open_time: string | null
          parking_site_id: string
          price_info: string | null
          role_prices: Json | null
          schedule_config: Json | null
          user_types: string | null
        }
        Insert: {
          address?: string | null
          allowed_user_types?: string[] | null
          capacity?: number | null
          category?: string | null
          close_time?: string | null
          id: string
          images?: string[] | null
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          map_x?: number | null
          map_y?: number | null
          name: string
          open_time?: string | null
          parking_site_id: string
          price_info?: string | null
          role_prices?: Json | null
          schedule_config?: Json | null
          user_types?: string | null
        }
        Update: {
          address?: string | null
          allowed_user_types?: string[] | null
          capacity?: number | null
          category?: string | null
          close_time?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          map_x?: number | null
          map_y?: number | null
          name?: string
          open_time?: string | null
          parking_site_id?: string
          price_info?: string | null
          role_prices?: Json | null
          schedule_config?: Json | null
          user_types?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buildings_parking_site_id_fkey"
            columns: ["parking_site_id"]
            isOneToOne: false
            referencedRelation: "parking_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_parking_site_id_fkey"
            columns: ["parking_site_id"]
            isOneToOne: false
            referencedRelation: "site_structure_view"
            referencedColumns: ["site_id"]
          },
        ]
      }
      cars: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          image: string | null
          is_active: boolean | null
          is_default: boolean | null
          license_plate: string
          model: string | null
          profile_id: string
          province: string | null
          rank: number | null
          updated_at: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          vehicle_type_code: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          license_plate: string
          model?: string | null
          profile_id: string
          province?: string | null
          rank?: number | null
          updated_at?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          vehicle_type_code?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          license_plate?: string
          model?: string | null
          profile_id?: string
          province?: string | null
          rank?: number | null
          updated_at?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          vehicle_type_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cars_user_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      e_stamps: {
        Row: {
          created_at: string | null
          discount_amount: number | null
          discount_percentage: number | null
          free_hours: number
          id: string
          max_discount_amount: number | null
          note: string | null
          reservation_id: string
          shop_id: string
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          free_hours?: number
          id?: string
          max_discount_amount?: number | null
          note?: string | null
          reservation_id: string
          shop_id: string
        }
        Update: {
          created_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          free_hours?: number
          id?: string
          max_discount_amount?: number | null
          note?: string | null
          reservation_id?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "e_stamps_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_stamps_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_store: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          created_at: string | null
          event_data: Json
          event_type: string
          id: number
          version: number
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          created_at?: string | null
          event_data: Json
          event_type: string
          id?: number
          version: number
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          created_at?: string | null
          event_data?: Json
          event_type?: string
          id?: number
          version?: number
        }
        Relationships: []
      }
      floors: {
        Row: {
          building_id: string
          id: string
          layout_data: Json | null
          level_order: number | null
          name: string
        }
        Insert: {
          building_id: string
          id: string
          layout_data?: Json | null
          level_order?: number | null
          name: string
        }
        Update: {
          building_id?: string
          id?: string
          layout_data?: Json | null
          level_order?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "floors_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floors_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "site_structure_view"
            referencedColumns: ["building_id"]
          },
        ]
      }
      gate_attendance: {
        Row: {
          access_id: string
          check_in_at: string | null
          check_out_at: string | null
          id: string
          location_id: string | null
          profile_id: string
          status: string | null
        }
        Insert: {
          access_id: string
          check_in_at?: string | null
          check_out_at?: string | null
          id?: string
          location_id?: string | null
          profile_id: string
          status?: string | null
        }
        Update: {
          access_id?: string
          check_in_at?: string | null
          check_out_at?: string | null
          id?: string
          location_id?: string | null
          profile_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_attendance_access_id_fkey"
            columns: ["access_id"]
            isOneToOne: false
            referencedRelation: "user_door_access"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_attendance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      latest_versions: {
        Row: {
          aggregate_id: string
          latest_event_data: Json | null
          updated_at: string | null
          version: number
        }
        Insert: {
          aggregate_id: string
          latest_event_data?: Json | null
          updated_at?: string | null
          version?: number
        }
        Update: {
          aggregate_id?: string
          latest_event_data?: Json | null
          updated_at?: string | null
          version?: number
        }
        Relationships: []
      }
      parking_sites: {
        Row: {
          closing_time: string | null
          code: string
          description: string | null
          id: string
          name: string
          opening_time: string | null
          status: Database["public"]["Enums"]["site_status"]
          timezone: string | null
          timezone_offset: number | null
        }
        Insert: {
          closing_time?: string | null
          code: string
          description?: string | null
          id: string
          name: string
          opening_time?: string | null
          status?: Database["public"]["Enums"]["site_status"]
          timezone?: string | null
          timezone_offset?: number | null
        }
        Update: {
          closing_time?: string | null
          code?: string
          description?: string | null
          id?: string
          name?: string
          opening_time?: string | null
          status?: Database["public"]["Enums"]["site_status"]
          timezone?: string | null
          timezone_offset?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string | null
          created_at: string
          email: string | null
          id: string
          line_id: string | null
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          role_level: number | null
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          email?: string | null
          id?: string
          line_id?: string | null
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          role_level?: number | null
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          email?: string | null
          id?: string
          line_id?: string | null
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          role_level?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      recent_activities: {
        Row: {
          created_at: string | null
          end_time: string | null
          id: number
          profile_id: string
          reservation_id: string
          slot_id: string | null
          start_time: string | null
          status: string | null
          updated_at: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"] | null
          vehicle_type_code: number | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          id?: number
          profile_id: string
          reservation_id: string
          slot_id?: string | null
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
          vehicle_type_code?: number | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          id?: number
          profile_id?: string
          reservation_id?: string
          slot_id?: string | null
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
          vehicle_type_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recent_activities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          booking_type: Database["public"]["Enums"]["booking_type"] | null
          car_id: string | null
          car_plate: string | null
          end_time: string | null
          floor_id: string | null
          id: string
          parking_site_id: string
          profile_id: string
          reserved_at: string | null
          slot_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          status_code: string | null
          updated_at: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          vehicle_type_code: number | null
          version: number
        }
        Insert: {
          booking_type?: Database["public"]["Enums"]["booking_type"] | null
          car_id?: string | null
          car_plate?: string | null
          end_time?: string | null
          floor_id?: string | null
          id?: string
          parking_site_id: string
          profile_id: string
          reserved_at?: string | null
          slot_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          status_code?: string | null
          updated_at?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          vehicle_type_code?: number | null
          version?: number
        }
        Update: {
          booking_type?: Database["public"]["Enums"]["booking_type"] | null
          car_id?: string | null
          car_plate?: string | null
          end_time?: string | null
          floor_id?: string | null
          id?: string
          parking_site_id?: string
          profile_id?: string
          reserved_at?: string | null
          slot_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          status_code?: string | null
          updated_at?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          vehicle_type_code?: number | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "reservations_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "site_structure_view"
            referencedColumns: ["floor_id"]
          },
          {
            foreignKeyName: "reservations_parking_site_id_fkey"
            columns: ["parking_site_id"]
            isOneToOne: false
            referencedRelation: "parking_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_parking_site_id_fkey"
            columns: ["parking_site_id"]
            isOneToOne: false
            referencedRelation: "site_structure_view"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "reservations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations_history: {
        Row: {
          description: string
          details: Json | null
          id: number
          reservation_id: string
          timestamp: string | null
        }
        Insert: {
          description: string
          details?: Json | null
          id?: number
          reservation_id: string
          timestamp?: string | null
        }
        Update: {
          description?: string
          details?: Json | null
          id?: number
          reservation_id?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      slot_status_overrides: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          override_date: string
          slot_id: string
          start_time: string
          status: Database["public"]["Enums"]["slot_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          override_date: string
          slot_id: string
          start_time: string
          status: Database["public"]["Enums"]["slot_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          override_date?: string
          slot_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slot_status_overrides_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
        ]
      }
      slots: {
        Row: {
          details: string | null
          floor_id: string
          id: string
          name: string
          parking_site_id: string
          slot_number: number | null
          status: Database["public"]["Enums"]["slot_status"]
          updated_at: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          vehicle_type_code: number | null
          version: number
          zone_id: string
        }
        Insert: {
          details?: string | null
          floor_id: string
          id: string
          name: string
          parking_site_id: string
          slot_number?: number | null
          status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          vehicle_type_code?: number | null
          version?: number
          zone_id: string
        }
        Update: {
          details?: string | null
          floor_id?: string
          id?: string
          name?: string
          parking_site_id?: string
          slot_number?: number | null
          status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          vehicle_type_code?: number | null
          version?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slots_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slots_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "site_structure_view"
            referencedColumns: ["floor_id"]
          },
          {
            foreignKeyName: "slots_parking_site_id_fkey"
            columns: ["parking_site_id"]
            isOneToOne: false
            referencedRelation: "parking_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slots_parking_site_id_fkey"
            columns: ["parking_site_id"]
            isOneToOne: false
            referencedRelation: "site_structure_view"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "slots_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "site_structure_view"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "slots_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      snapshots: {
        Row: {
          aggregate_id: string
          created_at: string | null
          snapshot_data: Json
          version: number
        }
        Insert: {
          aggregate_id: string
          created_at?: string | null
          snapshot_data: Json
          version: number
        }
        Update: {
          aggregate_id?: string
          created_at?: string | null
          snapshot_data?: Json
          version?: number
        }
        Relationships: []
      }
      user_bookmarks: {
        Row: {
          building_id: string
          created_at: string | null
          user_id: string
        }
        Insert: {
          building_id: string
          created_at?: string | null
          user_id: string
        }
        Update: {
          building_id?: string
          created_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bookmarks_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bookmarks_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "site_structure_view"
            referencedColumns: ["building_id"]
          },
        ]
      }
      user_door_access: {
        Row: {
          door_id: string
          granted_at: string
          granted_by: string | null
          id: string
          is_granted: boolean
          profile_id: string
          valid_until: string | null
        }
        Insert: {
          door_id: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_granted?: boolean
          profile_id: string
          valid_until?: string | null
        }
        Update: {
          door_id?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_granted?: boolean
          profile_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_door_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_door_access_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          email: string
          id: string
          name: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          updated_at: string | null
          version: number
        }
        Insert: {
          email: string
          id: string
          name?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string | null
          version?: number
        }
        Update: {
          email?: string
          id?: string
          name?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string | null
          version?: number
        }
        Relationships: []
      }
      zones: {
        Row: {
          floor_id: string
          id: string
          name: string
        }
        Insert: {
          floor_id: string
          id: string
          name: string
        }
        Update: {
          floor_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "zones_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zones_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "site_structure_view"
            referencedColumns: ["floor_id"]
          },
        ]
      }
    }
    Views: {
      site_structure_view: {
        Row: {
          building_id: string | null
          building_name: string | null
          floor_id: string | null
          floor_name: string | null
          level_order: number | null
          site_id: string | null
          site_name: string | null
          supported_vehicle_types: number[] | null
          zone_id: string | null
          zone_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_vehicle_with_log: {
        Args: {
          p_color: string
          p_image: string
          p_is_default: boolean
          p_license_plate: string
          p_model: string
          p_province: string
          p_user_id: string
          p_user_name: string
          p_vehicle_type: string
        }
        Returns: {
          color: string | null
          created_at: string | null
          id: string
          image: string | null
          is_active: boolean | null
          is_default: boolean | null
          license_plate: string
          model: string | null
          profile_id: string
          province: string | null
          rank: number | null
          updated_at: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          vehicle_type_code: number | null
        }
        SetofOptions: {
          from: "*"
          to: "cars"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_slot_status_with_log: {
        Args: {
          p_slot_ids: string[]
          p_status: Database["public"]["Enums"]["slot_status"]
          p_user_id: string
          p_user_name: string
        }
        Returns: undefined
      }
      admin_upsert_slot_overrides_with_log: {
        Args: {
          p_override_date: string
          p_ranges: Json
          p_slot_id: string
          p_user_id: string
          p_user_name: string
        }
        Returns: undefined
      }
      auto_cancel_expired_pending_reservations: { Args: never; Returns: number }
      check_is_blacklisted: {
        Args: {
          p_building_id?: string
          p_entity_type: Database["public"]["Enums"]["blacklist_entity_type"]
          p_identifier: string
        }
        Returns: boolean
      }
      check_user_door_access: {
        Args: { p_door_id: string; p_profile_id: string }
        Returns: boolean
      }
      claim_invite_code: {
        Args: { p_code: string; p_visitor_id: string }
        Returns: Json
      }
      claim_parking_invite: {
        Args: { p_code: string; p_visitor_id: string }
        Returns: Json
      }
      create_reservation_with_log: {
        Args: {
          p_booking_type: string
          p_car_id: string
          p_car_plate: string
          p_end_time: string
          p_floor_id: string
          p_profile_id: string
          p_reserve_status: string
          p_site_id: string
          p_slot_id: string
          p_start_time: string
          p_user_id: string
          p_user_name: string
          p_vehicle_type: string
        }
        Returns: Json
      }
      create_reservation_with_log2: {
        Args: {
          p_booking_type: string
          p_car_id: string
          p_car_plate: string
          p_end_time: string
          p_floor_id: string
          p_profile_id: string
          p_reserve_status: string
          p_site_id: string
          p_slot_id: string
          p_start_time: string
          p_user_id: string
          p_user_name: string
          p_vehicle_type: string
        }
        Returns: {
          booking_type: Database["public"]["Enums"]["booking_type"] | null
          car_id: string | null
          car_plate: string | null
          end_time: string | null
          floor_id: string | null
          id: string
          parking_site_id: string
          profile_id: string
          reserved_at: string | null
          slot_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          status_code: string | null
          updated_at: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          vehicle_type_code: number | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_vehicle_with_log: {
        Args: { p_user_id: string; p_user_name: string; p_vehicle_id: string }
        Returns: {
          color: string | null
          created_at: string | null
          id: string
          image: string | null
          is_active: boolean | null
          is_default: boolean | null
          license_plate: string
          model: string | null
          profile_id: string
          province: string | null
          rank: number | null
          updated_at: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          vehicle_type_code: number | null
        }
        SetofOptions: {
          from: "*"
          to: "cars"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      find_best_available_slot: {
        Args: { p_end_time: string; p_start_time: string; p_zone_id: string }
        Returns: Json
      }
      get_building_availability: {
        Args: {
          p_building_id: string
          p_end_time: string
          p_start_time: string
          p_vehicle_type?: string
        }
        Returns: Json
      }
      get_building_slots_availability: {
        Args: {
          p_building_id: string
          p_duration_minutes?: number
          p_end_time: string
          p_interval_minutes: number
          p_start_time: string
          p_vehicle_type: string
        }
        Returns: {
          available_count: number
          reserved_count: number
          slot_time: string
          total_capacity: number
        }[]
      }
      get_building_slots_status: {
        Args: { p_building_id: string }
        Returns: {
          current_status: string
          floor_id: string
          floor_name: string
          level_order: number
          main_status: string
          slot_id: string
          slot_name: string
          slot_number: number
          zone_id: string
          zone_name: string
        }[]
      }
      get_parking_fee: { Args: { res_id: string }; Returns: Json }
      get_site_availability: {
        Args: {
          p_end_time: string
          p_site_id: string
          p_start_time: string
          p_vehicle_type?: string
        }
        Returns: Json
      }
      get_site_buildings: {
        Args: {
          p_lat?: number
          p_lng?: number
          p_site_id: string
          p_user_id?: string
        }
        Returns: Json
      }
      grant_user_door_access: {
        Args: {
          p_door_id: string
          p_granted_by?: string
          p_is_granted?: boolean
          p_profile_id: string
          p_valid_until?: string
        }
        Returns: Json
      }
      insert_activity_log: {
        Args: {
          p_action: string
          p_category: Database["public"]["Enums"]["activity_category"]
          p_changes: Json
          p_detail: string
          p_entity_id: string
          p_entity_type: string
          p_log_type: Database["public"]["Enums"]["activity_log_type"]
          p_meta?: Json
          p_new_data?: Json
          p_old_data?: Json
          p_site_id: string
          p_status: Database["public"]["Enums"]["activity_status"]
          p_user_id: string
          p_user_name: string
        }
        Returns: undefined
      }
      process_gate_access: {
        Args: {
          p_access_id: string
          p_door_id: string
          p_scanner_name?: string
        }
        Returns: Json
      }
      save_events_and_update_version:
        | {
            Args: {
              p_aggregate_id: string
              p_events: Json
              p_expected_version: number
              p_new_version: number
            }
            Returns: undefined
          }
        | {
            Args: {
              p_aggregate_id: string
              p_events: Json
              p_expected_version: number
              p_latest_event_data: Json
              p_new_version: number
            }
            Returns: undefined
          }
      update_config_with_log: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_updates: Json
          p_user_id: string
          p_user_name: string
        }
        Returns: undefined
      }
      update_multiple_entities_with_log: {
        Args: { p_payload: Json; p_user_id: string; p_user_name: string }
        Returns: undefined
      }
      update_profile_with_log: {
        Args: {
          p_actor_id: string
          p_actor_name: string
          p_updates: Json
          p_user_id: string
        }
        Returns: {
          avatar: string | null
          created_at: string
          email: string | null
          id: string
          line_id: string | null
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          role_level: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_reservation_status_with_log: {
        Args: {
          p_new_status: string
          p_reservation_id: string
          p_user_id: string
          p_user_name: string
        }
        Returns: {
          booking_type: Database["public"]["Enums"]["booking_type"] | null
          car_id: string | null
          car_plate: string | null
          end_time: string | null
          floor_id: string | null
          id: string
          parking_site_id: string
          profile_id: string
          reserved_at: string | null
          slot_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          status_code: string | null
          updated_at: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          vehicle_type_code: number | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_vehicle_with_log: {
        Args: {
          p_color: string
          p_image: string
          p_is_default: boolean
          p_license_plate: string
          p_model: string
          p_province: string
          p_user_id: string
          p_user_name: string
          p_vehicle_id: string
        }
        Returns: {
          color: string | null
          created_at: string | null
          id: string
          image: string | null
          is_active: boolean | null
          is_default: boolean | null
          license_plate: string
          model: string | null
          profile_id: string
          province: string | null
          rank: number | null
          updated_at: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          vehicle_type_code: number | null
        }
        SetofOptions: {
          from: "*"
          to: "cars"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      activity_category: "normal" | "abnormal"
      activity_log_type: "revision" | "activity"
      activity_status: "success" | "warning" | "denied" | "error"
      blacklist_entity_type: "user" | "vehicle"
      blacklist_status: "active" | "inactive"
      booking_type: "hourly" | "flat_24h" | "monthly_regular" | "monthly_night"
      reservation_status:
        | "pending"
        | "checked_in"
        | "checked_out"
        | "cancelled"
        | "confirmed"
        | "pending_payment"
        | "active"
        | "checked_in_pending_payment"
        | "pending_invite"
      site_status: "active" | "inactive" | "maintenance"
      slot_status: "available" | "reserved" | "occupied" | "maintenance"
      user_role: "User" | "Host" | "Visitor" | "Admin"
      user_status: "active" | "inactive" | "suspended"
      vehicle_type: "car" | "motorcycle" | "ev" | "other"
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
      activity_category: ["normal", "abnormal"],
      activity_log_type: ["revision", "activity"],
      activity_status: ["success", "warning", "denied", "error"],
      blacklist_entity_type: ["user", "vehicle"],
      blacklist_status: ["active", "inactive"],
      booking_type: ["hourly", "flat_24h", "monthly_regular", "monthly_night"],
      reservation_status: [
        "pending",
        "checked_in",
        "checked_out",
        "cancelled",
        "confirmed",
        "pending_payment",
        "active",
        "checked_in_pending_payment",
        "pending_invite",
      ],
      site_status: ["active", "inactive", "maintenance"],
      slot_status: ["available", "reserved", "occupied", "maintenance"],
      user_role: ["User", "Host", "Visitor", "Admin"],
      user_status: ["active", "inactive", "suspended"],
      vehicle_type: ["car", "motorcycle", "ev", "other"],
    },
  },
} as const
