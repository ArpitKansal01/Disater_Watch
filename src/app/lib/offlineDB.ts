import { openDB, IDBPDatabase } from "idb";

let dbPromise: Promise<IDBPDatabase> | null = null;

// ✅ Define report type
export interface OfflineReport {
  id?: number;
  image: string;
  note: string;
  location: string;
  createdAt: string;
}

// ✅ Lazy + client-safe DB init
const getDB = async () => {
  if (typeof window === "undefined") {
    return null; // 🚨 prevents server crash
  }

  if (!dbPromise) {
    dbPromise = openDB("offline-reports-db", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("reports")) {
          db.createObjectStore("reports", {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      },
    });
  }

  return dbPromise;
};

// ✅ Save report
export const saveReportOffline = async (
  report: OfflineReport
) => {
  const db = await getDB();
  if (!db) return;

  await db.add("reports", report);
};

// ✅ Get all reports
export const getOfflineReports = async () => {
  const db = await getDB();
  if (!db) return [];

  return await db.getAll("reports");
};

// ✅ Clear reports
export const clearOfflineReports = async () => {
  const db = await getDB();
  if (!db) return;

  const tx = db.transaction("reports", "readwrite");
  await tx.objectStore("reports").clear();
  await tx.done;
};
