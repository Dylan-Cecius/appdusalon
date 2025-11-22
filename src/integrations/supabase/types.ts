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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          barber_id: string | null
          client_name: string
          client_phone: string
          created_at: string
          employee_id: string | null
          end_time: string
          id: string
          is_paid: boolean
          notes: string | null
          salon_id: string | null
          services: Json
          start_time: string
          status: string
          total_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          barber_id?: string | null
          client_name: string
          client_phone: string
          created_at?: string
          employee_id?: string | null
          end_time: string
          id?: string
          is_paid?: boolean
          notes?: string | null
          salon_id?: string | null
          services: Json
          start_time: string
          status?: string
          total_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          barber_id?: string | null
          client_name?: string
          client_phone?: string
          created_at?: string
          employee_id?: string | null
          end_time?: string
          id?: string
          is_paid?: boolean
          notes?: string | null
          salon_id?: string | null
          services?: Json
          start_time?: string
          status?: string
          total_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      automated_reports: {
        Row: {
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          frequency: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          next_send_at: string | null
          recipient_emails: string[]
          report_name: string
          report_types: string[]
          time_of_day: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          frequency: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          next_send_at?: string | null
          recipient_emails?: string[]
          report_name: string
          report_types?: string[]
          time_of_day?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          next_send_at?: string | null
          recipient_emails?: string[]
          report_name?: string
          report_types?: string[]
          time_of_day?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      barbers: {
        Row: {
          color: string
          created_at: string
          end_time: string
          id: string
          is_active: boolean
          name: string
          salon_id: string | null
          start_time: string
          updated_at: string
          user_id: string | null
          working_days: string[] | null
        }
        Insert: {
          color?: string
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          name: string
          salon_id?: string | null
          start_time?: string
          updated_at?: string
          user_id?: string | null
          working_days?: string[] | null
        }
        Update: {
          color?: string
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          name?: string
          salon_id?: string | null
          start_time?: string
          updated_at?: string
          user_id?: string | null
          working_days?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "barbers_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          salon_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          salon_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          salon_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_blocks: {
        Row: {
          barber_id: string
          block_date: string
          block_type: string
          created_at: string
          end_time: string
          id: string
          notes: string | null
          salon_id: string | null
          start_time: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          barber_id: string
          block_date: string
          block_type?: string
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          salon_id?: string | null
          start_time: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          barber_id?: string
          block_date?: string
          block_type?: string
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          salon_id?: string | null
          start_time?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_blocks_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_blocks_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          color: string
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          salon_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          salon_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          salon_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      lunch_breaks: {
        Row: {
          barber_id: string
          created_at: string
          duration: number
          end_time: string
          id: string
          is_active: boolean
          salon_id: string | null
          start_time: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          barber_id: string
          created_at?: string
          duration?: number
          end_time: string
          id?: string
          is_active?: boolean
          salon_id?: string | null
          start_time: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          barber_id?: string
          created_at?: string
          duration?: number
          end_time?: string
          id?: string
          is_active?: boolean
          salon_id?: string | null
          start_time?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lunch_breaks_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: true
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lunch_breaks_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          salon_name: string | null
          stats_password: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          logo_url?: string | null
          salon_name?: string | null
          stats_password?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          salon_name?: string | null
          stats_password?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promo_code_usage: {
        Row: {
          id: string
          promo_code_id: string
          subscription_type: string
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          promo_code_id: string
          subscription_type: string
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          promo_code_id?: string
          subscription_type?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      salon_settings: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          stats_password: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          stats_password?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          stats_password?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      salons: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          appointment_buffer: number | null
          category: string
          created_at: string
          display_order: number | null
          duration: number
          id: string
          is_active: boolean
          name: string
          price: number
          salon_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          appointment_buffer?: number | null
          category?: string
          created_at?: string
          display_order?: number | null
          duration: number
          id?: string
          is_active?: boolean
          name: string
          price: number
          salon_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          appointment_buffer?: number | null
          category?: string
          created_at?: string
          display_order?: number | null
          duration?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          salon_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      todo_items: {
        Row: {
          barber_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean
          priority: string
          salon_id: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          barber_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          priority?: string
          salon_id?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          barber_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          priority?: string
          salon_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "todo_items_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_items_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          client_id: string | null
          created_at: string
          employee_id: string | null
          id: string
          items: Json
          payment_method: string
          salon_id: string | null
          total_amount: number
          transaction_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          items: Json
          payment_method: string
          salon_id?: string | null
          total_amount: number
          transaction_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          items?: Json
          payment_method?: string
          salon_id?: string | null
          total_amount?: number
          transaction_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          salon_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          salon_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          salon_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      appointments_secure: {
        Row: {
          barber_id: string | null
          client_name_masked: string | null
          client_phone_masked: string | null
          created_at: string | null
          end_time: string | null
          id: string | null
          is_paid: boolean | null
          notes: string | null
          services: Json | null
          start_time: string | null
          status: string | null
          total_price: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          barber_id?: string | null
          client_name_masked?: never
          client_phone_masked?: never
          created_at?: string | null
          end_time?: string | null
          id?: string | null
          is_paid?: boolean | null
          notes?: string | null
          services?: Json | null
          start_time?: string | null
          status?: string | null
          total_price?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          barber_id?: string | null
          client_name_masked?: never
          client_phone_masked?: never
          created_at?: string | null
          end_time?: string | null
          id?: string | null
          is_paid?: boolean | null
          notes?: string | null
          services?: Json | null
          start_time?: string | null
          status?: string | null
          total_price?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_next_send_date:
        | {
            Args: {
              day_of_month?: number
              day_of_week?: number
              frequency_type: string
              time_of_day: string
            }
            Returns: string
          }
        | {
            Args: {
              day_of_month?: number
              day_of_week?: number
              frequency_type: string
              time_of_day: string
            }
            Returns: string
          }
      get_appointment_client_details: {
        Args: { appointment_id: string }
        Returns: {
          client_name: string
          client_phone: string
        }[]
      }
      get_barber_owner: { Args: { target_barber_id: string }; Returns: string }
      get_user_employee_id: { Args: { _user_id: string }; Returns: string }
      get_user_salon_id: { Args: { _user_id: string }; Returns: string }
      has_role_in_salon: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _salon_id: string
          _user_id: string
        }
        Returns: boolean
      }
      hash_password: { Args: { password_text: string }; Returns: string }
      is_salon_admin: { Args: { _user_id: string }; Returns: boolean }
      use_promo_code: {
        Args: { code_text: string; user_id_param: string }
        Returns: Json
      }
      user_owns_barber: {
        Args: { target_barber_id: string; target_user_id?: string }
        Returns: boolean
      }
      verify_password: {
        Args: { password_hash: string; password_text: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "employee"
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
      app_role: ["admin", "employee"],
    },
  },
} as const
