export * from './types.js';
export * from './utility.js';
// Export wrappers for backward compatibility
export { Telemetry } from './telemetry-wrapper.js';
export { InstrumentClass } from './decorator-wrapper.js';
// Export loader for direct usage
export { loadTelemetryProvider, createTelemetry, getTelemetry, clearTelemetryCache } from './loader.js';

// Export new interfaces for abstraction layer (except OtelConfig which is already exported from types)
export {
  // Span interfaces
  SpanStatusCode,
  SpanKind,
} from './interfaces.js';

export type {
  // Span type interfaces
  SpanStatus,
  SpanContext,
  ISpan,
  SpanOptions,
  Link,
  // Context type interfaces
  IContext,
  IBaggage,
  BaggageEntry,
  BaggageMetadata,
  // Tracer type interfaces
  ITracer,
  // Telemetry type interfaces
  TraceClassOptions,
  TraceMethodOptions,
  ITelemetry,
  ITelemetryProvider,
  // Propagation type interfaces
  IPropagator,
  TextMapSetter,
  TextMapGetter,
  // Decorator type options
  InstrumentOptions,
} from './interfaces.js';

// Export no-op implementations
export * from './no-op.js';

// Re-export OpenTelemetry-compatible types from context wrapper for backward compatibility
export type { Span } from './context-wrapper.js';
