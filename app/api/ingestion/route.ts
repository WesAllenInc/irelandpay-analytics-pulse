import { NextResponse } from 'next/server';
import { Buffer } from 'buffer';
import { ingestResiduals, ingestVolumes } from '@/lib/ingestion';

export async function POST(request: Request) {
  const form = await request.formData();
  const results: any[] = [];

  for (const [_, value] of form.entries()) {
    if (value instanceof File) {
      const buffer = Buffer.from(await value.arrayBuffer());
      const fileName = value.name;
      let result;
      if (fileName.toLowerCase().includes('residual')) {
        result = await ingestResiduals(buffer, fileName);
      } else {
        result = await ingestVolumes(buffer, fileName);
      }
      results.push(result);
    }
  }

  return NextResponse.json({ results });
}
