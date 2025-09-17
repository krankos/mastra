/**
 * Context wrapper module - provides OpenTelemetry-compatible API using abstraction layer
 * This module provides a compatibility layer for code that expects OpenTelemetry APIs
 * When @mastra/telemetry is not installed, it provides no-op implementations
 */

import type { ISpan, IContext, ITracer } from './interfaces.js';
import { NoOpSpan, NoOpContext } from './no-op.js';

// Type definitions for backward compatibility
export type Span = ISpan;
export type Context = IContext;
export type Tracer = ITracer;
export type Attributes = Record<string, any>;
export type AttributeValue = string | number | boolean | undefined | null | Array<string | number | boolean>;
export type SpanContext = {
  traceId: string;
  spanId: string;
  traceFlags?: number;
  traceState?: unknown;
};
export type SpanOptions = {
  kind?: number;
  attributes?: Attributes;
  links?: Array<{ context: SpanContext; attributes?: Attributes }>;
  startTime?: Date | number;
  root?: boolean;
};
export type SpanStatus = {
  code: number;
  message?: string;
};
export type TimeInput = Date | number;
export type Exception = Error | string;

// Global context storage for no-op implementation
let activeContext: IContext = new NoOpContext();
let activeSpan: ISpan | undefined;

/**
 * Wrapper for OpenTelemetry context API
 * Provides no-op implementation when telemetry is not available
 */
export const context = {
  /**
   * Get the active context
   */
  active(): Context {
    return activeContext;
  },

  /**
   * Run a function with a specific context
   */
  with<T>(ctx: Context, fn: () => T): T {
    const prevContext = activeContext;
    activeContext = ctx;
    try {
      return fn();
    } finally {
      activeContext = prevContext;
    }
  },

  /**
   * Run an async function with a specific context
   */
  async withAsync<T>(ctx: Context, fn: () => Promise<T>): Promise<T> {
    const prevContext = activeContext;
    activeContext = ctx;
    try {
      return await fn();
    } finally {
      activeContext = prevContext;
    }
  },
};

/**
 * Wrapper for OpenTelemetry trace API
 * Provides no-op implementation when telemetry is not available
 */
export const trace = {
  /**
   * Get a tracer
   */
  getTracer(name: string): any {
    // Return a no-op tracer
    return {
      startSpan: () => new NoOpSpan(),
      startActiveSpan: <T>(name: string, fn: (span: ISpan) => T) => {
        const span = new NoOpSpan();
        return fn(span);
      }
    };
  },

  /**
   * Get the active span
   */
  getActiveSpan(): Span | undefined {
    return activeSpan;
  },

  /**
   * Set a span in context
   */
  setSpan(ctx: Context, span: Span): Context {
    activeSpan = span;
    return ctx;
  },

  /**
   * Get a span from context
   */
  getSpan(ctx: Context): Span | undefined {
    return activeSpan;
  },

  /**
   * Set span attributes on the current span
   */
  setSpanAttributes(attributes: Record<string, any>): void {
    if (activeSpan) {
      activeSpan.setAttributes(attributes);
    }
  },
};

/**
 * Helper function for compatibility
 */
export function toOtelSpan(span: ISpan): ISpan {
  return span;
}

/**
 * Helper function for compatibility
 */
export function toOtelContext(ctx: IContext): IContext {
  return ctx;
}