const { app } = require("electron")
const fs = require("fs")
const os = require("os")
const path = require("path")
const Database = require("better-sqlite3")
const { openApplicationDatabase } = require("../services/DatabaseBootstrap.cjs")
const { importAllData } = require("../services/JsonBackupImporter.cjs")

function createSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (_id TEXT PRIMARY KEY, productName TEXT NOT NULL, productPrice REAL DEFAULT 0, purchasePrice REAL DEFAULT 0, quantity INTEGER DEFAULT 0, hasInfiniteQuantity INTEGER DEFAULT 1, companyName TEXT DEFAULT '', containerSize TEXT DEFAULT '');
    CREATE TABLE IF NOT EXISTS clients (_id TEXT PRIMARY KEY, clientName TEXT NOT NULL, clientNumber TEXT DEFAULT '', clientAddress TEXT DEFAULT '', isFiler INTEGER DEFAULT 0, ntnNumber TEXT DEFAULT '');
    CREATE TABLE IF NOT EXISTS field_officers (_id TEXT PRIMARY KEY, name TEXT NOT NULL, phoneNumber TEXT DEFAULT '');
    CREATE TABLE IF NOT EXISTS salesmen (_id TEXT PRIMARY KEY, name TEXT NOT NULL, phoneNumber TEXT DEFAULT '');
    CREATE TABLE IF NOT EXISTS bills (_id TEXT PRIMARY KEY, billId INTEGER, clientId TEXT DEFAULT '', clientName TEXT DEFAULT '', clientAddress TEXT DEFAULT '', fieldOfficerId TEXT DEFAULT '', salesmanId TEXT DEFAULT '', billDate TEXT DEFAULT '', totalAmount REAL DEFAULT 0, items TEXT DEFAULT '[]');
    CREATE TABLE IF NOT EXISTS client_products (_id TEXT PRIMARY KEY, clientId TEXT NOT NULL, productId TEXT NOT NULL, rate REAL DEFAULT 0, discount REAL DEFAULT 0, extraDiscount REAL DEFAULT 0, lastUsed TEXT DEFAULT '', UNIQUE(clientId, productId));
    CREATE TABLE IF NOT EXISTS settings (type TEXT PRIMARY KEY, data TEXT DEFAULT '{}');
  `)
}

async function run() {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "billing-startup-recovery-test-"))
  const dbPath = path.join(userData, "billing_system.sqlite")
  const suppliedLegacyPath = process.argv[2]
  const legacyBytes = suppliedLegacyPath
    ? fs.readFileSync(suppliedLegacyPath)
    : Buffer.from("legacy sqlite database unreadable by new driver")
  const walPath = suppliedLegacyPath ? `${suppliedLegacyPath}-wal` : ""
  const shmPath = suppliedLegacyPath ? `${suppliedLegacyPath}-shm` : ""
  const walBytes = walPath ? (fs.existsSync(walPath) ? fs.readFileSync(walPath) : null) : Buffer.from("legacy wal test bytes")
  const shmBytes = shmPath ? (fs.existsSync(shmPath) ? fs.readFileSync(shmPath) : null) : Buffer.from("legacy shm test bytes")
  fs.writeFileSync(dbPath, legacyBytes)
  if (walPath) {
    if (fs.existsSync(walPath)) fs.copyFileSync(walPath, `${dbPath}-wal`)
  } else {
    fs.writeFileSync(`${dbPath}-wal`, walBytes)
  }
  if (shmPath) {
    if (fs.existsSync(shmPath)) fs.copyFileSync(shmPath, `${dbPath}-shm`)
  } else {
    fs.writeFileSync(`${dbPath}-shm`, shmBytes)
  }

  let db
  try {
    let opened = await openApplicationDatabase({
      Database,
      dbPath,
      userData,
      createSchema,
      migrateFromNedb: () => [],
    })
    db = opened.db
    if (!opened.restoreRequired) throw new Error("Unreadable legacy database did not require restore")

    const markerPath = path.join(userData, "database-restore-required.json")
    const marker = JSON.parse(fs.readFileSync(markerPath, "utf8"))
    const recoveryDirectory = marker.recoveryDirectory
    for (const [suffix, expected] of [["", legacyBytes], ["-wal", walBytes], ["-shm", shmBytes]].filter(([, bytes]) => bytes)) {
      const archived = fs.readFileSync(path.join(recoveryDirectory, `billing_system.sqlite${suffix}`))
      if (!archived.equals(expected)) throw new Error(`Recovery copy mismatch for ${suffix || "database"}`)
      if (suffix && fs.existsSync(`${dbPath}${suffix}`) && fs.readFileSync(`${dbPath}${suffix}`).equals(expected)) {
        throw new Error(`Legacy ${suffix} sidecar remained at active path`)
      }
    }
    if (!fs.existsSync(dbPath) || fs.readFileSync(dbPath).equals(legacyBytes)) {
      throw new Error("A fresh database was not created after preserving the legacy database")
    }

    const backup = {
      products: [{ _id: "p1", productName: "Restored Product", productPrice: 10, quantity: 4 }],
      clients: [{ _id: "c1", clientName: "Restored Client" }],
      bills: [{
        _id: "b1", billId: 1, clientId: "c1", billDate: "2026-09-27T12:00:00.000Z",
        totalAmount: 20, items: [{ productId: "p1", quantity: 2, rate: 10, total: 20 }],
      }],
      fieldOfficers: [],
      salesmen: [],
      companyInfo: { companyName: "Restored Company" },
      credentials: { username: "admin" },
    }
    importAllData(db, backup, {
      generateId: () => `generated-${Math.random()}`,
      ensureItemsHaveIds: (items) => items.map((item, index) => ({ ...item, _id: item._id || `item-${index}` })),
      toIsoDate: (value) => value ? new Date(value).toISOString() : "",
    })

    if (db.prepare("SELECT COUNT(*) AS count FROM bills").get().count !== 1) {
      throw new Error("JSON restore did not import bills")
    }
    if (db.prepare("SELECT COUNT(*) AS count FROM client_products WHERE clientId='c1'").get().count !== 1) {
      throw new Error("JSON restore did not rebuild client-product history")
    }

    db.close()
    db = null
    opened = await openApplicationDatabase({
      Database,
      dbPath,
      userData,
      createSchema,
      migrateFromNedb: () => [],
    })
    db = opened.db
    if (!opened.restoreRequired) throw new Error("Restore gate was lost after app restart before completion marker removal")

    fs.rmSync(markerPath)
    db.close()
    db = null
    opened = await openApplicationDatabase({
      Database,
      dbPath,
      userData,
      createSchema,
      migrateFromNedb: () => [],
    })
    db = opened.db
    if (opened.restoreRequired) throw new Error("Restore gate remained after successful restore marker removal")
    if (db.prepare("SELECT COUNT(*) AS count FROM bills").get().count !== 1) {
      throw new Error("Restored data did not survive app restart")
    }

    console.log("Startup recovery and JSON restore test passed")
  } finally {
    db?.close()
    fs.rmSync(userData, { recursive: true, force: true })
  }
}

app.whenReady().then(() => run()
  .then(() => app.exit(0))
  .catch((error) => {
    console.error(error)
    app.exit(1)
  }))
