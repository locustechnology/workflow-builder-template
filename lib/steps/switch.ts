/**
 * Executable step function for Switch action
 * Evaluates routing rules top-to-bottom and returns the first matching rule index.
 */
import "server-only";

import { type StepInput, withStepLogging } from "./step-handler";

export type SwitchRule = {
  /** The resolved value to compare (template already replaced by executor) */
  field: string;
  /** Operator type category: "string" | "number" | "date_time" | "boolean" | "array" */
  operatorType: string;
  /** The comparison operator, e.g. "is_equal_to", "contains" */
  operator: string;
  /** The comparison target value */
  value: string;
  /** Optional renamed output label */
  outputName?: string;
};

export type SwitchInput = StepInput & {
  rules: SwitchRule[];
};

type SwitchResult = {
  matchedRuleIndex: number;
  matchedOutputName: string;
};

// --- Unary operators (no value needed) ---
const UNARY_OPERATORS = new Set([
  "exists",
  "does_not_exist",
  "is_empty",
  "is_not_empty",
  "is_true",
  "is_false",
]);

/**
 * Check if a value "exists" (is not null, undefined, or empty string)
 */
function valueExists(val: unknown): boolean {
  return val !== null && val !== undefined && val !== "";
}

/**
 * Check if a value is "empty" (null, undefined, empty string, empty array, empty object)
 */
function valueIsEmpty(val: unknown): boolean {
  if (val === null || val === undefined || val === "") return true;
  if (Array.isArray(val) && val.length === 0) return true;
  if (typeof val === "object" && Object.keys(val).length === 0) return true;
  return false;
}

/**
 * Evaluate a single rule against its field value
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Rule evaluation requires extensive operator handling
function evaluateRule(rule: SwitchRule): boolean {
  const { field, operatorType, operator, value } = rule;

  // --- Universal operators (work across all types) ---
  switch (operator) {
    case "exists":
      return valueExists(field);
    case "does_not_exist":
      return !valueExists(field);
    case "is_empty":
      return valueIsEmpty(field);
    case "is_not_empty":
      return !valueIsEmpty(field);
  }

  // --- Type-specific operators ---
  switch (operatorType) {
    case "string":
      return evaluateStringOperator(String(field ?? ""), operator, value);
    case "number":
      return evaluateNumberOperator(field, operator, value);
    case "date_time":
      return evaluateDateTimeOperator(field, operator, value);
    case "boolean":
      return evaluateBooleanOperator(field, operator);
    case "array":
      return evaluateArrayOperator(field, operator, value);
    default:
      // Default to string comparison
      return evaluateStringOperator(String(field ?? ""), operator, value);
  }
}

function evaluateStringOperator(
  fieldVal: string,
  operator: string,
  value: string
): boolean {
  switch (operator) {
    case "is_equal_to":
      return fieldVal === value;
    case "is_not_equal_to":
      return fieldVal !== value;
    case "contains":
      return fieldVal.includes(value);
    case "does_not_contain":
      return !fieldVal.includes(value);
    case "starts_with":
      return fieldVal.startsWith(value);
    case "does_not_start_with":
      return !fieldVal.startsWith(value);
    case "ends_with":
      return fieldVal.endsWith(value);
    case "does_not_end_with":
      return !fieldVal.endsWith(value);
    case "matches_regex":
      try {
        return new RegExp(value).test(fieldVal);
      } catch {
        return false;
      }
    case "does_not_match_regex":
      try {
        return !new RegExp(value).test(fieldVal);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

function evaluateNumberOperator(
  fieldVal: unknown,
  operator: string,
  value: string
): boolean {
  const num = Number(fieldVal);
  const target = Number(value);
  if (Number.isNaN(num) || Number.isNaN(target)) return false;

  switch (operator) {
    case "is_equal_to":
      return num === target;
    case "is_not_equal_to":
      return num !== target;
    case "is_greater_than":
      return num > target;
    case "is_less_than":
      return num < target;
    case "is_greater_than_or_equal_to":
      return num >= target;
    case "is_less_than_or_equal_to":
      return num <= target;
    default:
      return false;
  }
}

function evaluateDateTimeOperator(
  fieldVal: unknown,
  operator: string,
  value: string
): boolean {
  const fieldDate = new Date(String(fieldVal));
  const targetDate = new Date(value);
  if (Number.isNaN(fieldDate.getTime()) || Number.isNaN(targetDate.getTime()))
    return false;

  switch (operator) {
    case "is_equal_to":
      return fieldDate.getTime() === targetDate.getTime();
    case "is_not_equal_to":
      return fieldDate.getTime() !== targetDate.getTime();
    case "is_after":
      return fieldDate.getTime() > targetDate.getTime();
    case "is_before":
      return fieldDate.getTime() < targetDate.getTime();
    case "is_after_or_equal_to":
      return fieldDate.getTime() >= targetDate.getTime();
    case "is_before_or_equal_to":
      return fieldDate.getTime() <= targetDate.getTime();
    default:
      return false;
  }
}

function evaluateBooleanOperator(fieldVal: unknown, operator: string): boolean {
  switch (operator) {
    case "is_true":
      return (
        fieldVal === true ||
        fieldVal === "true" ||
        fieldVal === "1" ||
        fieldVal === 1
      );
    case "is_false":
      return (
        fieldVal === false ||
        fieldVal === "false" ||
        fieldVal === "0" ||
        fieldVal === 0
      );
    case "is_equal_to":
      return Boolean(fieldVal) === true;
    case "is_not_equal_to":
      return Boolean(fieldVal) === false;
    default:
      return false;
  }
}

function evaluateArrayOperator(
  fieldVal: unknown,
  operator: string,
  value: string
): boolean {
  // Try to parse field as array
  let arr: unknown[];
  if (Array.isArray(fieldVal)) {
    arr = fieldVal;
  } else if (typeof fieldVal === "string") {
    try {
      const parsed = JSON.parse(fieldVal);
      arr = Array.isArray(parsed) ? parsed : [];
    } catch {
      arr = [];
    }
  } else {
    arr = [];
  }

  switch (operator) {
    case "contains":
      return arr.some(
        (item) => String(item) === value || item === value
      );
    case "does_not_contain":
      return !arr.some(
        (item) => String(item) === value || item === value
      );
    case "length_equal_to":
      return arr.length === Number(value);
    case "length_not_equal_to":
      return arr.length !== Number(value);
    case "length_greater_than":
      return arr.length > Number(value);
    case "length_less_than":
      return arr.length < Number(value);
    case "length_greater_than_or_equal_to":
      return arr.length >= Number(value);
    case "length_less_than_or_equal_to":
      return arr.length <= Number(value);
    default:
      return false;
  }
}

/**
 * Evaluate all rules and return the first matching index
 * Returns -1 if no rule matches (fallback)
 */
function evaluateSwitch(input: SwitchInput): SwitchResult {
  const { rules } = input;

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    try {
      if (evaluateRule(rule)) {
        return {
          matchedRuleIndex: i,
          matchedOutputName: rule.outputName || `Output ${i}`,
        };
      }
    } catch (error) {
      console.error(`[Switch] Error evaluating rule ${i}:`, error);
    }
  }

  return {
    matchedRuleIndex: -1,
    matchedOutputName: "Fallback",
  };
}

// biome-ignore lint/suspicious/useAwait: workflow "use step" requires async
export async function switchStep(
  input: SwitchInput
): Promise<SwitchResult> {
  "use step";
  return withStepLogging(input, () =>
    Promise.resolve(evaluateSwitch(input))
  );
}
switchStep.maxRetries = 0;

/**
 * Check if an operator is unary (doesn't need a value)
 */
export function isUnaryOperator(operator: string): boolean {
  return UNARY_OPERATORS.has(operator);
}
