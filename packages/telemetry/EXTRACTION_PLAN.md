# OpenTelemetry Extraction Plan for @mastra/telemetry

## Executive Summary

This document outlines a comprehensive plan to extract OpenTelemetry dependencies from `@mastra/core` into a new `@mastra/telemetry` package. The goal is to make OpenTelemetry an optional dependency, reducing bundle size and complexity for users who don't require telemetry.

## Current State Analysis

### OpenTelemetry Dependencies

The following 13 OpenTelemetry packages are currently direct dependencies of `@mastra/core`:

```json
"@opentelemetry/api": "^1.9.0"
"@opentelemetry/auto-instrumentations-node": "^0.62.1"
"@opentelemetry/core": "^2.0.1"
"@opentelemetry/exporter-trace-otlp-grpc": "^0.203.0"
"@opentelemetry/exporter-trace-otlp-http": "^0.203.0"
"@opentelemetry/otlp-exporter-base": "^0.203.0"
"@opentelemetry/otlp-transformer": "^0.203.0"
"@opentelemetry/resources": "^2.0.1"
"@opentelemetry/sdk-metrics": "^2.0.1"
"@opentelemetry/sdk-node": "^0.203.0"
"@opentelemetry/sdk-trace-base": "^2.0.1"
"@opentelemetry/sdk-trace-node": "^2.0.1"
"@opentelemetry/semantic-conventions": "^1.36.0"
```

### Two Distinct Tracing Systems

1. **AI Tracing System** (`src/ai-tracing/`)
   - Independent of OpenTelemetry
   - Custom implementation for AI-specific tracing
   - Should remain in core as it's lightweight and essential

2. **Legacy Telemetry System** (`src/telemetry/`)
   - Depends on OpenTelemetry
   - Provides class instrumentation and span management
   - Target for extraction

### Usage Inventory

#### Files Using @InstrumentClass Decorator

- `src/mastra/index.ts` - Main Mastra class
- `src/agent/agent.ts` - Agent class (extensive usage)
- `src/voice/voice.ts` - Voice class
- `src/tts/index.ts` - TTS class
- `src/server/auth.ts` - Auth server component

#### Direct OpenTelemetry API Usage

- `src/workflows/default.ts` - Uses trace, context, Span
- `src/workflows/legacy/*.ts` - Multiple files using OpenTelemetry APIs
- `src/loop/telemetry/index.ts` - Loop telemetry module
- `src/tools/tool-builder/builder.ts` - Tool builder tracing

#### Telemetry Integration Points

- **Agent**: ~20+ telemetry references, context propagation, baggage management
- **Workflows**: Direct span creation and context management
- **Storage**: Wrapped with telemetry instrumentation
- **Processors**: Receive telemetry for tracing
- **Mastra Constructor**: Initializes telemetry (line 264)

## Implementation Plan

### Phase 1: Create Abstraction Layer (Week 1-2)

**Goal**: Introduce abstractions without breaking changes

#### 1.1 Define Core Interfaces

Create `packages/core/src/telemetry/interfaces.ts`:

```typescript
// Core telemetry interfaces that remain in @mastra/core
export interface ITelemetry {
  tracer: ITracer;
  traceClass<T>(instance: T, options?: TraceClassOptions): T;
  traceMethod<T>(method: Function, options?: TraceMethodOptions): T;
  shutdown(): Promise<void>;
}

export interface ITracer {
  startSpan(name: string, options?: SpanOptions): ISpan;
}

export interface ISpan {
  end(): void;
  setAttribute(key: string, value: any): void;
  setAttributes(attributes: Record<string, any>): void;
  recordException(error: Error): void;
  setStatus(status: SpanStatus): void;
}

export interface ITelemetryProvider {
  init(config: TelemetryConfig): ITelemetry;
  getActiveSpan(): ISpan | undefined;
  setBaggage(entries: Record<string, string>): void;
  // ... other static methods
}
```

#### 1.2 Create Adapter Layer

Create adapters that wrap OpenTelemetry behind interfaces:

```typescript
// packages/core/src/telemetry/adapters/otel-adapter.ts
class OpenTelemetryAdapter implements ITelemetry {
  // Wrap OpenTelemetry functionality
}
```

#### 1.3 Update Existing Code

- Replace direct OpenTelemetry imports with interface usage
- Update all components to use abstracted interfaces
- Maintain backward compatibility

### Phase 2: Convert to Optional Dependencies (Week 3-4)

**Goal**: Make OpenTelemetry optional without extraction

#### 2.1 Dynamic Import Strategy

```typescript
// packages/core/src/telemetry/loader.ts
export async function loadTelemetryProvider(config: TelemetryConfig): Promise<ITelemetry> {
  if (!config.enabled) {
    return new NoOpTelemetry();
  }

  try {
    // Dynamically import OpenTelemetry dependencies
    const { OpenTelemetryProvider } = await import('./providers/otel-provider');
    return new OpenTelemetryProvider(config);
  } catch (error) {
    console.warn('OpenTelemetry dependencies not installed, using no-op telemetry');
    return new NoOpTelemetry();
  }
}
```

#### 2.2 Convert Decorators

Transform decorators to support optional telemetry:

```typescript
export function InstrumentClass(options?: InstrumentOptions) {
  return function (target: any) {
    // Store metadata for runtime instrumentation
    Reflect.defineMetadata('instrument:class', options, target);
    return target;
  };
}

// Runtime instrumentation in Mastra constructor
if (telemetryEnabled) {
  const metadata = Reflect.getMetadata('instrument:class', ClassConstructor);
  if (metadata) {
    instance = telemetry.traceClass(instance, metadata);
  }
}
```

#### 2.3 Update Package.json

Move OpenTelemetry to optional peer dependencies:

```json
{
  "peerDependencies": {
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/sdk-node": "^0.203.0"
    // ... other OpenTelemetry packages
  },
  "peerDependenciesMeta": {
    "@opentelemetry/api": { "optional": true },
    "@opentelemetry/sdk-node": { "optional": true }
    // ... mark all as optional
  }
}
```

### Phase 3: Extract to Separate Package (Week 5-6)

**Goal**: Create @mastra/telemetry package

#### 3.1 Create Package Structure

```
packages/telemetry/
├── src/
│   ├── index.ts
│   ├── providers/
│   │   └── otel/
│   │       ├── index.ts
│   │       ├── telemetry.ts
│   │       ├── decorators.ts
│   │       ├── utility.ts
│   │       └── exporters/
│   │           ├── storage-exporter.ts
│   │           ├── cloud-exporter.ts  // Moved from @mastra/cloud
│   │           └── composite-exporter.ts
│   ├── types.ts
│   └── otel-vendor.ts
├── package.json
├── tsconfig.json
└── README.md
```

#### 3.2 Package.json for @mastra/telemetry

```json
{
  "name": "@mastra/telemetry",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "dependencies": {
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/auto-instrumentations-node": "^0.62.1",
    "@opentelemetry/core": "^2.0.1",
    "@opentelemetry/exporter-trace-otlp-grpc": "^0.203.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.203.0",
    "@opentelemetry/otlp-exporter-base": "^0.203.0",
    "@opentelemetry/otlp-transformer": "^0.203.0",
    "@opentelemetry/resources": "^2.0.1",
    "@opentelemetry/sdk-metrics": "^2.0.1",
    "@opentelemetry/sdk-node": "^0.203.0",
    "@opentelemetry/sdk-trace-base": "^2.0.1",
    "@opentelemetry/sdk-trace-node": "^2.0.1",
    "@opentelemetry/semantic-conventions": "^1.36.0"
  },
  "peerDependencies": {
    "@mastra/core": "workspace:*"
  }
}
```

#### 3.3 Consolidate Telemetry Exporters

**Note**: When creating the @mastra/telemetry package, consolidate all telemetry exporters:

- Move the cloud telemetry exporter from `@mastra/cloud/src/telemetry/` to `@mastra/telemetry/src/exporters/cloud-exporter.ts`
- Keep the storage exporter from `@mastra/core/src/telemetry/storage-exporter.ts`
- This consolidation keeps all telemetry concerns together in one package
- Both exporters will be available as optional features of the telemetry package

#### 3.4 Update Core Package

Update `@mastra/core` to use the extracted package:

```typescript
// packages/core/src/mastra/index.ts
async function initializeTelemetry(config?: TelemetryConfig): Promise<ITelemetry> {
  if (!config?.enabled) {
    return new NoOpTelemetry();
  }

  try {
    const { MastraTelemetry } = await import('@mastra/telemetry');
    return new MastraTelemetry(config);
  } catch (error) {
    logger.warn(
      'Telemetry enabled but @mastra/telemetry not installed. ' + 'Install it with: npm install @mastra/telemetry',
    );
    return new NoOpTelemetry();
  }
}
```

### Phase 4: Migration Support (Week 7)

**Goal**: Smooth migration for existing users

#### 4.1 Migration Guide

Create comprehensive migration documentation:

- Step-by-step upgrade instructions
- Code examples for common patterns
- Troubleshooting guide

#### 4.2 Compatibility Layer

Provide temporary backward compatibility:

```typescript
// packages/core/src/telemetry/index.ts (temporary)
export * from '@mastra/telemetry';
console.warn(
  'Direct telemetry imports from @mastra/core are deprecated. ' + 'Please import from @mastra/telemetry instead.',
);
```

#### 4.3 Codemod Tool

Create automated migration tool:

```bash
npx @mastra/migrate-telemetry
```

## Testing Strategy

### Test Matrix

- Core without telemetry package
- Core with telemetry package
- Each decorator with/without telemetry
- Workflow execution with/without telemetry
- Agent operations with/without telemetry

### Test Implementation

```typescript
describe('Telemetry extraction', () => {
  describe('without @mastra/telemetry', () => {
    test('should use no-op implementations', () => {
      // Test no-op behavior
    });
  });

  describe('with @mastra/telemetry', () => {
    test('should use real telemetry', () => {
      // Test actual telemetry
    });
  });
});
```

## Rollout Plan

### Stage 1: Alpha Release (Week 8)

- Release `@mastra/telemetry@alpha`
- Test with internal projects
- Gather feedback

### Stage 2: Beta Release (Week 9-10)

- Address alpha feedback
- Release `@mastra/telemetry@beta`
- Update documentation
- Community testing

### Stage 3: Stable Release (Week 11-12)

- Final adjustments
- Release `@mastra/telemetry@1.0.0`
- Update all examples and templates
- Deprecation notices for old imports

## Risk Mitigation

### Identified Risks

1. **Breaking Changes**: Existing code may break
   - Mitigation: Provide compatibility layer and migration tools

2. **Performance Impact**: Dynamic imports may affect startup time
   - Mitigation: Lazy load only when needed, cache loaded modules

3. **Type Safety**: Loss of type information with dynamic imports
   - Mitigation: Export interface types from core, implementation types from telemetry

4. **Testing Complexity**: Need to test multiple configurations
   - Mitigation: Automated test matrix, CI/CD pipeline updates

## Success Criteria

1. **Bundle Size Reduction**: Core package reduced by at least 30%
2. **No Performance Regression**: Startup time within 5% of current
3. **Zero Breaking Changes**: Existing code works with compatibility layer
4. **Adoption Rate**: 50% of users successfully migrate within 3 months
5. **Developer Experience**: Clear documentation and smooth migration

## File-by-File Migration Checklist

### Core Files to Modify

- [ ] `src/mastra/index.ts` - Add dynamic telemetry loading
- [ ] `src/agent/agent.ts` - Replace direct telemetry usage
- [ ] `src/workflows/default.ts` - Abstract OpenTelemetry APIs
- [ ] `src/workflows/legacy/*.ts` - Update all legacy workflow files
- [ ] `src/voice/voice.ts` - Update decorator usage
- [ ] `src/tts/index.ts` - Update decorator usage
- [ ] `src/server/auth.ts` - Update decorator usage
- [ ] `src/loop/telemetry/index.ts` - Convert to use interfaces
- [ ] `src/tools/tool-builder/builder.ts` - Update trace usage
- [ ] `src/telemetry/*` - Move all files to new package
- [ ] `src/index.ts` - Update exports

### New Files to Create

- [ ] `src/telemetry-interface/index.ts` - Core interfaces
- [ ] `src/telemetry-interface/no-op.ts` - No-op implementations
- [ ] `src/telemetry-interface/loader.ts` - Dynamic loader
- [ ] `packages/telemetry/package.json` - New package definition
- [ ] `packages/telemetry/src/index.ts` - Package exports
- [ ] Migration guide documentation
- [ ] Codemod tool

## Timeline Summary

- **Weeks 1-2**: Create abstraction layer (no breaking changes)
- **Weeks 3-4**: Make OpenTelemetry optional (minor changes)
- **Weeks 5-6**: Extract to separate package (major changes)
- **Week 7**: Migration support and documentation
- **Week 8**: Alpha release
- **Weeks 9-10**: Beta release and testing
- **Weeks 11-12**: Stable release

## Next Steps

1. Review and approve this plan
2. Create tracking issues for each phase
3. Set up new package structure
4. Begin Phase 1 implementation
5. Establish testing infrastructure

## Notes

- The AI tracing system (`src/ai-tracing/`) should remain in core as it's independent of OpenTelemetry
- Consider future support for alternative telemetry providers (Datadog, New Relic, etc.)
- Monitor community feedback closely during beta period
- Ensure all examples and documentation are updated before stable release
