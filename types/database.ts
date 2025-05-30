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
          id: string;
          created_at: string;
          name: string;
          email: string;
          phone: string;
          address: string;
          city: string;
          country: string;
          status: string;
          payment_methods: string[];
          monthly_volume: number;
          transaction_count: number;
          average_transaction: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          email: string;
          phone?: string;
          address?: string;
          city?: string;
          country?: string;
          status?: string;
          payment_methods?: string[];
          monthly_volume?: number;
          transaction_count?: number;
          average_transaction?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          email?: string;
          phone?: string;
          address?: string;
          city?: string;
          country?: string;
          status?: string;
          payment_methods?: string[];
          monthly_volume?: number;
          transaction_count?: number;
          average_transaction?: number;
        };
      };
      transactions: {
        Row: {
          id: string;
          created_at: string;
          merchant_id: string;
          amount: number;
          currency: string;
          status: string;
          payment_method: string;
          customer_email: string;
          reference: string;
          fee: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          merchant_id: string;
          amount: number;
          currency?: string;
          status?: string;
          payment_method: string;
          customer_email?: string;
          reference?: string;
          fee?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          merchant_id?: string;
          amount?: number;
          currency?: string;
          status?: string;
          payment_method?: string;
          customer_email?: string;
          reference?: string;
          fee?: number;
        };
      };
      analytics: {
        Row: {
          id: string;
          date: string;
          merchant_id: string;
          total_transactions: number;
          total_volume: number;
          average_transaction: number;
          conversion_rate: number;
        };
        Insert: {
          id?: string;
          date: string;
          merchant_id: string;
          total_transactions: number;
          total_volume: number;
          average_transaction: number;
          conversion_rate: number;
        };
        Update: {
          id?: string;
          date?: string;
          merchant_id?: string;
          total_transactions?: number;
          total_volume?: number;
          average_transaction?: number;
          conversion_rate?: number;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}