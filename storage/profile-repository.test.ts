import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { createEmptyProfile } from "~utils/profile-factory";
import { DB_NAME, resetDatabaseCache } from "./db";
import { DEFAULT_PROFILE_ID, profileRepository } from "./profile-repository";

describe("profileRepository", () => {
  beforeEach(async () => {
    resetDatabaseCache();
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });

  it("returns null when no profile exists", async () => {
    expect(await profileRepository.getProfile()).toBeNull();
  });

  it("saves and reads a profile", async () => {
    const profile = createEmptyProfile({
      personal: { firstName: "Aman", lastName: "Chaubey", fullName: "Aman Chaubey" }
    });
    await profileRepository.saveProfile(profile);
    const stored = await profileRepository.getProfile();
    expect(stored?.id).toBe(DEFAULT_PROFILE_ID);
    expect(stored?.personal.fullName).toBe("Aman Chaubey");
  });

  it("deletes a profile", async () => {
    await profileRepository.saveProfile(createEmptyProfile());
    await profileRepository.deleteProfile();
    expect(await profileRepository.getProfile()).toBeNull();
  });
});
