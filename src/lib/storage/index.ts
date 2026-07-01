import { PersistentStorageManager } from "./persistentStorageManager";

export * from "./types";
export * from "./indexedDBAdapter";
export * from "./localStorageAdapter";
export * from "./inMemoryAdapter";
export * from "./persistentStorageManager";

export const storyStorage = new PersistentStorageManager();

