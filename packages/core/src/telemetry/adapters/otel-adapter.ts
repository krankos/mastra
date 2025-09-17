/**
 * OpenTelemetry adapter implementation
 * Wraps OpenTelemetry APIs to implement our abstracted interfaces
 */

import {
  context as otelContext,
  trace,
  propagation,
  SpanStatusCode as OtelSpanStatusCode,
  type Span as OtelSpan,
  type Tracer as OtelTracer,
  type Context as OtelContext,
  type SpanOptions as OtelSpanOptions,
  type SpanContext as OtelSpanContext,
  type SpanKind as OtelSpanKind,
  type Link as OtelLink,
  type Baggage as OtelBaggage,
} from '@opentelemetry/api';
// baggageUtils removed - not needed

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
  Link,
} from '../interfaces';
import { SpanStatusCode } from '../interfaces';

// ============================================================================
// OpenTelemetry Span Adapter
// ============================================================================

export class OtelSpanAdapter implements ISpan {
  constructor(private span: OtelSpan) {}

  end(endTime?: number): void {
    this.span.end(endTime);
  }

  setAttribute(key: string, value: any): ISpan {
    this.span.setAttribute(key, value);
    return this;
  }

  setAttributes(attributes: Record<string, any>): ISpan {
    this.span.setAttributes(attributes);
    return this;
  }

  addEvent(name: string, attributes?: Record<string, any>, timestamp?: number): ISpan {
    if (timestamp !== undefined) {
      this.span.addEvent(name, attributes, timestamp);
    } else if (attributes) {
      this.span.addEvent(name, attributes);
    } else {
      this.span.addEvent(name);
    }
    return this;
  }

  setStatus(status: SpanStatus): ISpan {
    // Convert our status code to OpenTelemetry's
    const otelCode = this.convertStatusCode(status.code);
    this.span.setStatus({ code: otelCode, message: status.message });
    return this;
  }

  recordException(exception: Error | string, attributes?: Record<string, any>): void {
    // OpenTelemetry's recordException expects attributes as the second parameter,
    // not a TimeInput, so we pass undefined for time and attributes as third param
    if (attributes) {
      this.span.recordException(exception, attributes as any);
    } else {
      this.span.recordException(exception);
    }
  }

  updateName(name: string): ISpan {
    this.span.updateName(name);
    return this;
  }

  isRecording(): boolean {
    return this.span.isRecording();
  }

  spanContext(): SpanContext {
    const context = this.span.spanContext();
    return {
      traceId: context.traceId,
      spanId: context.spanId,
      traceFlags: context.traceFlags,
      traceState: context.traceState,
    };
  }

  private convertStatusCode(code: SpanStatusCode): OtelSpanStatusCode {
    switch (code) {
      case SpanStatusCode.OK:
        return OtelSpanStatusCode.OK;
      case SpanStatusCode.ERROR:
        return OtelSpanStatusCode.ERROR;
      default:
        return OtelSpanStatusCode.UNSET;
    }
  }

  // Get the underlying OpenTelemetry span (for internal use)
  getOtelSpan(): OtelSpan {
    return this.span;
  }
}

// ============================================================================
// OpenTelemetry Context Adapter
// ============================================================================

export class OtelContextAdapter implements IContext {
  constructor(private context: OtelContext) {}

  getValue(key: symbol): unknown {
    return this.context.getValue(key);
  }

  setValue(key: symbol, value: unknown): IContext {
    const newContext = this.context.setValue(key, value);
    return new OtelContextAdapter(newContext);
  }

  deleteValue(key: symbol): IContext {
    const newContext = this.context.deleteValue(key);
    return new OtelContextAdapter(newContext);
  }

  // Get the underlying OpenTelemetry context (for internal use)
  getOtelContext(): OtelContext {
    return this.context;
  }
}

// ============================================================================
// OpenTelemetry Baggage Adapter
// ============================================================================

export class OtelBaggageAdapter implements IBaggage {
  constructor(private baggage: OtelBaggage) {}

  getEntry(key: string): BaggageEntry | undefined {
    const entry = this.baggage.getEntry(key);
    if (!entry) return undefined;
    return {
      value: entry.value,
      metadata: entry.metadata,
    };
  }

  getAllEntries(): [string, BaggageEntry][] {
    return this.baggage.getAllEntries().map(([key, entry]) => [key, { value: entry.value, metadata: entry.metadata }]);
  }

  setEntry(key: string, entry: BaggageEntry): IBaggage {
    const otelEntry = {
      value: entry.value,
      metadata: entry.metadata as any,
    };
    const newBaggage = this.baggage.setEntry(key, otelEntry);
    return new OtelBaggageAdapter(newBaggage);
  }

  removeEntry(key: string): IBaggage {
    const newBaggage = this.baggage.removeEntry(key);
    return new OtelBaggageAdapter(newBaggage);
  }

  removeEntries(...keys: string[]): IBaggage {
    const newBaggage = this.baggage.removeEntries(...keys);
    return new OtelBaggageAdapter(newBaggage);
  }

  clear(): IBaggage {
    const newBaggage = this.baggage.clear();
    return new OtelBaggageAdapter(newBaggage);
  }

  // Get the underlying OpenTelemetry baggage (for internal use)
  getOtelBaggage(): OtelBaggage {
    return this.baggage;
  }
}

// ============================================================================
// OpenTelemetry Tracer Adapter
// ============================================================================

export class OtelTracerAdapter implements ITracer {
  constructor(private tracer: OtelTracer) {}

  startSpan(name: string, options?: SpanOptions, context?: IContext): ISpan {
    const otelOptions = options ? this.convertSpanOptions(options) : undefined;
    const otelCtx =
      context instanceof OtelContextAdapter ? context.getOtelContext() : context ? otelContext.active() : undefined;

    const span = otelCtx ? this.tracer.startSpan(name, otelOptions, otelCtx) : this.tracer.startSpan(name, otelOptions);

    return new OtelSpanAdapter(span);
  }

  startActiveSpan<T>(...args: any[]): T {
    // Parse the overloaded arguments
    const name = args[0] as string;
    let options: SpanOptions | undefined;
    let context: IContext | undefined;
    let fn: (span: ISpan) => T;

    if (typeof args[1] === 'function') {
      fn = args[1];
    } else if (typeof args[2] === 'function') {
      options = args[1];
      fn = args[2];
    } else {
      options = args[1];
      context = args[2];
      fn = args[3];
    }

    const otelOptions = options ? this.convertSpanOptions(options) : undefined;
    const otelCtx = context instanceof OtelContextAdapter ? context.getOtelContext() : undefined;

    // Use OpenTelemetry's startActiveSpan with proper callback
    if (otelCtx) {
      return this.tracer.startActiveSpan(name, otelOptions || {}, otelCtx, (span: OtelSpan) =>
        fn(new OtelSpanAdapter(span)),
      );
    } else if (otelOptions) {
      return this.tracer.startActiveSpan(name, otelOptions, (span: OtelSpan) => fn(new OtelSpanAdapter(span)));
    } else {
      return this.tracer.startActiveSpan(name, (span: OtelSpan) => fn(new OtelSpanAdapter(span)));
    }
  }

  private convertSpanOptions(options: SpanOptions): OtelSpanOptions {
    const otelOptions: OtelSpanOptions = {};

    if (options.kind !== undefined) {
      otelOptions.kind = options.kind as unknown as OtelSpanKind;
    }
    if (options.attributes) {
      otelOptions.attributes = options.attributes;
    }
    if (options.links) {
      otelOptions.links = options.links.map(link => this.convertLink(link));
    }
    if (options.startTime !== undefined) {
      otelOptions.startTime = options.startTime;
    }
    if (options.root !== undefined) {
      otelOptions.root = options.root;
    }

    return otelOptions;
  }

  private convertLink(link: Link): OtelLink {
    return {
      context: link.context as OtelSpanContext,
      attributes: link.attributes,
    };
  }
}

// ============================================================================
// OpenTelemetry Telemetry Adapter
// ============================================================================

export class OtelTelemetryAdapter implements ITelemetry {
  public tracer: ITracer;
  public name: string;
  private otelTracer: OtelTracer;

  constructor(config: OtelConfig) {
    this.name = config.serviceName ?? 'default-service';
    this.otelTracer = trace.getTracer(this.name);
    this.tracer = new OtelTracerAdapter(this.otelTracer);
  }

  traceClass<T extends object>(instance: T, options?: TraceClassOptions): T {
    const { skipIfNoTelemetry = true } = options || {};

    // Skip if no telemetry is active and skipIfNoTelemetry is true
    if (skipIfNoTelemetry && !trace.getActiveSpan()) {
      return instance;
    }

    // Get all method names from the instance
    const methodNames = this.getAllMethodNames(instance);
    const { excludeMethods = [], spanNamePrefix = '', attributes = {} } = options || {};

    // Create a proxy to intercept method calls
    return new Proxy(instance, {
      get: (target, prop, receiver) => {
        const value = Reflect.get(target, prop, receiver);

        // Only wrap functions that aren't excluded
        if (
          typeof value === 'function' &&
          typeof prop === 'string' &&
          methodNames.includes(prop) &&
          !excludeMethods.includes(prop)
        ) {
          return this.wrapMethod(value as (...args: any[]) => any, {
            spanName: spanNamePrefix ? `${spanNamePrefix}.${prop}` : prop,
            attributes,
          });
        }

        return value;
      },
    });
  }

  traceMethod<T>(method: (...args: any[]) => T, options?: TraceMethodOptions): (...args: any[]) => T {
    return this.wrapMethod(method, options);
  }

  private wrapMethod<T>(method: (...args: any[]) => T, options?: TraceMethodOptions): (...args: any[]) => T {
    const tracer = this.otelTracer;
    const { spanName = method.name || 'anonymous', attributes = {}, kind } = options || {};

    return function (this: any, ...args: any[]): T {
      const spanOptions: OtelSpanOptions = { attributes };
      if (kind !== undefined) {
        spanOptions.kind = kind as unknown as OtelSpanKind;
      }

      return tracer.startActiveSpan(spanName, spanOptions, (span: OtelSpan) => {
        try {
          const result = method.apply(this, args);

          // Handle promises
          if (result && typeof (result as any).then === 'function') {
            return (result as any).then(
              (value: any) => {
                span.end();
                return value;
              },
              (error: any) => {
                span.recordException(error);
                span.setStatus({ code: OtelSpanStatusCode.ERROR });
                span.end();
                throw error;
              },
            ) as T;
          }

          span.end();
          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: OtelSpanStatusCode.ERROR });
          span.end();
          throw error;
        }
      });
    };
  }

  private getAllMethodNames(obj: any): string[] {
    const methods: string[] = [];
    let current = obj;

    while (current && current !== Object.prototype) {
      Object.getOwnPropertyNames(current).forEach(name => {
        if (typeof obj[name] === 'function' && name !== 'constructor') {
          methods.push(name);
        }
      });
      current = Object.getPrototypeOf(current);
    }

    return methods;
  }

  async shutdown(): Promise<void> {
    // OpenTelemetry shutdown is handled at the SDK level, not tracer level
    // This is a no-op for the adapter
  }
}

// ============================================================================
// OpenTelemetry Provider Adapter
// ============================================================================

export class OtelTelemetryProvider implements ITelemetryProvider {
  private static telemetry: ITelemetry | undefined;

  init(config?: OtelConfig): ITelemetry {
    if (!OtelTelemetryProvider.telemetry) {
      OtelTelemetryProvider.telemetry = new OtelTelemetryAdapter(config || {});
    }
    return OtelTelemetryProvider.telemetry;
  }

  getActiveSpan(): ISpan | undefined {
    const span = trace.getActiveSpan();
    return span ? new OtelSpanAdapter(span) : undefined;
  }

  setBaggage(entries: Record<string, string>): void {
    const baggage = propagation.getBaggage(otelContext.active()) || propagation.createBaggage();
    let newBaggage = baggage;

    Object.entries(entries).forEach(([key, value]) => {
      newBaggage = newBaggage.setEntry(key, { value });
    });

    propagation.setBaggage(otelContext.active(), newBaggage);
  }

  getBaggage(): IBaggage | undefined {
    const baggage = propagation.getBaggage(otelContext.active());
    return baggage ? new OtelBaggageAdapter(baggage) : undefined;
  }

  setSpan(context: IContext, span: ISpan): IContext {
    const otelCtx = context instanceof OtelContextAdapter ? context.getOtelContext() : otelContext.active();
    const otelSpan = span instanceof OtelSpanAdapter ? span.getOtelSpan() : undefined;

    if (!otelSpan) {
      return context;
    }

    const newContext = trace.setSpan(otelCtx, otelSpan);
    return new OtelContextAdapter(newContext);
  }

  getSpan(context: IContext): ISpan | undefined {
    const otelCtx = context instanceof OtelContextAdapter ? context.getOtelContext() : otelContext.active();
    const span = trace.getSpan(otelCtx);
    return span ? new OtelSpanAdapter(span) : undefined;
  }

  getActiveContext(): IContext {
    return new OtelContextAdapter(otelContext.active());
  }

  setActiveContext(context: IContext): IContext {
    // OpenTelemetry doesn't have a direct setActiveContext,
    // context is managed through the with() API
    return context;
  }

  with<T>(context: IContext, fn: () => T): T {
    const otelCtx = context instanceof OtelContextAdapter ? context.getOtelContext() : otelContext.active();
    return otelContext.with(otelCtx, fn);
  }

  async withAsync<T>(context: IContext, fn: () => Promise<T>): Promise<T> {
    const otelCtx = context instanceof OtelContextAdapter ? context.getOtelContext() : otelContext.active();
    return otelContext.with(otelCtx, fn);
  }
}
