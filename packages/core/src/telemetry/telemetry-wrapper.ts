/**
 * Wrapper for telemetry that supports dynamic loading
 * This provides backward compatibility for code that uses Telemetry directly
 */

import { loadTelemetryProvider } from './loader.js';
import type { ITelemetry, ITelemetryProvider, OtelConfig, ITracer, ISpan, IContext, TraceClassOptions, TraceMethodOptions } from './interfaces.js';
import { NoOpTelemetry } from './no-op.js';

let cachedProvider: ITelemetryProvider | undefined;

/**
 * Backward-compatible Telemetry class that works with dynamic loading
 * This class proxies all methods to the underlying ITelemetry instance
 */
export class Telemetry implements ITelemetry {
  private static _instance: Telemetry | undefined;
  private static _loadingPromise: Promise<void> | undefined;
  private _telemetry: ITelemetry;

  public get tracer(): ITracer {
    return this._telemetry.tracer;
  }

  public get name(): string {
    return this._telemetry.name;
  }

  private constructor(telemetry: ITelemetry) {
    this._telemetry = telemetry;
  }

  /**
   * Synchronous init for backward compatibility
   * Returns a wrapper that starts with no-op and upgrades when real provider loads
   */
  static init(config?: OtelConfig): Telemetry {
    // If already initialized, return existing instance
    if (this._instance) {
      return this._instance;
    }

    // Create instance with no-op initially
    const noOpTelemetry = new NoOpTelemetry();
    this._instance = new Telemetry(noOpTelemetry);

    // Start loading real provider in background
    if (!this._loadingPromise) {
      this._loadingPromise = this.loadAsync(config);
    }

    return this._instance;
  }

  /**
   * Async loading of the real telemetry provider
   */
  private static async loadAsync(config?: OtelConfig): Promise<void> {
    try {
      if (!cachedProvider) {
        cachedProvider = await loadTelemetryProvider(config);
      }
      const telemetry = cachedProvider.init(config);

      // Upgrade the instance to use real telemetry
      if (this._instance) {
        this._instance._telemetry = telemetry;
      }

      // Set global flag to indicate telemetry is active
      (globalThis as any).__TELEMETRY_ACTIVE__ = true;
    } catch (error) {
      console.warn('Failed to load telemetry provider:', error);
    }
  }

  /**
   * Get the global telemetry instance
   */
  static get(): Telemetry {
    if (!this._instance) {
      throw new Error('Telemetry not initialized. Call Telemetry.init() first.');
    }
    return this._instance;
  }

  // Proxy all ITelemetry methods to the underlying implementation

  traceClass<T extends object>(instance: T, options?: TraceClassOptions): T {
    return this._telemetry.traceClass(instance, options);
  }

  traceMethod<T>(method: (...args: any[]) => T, options?: TraceMethodOptions): (...args: any[]) => T {
    return this._telemetry.traceMethod(method, options);
  }

  shutdown(): Promise<void> {
    return this._telemetry.shutdown();
  }

  // Additional methods that might be used by legacy code
  getBaggageTracer?(): ITracer {
    // Return the same tracer for now
    return this.tracer;
  }

  /**
   * Wait for telemetry to be fully loaded
   */
  static async waitForInit(): Promise<Telemetry> {
    if (this._loadingPromise) {
      await this._loadingPromise;
    }
    if (!this._instance) {
      this._instance = this.init();
    }
    return this._instance;
  }

  /**
   * Static method to get the active span
   */
  static getActiveSpan(): ISpan | undefined {
    // Return undefined when telemetry is not loaded
    // The real implementation will be in @mastra/telemetry
    return undefined;
  }

  /**
   * Static method to set baggage
   */
  static setBaggage(entries: Record<string, any>, ctx?: IContext): IContext {
    // No-op when telemetry is not loaded
    // The real implementation will be in @mastra/telemetry
    return ctx || ({} as IContext);
  }

  /**
   * Static method to run with context
   */
  static withContext(ctx: IContext, fn: () => void): void {
    // No-op when telemetry is not loaded
    fn();
  }
}