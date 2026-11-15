// Structural validation, compiled by typia from the types in src/. It checks
// everything the JSON Schema checks (and the same constraints), including
// unknown properties, which are an error outside `extensions`.

import typia, { IValidation } from "typia";
import { BomkitDocument } from "../../src/index.js";

export type StructureError = Pick<
  IValidation.IError,
  "path" | "expected" | "value"
>;

/** Typia dispatches on `kind` and returns the narrowed document in `data`. */
export const validateStructure = typia.createValidateEquals<BomkitDocument>();
