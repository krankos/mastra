import { Mastra } from '@mastra/core';
import { PinoLogger } from '@mastra/loggers';
import { InMemoryStore } from '@mastra/core/storage';

import { agentThatHarassesYou, chefAgent, chefAgentResponses, dynamicAgent, evalAgent } from './agents/index';
import { myMcpServer, myMcpServerTwo } from './mcp/server';
import { myWorkflow } from './workflows';
import { chefModelV2Agent } from './agents/model-v2-agent';
import { createScorer } from '@mastra/core/scores';
import { LangfuseExporter } from '@mastra/langfuse';
import { BraintrustExporter } from '@mastra/braintrust';
<<<<<<< Updated upstream
import { OpenTelemetryExporter } from '@mastra/opentelemetry';
=======
import { OtelExporter } from '@mastra/otel-exporter';
>>>>>>> Stashed changes
import { DefaultExporter } from '@mastra/core/ai-tracing';

const testScorer = createScorer({
  name: 'scorer1',
  description: 'Scorer 1',
}).generateScore(() => {
  return 1;
});

// pnpm install --ignore-workspace
// ../../packages/cli/dist/index.js dev

export const mastra = new Mastra({
  agents: {
    chefAgent,
    chefAgentResponses,
    dynamicAgent,
    agentThatHarassesYou,
    evalAgent,
    chefModelV2Agent,
  },
<<<<<<< Updated upstream
  logger: new PinoLogger({ name: 'Chef', level: 'debug' }),
=======
  logger: new PinoLogger({ name: 'Chef', level: 'info' }),
>>>>>>> Stashed changes
  storage: new InMemoryStore(),
  mcpServers: {
    myMcpServer,
    myMcpServerTwo,
  },
  workflows: { myWorkflow },
  bundler: {
    sourcemap: true,
  },
  serverMiddleware: [
    {
      handler: (c, next) => {
        console.log('Middleware called');
        return next();
      },
    },
  ],
  scorers: {
    testScorer,
  },
  observability: {
    configs: {
      multi: {
        serviceName: 'test-service',
        exporters: [
          new DefaultExporter(),
          new LangfuseExporter({
            publicKey: process.env.LANGFUSE_PUBLIC_KEY,
            secretKey: process.env.LANGFUSE_SECRET_KEY,
            baseUrl: process.env.LANGFUSE_BASE_URL,
            realtime: true,
          }),
          new BraintrustExporter({
            apiKey: process.env.BRAINTRUST_API_KEY,
          }),
<<<<<<< Updated upstream
          new OpenTelemetryExporter({
=======
          new OtelExporter({
>>>>>>> Stashed changes
            provider: {
              dash0: {
                apiKey: process.env.DASH0_API_KEY, // Required at runtime
                endpoint: 'ingress.us-west-2.aws.dash0.com:4317',
              },
            },
          }),
<<<<<<< Updated upstream
          new OpenTelemetryExporter({
=======
          new OtelExporter({
>>>>>>> Stashed changes
            provider: {
              signoz: {
                apiKey: process.env.SIGNOZ_API_KEY, // Required at runtime
              },
            },
          }),
<<<<<<< Updated upstream
          new OpenTelemetryExporter({
=======
          new OtelExporter({
>>>>>>> Stashed changes
            provider: {
              newrelic: {
                apiKey: process.env.NEW_RELIC_LICENSE_KEY, // Required at runtime
              },
            },
          }),
<<<<<<< Updated upstream
          new OpenTelemetryExporter({
=======
          new OtelExporter({
>>>>>>> Stashed changes
            provider: {
              traceloop: {
                apiKey: process.env.TRACELOOP_API_KEY, // Required at runtime
              },
            },
          }),
<<<<<<< Updated upstream
          new OpenTelemetryExporter({
=======
          new OtelExporter({
>>>>>>> Stashed changes
            provider: {
              laminar: {
                apiKey: process.env.LMNR_PROJECT_API_KEY, // Required at runtime
              },
            },
          }),
<<<<<<< Updated upstream
          // new OpenTelemetryExporter({
          //   provider: {
          //     langsmith: {
          //       apiKey: process.env.LANGSMITH_API_KEY, // Required at runtime
          //     }
          //   },
          // }),
=======
>>>>>>> Stashed changes
        ],
      },
    },
  },
});
