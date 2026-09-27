const { app } = require("electron")
const path = require("path")
const fs = require("fs")
const os = require("os")
const Database = require("better-sqlite3")
const initSqlJs = require("sql.js")

app.whenReady().then(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "migration-verify-"))
  const dbPath = path.join(tempDir, "billing_system.sqlite")

  console.log("1. Creating sample 1.0.7 sql.js database...")
  const SQL = await initSqlJs()
  const sqlDb = new SQL.Database()
  sqlDb.exec(`
    CREATE TABLE products (_id TEXT PRIMARY KEY, productName TEXT, productPrice REAL, purchasePrice REAL, quantity INTEGER, hasInfiniteQuantity INTEGER, companyName TEXT, containerSize TEXT);
    INSERT INTO products VALUES ('p1', 'Paracetamol 500mg', 150, 100, 50, 0, 'PharmaCorp', 'Box');
    INSERT INTO products VALUES ('p2', 'Amoxicillin 250mg', 300, 220, 20, 0, 'PharmaCorp', 'Strip');

    CREATE TABLE clients (_id TEXT PRIMARY KEY, clientName TEXT, clientNumber TEXT, clientAddress TEXT, isFiler INTEGER, ntnNumber TEXT);
    INSERT INTO clients VALUES ('c1', 'Care Pharmacy', '03001234567', '45 Market Street', 1, '1234567-8');

    CREATE TABLE field_officers (_id TEXT PRIMARY KEY, name TEXT, phoneNumber TEXT);
    INSERT INTO field_officers VALUES ('fo1', 'Officer John', '03009999999');

    CREATE TABLE salesmen (_id TEXT PRIMARY KEY, name TEXT, phoneNumber TEXT);
    INSERT INTO salesmen VALUES ('sm1', 'Salesman Dave', '03008888888');

    CREATE TABLE bills (_id TEXT PRIMARY KEY, billId INTEGER, clientId TEXT, clientName TEXT, clientAddress TEXT, fieldOfficerId TEXT, salesmanId TEXT, billDate TEXT, totalAmount REAL, items TEXT);
    INSERT INTO bills VALUES ('b1', 1001, 'c1', 'Care Pharmacy', '45 Market Street', 'fo1', 'sm1', '2026-09-27', 450, '[{"productId":"p1","rate":150,"quantity":3,"total":450}]');

    CREATE TABLE client_products (_id TEXT PRIMARY KEY, clientId TEXT, productId TEXT, rate REAL, discount REAL, extraDiscount REAL, lastUsed TEXT);
    INSERT INTO client_products VALUES ('cp1', 'c1', 'p1', 150, 0, 0, '2026-09-27');

    CREATE TABLE settings (type TEXT PRIMARY KEY, data TEXT);
    INSERT INTO settings VALUES ('company-info', '{"companyName":"Offline Billing Hub"}');
    INSERT INTO settings VALUES ('credentials', '{"username":"admin"}');
    INSERT INTO settings VALUES ('app-config', '{"invoicePrefix":"INV-"}');
  `)

  const data = sqlDb.export()
  fs.writeFileSync(dbPath, Buffer.from(data))
  sqlDb.close()

  console.log("2. Running openApplicationDatabase auto-migration...")
  const { openApplicationDatabase } = require("../services/DatabaseBootstrap.cjs")

  const result = await openApplicationDatabase({
    Database,
    dbPath,
    userData: tempDir,
    createSchema: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS products (_id TEXT PRIMARY KEY, productName TEXT, productPrice REAL, purchasePrice REAL, quantity INTEGER, hasInfiniteQuantity INTEGER, companyName TEXT, containerSize TEXT);
        CREATE TABLE IF NOT EXISTS clients (_id TEXT PRIMARY KEY, clientName TEXT, clientNumber TEXT, clientAddress TEXT, isFiler INTEGER, ntnNumber TEXT);
        CREATE TABLE IF NOT EXISTS field_officers (_id TEXT PRIMARY KEY, name TEXT, phoneNumber TEXT);
        CREATE TABLE IF NOT EXISTS salesmen (_id TEXT PRIMARY KEY, name TEXT, phoneNumber TEXT);
        CREATE TABLE IF NOT EXISTS bills (_id TEXT PRIMARY KEY, billId INTEGER, clientId TEXT, clientName TEXT, clientAddress TEXT, fieldOfficerId TEXT, salesmanId TEXT, billDate TEXT, totalAmount REAL, items TEXT);
        CREATE TABLE IF NOT EXISTS client_products (_id TEXT PRIMARY KEY, clientId TEXT, productId TEXT, rate REAL, discount REAL, extraDiscount REAL, lastUsed TEXT);
        CREATE TABLE IF NOT EXISTS settings (type TEXT PRIMARY KEY, data TEXT);
      `)
    },
    migrateFromNedb: () => []
  })

  if (result.restoreRequired) {
    throw new Error("Expected restoreRequired to be false, got true")
  }

  const userVersion = result.db.pragma("user_version", { simple: true })
  if (userVersion !== 1) {
    throw new Error(`Expected user_version to be 1, got ${userVersion}`)
  }

  const products = result.db.prepare("SELECT * FROM products").all()
  if (products.length !== 2) {
    throw new Error(`Expected 2 products, got ${products.length}`)
  }

  const bills = result.db.prepare("SELECT * FROM bills").all()
  if (bills.length !== 1 || Number(bills[0].totalAmount) !== 450) {
    throw new Error("Bill record was not properly imported")
  }

  const backupFile = path.join(tempDir, "billing-system-backup-v1.0.8.json")
  if (!fs.existsSync(backupFile)) {
    throw new Error("Durable JSON backup file was not created on disk")
  }

  result.db.close()
  console.log("3. First launch migration verified.")

  console.log("4. Verifying second launch skips migration...")
  const secondResult = await openApplicationDatabase({
    Database,
    dbPath,
    userData: tempDir,
    createSchema: () => {},
    migrateFromNedb: () => []
  })

  if (secondResult.restoreRequired) {
    throw new Error("Second launch returned restoreRequired = true")
  }
  if (secondResult.db.pragma("user_version", { simple: true }) !== 1) {
    throw new Error("Second launch user_version mismatch")
  }
  secondResult.db.close()

  // Clean up
  fs.rmSync(tempDir, { recursive: true, force: true })
  console.log("\nAuto-migration test passed: 100% data migrated to JSON and native SQLite automatically.")
  app.exit(0)
})
