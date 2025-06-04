// Type declarations for modules used in the Edge Function

declare module 'xlsx' {
  export function read(data: ArrayBuffer, options?: { type?: string }): Workbook;
  
  export interface Workbook {
    SheetNames: string[];
    Sheets: { [key: string]: Sheet };
  }
  
  export interface Sheet {
    [cell: string]: any;
  }
  
  export namespace utils {
    export function sheet_to_json<T>(worksheet: Sheet, options?: any): T[];
  }
}

declare module 'std/server' {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

// Deno environment declarations
declare namespace Deno {
  export namespace env {
    export function get(key: string): string | undefined;
  }
}
