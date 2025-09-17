/**
 * Context wrapper module - provides OpenTelemetry-compatible API using abstraction layer
 * This module acts as a bridge for existing code that uses OpenTelemetry directly
 */

import {
  context as otlpContext,
  trace as otlpTrace,
  type Span as OtelSpan,
  type Context as OtelContext,
} from '@opentelemetry/api';
import type { ISpan, IContext } from './interfaces';
import { OtelSpanAdapter, OtelContextAdapter } from './adapters/otel-adapter';

/**
 * Wrapper for OpenTelemetry context API
 * Provides backward compatibility while using abstraction layer
 */
export const context = {
  /**
   * Get the active context
   */
  active(): OtelContext {
    return otlpContext.active();
  },

  /**
   * Run a function with a specific context
   */
  with<T>(ctx: OtelContext, fn: () => T): T {
    return otlpContext.with(ctx, fn);
  },

  /**
   * Run an async function with a specific context
   */
  async withAsync<T>(ctx: OtelContext, fn: () => Promise<T>): Promise<T> {
    return otlpContext.with(ctx, fn);
  },
};

/**
 * Wrapper for OpenTelemetry trace API
 * Provides backward compatibility while using abstraction layer
 */
export const trace = {
  /**
   * Get a tracer
   */
  getTracer(name: string): any {
    return otlpTrace.getTracer(name);
  },

  /**
   * Get the active span
   */
  getActiveSpan(): OtelSpan | undefined {
    return otlpTrace.getActiveSpan();
  },

  /**
   * Set a span in context
   */
  setSpan(ctx: OtelContext, span: OtelSpan): OtelContext {
    return otlpTrace.setSpan(ctx, span);
  },

  /**
   * Get a span from context
   */
  getSpan(ctx: OtelContext): OtelSpan | undefined {
    return otlpTrace.getSpan(ctx);
  },

  /**
   * Set span attributes on the current span
   */
  setSpanAttributes(attributes: Record<string, any>): void {
    const span = otlpTrace.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  },
};

// Re-export types for backward compatibility
export type {
  Span,
  Context,
  Tracer,
  Attributes,
  AttributeValue,
  SpanContext,
  SpanOptions,
  SpanStatus,
  TimeInput,
  Exception,
} from '@opentelemetry/api';

/**
 * Helper function to convert ISpan to OtelSpan if needed
 */
export function toOtelSpan(span: ISpan | OtelSpan): OtelSpan {
  if (span instanceof OtelSpanAdapter) {
    return span.getOtelSpan();
  }
  return span as OtelSpan;
}

/**
 * Helper function to convert IContext to OtelContext if needed
 */
export function toOtelContext(ctx: IContext | OtelContext): OtelContext {
  if (ctx instanceof OtelContextAdapter) {
    return ctx.getOtelContext();
  }
  return ctx as OtelContext;
}
