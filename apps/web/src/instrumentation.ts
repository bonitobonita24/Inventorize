// Next.js instrumentation hook — starts background workers on server init
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register(): Promise<void> {
  // Workers use ioredis + BullMQ — Node.js only, not edge runtime
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    const { startWorkers } = await import('./server/workers/startup');
    await startWorkers();
  }
}
