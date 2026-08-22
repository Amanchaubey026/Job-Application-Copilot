export const DB_NAME = "job-application-copilot";
const DB_VERSION = 4;
export const PROFILE_STORE = "profiles";
export const SETTINGS_STORE = "settings";
export const AI_CACHE_STORE = "ai-cache";
export const KNOWLEDGE_STORE = "knowledge";
export const EMBEDDING_STORE = "embeddings";
export const APPLICATION_STORE = "applications";
export const ANSWER_LIBRARY_STORE = "answers";
export const RESUME_STORE = "resume-versions";
export const REVISION_STORE = "resume-revisions";
export const SNAPSHOT_STORE = "snapshots";

let dbPromise: Promise<IDBDatabase> | null = null;
let dbInstance: IDBDatabase | null = null;

function ensureStores(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(PROFILE_STORE)) {
    db.createObjectStore(PROFILE_STORE, { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
    db.createObjectStore(SETTINGS_STORE, { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains(AI_CACHE_STORE)) {
    db.createObjectStore(AI_CACHE_STORE, { keyPath: "key" });
  }
  if (!db.objectStoreNames.contains(KNOWLEDGE_STORE)) {
    db.createObjectStore(KNOWLEDGE_STORE, { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains(EMBEDDING_STORE)) {
    db.createObjectStore(EMBEDDING_STORE, { keyPath: "knowledgeId" });
  }
  if (!db.objectStoreNames.contains(APPLICATION_STORE)) {
    db.createObjectStore(APPLICATION_STORE, { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains(ANSWER_LIBRARY_STORE)) {
    db.createObjectStore(ANSWER_LIBRARY_STORE, { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains(RESUME_STORE)) {
    db.createObjectStore(RESUME_STORE, { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains(REVISION_STORE)) {
    db.createObjectStore(REVISION_STORE, { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
    db.createObjectStore(SNAPSHOT_STORE, { keyPath: "id" });
  }
}

export function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this context."));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        ensureStores(request.result);
      };

      request.onsuccess = () => {
        finish(() => {
          dbInstance = request.result;
          dbInstance.onclose = () => {
            dbInstance = null;
            dbPromise = null;
          };
          resolve(dbInstance);
        });
      };
      request.onblocked = () => {
        if (dbInstance) {
          dbInstance.close();
          dbInstance = null;
        }
      };
      request.onerror = () => {
        finish(() => {
          dbPromise = null;
          reject(request.error ?? new Error("Failed to open IndexedDB."));
        });
      };
      setTimeout(() => {
        finish(() => {
          dbPromise = null;
          reject(new Error("IndexedDB open timed out."));
        });
      }, 4000);
    });
  }

  return dbPromise;
}

export function resetDatabaseCache(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  dbPromise = null;
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

export function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const request = run(tx.objectStore(storeName));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error("IndexedDB request failed."));
        tx.onerror = () =>
          reject(tx.error ?? new Error("IndexedDB transaction failed."));
      })
  );
}

export function withTransaction(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => void
): Promise<void> {
  return openDatabase().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        run(tx.objectStore(storeName));
        tx.oncomplete = () => resolve();
        tx.onerror = () =>
          reject(tx.error ?? new Error("IndexedDB transaction failed."));
        tx.onabort = () =>
          reject(tx.error ?? new Error("IndexedDB transaction aborted."));
      })
  );
}
