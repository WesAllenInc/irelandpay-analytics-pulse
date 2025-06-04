// Type definitions for Deno Edge Functions

declare module "https://deno.land/std@0.208.0/http/server.ts" {
  export function serve(handler: (request: Request) => Response | Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.38.0" {
  export interface SupabaseClient {
    from: (table: string) => any;
    storage: {
      from: (bucket: string) => {
        download: (path: string) => Promise<{ data: any; error: any }>;
      };
    };
  }
  export function createClient(url: string, key: string): SupabaseClient;
}

declare module "https://esm.sh/xlsx@0.18.5" {
  export function read(data: ArrayBuffer, opts?: any): any;
  export namespace utils {
    export function sheet_to_json(sheet: any, opts?: any): any[];
  }
}

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
  }
  export const env: Env;
}
