import type { IContext, IBaggage } from './interfaces.js';
import { loadTelemetryProvider } from './loader.js';

// Helper function to check if telemetry is active
export function hasActiveTelemetry(tracerName: string = 'default-tracer'): boolean {
  // Check if telemetry is enabled by looking for the global telemetry instance
  // This is set by the telemetry provider when it's loaded
  const g = globalThis as any;
  return !!g.__TELEMETRY_ACTIVE__;
}

/**
 * Get baggage values from context
 * @param ctx The context to get baggage values from
 * @returns
 */
export function getBaggageValues(ctx: IContext) {
  // For now, return empty values when telemetry is not loaded
  // The real implementation will be in @mastra/telemetry
  // This is called from telemetry-aware code that will have the real context

  // Try to get baggage if it's attached to the context
  const baggage = (ctx as any).__baggage as IBaggage | undefined;

  if (!baggage) {
    return {
      requestId: undefined,
      componentName: undefined,
      runId: undefined,
      threadId: undefined,
      resourceId: undefined,
    };
  }

  // IBaggage should have a getEntry method
  const requestId = baggage.getEntry?.('http.request_id')?.value;
  const componentName = baggage.getEntry?.('componentName')?.value;
  const runId = baggage.getEntry?.('runId')?.value;
  const threadId = baggage.getEntry?.('threadId')?.value;
  const resourceId = baggage.getEntry?.('resourceId')?.value;

  return {
    requestId,
    componentName,
    runId,
    threadId,
    resourceId,
  };
}
