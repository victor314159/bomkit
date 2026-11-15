// Assembly instructions: an ordered list of steps on an assembly part.

import type { tags } from "typia";
import {
  DocumentId,
  Note,
  PrivateExtensions,
  StepId,
  UsageId,
} from "./common.js";

/**
 * One assembly step. Steps are executed in array order. A step references
 * the usages it installs, so a viewer can show "what goes in at this step"
 * and check that every usage is installed exactly once.
 */
export interface Step {
  id: StepId;
  title: string & tags.MinLength<1>;
  /** Markdown. Images and videos are referenced through `documents`. */
  instructions?: string;
  /** Usages of the same part installed during this step. */
  usages?: UsageId[];
  documents?: DocumentId[];
  /** Tools, fixtures or machines needed, as free text. */
  tools?: string[];
  notes?: Note[];
  extensions?: PrivateExtensions;
}
