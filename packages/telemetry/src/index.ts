/**
 * @mastra/telemetry - OpenTelemetry implementation for Mastra
 *
 * This package provides the OpenTelemetry-based telemetry provider
 * that implements the telemetry interfaces from @mastra/core
 */

import type {
  ITelemetry,
  ITelemetryProvider,
  ISpan,
  IContext,
  IBaggage,
  OtelConfig,
} from '@mastra/core';

import { Telemetry } from './telemetry.js';
import * as api from '@opentelemetry/api';
import { context, trace } from '@opentelemetry/api';

// Re-export telemetry implementation
export { Telemetry } from './telemetry.js';
export { InstrumentClass } from './decorators.js';
export * from './types.js';
export * from './utility.js';
export * from './otel-vendor.js';

// Export all exporters
export { CompositeExporter } from './exporters/composite-exporter.js';
export { CloudTelemetryExporter } from './exporters/cloud-exporter.js';

/**
 * OpenTelemetry-based implementation of ITelemetryProvider
 * This is the main export that @mastra/core will import dynamically
 */
export class MastraTelemetry implements ITelemetryProvider {
  private telemetry: Telemetry | undefined;

  init(config?: OtelConfig): ITelemetry {
    // Initialize OpenTelemetry-based telemetry
    this.telemetry = Telemetry.init(config);
    return this.telemetry as ITelemetry;
  }

  getActiveSpan(): ISpan | undefined {
    return trace.getActiveSpan() as ISpan | undefined;
  }

  setBaggage(entries: Record<string, string>): void {
    const currentBaggage = api.propagation.getBaggage(context.active());
    let newBaggage = currentBaggage || api.propagation.createBaggage();

    for (const [key, value] of Object.entries(entries)) {
      newBaggage = newBaggage.setEntry(key, { value });
    }

    // Create new context with baggage
    api.propagation.setBaggage(context.active(), newBaggage);
    // Note: setGlobalContext is not available in the API
    // The baggage is set in the context for propagation
  }

  getBaggage(): IBaggage | undefined {
    return api.propagation.getBaggage(context.active()) as IBaggage | undefined;
  }

  setSpan(ctx: IContext, span: ISpan): IContext {
    return trace.setSpan(ctx as api.Context, span as api.Span) as IContext;
  }

  getSpan(ctx: IContext): ISpan | undefined {
    return trace.getSpan(ctx as api.Context) as ISpan | undefined;
  }

  getActiveContext(): IContext {
    return context.active() as IContext;
  }

  setActiveContext(ctx: IContext): IContext {
    // Note: setGlobalContext is not available in OpenTelemetry API
    // The context needs to be used with context.with() instead
    return ctx;
  }

  with<T>(ctx: IContext, fn: () => T): T {
    return context.with(ctx as api.Context, fn);
  }

  async withAsync<T>(ctx: IContext, fn: () => Promise<T>): Promise<T> {
    return context.with(ctx as api.Context, fn);
  }
}

// Default export for backward compatibility
export default MastraTelemetry;