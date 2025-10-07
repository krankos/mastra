import { ToolCallMessagePartComponent } from '@assistant-ui/react';

import { ToolBadge } from './badges/tool-badge';
import { useWorkflowStream, WorkflowBadge } from './badges/workflow-badge';
import { useWorkflow } from '@/hooks/use-workflows';
import { WorkflowRunProvider } from '@/domains/workflows';
import { LoadingBadge } from './badges/loading-badge';
import { AgentBadge } from './badges/agent-badge';

export const ToolFallback: ToolCallMessagePartComponent = ({ toolName, result, args, ...props }) => {
  return (
    <WorkflowRunProvider>
      <ToolFallbackInner toolName={toolName} result={result} args={args} {...props} />
    </WorkflowRunProvider>
  );
};

const ToolFallbackInner: ToolCallMessagePartComponent = ({ toolName, result, args }) => {
  // We need to handle the stream data even if the workflow is not resolved yet
  // The response from the fetch request resolving the workflow might theoretically
  // be resolved after we receive the first stream event

  console.log('lol', result);
  useWorkflowStream(result);
  const { data: workflow, isLoading } = useWorkflow(toolName);

  const isAgent = args.__mastraMetadata?.from === 'AGENT';

  if (isAgent) {
    return (
      <AgentBadge
        agentId={toolName}
        messages={args?.__mastraMetadata?.messages}
        networkMetadata={args?.__mastraMetadata?.networkMetadata}
      />
    );
  }

  if (isLoading) return <LoadingBadge />;

  if (workflow) {
    return (
      <WorkflowBadge
        workflowId={toolName}
        workflow={workflow}
        isStreaming={true}
        runId={result?.runId}
        networkMetadata={args?.__mastraMetadata?.networkMetadata}
      />
    );
  }

  return (
    <ToolBadge
      toolName={toolName}
      args={args}
      result={result}
      toolOutput={args?.__mastraMetadata?.toolOutput || []}
      networkMetadata={args?.__mastraMetadata?.networkMetadata}
    />
  );
};
