"use client";

import { ChevronRight, Plus, XCircle } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";

// --- Operator definitions matching the screenshots ---

type OperatorDef = {
  value: string;
  label: string;
};

type OperatorCategory = {
  value: string;
  label: string;
  icon: string;
  operators: OperatorDef[];
};

const OPERATOR_CATEGORIES: OperatorCategory[] = [
  {
    value: "string",
    label: "String",
    icon: "T",
    operators: [
      { value: "exists", label: "exists" },
      { value: "does_not_exist", label: "does not exist" },
      { value: "is_empty", label: "is empty" },
      { value: "is_not_empty", label: "is not empty" },
      { value: "is_equal_to", label: "is equal to" },
      { value: "is_not_equal_to", label: "is not equal to" },
      { value: "contains", label: "contains" },
      { value: "does_not_contain", label: "does not contain" },
      { value: "starts_with", label: "starts with" },
      { value: "does_not_start_with", label: "does not start with" },
      { value: "ends_with", label: "ends with" },
      { value: "does_not_end_with", label: "does not end with" },
      { value: "matches_regex", label: "matches regex" },
      { value: "does_not_match_regex", label: "does not match regex" },
    ],
  },
  {
    value: "number",
    label: "Number",
    icon: "#",
    operators: [
      { value: "exists", label: "exists" },
      { value: "does_not_exist", label: "does not exist" },
      { value: "is_empty", label: "is empty" },
      { value: "is_not_empty", label: "is not empty" },
      { value: "is_equal_to", label: "is equal to" },
      { value: "is_not_equal_to", label: "is not equal to" },
      { value: "is_greater_than", label: "is greater than" },
      { value: "is_less_than", label: "is less than" },
      { value: "is_greater_than_or_equal_to", label: "is greater than or equal to" },
      { value: "is_less_than_or_equal_to", label: "is less than or equal to" },
    ],
  },
  {
    value: "date_time",
    label: "Date & Time",
    icon: "\u{1F4C5}",
    operators: [
      { value: "exists", label: "exists" },
      { value: "does_not_exist", label: "does not exist" },
      { value: "is_empty", label: "is empty" },
      { value: "is_not_empty", label: "is not empty" },
      { value: "is_equal_to", label: "is equal to" },
      { value: "is_not_equal_to", label: "is not equal to" },
      { value: "is_after", label: "is after" },
      { value: "is_before", label: "is before" },
      { value: "is_after_or_equal_to", label: "is after or equal to" },
      { value: "is_before_or_equal_to", label: "is before or equal to" },
    ],
  },
  {
    value: "boolean",
    label: "Boolean",
    icon: "\u2611",
    operators: [
      { value: "exists", label: "exists" },
      { value: "does_not_exist", label: "does not exist" },
      { value: "is_empty", label: "is empty" },
      { value: "is_not_empty", label: "is not empty" },
      { value: "is_true", label: "is true" },
      { value: "is_false", label: "is false" },
      { value: "is_equal_to", label: "is equal to" },
      { value: "is_not_equal_to", label: "is not equal to" },
    ],
  },
  {
    value: "array",
    label: "Array",
    icon: "\u2261",
    operators: [
      { value: "exists", label: "exists" },
      { value: "does_not_exist", label: "does not exist" },
      { value: "is_empty", label: "is empty" },
      { value: "is_not_empty", label: "is not empty" },
      { value: "contains", label: "contains" },
      { value: "does_not_contain", label: "does not contain" },
      { value: "length_equal_to", label: "length equal to" },
      { value: "length_not_equal_to", label: "length not equal to" },
      { value: "length_greater_than", label: "length greater than" },
      { value: "length_less_than", label: "length less than" },
      { value: "length_greater_than_or_equal_to", label: "length greater than or equal to" },
      { value: "length_less_than_or_equal_to", label: "length less than or equal to" },
    ],
  },
];

const UNARY_OPERATORS = new Set([
  "exists",
  "does_not_exist",
  "is_empty",
  "is_not_empty",
  "is_true",
  "is_false",
]);

type RuleData = {
  field: string;
  operatorType: string;
  operator: string;
  value: string;
  outputName: string;
  renameOutput: boolean;
};

function getDefaultRule(): RuleData {
  return {
    field: "",
    operatorType: "string",
    operator: "is_equal_to",
    value: "",
    outputName: "",
    renameOutput: false,
  };
}

function parseRules(rulesJson: string | undefined): RuleData[] {
  if (!rulesJson) return [getDefaultRule()];
  try {
    const parsed = JSON.parse(rulesJson);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return [getDefaultRule()];
  } catch {
    return [getDefaultRule()];
  }
}

// --- Operator Selector (two-level: category → operator) ---

function OperatorSelector({
  operatorType,
  operator,
  onChangeType,
  onChangeOperator,
  disabled,
}: {
  operatorType: string;
  operator: string;
  onChangeType: (type: string) => void;
  onChangeOperator: (op: string) => void;
  disabled?: boolean;
}) {
  const [showCategories, setShowCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const currentCategory = useMemo(
    () => OPERATOR_CATEGORIES.find((c) => c.value === operatorType),
    [operatorType]
  );
  const currentOperator = useMemo(
    () => currentCategory?.operators.find((o) => o.value === operator),
    [currentCategory, operator]
  );

  const handleCategoryClick = useCallback(
    (catValue: string) => {
      setSelectedCategory(catValue);
      onChangeType(catValue);
      // Auto-select first operator in the new category
      const cat = OPERATOR_CATEGORIES.find((c) => c.value === catValue);
      if (cat && cat.operators.length > 0) {
        // Keep current operator if it exists in the new category
        const currentExists = cat.operators.find((o) => o.value === operator);
        if (!currentExists) {
          onChangeOperator(cat.operators[0].value);
        }
      }
    },
    [onChangeType, onChangeOperator, operator]
  );

  // Use a flat select with grouped options for simplicity
  const displayLabel = currentOperator
    ? `${currentCategory?.icon} ${currentOperator.label}`
    : "Select operator";

  return (
    <Select
      disabled={disabled}
      onValueChange={(val) => {
        // Value format: "category:operator"
        const [cat, op] = val.split(":");
        if (cat && op) {
          if (cat !== operatorType) {
            onChangeType(cat);
          }
          onChangeOperator(op);
        }
      }}
      value={`${operatorType}:${operator}`}
    >
      <SelectTrigger className="w-full text-xs">
        <SelectValue placeholder="Select operator">
          {displayLabel}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {OPERATOR_CATEGORIES.map((category) => (
          <div key={category.value}>
            <div className="px-2 py-1.5 font-semibold text-muted-foreground text-xs">
              {category.icon} {category.label}
            </div>
            {category.operators.map((op) => (
              <SelectItem
                key={`${category.value}:${op.value}`}
                value={`${category.value}:${op.value}`}
              >
                <span className="pl-2 text-xs">{op.label}</span>
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}

// --- Single Rule Component ---

function SwitchRuleItem({
  rule,
  index,
  onUpdate,
  onRemove,
  disabled,
  canRemove,
}: {
  rule: RuleData;
  index: number;
  onUpdate: (index: number, updated: RuleData) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
  canRemove: boolean;
}) {
  const isUnary = UNARY_OPERATORS.has(rule.operator);

  return (
    <div className="relative space-y-2">
      {/* Expression field */}
      <div className="flex items-start gap-1">
        <div className="flex h-9 w-8 shrink-0 items-center justify-center rounded-l-md border border-r-0 bg-muted text-muted-foreground text-xs italic">
          fx
        </div>
        <div className="min-w-0 flex-1">
          <TemplateBadgeInput
            disabled={disabled}
            id={`switch-rule-field-${index}`}
            onChange={(val) => onUpdate(index, { ...rule, field: val })}
            placeholder="e.g., {{@nodeId:Label.field}}"
            value={rule.field}
          />
        </div>
        {canRemove && (
          <button
            className="mt-1.5 shrink-0 text-muted-foreground hover:text-destructive"
            disabled={disabled}
            onClick={() => onRemove(index)}
            type="button"
          >
            <XCircle className="size-5" />
          </button>
        )}
      </div>

      {/* Operator selector */}
      <OperatorSelector
        disabled={disabled}
        onChangeOperator={(op) => onUpdate(index, { ...rule, operator: op })}
        onChangeType={(type) =>
          onUpdate(index, { ...rule, operatorType: type })
        }
        operator={rule.operator}
        operatorType={rule.operatorType}
      />

      {/* Value field (hidden for unary operators) */}
      {!isUnary && (
        <Input
          disabled={disabled}
          onChange={(e) => onUpdate(index, { ...rule, value: e.target.value })}
          placeholder="Comparison value"
          value={rule.value}
        />
      )}

      {/* Rename Output toggle */}
      <div className="space-y-1">
        <Label className="text-muted-foreground text-xs">Rename Output</Label>
        <div className="flex items-center gap-2">
          <button
            className={`relative h-5 w-9 rounded-full transition-colors ${
              rule.renameOutput
                ? "bg-primary"
                : "bg-muted-foreground/30"
            }`}
            disabled={disabled}
            onClick={() =>
              onUpdate(index, { ...rule, renameOutput: !rule.renameOutput })
            }
            type="button"
          >
            <span
              className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                rule.renameOutput ? "translate-x-4" : ""
              }`}
            />
          </button>
        </div>
        {rule.renameOutput && (
          <Input
            className="mt-1"
            disabled={disabled}
            onChange={(e) =>
              onUpdate(index, { ...rule, outputName: e.target.value })
            }
            placeholder={`Output ${index}`}
            value={rule.outputName}
          />
        )}
      </div>
    </div>
  );
}

// --- Main Switch Config Component ---

type SwitchConfigProps = {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
};

export function SwitchConfig({
  config,
  onUpdateConfig,
  disabled,
}: SwitchConfigProps) {
  const rules = useMemo(
    () => parseRules(config?.rules as string | undefined),
    [config?.rules]
  );

  const updateRules = useCallback(
    (newRules: RuleData[]) => {
      onUpdateConfig("rules", JSON.stringify(newRules));
    },
    [onUpdateConfig]
  );

  const handleUpdateRule = useCallback(
    (index: number, updated: RuleData) => {
      const newRules = [...rules];
      newRules[index] = updated;
      updateRules(newRules);
    },
    [rules, updateRules]
  );

  const handleRemoveRule = useCallback(
    (index: number) => {
      const newRules = rules.filter((_, i) => i !== index);
      updateRules(newRules);
    },
    [rules, updateRules]
  );

  const handleAddRule = useCallback(() => {
    updateRules([...rules, getDefaultRule()]);
  }, [rules, updateRules]);

  return (
    <div className="space-y-3">
      {/* Mode selector */}
      <div className="space-y-2">
        <Label className="ml-1">Mode</Label>
        <Select
          disabled={disabled}
          onValueChange={(val) => onUpdateConfig("switchMode", val)}
          value={(config?.switchMode as string) || "rules"}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rules">Rules</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Routing Rules */}
      <div className="space-y-3">
        <Label className="ml-1 font-semibold">Routing Rules</Label>

        {rules.map((rule, index) => (
          <div key={`rule-${index}`}>
            {index > 0 && (
              <div className="my-3 border-t border-dashed border-muted-foreground/30" />
            )}
            <SwitchRuleItem
              canRemove={rules.length > 1}
              disabled={disabled}
              index={index}
              onRemove={handleRemoveRule}
              onUpdate={handleUpdateRule}
              rule={rule}
            />
          </div>
        ))}

        {/* Add Rule button */}
        <Button
          className="w-full"
          disabled={disabled}
          onClick={handleAddRule}
          size="sm"
          variant="outline"
        >
          <Plus className="mr-1 size-3.5" />
          Add Routing Rule
        </Button>
      </div>
    </div>
  );
}
