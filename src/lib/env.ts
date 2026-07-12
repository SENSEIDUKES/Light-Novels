/**
 * True in local development only — covers Vite's browser dev server (where
 * `process` is undefined but `import.meta.env.DEV` is set) and Node-side
 * tooling (where NODE_ENV is set). Deliberately false under Vitest so
 * curation logs don't spam test output.
 */
export function isDevBuild(): boolean {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    return true;
  }
  const meta = import.meta as ImportMeta & { env?: { DEV?: boolean; TEST?: boolean } };
  return !!meta.env?.DEV && !meta.env?.TEST;
}
