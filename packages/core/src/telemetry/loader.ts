/**
 * Dynamic telemetry loader - loads telemetry provider based on configuration
 * Supports optional OpenTelemetry dependencies through @mastra/telemetry package
 */

import type { ITelemetry, ITelemetryProvider } from './interfaces.js';
import type { OtelConfig } from './types.js';
import { NoOpTelemetryProvider } from './no-op.js';

/**
 * Loads the appropriate telemetry provider based on configuration
 * Falls back to no-op if @mastra/telemetry is not available or disabled
 */
export async function loadTelemetryProvider(
  config?: OtelConfig
): Promise<ITelemetryProvider> {
  // If telemetry is explicitly disabled, return no-op
  if (!config?.enabled) {
    return new NoOpTelemetryProvider();
  }

  try {
    // Dynamically import @mastra/telemetry package
    // This will fail if @mastra/telemetry package is not installed
    const { MastraTelemetry } = await import('@mastra/telemetry');
    return new MastraTelemetry();
  } catch (error) {
    // Log warning that telemetry package is not available
    console.warn(
      'Telemetry enabled but @mastra/telemetry not installed. ' +
      'Install it with: npm install @mastra/telemetry',
      error
    );

    // Fall back to no-op provider
    return new NoOpTelemetryProvider();
  }
}

/**
 * Creates a telemetry instance using the appropriate provider
 */
export async function createTelemetry(
  name: string,
  config?: OtelConfig
): Promise<ITelemetry> {
  const provider = await loadTelemetryProvider(config);
  // Provider.init returns the telemetry instance
  return provider.init({ ...config, serviceName: name });
}

/**
 * Singleton telemetry instance cache
 * Ensures we don't create multiple instances for the same name
 */
const telemetryCache = new Map<string, Promise<ITelemetry>>();

/**
 * Gets or creates a cached telemetry instance
 */
export function getTelemetry(
  name: string,
  config?: OtelConfig
): Promise<ITelemetry> {
  const cacheKey = `${name}:${JSON.stringify(config)}`;

  if (!telemetryCache.has(cacheKey)) {
    telemetryCache.set(cacheKey, createTelemetry(name, config));
  }

  return telemetryCache.get(cacheKey)!;
}

/**
 * Clears the telemetry cache
 * Useful for testing or reconfiguration
 */
export function clearTelemetryCache(): void {
  telemetryCache.clear();
}