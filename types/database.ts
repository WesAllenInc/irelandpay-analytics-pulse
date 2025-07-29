export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      merchants: {
        Row: {
          id: string
          merchant_id: string
          dba_name: string
          processor: string | null
          agent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          merchant_id: string
          dba_name: string
          processor?: string | null
          agent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          merchant_id?: string
          dba_name?: string
          processor?: string | null
          agent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      merchant_processing_volumes: {
        Row: {
          id: string
          merchant_id: string
          processing_month: string
          gross_volume: number
          transaction_count: number
          avg_ticket: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          merchant_id: string
          processing_month: string
          gross_volume: number
          transaction_count: number
          avg_ticket: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          merchant_id?: string
          processing_month?: string
          gross_volume?: number
          transaction_count?: number
          avg_ticket?: number
          created_at?: string
          updated_at?: string
        }
      }
      residuals: {
        Row: {
          id: string
          merchant_id: string
          processing_month: string
          net_residual: number
          fees_deducted: number
          final_residual: number
          office_bps: number
          agent_bps: number
          processor_residual: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          merchant_id: string
          processing_month: string
          net_residual: number
          fees_deducted: number
          final_residual: number
          office_bps: number
          agent_bps: number
          processor_residual: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          merchant_id?: string
          processing_month?: string
          net_residual?: number
          fees_deducted?: number
          final_residual?: number
          office_bps?: number
          agent_bps?: number
          processor_residual?: number
          created_at?: string
          updated_at?: string
        }
      }
      merchant_data: {
        Row: {
          id: string
          mid: string
          datasource: string
          merchant_dba: string
          total_txns: number
          total_volume: number
          month: string | null
          created_at: string
        }
        Insert: {
          id?: string
          mid: string
          datasource: string
          merchant_dba: string
          total_txns: number
          total_volume: number
          month?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          mid?: string
          datasource?: string
          merchant_dba?: string
          total_txns?: number
          total_volume?: number
          month?: string | null
          created_at?: string
        }
      }
      residual_data: {
        Row: {
          id: string
          mid: string
          net_profit: number
          payout_month: string | null
          created_at: string
        }
        Insert: {
          id?: string
          mid: string
          net_profit: number
          payout_month?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          mid?: string
          net_profit?: number
          payout_month?: string | null
          created_at?: string
        }
      }
      master_data_mv: {
        Row: {
          mid: string
          merchant_dba: string
          datasource: string
          volume_month: string | null
          merchant_volume: number
          total_txns: number
          net_profit: number | null
          profit_month: string | null
          profit_margin: number | null
          year: number | null
          month_num: number | null
        }
      }
    }
    Views: {
      master_data: {
        Row: {
          mid: string
          merchant_dba: string
          volume_month: string | null
          merchant_volume: number
          net_profit: number | null
          profit_month: string | null
        }
      }
    }
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}