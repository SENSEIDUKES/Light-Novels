import type { StoryWorld } from "../../types";

export type StoryPatchOperation =
  | { op: "add" | "replace"; path: string; value: unknown }
  | { op: "remove"; path: string };

const FORBIDDEN_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);
export const MAX_STORY_PATCH_OPERATIONS = 500;

function escapeSegment(value: string): string {
  return value.replace(/~/g, "~0").replace(/\//g, "~1");
}

function unescapeSegment(value: string): string {
  return value.replace(/~1/g, "/").replace(/~0/g, "~");
}

function appendPath(path: string, segment: string | number): string {
  return `${path}/${escapeSegment(String(segment))}`;
}

function equalJson(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length
      && left.every((entry, index) => equalJson(entry, right[index]));
  }
  if (
    left !== null
    && right !== null
    && typeof left === "object"
    && typeof right === "object"
    && !Array.isArray(left)
    && !Array.isArray(right)
  ) {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const leftKeys = Object.keys(leftRecord).sort();
    const rightKeys = Object.keys(rightRecord).sort();
    return leftKeys.length === rightKeys.length
      && leftKeys.every((key, index) =>
        key === rightKeys[index] && equalJson(leftRecord[key], rightRecord[key]));
  }
  return false;
}

function diffJson(
  previous: unknown,
  next: unknown,
  path: string,
  operations: StoryPatchOperation[],
): void {
  if (equalJson(previous, next)) return;

  if (Array.isArray(previous) && Array.isArray(next)) {
    let prefix = 0;
    while (
      prefix < previous.length
      && prefix < next.length
      && equalJson(previous[prefix], next[prefix])
    ) {
      prefix += 1;
    }
    let suffix = 0;
    while (
      suffix < previous.length - prefix
      && suffix < next.length - prefix
      && equalJson(
        previous[previous.length - 1 - suffix],
        next[next.length - 1 - suffix],
      )
    ) {
      suffix += 1;
    }

    const previousMiddleLength = previous.length - prefix - suffix;
    const nextMiddleLength = next.length - prefix - suffix;
    if (previousMiddleLength === nextMiddleLength) {
      for (let index = 0; index < previousMiddleLength; index += 1) {
        diffJson(
          previous[prefix + index],
          next[prefix + index],
          appendPath(path, prefix + index),
          operations,
        );
      }
      return;
    }

    for (let index = previousMiddleLength - 1; index >= 0; index -= 1) {
      operations.push({ op: "remove", path: appendPath(path, prefix + index) });
    }
    for (let index = 0; index < nextMiddleLength; index += 1) {
      operations.push({
        op: "add",
        path: appendPath(path, prefix + index),
        value: next[prefix + index],
      });
    }
    return;
  }

  if (
    previous !== null
    && next !== null
    && typeof previous === "object"
    && typeof next === "object"
    && !Array.isArray(previous)
    && !Array.isArray(next)
  ) {
    const previousRecord = previous as Record<string, unknown>;
    const nextRecord = next as Record<string, unknown>;
    const keys = new Set([...Object.keys(previousRecord), ...Object.keys(nextRecord)]);
    for (const key of [...keys].sort()) {
      const childPath = appendPath(path, key);
      if (!(key in nextRecord)) {
        operations.push({ op: "remove", path: childPath });
      } else if (!(key in previousRecord)) {
        operations.push({ op: "add", path: childPath, value: nextRecord[key] });
      } else {
        diffJson(previousRecord[key], nextRecord[key], childPath, operations);
      }
    }
    return;
  }

  operations.push({ op: "replace", path, value: next });
}

export function createStoryPatch(
  previous: StoryWorld,
  next: StoryWorld,
): StoryPatchOperation[] {
  const operations: StoryPatchOperation[] = [];
  diffJson(previous, next, "", operations);
  if (operations.length > MAX_STORY_PATCH_OPERATIONS) {
    throw new Error(
      `Story update exceeds the bounded patch limit (${operations.length}/${MAX_STORY_PATCH_OPERATIONS}).`,
    );
  }
  return operations;
}

function parsePath(path: string): string[] {
  if (!path.startsWith("/") || path === "/") {
    throw new Error("Story patch paths must address a field below the story root.");
  }
  const segments = path.slice(1).split("/").map(unescapeSegment);
  if (segments.some((segment) => FORBIDDEN_SEGMENTS.has(segment))) {
    throw new Error("Story patch contains a forbidden path segment.");
  }
  return segments;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function applyStoryPatch(
  source: StoryWorld,
  operations: readonly StoryPatchOperation[],
): StoryWorld {
  if (operations.length > MAX_STORY_PATCH_OPERATIONS) {
    throw new Error("Story patch exceeds the bounded operation limit.");
  }
  const result = cloneJson(source) as unknown as Record<string, unknown>;
  for (const operation of operations) {
    const segments = parsePath(operation.path);
    let parent: unknown = result;
    for (const segment of segments.slice(0, -1)) {
      if (Array.isArray(parent)) {
        const index = Number(segment);
        if (!Number.isSafeInteger(index) || index < 0 || index >= parent.length) {
          throw new Error("Story patch array path is out of bounds.");
        }
        parent = parent[index];
      } else if (parent !== null && typeof parent === "object") {
        if (!Object.prototype.hasOwnProperty.call(parent, segment)) {
          throw new Error("Story patch path does not exist.");
        }
        parent = (parent as Record<string, unknown>)[segment];
      } else {
        throw new Error("Story patch traverses a non-container value.");
      }
    }

    const leaf = segments.at(-1)!;
    if (Array.isArray(parent)) {
      const index = Number(leaf);
      const upperBound = operation.op === "add" ? parent.length : parent.length - 1;
      if (!Number.isSafeInteger(index) || index < 0 || index > upperBound) {
        throw new Error("Story patch array index is out of bounds.");
      }
      if (operation.op === "remove") parent.splice(index, 1);
      else if (operation.op === "add") parent.splice(index, 0, cloneJson(operation.value));
      else parent[index] = cloneJson(operation.value);
    } else if (parent !== null && typeof parent === "object") {
      const record = parent as Record<string, unknown>;
      if (operation.op === "remove") {
        if (!Object.prototype.hasOwnProperty.call(record, leaf)) {
          throw new Error("Story patch remove target does not exist.");
        }
        delete record[leaf];
      } else {
        record[leaf] = cloneJson(operation.value);
      }
    } else {
      throw new Error("Story patch parent is not a container.");
    }
  }
  return result as unknown as StoryWorld;
}
