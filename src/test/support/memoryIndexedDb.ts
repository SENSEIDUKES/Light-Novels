/**
 * Minimal in-memory IDBFactory.
 *
 * jsdom ships no IndexedDB, so this stands in for the browser engine and lets
 * the REAL `IndexedDbFoundationCache` run: its schema, its owner isolation, its
 * serialization guard and its outbox lease semantics are all exercised
 * unchanged. Databases survive for the lifetime of the factory, so re-opening
 * the cache against the same factory models a page reload rather than a wipe.
 */

class MemoryRequest<T = unknown> {
  result!: T;
  error: DOMException | null = null;
  onsuccess: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onupgradeneeded: ((event: IDBVersionChangeEvent) => void) | null = null;
  onblocked: ((event: Event) => void) | null = null;
}

/** Serialize a primitive or compound IndexedDB key into one map key. */
function encodeKey(key: unknown): string {
  return Array.isArray(key) ? JSON.stringify(key.map(String)) : String(key);
}

class MemoryObjectStore {
  constructor(
    private readonly transaction: MemoryTransaction,
    private readonly rows: Map<string, unknown>,
    private readonly keyPath: string | string[] | null,
  ) {}

  private keyOf(value: unknown): string {
    if (!this.keyPath) return encodeKey((value as { storageKey: string }).storageKey);
    const record = value as Record<string, unknown>;
    return Array.isArray(this.keyPath)
      ? encodeKey(this.keyPath.map((field) => record[field]))
      : encodeKey(record[this.keyPath]);
  }

  get(key: IDBValidKey): IDBRequest {
    return this.operation(() => clone(this.rows.get(encodeKey(key))));
  }

  getAll(): IDBRequest {
    return this.operation(() => Array.from(this.rows.values(), clone));
  }

  put(value: unknown): IDBRequest {
    return this.operation(() => {
      const key = this.keyOf(value);
      this.rows.set(key, clone(value));
      return key;
    });
  }

  add(value: unknown): IDBRequest {
    return this.operation(() => {
      const key = this.keyOf(value);
      if (this.rows.has(key)) throw new DOMException("Duplicate", "ConstraintError");
      this.rows.set(key, clone(value));
      return key;
    });
  }

  delete(key: IDBValidKey): IDBRequest {
    return this.operation(() => {
      this.rows.delete(encodeKey(key));
      return undefined;
    });
  }

  clear(): IDBRequest {
    return this.operation(() => {
      this.rows.clear();
      return undefined;
    });
  }

  private operation<T>(work: () => T): IDBRequest<T> {
    const request = new MemoryRequest<T>();
    this.transaction.beginOperation();
    setTimeout(() => {
      try {
        request.result = work();
        request.onsuccess?.(new Event("success"));
      } catch (error) {
        request.error = error instanceof DOMException
          ? error
          : new DOMException(String(error), "UnknownError");
        request.onerror?.(new Event("error"));
        this.transaction.fail(request.error);
      } finally {
        this.transaction.endOperation();
      }
    }, 0);
    return request as unknown as IDBRequest<T>;
  }
}

class MemoryTransaction {
  oncomplete: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onabort: ((event: Event) => void) | null = null;
  error: DOMException | null = null;
  private pending = 0;
  private completionScheduled = false;
  private finished = false;

  constructor(
    private readonly database: MemoryDatabase,
    private readonly storeNames: string[],
  ) {
    this.scheduleCompletion();
  }

  objectStore(name: string): IDBObjectStore {
    if (!this.storeNames.includes(name)) throw new DOMException("Missing store", "NotFoundError");
    const rows = this.database.stores.get(name);
    if (!rows) throw new DOMException("Missing store", "NotFoundError");
    return new MemoryObjectStore(
      this,
      rows,
      this.database.keyPaths.get(name) ?? null,
    ) as unknown as IDBObjectStore;
  }

  beginOperation(): void {
    this.pending += 1;
  }

  endOperation(): void {
    this.pending -= 1;
    this.scheduleCompletion();
  }

  fail(error: DOMException): void {
    this.error = error;
    this.onerror?.(new Event("error"));
  }

  private scheduleCompletion(): void {
    if (this.completionScheduled || this.finished) return;
    this.completionScheduled = true;
    setTimeout(() => {
      this.completionScheduled = false;
      if (this.pending > 0 || this.finished) return;
      this.finished = true;
      if (this.error) this.onabort?.(new Event("abort"));
      else this.oncomplete?.(new Event("complete"));
    }, 0);
  }
}

class MemoryDatabase {
  readonly stores = new Map<string, Map<string, unknown>>();
  readonly keyPaths = new Map<string, string | string[]>();
  readonly objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  };
  onversionchange: ((event: IDBVersionChangeEvent) => void) | null = null;

  createObjectStore(
    name: string,
    options?: { keyPath?: string | string[] },
  ): IDBObjectStore {
    const rows = new Map<string, unknown>();
    this.stores.set(name, rows);
    if (options?.keyPath) this.keyPaths.set(name, options.keyPath);
    return { name } as IDBObjectStore;
  }

  transaction(storeNames: string | string[]): IDBTransaction {
    return new MemoryTransaction(
      this,
      Array.isArray(storeNames) ? storeNames : [storeNames],
    ) as unknown as IDBTransaction;
  }

  close(): void {}
}

export class MemoryIndexedDbFactory {
  private readonly databases = new Map<string, MemoryDatabase>();

  open(name: string): IDBOpenDBRequest {
    const request = new MemoryRequest<MemoryDatabase>();
    setTimeout(() => {
      let database = this.databases.get(name);
      if (!database) {
        database = new MemoryDatabase();
        this.databases.set(name, database);
        request.result = database;
        request.onupgradeneeded?.({} as IDBVersionChangeEvent);
      }
      request.result = database;
      setTimeout(() => request.onsuccess?.(new Event("success")), 0);
    }, 0);
    return request as unknown as IDBOpenDBRequest;
  }

  /** Discard every database, modelling a cleared browser profile. */
  clear(): void {
    this.databases.clear();
  }
}

function clone<T>(value: T): T {
  return value === undefined ? value : structuredClone(value);
}
