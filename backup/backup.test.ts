import { describe, expect, it } from "vitest";
import { BACKUP_SCHEMA_VERSION, parseBackup } from "./backup";

describe("backup parse", () => {
  it("parses a valid v4 backup", () => {
    const backup = parseBackup({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: "2026-08-22T00:00:00.000Z",
      profile: null,
      knowledge: [],
      resumeVersions: [],
      applications: [],
      answers: []
    });
    expect(backup.schemaVersion).toBe(4);
  });

  it("rejects corrupted backups", () => {
    expect(() => parseBackup("nope")).toThrow(/valid JSON/i);
    expect(() => parseBackup({ schemaVersion: 99 })).toThrow(/Unsupported/);
  });
});
