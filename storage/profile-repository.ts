import type { UserProfile } from "~types/profile";
import { touchProfile } from "~utils/profile-factory";
import { openDatabase, PROFILE_STORE } from "./db";

export const DEFAULT_PROFILE_ID = "default";

export interface ProfileRepository {
  getProfile(): Promise<UserProfile | null>;
  saveProfile(profile: UserProfile): Promise<void>;
  deleteProfile(): Promise<void>;
}

function withRequest<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(PROFILE_STORE, mode);
        const request = run(tx.objectStore(PROFILE_STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error("IndexedDB request failed."));
        tx.onerror = () =>
          reject(tx.error ?? new Error("IndexedDB transaction failed."));
      })
  );
}

export const profileRepository: ProfileRepository = {
  async getProfile() {
    const value = await withRequest(
      "readonly",
      (store) => store.get(DEFAULT_PROFILE_ID) as IDBRequest<UserProfile | undefined>
    );
    return value ?? null;
  },

  async saveProfile(profile) {
    const toSave: UserProfile = {
      ...touchProfile(profile),
      id: DEFAULT_PROFILE_ID
    };
    await withRequest("readwrite", (store) => store.put(toSave));
  },

  async deleteProfile() {
    await withRequest("readwrite", (store) => store.delete(DEFAULT_PROFILE_ID));
  }
};
