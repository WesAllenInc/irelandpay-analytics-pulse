import { NextResponse } from 'next/server';

// GET handler for analytics API route
export async function GET() {
  return NextResponse.json({ message: 'Analytics API endpoint' });
}
