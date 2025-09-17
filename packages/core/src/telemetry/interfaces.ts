/**
 * Core telemetry interfaces for abstraction layer
 * These interfaces will remain in @mastra/core and provide abstraction
 * over OpenTelemetry and other potential telemetry providers
 */

// ============================================================================
// Span Interfaces
// ============================================================================

export enum SpanStatusCode {
  UNSET = 0,
  OK = 1,
  ERROR = 2,
}

export interface SpanStatus {
  code: SpanStatusCode;
  message?: string;
}

export interface SpanContext {
  traceId: string;
  spanId: string;
  traceFlags?: number;
  traceState?: unknown;
}

export interface ISpan {
  // Core span operations
  end(endTime?: number): void;
  setAttribute(key: string, value: any): ISpan;
  setAttributes(attributes: Record<string, any>): ISpan;
  addEvent(name: string, attributes?: Record<string, any>, timestamp?: number): ISpan;
  setStatus(status: SpanStatus): ISpan;
  recordException(exception: Error | string, attributes?: Record<string, any>): void;
  updateName(name: string): ISpan;
  isRecording(): boolean;
  spanContext(): SpanContext;
}

export interface SpanOptions {
  kind?: SpanKind;
  attributes?: Record<string, any>;
  links?: Link[];
  startTime?: number;
  root?: boolean;
}

export enum SpanKind {
  INTERNAL = 0,
  SERVER = 1,
  CLIENT = 2,
  PRODUCER = 3,
  CONSUMER = 4,
}

export interface Link {
  context: SpanContext;
  attributes?: Record<string, any>;
}

// ============================================================================
// Context Interfaces
// ============================================================================

export interface IContext {
  getValue(key: symbol): unknown;
  setValue(key: symbol, value: unknown): IContext;
  deleteValue(key: symbol): IContext;
}

export interface IBaggage {
  getEntry(key: string): BaggageEntry | undefined;
  getAllEntries(): [string, BaggageEntry][];
  setEntry(key: string, entry: BaggageEntry): IBaggage;
  removeEntry(key: string): IBaggage;
  removeEntries(...keys: string[]): IBaggage;
  clear(): IBaggage;
}

export interface BaggageEntry {
  value: string;
  metadata?: BaggageMetadata;
}

export interface BaggageMetadata {
  toString(): string;
}

// ============================================================================
// Tracer Interfaces
// ============================================================================

export interface ITracer {
  startSpan(name: string, options?: SpanOptions, context?: IContext): ISpan;
  startActiveSpan<T>(name: string, fn: (span: ISpan) => T): T;
  startActiveSpan<T>(name: string, options: SpanOptions, fn: (span: ISpan) => T): T;
  startActiveSpan<T>(name: string, options: SpanOptions, context: IContext, fn: (span: ISpan) => T): T;
}

// ============================================================================
// Telemetry Interfaces
// ============================================================================

export interface TraceClassOptions {
  spanNamePrefix?: string;
  attributes?: Record<string, string>;
  excludeMethods?: string[];
  skipIfNoTelemetry?: boolean;
}

export interface TraceMethodOptions {
  spanName?: string;
  attributes?: Record<string, any>;
  kind?: SpanKind;
}

export interface ITelemetry {
  // Core telemetry operations
  tracer: ITracer;
  name: string;

  // Class and method tracing
  traceClass<T extends object>(instance: T, options?: TraceClassOptions): T;

  traceMethod<T>(method: (...args: any[]) => T, options?: TraceMethodOptions): (...args: any[]) => T;

  // Lifecycle
  shutdown(): Promise<void>;
}

// ============================================================================
// Telemetry Configuration
// ============================================================================

export interface OtelConfig {
  enabled?: boolean;
  serviceName?: string;
  endpoint?: string;
  headers?: Record<string, string>;
  protocol?: 'grpc' | 'http';
  samplingRatio?: number;
  environment?: string;
  deploymentEnvironment?: string;
  consoleExporter?: boolean;
  storageExporter?: boolean;
  attributes?: Record<string, string>;
}

// ============================================================================
// Static Telemetry Provider Interface
// ============================================================================

export interface ITelemetryProvider {
  // Factory method
  init(config?: OtelConfig): ITelemetry;

  // Static utility methods
  getActiveSpan(): ISpan | undefined;
  setBaggage(entries: Record<string, string>): void;
  getBaggage(): IBaggage | undefined;
  setSpan(context: IContext, span: ISpan): IContext;
  getSpan(context: IContext): ISpan | undefined;
  getActiveContext(): IContext;
  setActiveContext(context: IContext): IContext;
  with<T>(context: IContext, fn: () => T): T;
  withAsync<T>(context: IContext, fn: () => Promise<T>): Promise<T>;
}

// ============================================================================
// Propagation Interfaces
// ============================================================================

export interface IPropagator {
  inject(context: IContext, carrier: any, setter?: TextMapSetter): void;
  extract(context: IContext, carrier: any, getter?: TextMapGetter): IContext;
}

export interface TextMapSetter {
  set(carrier: any, key: string, value: string): void;
}

export interface TextMapGetter {
  keys(carrier: any): string[];
  get(carrier: any, key: string): string | string[] | undefined;
}

// ============================================================================
// Decorator Options
// ============================================================================

export interface InstrumentOptions {
  prefix?: string;
  excludeMethods?: string[];
  attributes?: Record<string, any>;
  skipIfNoTelemetry?: boolean;
}
