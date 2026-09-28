const { app } = require("electron")
const fs = require("fs")
const os = require("os")
const path = require("path")
const initSqlJs = require("sql.js")
const Database = require("better-sqlite3")
const { importAllData } = require("../services/JsonBackupImporter.cjs")

const generateId = () => `test-${Math.random().toString(36).slice(2)}`
const ensureItemsHaveIds = (items) => items.map((item, index) => ({ ...item, _id: item._id || `restored-item-${index}` }))
const toIsoDate = (value) => value ? new Date(value).toISOString() : ""

async function verify() {
  const SQL = await initSqlJs()
  const legacyDb = new SQL.Database()
  legacyDb.run(`
    CREATE TABLE products (
      _id TEXT PRIMARY KEY, productName TEXT NOT NULL, productPrice REAL DEFAULT 0,
      purchasePrice REAL DEFAULT 0, quantity INTEGER DEFAULT 0,
      hasInfiniteQuantity INTEGER DEFAULT 1, companyName TEXT DEFAULT '', containerSize TEXT DEFAULT ''
    );
    CREATE INDEX idx_products_name ON products(productName);
    CREATE TABLE clients (
      _id TEXT PRIMARY KEY, clientName TEXT NOT NULL, clientNumber TEXT DEFAULT '',
      clientAddress TEXT DEFAULT '', isFiler INTEGER DEFAULT 0, ntnNumber TEXT DEFAULT ''
    );
    CREATE INDEX idx_clients_name ON clients(clientName);
    CREATE TABLE field_officers (_id TEXT PRIMARY KEY, name TEXT NOT NULL, phoneNumber TEXT DEFAULT '');
    CREATE INDEX idx_fo_name ON field_officers(name);
    CREATE TABLE salesmen (_id TEXT PRIMARY KEY, name TEXT NOT NULL, phoneNumber TEXT DEFAULT '');
    CREATE INDEX idx_sm_name ON salesmen(name);
    CREATE TABLE bills (
      _id TEXT PRIMARY KEY, billId INTEGER, clientId TEXT DEFAULT '', clientName TEXT DEFAULT '',
      clientAddress TEXT DEFAULT '', fieldOfficerId TEXT DEFAULT '', salesmanId TEXT DEFAULT '',
      billDate TEXT DEFAULT '', totalAmount REAL DEFAULT 0, items TEXT DEFAULT '[]'
    );
    CREATE INDEX idx_bills_date ON bills(billDate);
    CREATE INDEX idx_bills_client ON bills(clientId);
    CREATE INDEX idx_bills_id ON bills(billId);
    CREATE TABLE client_products (
      _id TEXT PRIMARY KEY, clientId TEXT NOT NULL, productId TEXT NOT NULL,
      rate REAL DEFAULT 0, discount REAL DEFAULT 0, extraDiscount REAL DEFAULT 0, lastUsed TEXT DEFAULT ''
    );
    CREATE UNIQUE INDEX idx_cp_unique ON client_products(clientId, productId);
    CREATE TABLE settings (type TEXT PRIMARY KEY, data TEXT DEFAULT '{}');
  `)
  legacyDb.run("INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?)", ["product-1", "Test Product", 12.5, 8, 10, 0, "Test Co", "Box"])
  legacyDb.run("INSERT INTO clients VALUES (?, ?, ?, ?, ?, ?)", ["client-1", "Test Client", "123", "Test Address", 1, "NTN"])
  legacyDb.run("INSERT INTO field_officers VALUES (?, ?, ?)", ["officer-1", "Test Officer", "456"])
  legacyDb.run("INSERT INTO salesmen VALUES (?, ?, ?)", ["salesman-1", "Test Salesman", "789"])
  legacyDb.run("INSERT INTO bills VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
    "test-bill", 101, "client-1", "Test Client", "Test Address", "officer-1", "salesman-1",
    "2026-09-27T12:00:00.000Z", 25, JSON.stringify([{ productId: "product-1", quantity: 2, total: 25 }]),
  ])
  legacyDb.run("INSERT INTO client_products VALUES (?, ?, ?, ?, ?, ?, ?)", ["history-1", "client-1", "product-1", 12.5, 0, 0, "2026-09-27"])
  legacyDb.run("INSERT INTO settings VALUES (?, ?)", ["company-info", JSON.stringify({ companyName: "Test Co" })])

  const testPath = path.join(os.tmpdir(), `billing-sqlite-driver-${process.pid}.sqlite`)
  try {
    fs.writeFileSync(testPath, Buffer.from(legacyDb.export()))
    legacyDb.close()

    const db = new Database(testPath)
    const row = db.prepare("SELECT * FROM bills WHERE _id = ?").get("test-bill")
    if (!row || row.billId !== 101 || JSON.parse(row.items)[0].quantity !== 2) {
      throw new Error("Could not read the sql.js-created SQLite snapshot")
    }
    if (db.prepare("SELECT quantity FROM products WHERE _id = ?").get("product-1")?.quantity !== 10) {
      throw new Error("Product data did not survive opening the SQLite snapshot")
    }
    if (JSON.parse(db.prepare("SELECT data FROM settings WHERE type = ?").get("company-info").data).companyName !== "Test Co") {
      throw new Error("Settings JSON did not survive opening the SQLite snapshot")
    }
    if (db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'index'").get().count < 7) {
      throw new Error("SQLite indexes did not survive opening the SQLite snapshot")
    }

    db.transaction(() => {
      db.prepare("UPDATE bills SET items = ? WHERE _id = ?").run(JSON.stringify([{ quantity: 3 }]), "test-bill")
    })()

    try {
      db.transaction(() => {
        db.prepare("UPDATE bills SET items = ? WHERE _id = ?").run(JSON.stringify([{ quantity: 4 }]), "test-bill")
        throw new Error("rollback check")
      })()
    } catch (error) {
      if (error.message !== "rollback check") throw error
    }

    db.close()
    const reopenedDb = new Database(testPath)
    const updatedRow = reopenedDb.prepare("SELECT items FROM bills WHERE _id = ?").get("test-bill")
    if (JSON.parse(updatedRow.items)[0].quantity !== 3) {
      throw new Error("Native SQLite transaction did not persist after reopening")
    }

    const backup = {
      products: [{ _id: "restored-product", productName: "Restored Product", productPrice: 20, quantity: 8, hasInfiniteQuantity: false }],
      clients: [{ _id: "restored-client", clientName: "Restored Client" }],
      fieldOfficers: [],
      salesmen: [],
      bills: [{
        _id: "restored-bill",
        billId: 202,
        clientId: "restored-client",
        billDate: "2026-09-27T12:00:00.000Z",
        totalAmount: 40,
        items: [{ productId: "restored-product", quantity: 2, rate: 20, total: 40 }],
      }],
      companyInfo: { companyName: "Restored Company" },
      credentials: { username: "admin" },
      appConfig: { locale: "en-GB" },
    }
    importAllData(reopenedDb, backup, { generateId, ensureItemsHaveIds, toIsoDate })
    if (reopenedDb.prepare("SELECT COUNT(*) AS count FROM bills").get().count !== 1) {
      throw new Error("All-data JSON import did not replace bill rows")
    }
    if (reopenedDb.prepare("SELECT COUNT(*) AS count FROM client_products WHERE clientId = ?").get("restored-client").count !== 1) {
      throw new Error("Client-product history was not rebuilt from imported bills")
    }
    if (JSON.parse(reopenedDb.prepare("SELECT data FROM settings WHERE type = ?").get("app-config").data).locale !== "en-GB") {
      throw new Error("Application settings were not imported")
    }

    const invalidBackup = { ...backup, products: [backup.products[0], backup.products[0]] }
    try {
      importAllData(reopenedDb, invalidBackup, { generateId, ensureItemsHaveIds, toIsoDate })
      throw new Error("Duplicate IDs were unexpectedly accepted")
    } catch (error) {
      if (error.message === "Duplicate IDs were unexpectedly accepted") throw error
    }
    if (reopenedDb.prepare("SELECT COUNT(*) AS count FROM bills").get().count !== 1 ||
        reopenedDb.prepare("SELECT _id FROM products LIMIT 1").get()._id !== "restored-product") {
      throw new Error("Failed JSON import did not roll back atomically")
    }

    reopenedDb.close()
    console.log("SQLite driver compatibility check passed")
  } finally {
    legacyDb.close()
    if (fs.existsSync(testPath)) fs.unlinkSync(testPath)
  }
}

app.whenReady().then(() => verify().then(() => app.exit(0)).catch((error) => {
  console.error(error)
  app.exit(1)
}))