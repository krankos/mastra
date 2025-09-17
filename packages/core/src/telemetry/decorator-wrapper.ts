/**
 * Decorator wrapper that supports dynamic loading of telemetry
 */

import type { InstrumentOptions } from './interfaces.js';

/**
 * Decorator for instrumenting classes with telemetry
 * This is a no-op when @mastra/telemetry is not installed
 *
 * @param options - Options for instrumentation
 */
export function InstrumentClass(options?: InstrumentOptions) {
  return function (target: any) {
    // No-op when telemetry is not installed
    // The real implementation will be loaded from @mastra/telemetry
    // Store options as a property for runtime instrumentation
    (target as any).__instrumentOptions = options || {};
    return target;
  };
}