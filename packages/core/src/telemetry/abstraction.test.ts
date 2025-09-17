/**
 * Tests for the telemetry abstraction layer
 * Ensures that both no-op and OpenTelemetry implementations work correctly
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NoOpTelemetry, NoOpTelemetryProvider, NoOpSpan, NoOpTracer, NoOpContext, NoOpBaggage } from './no-op';
import { OtelTelemetryAdapter, OtelTelemetryProvider, OtelSpanAdapter } from './adapters/otel-adapter';
import { SpanStatusCode } from './interfaces';
import type { ITelemetry, ISpan, ITracer, IContext, IBaggage } from './interfaces';

describe('Telemetry Abstraction Layer', () => {
  describe('No-Op Implementation', () => {
    let telemetry: ITelemetry;
    let provider: NoOpTelemetryProvider;

    beforeEach(() => {
      provider = new NoOpTelemetryProvider();
      telemetry = provider.init({ enabled: false });
    });

    it('should create a no-op telemetry instance', () => {
      expect(telemetry).toBeInstanceOf(NoOpTelemetry);
      expect(telemetry.name).toBe('noop');
    });

    it('should have a no-op tracer', () => {
      expect(telemetry.tracer).toBeDefined();
      expect(telemetry.tracer).toBeInstanceOf(NoOpTracer);
    });

    it('should create no-op spans', () => {
      const span = telemetry.tracer.startSpan('test-span');
      expect(span).toBeInstanceOf(NoOpSpan);
      expect(span.isRecording()).toBe(false);
    });

    it('should handle span operations without errors', () => {
      const span = telemetry.tracer.startSpan('test-span');

      // All these operations should be no-ops and not throw
      expect(() => {
        span.setAttribute('key', 'value');
        span.setAttributes({ foo: 'bar', baz: 42 });
        span.addEvent('test-event', { detail: 'test' });
        span.setStatus({ code: SpanStatusCode.OK });
        span.recordException(new Error('test error'));
        span.updateName('new-name');
        span.end();
      }).not.toThrow();
    });

    it('should handle traceClass without modification', () => {
      class TestClass {
        value = 42;
        getValue() {
          return this.value;
        }
      }

      const instance = new TestClass();
      const traced = telemetry.traceClass(instance);

      expect(traced).toBe(instance); // Should return the same instance
      expect(traced.getValue()).toBe(42);
    });

    it('should handle traceMethod without modification', () => {
      const method = (a: number, b: number) => a + b;
      const traced = telemetry.traceMethod(method, { spanName: 'add' });

      expect(traced).toBe(method); // Should return the same function
      expect(traced(2, 3)).toBe(5);
    });

    it('should handle context operations', () => {
      const context = provider.getActiveContext();
      expect(context).toBeInstanceOf(NoOpContext);

      const key = Symbol('test');
      const newContext = context.setValue(key, 'value');
      expect(newContext).toBeInstanceOf(NoOpContext);
      expect(newContext.getValue(key)).toBe('value');
    });

    it('should handle baggage operations', () => {
      provider.setBaggage({ key1: 'value1', key2: 'value2' });
      const baggage = provider.getBaggage();

      expect(baggage).toBeInstanceOf(NoOpBaggage);
      expect(baggage?.getEntry('key1')).toEqual({ value: 'value1' });
    });

    it('should handle async operations', async () => {
      const result = await provider.withAsync(provider.getActiveContext(), async () => {
        return 'async-result';
      });
      expect(result).toBe('async-result');
    });
  });

  describe('OpenTelemetry Adapter', () => {
    let telemetry: ITelemetry;
    let provider: OtelTelemetryProvider;

    beforeEach(() => {
      provider = new OtelTelemetryProvider();
      telemetry = provider.init({
        enabled: true,
        serviceName: 'test-service',
      });
    });

    it('should create an OpenTelemetry adapter instance', () => {
      expect(telemetry).toBeInstanceOf(OtelTelemetryAdapter);
      expect(telemetry.name).toBe('test-service');
    });

    it('should wrap class methods with tracing', () => {
      class TestClass {
        value = 42;
        getValue() {
          return this.value;
        }
        setValue(val: number) {
          this.value = val;
        }
      }

      const instance = new TestClass();
      const traced = telemetry.traceClass(instance, {
        spanNamePrefix: 'TestClass',
        excludeMethods: ['setValue'],
      });

      // Should be a proxy
      expect(traced).not.toBe(instance);
      expect(traced.getValue()).toBe(42);

      // setValue should not be traced (excluded)
      traced.setValue(100);
      expect(traced.getValue()).toBe(100);
    });

    it('should wrap methods with error handling', async () => {
      const errorMethod = () => {
        throw new Error('Test error');
      };

      const traced = telemetry.traceMethod(errorMethod, {
        spanName: 'error-method',
      });

      expect(() => traced()).toThrow('Test error');
    });

    it('should handle async methods', async () => {
      const asyncMethod = async (ms: number): Promise<string> => {
        await new Promise(resolve => setTimeout(resolve, ms));
        return 'done';
      };

      const traced = telemetry.traceMethod(asyncMethod, {
        spanName: 'async-method',
      });

      const result = await traced(10);
      expect(result).toBe('done');
    });

    it('should handle startActiveSpan with callback', () => {
      const tracer = telemetry.tracer;
      let spanInCallback: ISpan | undefined;

      const result = tracer.startActiveSpan('test-span', (span: ISpan) => {
        spanInCallback = span;
        span.setAttribute('test', true);
        span.end();
        return 'callback-result';
      });

      expect(result).toBe('callback-result');
      expect(spanInCallback).toBeDefined();
    });

    it('should propagate context through operations', () => {
      const context = provider.getActiveContext();
      const span = telemetry.tracer.startSpan('parent-span');

      const newContext = provider.setSpan(context, span);
      const retrievedSpan = provider.getSpan(newContext);

      expect(retrievedSpan).toBeDefined();

      span.end();
    });
  });

  describe('Interface Compatibility', () => {
    it('should allow switching between implementations', () => {
      const configs = [{ enabled: false }, { enabled: true, serviceName: 'test' }];

      for (const config of configs) {
        const provider = config.enabled ? new OtelTelemetryProvider() : new NoOpTelemetryProvider();

        const telemetry = provider.init(config);

        // All implementations should support these operations
        const span = telemetry.tracer.startSpan('test');
        span.setAttribute('key', 'value');
        span.end();

        const traced = telemetry.traceClass({ method: () => 'test' });
        expect(traced).toBeDefined();
      }
    });

    it('should maintain consistent span status codes', () => {
      expect(SpanStatusCode.UNSET).toBe(0);
      expect(SpanStatusCode.OK).toBe(1);
      expect(SpanStatusCode.ERROR).toBe(2);
    });
  });
});
