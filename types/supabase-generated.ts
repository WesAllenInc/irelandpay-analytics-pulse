export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agents: {
        Row: {
          agent_name: string
          created_at: string | null
          email: string | null
          id: string
        }
        Insert: {
          agent_name: string
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Update: {
          agent_name?: string
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      ingestion_logs: {
        Row: {
          error_log: Json | null
          file_name: string
          file_type: string
          id: string
          rows_failed: number | null
          rows_success: number | null
          status: string | null
          total_rows: number | null
          upload_timestamp: string | null
        }
        Insert: {
          error_log?: Json | null
          file_name: string
          file_type: string
          id?: string
          rows_failed?: number | null
          rows_success?: number | null
          status?: string | null
          total_rows?: number | null
          upload_timestamp?: string | null
        }
        Update: {
          error_log?: Json | null
          file_name?: string
          file_type?: string
          id?: string
          rows_failed?: number | null
          rows_success?: number | null
          status?: string | null
          total_rows?: number | null
          upload_timestamp?: string | null
        }
        Relationships: []
      }
      merchant_metrics: {
        Row: {
          date_loaded: string | null
          id: number
          mid: string
          month: string
          source_file: string | null
          total_txns: number
          total_volume: number
        }
        Insert: {
          date_loaded?: string | null
          id?: number
          mid: string
          month: string
          source_file?: string | null
          total_txns?: number
          total_volume?: number
        }
        Update: {
          date_loaded?: string | null
          id?: number
          mid?: string
          month?: string
          source_file?: string | null
          total_txns?: number
          total_volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "merchant_metrics_mid_fkey"
            columns: ["mid"]
            isOneToOne: false
            referencedRelation: "estimated_net_profit"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_metrics_mid_fkey"
            columns: ["mid"]
            isOneToOne: false
            referencedRelation: "master_data"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_metrics_mid_fkey"
            columns: ["mid"]
            isOneToOne: false
            referencedRelation: "master_data_mv"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_metrics_mid_fkey"
            columns: ["mid"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["mid"]
          },
        ]
      }
      merchant_processing_volumes: {
        Row: {
          chargebacks: number | null
          created_at: string | null
          estimated_bps: number | null
          fees: number | null
          gross_volume: number | null
          id: string
          merchant_mid: string | null
          processing_month: string
        }
        Insert: {
          chargebacks?: number | null
          created_at?: string | null
          estimated_bps?: number | null
          fees?: number | null
          gross_volume?: number | null
          id?: string
          merchant_mid?: string | null
          processing_month: string
        }
        Update: {
          chargebacks?: number | null
          created_at?: string | null
          estimated_bps?: number | null
          fees?: number | null
          gross_volume?: number | null
          id?: string
          merchant_mid?: string | null
          processing_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_processing_volumes_merchant_mid_fkey"
            columns: ["merchant_mid"]
            isOneToOne: false
            referencedRelation: "estimated_net_profit"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_processing_volumes_merchant_mid_fkey"
            columns: ["merchant_mid"]
            isOneToOne: false
            referencedRelation: "master_data"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_processing_volumes_merchant_mid_fkey"
            columns: ["merchant_mid"]
            isOneToOne: false
            referencedRelation: "master_data_mv"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_processing_volumes_merchant_mid_fkey"
            columns: ["merchant_mid"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["mid"]
          },
        ]
      }
      merchants: {
        Row: {
          address: string | null
          agent_id: string | null
          category: string | null
          city: string | null
          date_created: string | null
          dba_name: string | null
          email: string | null
          mid: string
          phone: string | null
          processor: string | null
          state: string | null
          status: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          agent_id?: string | null
          category?: string | null
          city?: string | null
          date_created?: string | null
          dba_name?: string | null
          email?: string | null
          mid: string
          phone?: string | null
          processor?: string | null
          state?: string | null
          status?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          agent_id?: string | null
          category?: string | null
          city?: string | null
          date_created?: string | null
          dba_name?: string | null
          email?: string | null
          mid?: string
          phone?: string | null
          processor?: string | null
          state?: string | null
          status?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchants_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      residual_payouts: {
        Row: {
          agent_net: number | null
          bps: number | null
          commission_pct: number | null
          created_at: string
          expenses: number | null
          id: string
          income: number | null
          merchant_dba: string
          mid: string
          net_profit: number | null
          payout_month: string
          sales_amount: number | null
          source_file: string | null
          transactions: number | null
          updated_at: string
        }
        Insert: {
          agent_net?: number | null
          bps?: number | null
          commission_pct?: number | null
          created_at?: string
          expenses?: number | null
          id?: string
          income?: number | null
          merchant_dba: string
          mid: string
          net_profit?: number | null
          payout_month: string
          sales_amount?: number | null
          source_file?: string | null
          transactions?: number | null
          updated_at?: string
        }
        Update: {
          agent_net?: number | null
          bps?: number | null
          commission_pct?: number | null
          created_at?: string
          expenses?: number | null
          id?: string
          income?: number | null
          merchant_dba?: string
          mid?: string
          net_profit?: number | null
          payout_month?: string
          sales_amount?: number | null
          source_file?: string | null
          transactions?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "residual_payouts_mid_fkey"
            columns: ["mid"]
            isOneToOne: false
            referencedRelation: "estimated_net_profit"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "residual_payouts_mid_fkey"
            columns: ["mid"]
            isOneToOne: false
            referencedRelation: "master_data"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "residual_payouts_mid_fkey"
            columns: ["mid"]
            isOneToOne: false
            referencedRelation: "master_data_mv"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "residual_payouts_mid_fkey"
            columns: ["mid"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["mid"]
          },
        ]
      }
      residuals: {
        Row: {
          agent_bps: number | null
          created_at: string | null
          fees_deducted: number | null
          final_residual: number | null
          id: string
          merchant_mid: string | null
          net_residual: number | null
          office_bps: number | null
          processing_month: string
          processor_residual: number | null
        }
        Insert: {
          agent_bps?: number | null
          created_at?: string | null
          fees_deducted?: number | null
          final_residual?: number | null
          id?: string
          merchant_mid?: string | null
          net_residual?: number | null
          office_bps?: number | null
          processing_month: string
          processor_residual?: number | null
        }
        Update: {
          agent_bps?: number | null
          created_at?: string | null
          fees_deducted?: number | null
          final_residual?: number | null
          id?: string
          merchant_mid?: string | null
          net_residual?: number | null
          office_bps?: number | null
          processing_month?: string
          processor_residual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "residuals_merchant_mid_fkey"
            columns: ["merchant_mid"]
            isOneToOne: false
            referencedRelation: "estimated_net_profit"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "residuals_merchant_mid_fkey"
            columns: ["merchant_mid"]
            isOneToOne: false
            referencedRelation: "master_data"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "residuals_merchant_mid_fkey"
            columns: ["merchant_mid"]
            isOneToOne: false
            referencedRelation: "master_data_mv"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "residuals_merchant_mid_fkey"
            columns: ["merchant_mid"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["mid"]
          },
        ]
      }
    }
    Views: {
      estimated_net_profit: {
        Row: {
          bps_last_month: number | null
          estimated_profit: number | null
          merchant_id: string | null
          name: string | null
          projected_volume_this_month: number | null
        }
        Relationships: []
      }
      master_data: {
        Row: {
          merchant_id: string | null
          merchant_volume: number | null
          name: string | null
          net_profit: number | null
          volume_month: string | null
        }
        Relationships: []
      }
      master_data_mv: {
        Row: {
          merchant_id: string | null
          merchant_volume: number | null
          name: string | null
          net_profit: number | null
          volume_month: string | null
        }
        Relationships: []
      }
      merchant_data: {
        Row: {
          month: string | null
          total_txns: number | null
          total_volume: number | null
        }
        Relationships: []
      }
      merchant_volume: {
        Row: {
          daily_volume: number | null
          volume_date: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      upsert_merchant_data: {
        Args: { data: Json }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
