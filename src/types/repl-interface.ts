export interface ReplManagerInterface {
  start(): Promise<void> | void;
  stop(): void;
}

export interface ReplEvaluationResult {
  result?: unknown;
  error?: string;
}

export type ReplEvaluationHandler = (
  expression: string,
  data: unknown,
  opts: unknown,
  lastResult?: unknown
) => Promise<ReplEvaluationResult>;
