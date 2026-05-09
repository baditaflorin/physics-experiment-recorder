import { openDB } from "idb";

import type { ExperimentRecord } from "../domain/types";

const dbPromise = openDB("physics-experiment-recorder", 1, {
  upgrade(db) {
    db.createObjectStore("records", { keyPath: "id" });
    db.createObjectStore("preferences");
  },
});

export async function saveRecord(record: ExperimentRecord) {
  const db = await dbPromise;
  await db.put("records", record);
  await db.put("preferences", record.id, "lastRecordId");
}

export async function loadLastRecord(): Promise<ExperimentRecord | null> {
  const db = await dbPromise;
  const id = await db.get("preferences", "lastRecordId");
  if (!id) {
    return null;
  }
  return (await db.get("records", id)) ?? null;
}

export async function clearRecords() {
  const db = await dbPromise;
  await db.clear("records");
  await db.delete("preferences", "lastRecordId");
}
