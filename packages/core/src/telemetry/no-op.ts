/**
 * No-operation implementations of telemetry interfaces
 * Used when telemetry is disabled or not available
 */

import type {
  ISpan,
  ITracer,
  ITelemetry,
  ITelemetryProvider,
  IContext,
  IBaggage,
  IPropagator,
  SpanOptions,
  SpanStatus,
  SpanContext,
  SpanKind,
  BaggageEntry,
  OtelConfig,
  TraceClassOptions,
  TraceMethodOptions,
  TextMapSetter,
  TextMapGetter,
} from './interfaces';
import { SpanStatusCode } from './interfaces';

// ============================================================================
// No-Op Span Implementation
// ============================================================================

export class NoOpSpan implements ISpan {
  private static readonly INVALID_SPAN_CONTEXT: SpanContext = {
    traceId: '00000000000000000000000000000000',
    spanId: '0000000000000000',
    traceFlags: 0,
  };

  end(_endTime?: number): void {
    // No-op
  }

  setAttribute(_key: string, _value: any): ISpan {
    return this;
  }

  setAttributes(_attributes: Record<string, any>): ISpan {
    return this;
  }

  addEvent(_name: string, _attributes?: Record<string, any>, _timestamp?: number): ISpan {
    return this;
  }

  setStatus(_status: SpanStatus): ISpan {
    return this;
  }

  recordException(_exception: Error | string, _attributes?: Record<string, any>): void {
    // No-op
  }

  updateName(_name: string): ISpan {
    return this;
  }

  isRecording(): boolean {
    return false;
  }

  spanContext(): SpanContext {
    return NoOpSpan.INVALID_SPAN_CONTEXT;
  }
}

// ============================================================================
// No-Op Context Implementation
// ============================================================================

export class NoOpContext implements IContext {
  private values = new Map<symbol, unknown>();

  getValue(key: symbol): unknown {
    return this.values.get(key);
  }

  setValue(key: symbol, value: unknown): IContext {
    const newContext = new NoOpContext();
    this.values.forEach((v, k) => (newContext as any).values.set(k, v));
    (newContext as any).values.set(key, value);
    return newContext;
  }

  deleteValue(key: symbol): IContext {
    const newContext = new NoOpContext();
    this.values.forEach((v, k) => {
      if (k !== key) {
        (newContext as any).values.set(k, v);
      }
    });
    return newContext;
  }
}

// ============================================================================
// No-Op Baggage Implementation
// ============================================================================

export class NoOpBaggage implements IBaggage {
  private entries = new Map<string, BaggageEntry>();

  getEntry(key: string): BaggageEntry | undefined {
    return this.entries.get(key);
  }

  getAllEntries(): [string, BaggageEntry][] {
    return Array.from(this.entries.entries());
  }

  setEntry(key: string, entry: BaggageEntry): IBaggage {
    const newBaggage = new NoOpBaggage();
    this.entries.forEach((v, k) => (newBaggage as any).entries.set(k, v));
    (newBaggage as any).entries.set(key, entry);
    return newBaggage;
  }

  removeEntry(key: string): IBaggage {
    const newBaggage = new NoOpBaggage();
    this.entries.forEach((v, k) => {
      if (k !== key) {
        (newBaggage as any).entries.set(k, v);
      }
    });
    return newBaggage;
  }

  removeEntries(...keys: string[]): IBaggage {
    const keySet = new Set(keys);
    const newBaggage = new NoOpBaggage();
    this.entries.forEach((v, k) => {
      if (!keySet.has(k)) {
        (newBaggage as any).entries.set(k, v);
      }
    });
    return newBaggage;
  }

  clear(): IBaggage {
    return new NoOpBaggage();
  }
}

// ============================================================================
// No-Op Tracer Implementation
// ============================================================================

export class NoOpTracer implements ITracer {
  private static readonly NOOP_SPAN = new NoOpSpan();

  startSpan(_name: string, _options?: SpanOptions, _context?: IContext): ISpan {
    return NoOpTracer.NOOP_SPAN;
  }

  startActiveSpan<T>(...args: any[]): T {
    // Find the callback function (last function argument)
    const fn = args[args.length - 1] as (span: ISpan) => T;
    return fn(NoOpTracer.NOOP_SPAN);
  }
}

// ============================================================================
// No-Op Telemetry Implementation
// ============================================================================

export class NoOpTelemetry implements ITelemetry {
  public readonly tracer: ITracer = new NoOpTracer();
  public readonly name: string = 'noop';

  traceClass<T extends object>(instance: T, _options?: TraceClassOptions): T {
    // Return the instance unchanged
    return instance;
  }

  traceMethod<T>(method: (...args: any[]) => T, _options?: TraceMethodOptions): (...args: any[]) => T {
    // Return the method unchanged
    return method;
  }

  async shutdown(): Promise<void> {
    // No-op
  }
}

// ============================================================================
// No-Op Telemetry Provider Implementation
// ============================================================================

export class NoOpTelemetryProvider implements ITelemetryProvider {
  private static instance: NoOpTelemetry;
  private static context = new NoOpContext();
  private static baggage = new NoOpBaggage();
  private static span = new NoOpSpan();

  init(_config?: OtelConfig): ITelemetry {
    if (!NoOpTelemetryProvider.instance) {
      NoOpTelemetryProvider.instance = new NoOpTelemetry();
    }
    return NoOpTelemetryProvider.instance;
  }

  getActiveSpan(): ISpan | undefined {
    return undefined;
  }

  setBaggage(entries: Record<string, string>): void {
    Object.entries(entries).forEach(([key, value]) => {
      NoOpTelemetryProvider.baggage = NoOpTelemetryProvider.baggage.setEntry(key, { value }) as NoOpBaggage;
    });
  }

  getBaggage(): IBaggage | undefined {
    return NoOpTelemetryProvider.baggage;
  }

  setSpan(context: IContext, _span: ISpan): IContext {
    return context;
  }

  getSpan(_context: IContext): ISpan | undefined {
    return undefined;
  }

  getActiveContext(): IContext {
    return NoOpTelemetryProvider.context;
  }

  setActiveContext(context: IContext): IContext {
    NoOpTelemetryProvider.context = context as NoOpContext;
    return context;
  }

  with<T>(_context: IContext, fn: () => T): T {
    return fn();
  }

  async withAsync<T>(_context: IContext, fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}

// ============================================================================
// No-Op Propagator Implementation
// ============================================================================

export class NoOpPropagator implements IPropagator {
  inject(_context: IContext, _carrier: any, _setter?: TextMapSetter): void {
    // No-op
  }

  extract(context: IContext, _carrier: any, _getter?: TextMapGetter): IContext {
    return context;
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

export const NOOP_SPAN = new NoOpSpan();
export const NOOP_TRACER = new NoOpTracer();
export const NOOP_TELEMETRY = new NoOpTelemetry();
export const NOOP_TELEMETRY_PROVIDER = new NoOpTelemetryProvider();
export const NOOP_PROPAGATOR = new NoOpPropagator();
