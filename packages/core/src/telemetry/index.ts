export * from './types';
export * from './telemetry.decorators';
export * from './utility';
export { OTLPTraceExporter as OTLPStorageExporter } from './storage-exporter';
export { Telemetry } from './telemetry';

// Export new interfaces for abstraction layer (except OtelConfig which is already exported from types)
export {
  // Span interfaces
  SpanStatusCode,
  SpanKind,
} from './interfaces';

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
} from './interfaces';

// Export no-op implementations
export * from './no-op';

// Re-export OpenTelemetry-compatible types from context wrapper for backward compatibility
export type { Span } from './context-wrapper';
