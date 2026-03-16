"use client";

import { Handle, Position } from "@xyflow/react";
import { useAtomValue } from "jotai";
import { Check, EyeOff, Route, XCircle } from "lucide-react";
import { memo, useMemo } from "react";
import {
  Node,
  NodeDescription,
  NodeTitle,
} from "@/components/ai-elements/node";
import { cn } from "@/lib/utils";
import {
  executionLogsAtom,
  selectedExecutionIdAtom,
  type WorkflowNodeData,
} from "@/lib/workflow-store";

type SwitchRuleConfig = {
  field: string;
  operatorType: string;
  operator: string;
  value: string;
  outputName?: string;
  renameOutput?: boolean;
};

function parseRulesFromConfig(
  config: Record<string, unknown> | undefined
): SwitchRuleConfig[] {
  if (!config?.rules) return [];
  try {
    const parsed =
      typeof config.rules === "string"
        ? JSON.parse(config.rules)
        : config.rules;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Status badge component (reused from action-node pattern)
const StatusBadge = ({
  status,
}: {
  status?: "idle" | "running" | "success" | "error";
}) => {
  if (!status || status === "idle" || status === "running") {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute top-2 right-2 rounded-full p-1",
        status === "success" && "bg-green-500/50",
        status === "error" && "bg-red-500/50"
      )}
    >
      {status === "success" && (
        <Check className="size-3.5 text-white" strokeWidth={2.5} />
      )}
      {status === "error" && (
        <XCircle className="size-3.5 text-white" strokeWidth={2.5} />
      )}
    </div>
  );
};

type SwitchNodeProps = {
  data?: WorkflowNodeData;
  id: string;
  selected?: boolean;
};

export const SwitchNode = memo(({ data, selected, id }: SwitchNodeProps) => {
  const selectedExecutionId = useAtomValue(selectedExecutionIdAtom);
  const executionLogs = useAtomValue(executionLogsAtom);

  if (!data) {
    return null;
  }

  const rules = useMemo(
    () => parseRulesFromConfig(data.config),
    [data.config]
  );
  const status = data.status;
  const isDisabled = data.enabled === false;

  // Get execution result to highlight the matched handle
  const nodeLog = executionLogs[id];
  const matchedRuleIndex =
    selectedExecutionId && nodeLog?.output
      ? (nodeLog.output as { matchedRuleIndex?: number })?.matchedRuleIndex
      : undefined;

  // Calculate handle positions based on rule count
  // Each rule handle + fallback, evenly spaced vertically
  const handleCount = rules.length + 1; // +1 for fallback
  const baseHeight = 192; // min node height
  const handleSpacing = 28;
  const nodeHeight = Math.max(
    baseHeight,
    80 + handleCount * handleSpacing + 20
  );

  return (
    <div
      className={cn(
        "node-container relative rounded-md border bg-card transition-all duration-150 ease-out",
        selected && "border-primary",
        isDisabled && "opacity-50",
        status === "success" && "border-green-500 border-2",
        status === "error" && "border-red-500 border-2"
      )}
      data-testid={`switch-node-${id}`}
      style={{ width: 192, minHeight: nodeHeight }}
    >
      {/* Target handle (left side - single input) */}
      <Handle position={Position.Left} type="target" />

      {/* Disabled badge */}
      {isDisabled && (
        <div className="absolute top-2 left-2 rounded-full bg-gray-500/50 p-1">
          <EyeOff className="size-3.5 text-white" />
        </div>
      )}

      {/* Status badge */}
      <StatusBadge status={status} />

      {/* Node content */}
      <div className="flex flex-col items-center gap-2 px-4 pt-4 pb-2">
        <Route className="size-10 text-purple-300" strokeWidth={1.5} />
        <div className="flex flex-col items-center gap-0.5 text-center">
          <NodeTitle className="text-sm">{data.label || "Switch"}</NodeTitle>
          <NodeDescription className="text-xs">Flow</NodeDescription>
        </div>
      </div>

      {/* Output handles section */}
      <div className="relative pb-2">
        {rules.map((rule, index) => {
          const handleId = `rule-${index}`;
          const label =
            rule.renameOutput && rule.outputName
              ? rule.outputName
              : `Output ${index}`;
          const isMatched = matchedRuleIndex === index;
          const topOffset = 80 + index * handleSpacing;

          return (
            <div
              className="relative flex items-center justify-end pr-3"
              key={handleId}
              style={{
                height: handleSpacing,
              }}
            >
              <span
                className={cn(
                  "text-[10px] leading-none",
                  isMatched
                    ? "font-medium text-green-400"
                    : "text-muted-foreground"
                )}
              >
                {label}
              </span>
              <Handle
                id={handleId}
                position={Position.Right}
                style={{
                  top: topOffset,
                  right: -4,
                  background: isMatched ? "#22c55e" : undefined,
                }}
                type="source"
              />
            </div>
          );
        })}

        {/* Fallback handle */}
        <div
          className="relative flex items-center justify-end pr-3"
          style={{ height: handleSpacing }}
        >
          <span
            className={cn(
              "text-[10px] leading-none",
              matchedRuleIndex === -1
                ? "font-medium text-amber-400"
                : "text-muted-foreground"
            )}
          >
            Fallback
          </span>
          <Handle
            id="fallback"
            position={Position.Right}
            style={{
              top: 80 + rules.length * handleSpacing,
              right: -4,
              background: matchedRuleIndex === -1 ? "#f59e0b" : undefined,
            }}
            type="source"
          />
        </div>
      </div>
    </div>
  );
});

SwitchNode.displayName = "SwitchNode";
