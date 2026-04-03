// Health check endpoint — Non-tRPC: no auth required
// Used by Docker healthcheck, load balancers, and monitoring

import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json(
    { status: 'ok', timestamp: new Date().toISOString() },
    { status: 200 },
  );
}
