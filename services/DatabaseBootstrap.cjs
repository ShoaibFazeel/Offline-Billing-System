const fs = require("fs")
const path = require("path")
const { v4: uuidv4 } = require("uuid")
const { importAllData } = require("./JsonBackupImporter.cjs")

function isUnsupportedDatabaseError(error) {
  return error?.code === "SQLITE_NOTADB" || /file is not a database|malformed database/i.test(error?.message || "")
}

function preserveUnopenableDatabase(dbPath, userData, sidecarSnapshotDirectory) {
  const recoveryDirectory = path.join(userData, `billing-system-recovery-${Date.now()}`)
  fs.mkdirSync(recoveryDirectory, { recursive: true })

  for (const suffix of ["", "-wal", "-shm"]) {
    const liveSource = `${dbPath}${suffix}`
    const snapshotSource = suffix ? path.join(sidecarSnapshotDirectory, path.basename(liveSource)) : liveSource
    const source = fs.existsSync(snapshotSource) ? snapshotSource : liveSource
    if (!fs.existsSync(source)) continue
    const archivedPath = path.join(recoveryDirectory, path.basename(source))
    fs.copyFileSync(source, archivedPath)
    if (fs.statSync(source).size !== fs.statSync(archivedPath).size) {
      throw new Error(`Could not verify recovery copy for ${path.basename(source)}`)
    }
  }

  const markerPath = path.join(userData, "database-restore-required.json")
  const temporaryMarkerPath = `${markerPath}.tmp`
  fs.writeFileSync(temporaryMarkerPath, JSON.stringify({
    recoveryDirectory,
    createdAt: new Date().toISOString(),
    reason: "The installed SQLite runtime cannot open the previous database file.",
  }, null, 2), "utf8")
  fs.renameSync(temporaryMarkerPath, markerPath)

  return recoveryDirectory
}

function generateId() {
  return uuidv4()
}

function generateUniqueItemId() {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function ensureItemsHaveIds(items) {
  if (!Array.isArray(items)) return []
  return items.map(item => ({ ...item, _id: item._id || generateUniqueItemId() }))
}

function toIsoDate(value) {
  if (!value) return ""
  try {
    const d = new Date(value)
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0]
  } catch {
    return ""
  }
}

function parseJson(str, fallback) {
  try {
    return str ? JSON.parse(str) : fallback
  } catch {
    return fallback
  }
}

function extractDataFromBetterSqlite(db) {
  const getTableRows = (tableName) => {
    try {
      const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName)
      if (!exists) return []
      return db.prepare(`SELECT * FROM ${tableName}`).all()
    } catch {
      return []
    }
  }

  const products = getTableRows("products")
  const clients = getTableRows("clients")
  const fieldOfficers = getTableRows("field_officers").map(row => ({
    _id: row._id,
    name: row.name,
    phoneNumber: row.phoneNumber,
  }))
  const salesmen = getTableRows("salesmen").map(row => ({
    _id: row._id,
    name: row.name,
    phoneNumber: row.phoneNumber,
  }))
  const rawBills = getTableRows("bills")
  const bills = rawBills.map(b => ({
    ...b,
    items: typeof b.items === "string" ? parseJson(b.items, []) : (Array.isArray(b.items) ? b.items : [])
  }))
  const clientProducts = getTableRows("client_products")

  const settingsRows = getTableRows("settings")
  let companyInfo = undefined
  let credentials = undefined
  let appConfig = undefined

  for (const s of settingsRows) {
    if (s.type === "company-info") companyInfo = parseJson(s.data, undefined)
    if (s.type === "credentials") credentials = parseJson(s.data, undefined)
    if (s.type === "app-config") appConfig = parseJson(s.data, undefined)
  }

  return {
    products,
    clients,
    fieldOfficers,
    salesmen,
    bills,
    clientProducts,
    companyInfo,
    credentials,
    appConfig
  }
}

async function extractDataFromSqlJs(dbPath) {
  const initSqlJs = require("sql.js")
  const SQL = await initSqlJs()
  const buffer = fs.readFileSync(dbPath)
  const db = new SQL.Database(buffer)

  const queryRows = (sql) => {
    try {
      const res = db.exec(sql)
      if (!res || !res.length) return []
      const { columns, values } = res[0]
      return values.map(row => {
        const obj = {}
        columns.forEach((col, idx) => {
          obj[col] = row[idx]
        })
        return obj
      })
    } catch {
      return []
    }
  }

  const products = queryRows("SELECT * FROM products")
  const clients = queryRows("SELECT * FROM clients")
  const fieldOfficers = queryRows("SELECT * FROM field_officers").map(row => ({
    _id: row._id,
    name: row.name,
    phoneNumber: row.phoneNumber,
  }))
  const salesmen = queryRows("SELECT * FROM salesmen").map(row => ({
    _id: row._id,
    name: row.name,
    phoneNumber: row.phoneNumber,
  }))
  const rawBills = queryRows("SELECT * FROM bills")
  const bills = rawBills.map(b => ({
    ...b,
    items: typeof b.items === "string" ? parseJson(b.items, []) : (Array.isArray(b.items) ? b.items : [])
  }))
  const clientProducts = queryRows("SELECT * FROM client_products")

  const settingsRows = queryRows("SELECT * FROM settings")
  let companyInfo = undefined
  let credentials = undefined
  let appConfig = undefined

  for (const s of settingsRows) {
    if (s.type === "company-info") companyInfo = parseJson(s.data, undefined)
    if (s.type === "credentials") credentials = parseJson(s.data, undefined)
    if (s.type === "app-config") appConfig = parseJson(s.data, undefined)
  }

  db.close()

  return {
    products,
    clients,
    fieldOfficers,
    salesmen,
    bills,
    clientProducts,
    companyInfo,
    credentials,
    appConfig
  }
}

async function openApplicationDatabase({ Database, dbPath, userData, createSchema, migrateFromNedb }) {
  const markerPath = path.join(userData, "database-restore-required.json")
  let restoreRequired = fs.existsSync(markerPath)
  let db

  const configure = (database) => {
    database.pragma("journal_mode = WAL")
    database.pragma("synchronous = FULL")
    database.pragma("busy_timeout = 5000")
    createSchema(database)
  }

  // 1. Fresh database if file does not exist
  if (!fs.existsSync(dbPath)) {
    db = new Database(dbPath)
    configure(db)
    const filesToArchive = migrateFromNedb(db)
    db.pragma("user_version = 1")
    for (const filePath of filesToArchive || []) {
      if (fs.existsSync(filePath)) fs.renameSync(filePath, filePath + ".bak")
    }
    return { db, restoreRequired: false }
  }

  // 2. If a restore was already marked as required, keep gating
  if (restoreRequired) {
    db = new Database(dbPath)
    configure(db)
    return { db, restoreRequired: true }
  }

  // 3. Database exists. Check if it is already native SQLite (user_version >= 1)
  let initialDb = null
  let isAlreadyNative = false

  try {
    initialDb = new Database(dbPath)
    const userVersion = Number(initialDb.pragma("user_version", { simple: true }) || 0)
    if (userVersion >= 1) {
      isAlreadyNative = true
    }
  } catch (err) {
    try { initialDb?.close() } catch {}
    initialDb = null
  }

  if (isAlreadyNative && initialDb) {
    db = initialDb
    configure(db)
    const filesToArchive = db.transaction(() => migrateFromNedb(db))()
    for (const filePath of filesToArchive || []) {
      if (fs.existsSync(filePath)) fs.renameSync(filePath, filePath + ".bak")
    }
    return { db, restoreRequired: false }
  }

  // 4. Automatic migration from sql.js:
  // Either user_version is 0, or better-sqlite3 could not parse the old file.
  console.log("Migrating database from sql.js to native SQLite...")
  let extractedData = null

  if (initialDb) {
    try {
      extractedData = extractDataFromBetterSqlite(initialDb)
    } catch (e) {
      console.warn("Could not extract via better-sqlite3:", e.message)
    } finally {
      try { initialDb.close() } catch {}
      initialDb = null
    }
  }

  if (!extractedData || (!extractedData.products.length && !extractedData.clients.length && !extractedData.bills.length)) {
    try {
      extractedData = await extractDataFromSqlJs(dbPath)
    } catch (sqlJsErr) {
      console.warn("Could not extract via sql.js:", sqlJsErr.message)
    }
  }

  // If extraction succeeded with valid data:
  const hasExtractedData = extractedData && (
    (Array.isArray(extractedData.products) && extractedData.products.length > 0) ||
    (Array.isArray(extractedData.clients) && extractedData.clients.length > 0) ||
    (Array.isArray(extractedData.bills) && extractedData.bills.length > 0) ||
    (Array.isArray(extractedData.fieldOfficers) && extractedData.fieldOfficers.length > 0) ||
    (Array.isArray(extractedData.salesmen) && extractedData.salesmen.length > 0)
  )

  if (hasExtractedData) {
    try {
      // Step A: Save full JSON backup to disk
      const backupPath = path.join(userData, "billing-system-backup-v1.0.8.json")
      fs.writeFileSync(backupPath, JSON.stringify(extractedData, null, 2), "utf8")
      console.log("Saved automatic JSON backup to:", backupPath)

      // Step B: Archive original database file
      const archivePath = path.join(userData, `billing_system.sqlite.pre-migration-${Date.now()}`)
      fs.copyFileSync(dbPath, archivePath)

      // Step C: Remove old database files
      for (const suffix of ["", "-wal", "-shm"]) {
        const p = `${dbPath}${suffix}`
        if (fs.existsSync(p)) fs.rmSync(p, { force: true })
      }

      // Step D: Create clean native SQLite database
      db = new Database(dbPath)
      configure(db)

      // Step E: Import all data into SQLite
      importAllData(db, extractedData, { generateId, ensureItemsHaveIds, toIsoDate })

      // Step F: Mark user_version = 1 so next startup opens directly without migrating
      db.pragma("user_version = 1")
      console.log("Database successfully migrated to native SQLite!")

      return { db, restoreRequired: false }
    } catch (migrError) {
      console.error("Auto-migration import failed:", migrError)
    }
  }

  // 5. Emergency fallback if extraction failed:
  const sidecarSnapshotDirectory = fs.mkdtempSync(path.join(userData, ".sqlite-sidecars-"))
  try {
    for (const suffix of ["-wal", "-shm"]) {
      const source = `${dbPath}${suffix}`
      if (fs.existsSync(source)) fs.copyFileSync(source, path.join(sidecarSnapshotDirectory, path.basename(source)))
    }
    preserveUnopenableDatabase(dbPath, userData, sidecarSnapshotDirectory)
  } finally {
    fs.rmSync(sidecarSnapshotDirectory, { recursive: true, force: true })
  }

  for (const suffix of ["", "-wal", "-shm"]) {
    const source = `${dbPath}${suffix}`
    if (fs.existsSync(source)) fs.rmSync(source, { force: true })
  }

  restoreRequired = true
  db = new Database(dbPath)
  configure(db)
  return { db, restoreRequired }
}

module.exports = { openApplicationDatabase }
