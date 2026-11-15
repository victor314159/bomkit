// JSONata expressions, restricted so that an import is reproducible and
// fails loudly: every name must be a declared column, every variable a known
// one, and functions that depend on the clock, on chance or on text built at
// run time are refused. All of this is checked when the configuration is
// loaded, before any row is read.

import jsonata from "jsonata";

/** Built-in functions of JSONata 2.2. The version is pinned in package.json. */
const BUILTINS = new Set(
  (
    "sum count max min average string substring substringBefore substringAfter lowercase uppercase length trim pad " +
    "match contains replace split join formatNumber formatBase formatInteger parseInteger number floor ceil round " +
    "abs sqrt power boolean not map zip filter single reduce sift keys lookup append exists spread merge reverse " +
    "each error assert type sort distinct base64encode base64decode encodeUrlComponent encodeUrl decodeUrlComponent " +
    "decodeUrl toMillis fromMillis clone"
  ).split(" "),
);

/** Not reproducible (`now`, `millis`, `random`, `shuffle`) or not checkable (`eval`). */
const REFUSED = new Set(["now", "millis", "random", "shuffle", "eval"]);

/** Functions provided by the importer. */
export const FUNCTIONS = [
  "id",
  "org",
  "num",
  "quantity",
  "designators",
  "nth",
] as const;
export type FunctionName = (typeof FUNCTIONS)[number];

/** Evaluations of sub-expressions allowed for one value. Stops runaway recursion. */
const STEP_LIMIT = 100_000;

export class ConfigError extends Error {}

export interface Scope {
  /** Where the expression is, for messages. */
  at: string;
  columns: ReadonlySet<string>;
  ctxKeys: ReadonlySet<string>;
  /** Variables holding rows (`prev`, `rows`): the step after them is a column. */
  rowVars: ReadonlySet<string>;
  /** Other variables (`sheet`, `row`). */
  vars: ReadonlySet<string>;
  /** `$nth` counts rows in order, so it is only available in `derive`. */
  phase: "derive" | "rows" | "emit";
  /** Receives remarks on expressions that are valid but likely wrong. */
  warn(message: string): void;
}

type Node = {
  type?: string;
  value?: unknown;
  position?: number;
  steps?: Node[];
  [key: string]: unknown;
};

function check(source: string, ast: Node, scope: Scope): void {
  const bound = new Set<string>();
  const collect = (n: unknown): void => {
    if (Array.isArray(n)) return n.forEach(collect);
    if (n === null || typeof n !== "object") return;
    const node = n as Node;
    if (node.type === "bind") bound.add(String((node["lhs"] as Node).value));
    if (node.type === "lambda")
      for (const a of node["arguments"] as Node[]) bound.add(String(a.value));
    Object.values(node).forEach(collect);
  };
  collect(ast);

  const fail = (message: string): never => {
    throw new ConfigError(`${scope.at}: ${message} in \`${source}\``);
  };
  const column = (name: unknown) => {
    if (!scope.columns.has(String(name)))
      fail(
        `"${String(name)}" is not a declared column (declared: ${[...scope.columns].join(", ")})`,
      );
  };
  const variable = (name: string) => {
    if (REFUSED.has(name))
      fail(`$${name} is not allowed (imports must be reproducible)`);
    const known =
      name === "" ||
      name === "$" ||
      name === "ctx" ||
      bound.has(name) ||
      BUILTINS.has(name) ||
      scope.rowVars.has(name) ||
      scope.vars.has(name) ||
      (FUNCTIONS as readonly string[]).includes(name);
    if (!known) fail(`unknown variable or function $${name}`);
    if (name === "nth" && scope.phase !== "derive")
      fail("$nth is only available in derive");
  };
  const children = (node: Node, skip?: string) => {
    for (const [key, v] of Object.entries(node)) if (key !== skip) visit(v);
  };
  const visit = (n: unknown): void => {
    if (Array.isArray(n)) return n.forEach(visit);
    if (n === null || typeof n !== "object") return;
    const node = n as Node;
    if (node.type === "path" && node.steps) {
      const steps = node.steps;
      steps.forEach((step, i) => {
        const before = i > 0 ? steps[i - 1]! : undefined;
        if (step.type === "name") {
          if (i === 0) column(step.value);
          else if (
            before?.type === "variable" &&
            scope.rowVars.has(String(before.value))
          )
            column(step.value);
          else if (
            before?.type === "variable" &&
            before.value === "ctx" &&
            !scope.ctxKeys.has(String(step.value))
          )
            fail(`"${String(step.value)}" is not set by any section row`);
          children(step, "value");
        } else visit(step);
      });
      children(node, "steps");
      return;
    }
    // `x != 'a'` is false, not true, when the cell x is empty.
    if (
      node.type === "binary" &&
      node.value === "!=" &&
      [node["lhs"], node["rhs"]].some(
        (o) => (o as Node | undefined)?.type === "path",
      )
    )
      scope.warn(
        `${scope.at}: \`!=\` is false when a cell is empty; write \`$not(… = …)\` if empty cells should match, in \`${source}\``,
      );
    if (node.type === "name") column(node.value);
    if (node.type === "variable") variable(String(node.value));
    children(node);
  };
  visit(ast);
}

export interface Compiled {
  source: string;
  evaluate(
    input: Record<string, unknown>,
    vars: Record<string, unknown>,
  ): Promise<unknown>;
}

export class EvaluationError extends Error {}

/** Parses and checks an expression. `functions` are the importer's own. */
export function compile(
  source: string,
  scope: Scope,
  functions: Record<FunctionName, (...args: unknown[]) => unknown>,
): Compiled {
  let expr: jsonata.Expression;
  try {
    expr = jsonata(source);
  } catch (e) {
    const err = e as { message?: string; position?: number };
    throw new ConfigError(
      `${scope.at}: ${err.message ?? "invalid expression"} at character ${err.position ?? "?"} in \`${source}\``,
    );
  }
  const ast = expr.ast() as Node;
  check(source, ast, scope);
  // Most leaves are a constant or a bare column: they need no evaluator.
  if (ast.type === "string" || ast.type === "number" || ast.type === "value") {
    const constant = ast.value;
    return { source, evaluate: async () => constant };
  }
  const only =
    ast.type === "path" && ast.steps?.length === 1 ? ast.steps[0]! : undefined;
  const bare = (n: Node, keys: string[]) =>
    Object.keys(n).every((k) => keys.includes(k));
  if (
    only?.type === "name" &&
    bare(only, ["type", "value", "position"]) &&
    bare(ast, ["type", "steps"])
  ) {
    const name = String(only.value);
    return {
      source,
      evaluate: async (input) =>
        typeof input[name] === "object"
          ? structuredClone(input[name])
          : input[name],
    };
  }
  for (const name of FUNCTIONS) expr.registerFunction(name, functions[name]);
  let steps = 0;
  (expr.assign as (name: string | symbol, value: unknown) => void)(
    Symbol.for("jsonata.__evaluate_entry"),
    () => {
      if (++steps > STEP_LIMIT)
        throw {
          message: `more than ${STEP_LIMIT} evaluation steps (endless recursion?)`,
        };
    },
  );
  return {
    source,
    async evaluate(input, vars) {
      steps = 0;
      try {
        return plain(await expr.evaluate(input, vars));
      } catch (e) {
        throw new EvaluationError(
          `${(e as { message?: string }).message ?? String(e)} in \`${source}\``,
        );
      }
    },
  };
}

/** JSONata marks its sequences with extra properties; this returns plain JSON values. */
function plain(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(plain);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .map(([k, v]) => [k, plain(v)])
        .filter(([, v]) => v !== undefined),
    );
  return typeof value === "function" ? undefined : value;
}
