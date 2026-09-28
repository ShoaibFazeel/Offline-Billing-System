const { app } = require("electron")
const fs = require("fs")
const os = require("os")
const path = require("path")
const Database = require("better-sqlite3")
const initSqlJs = require("sql.js")

const requiredTables = [
  "products",
  "clients",
  "field_officers",
  "salesmen",
  "bills",
  "client_products",
  "settings",
]

async function verifyDatabaseCopy(sourcePath) {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    throw new Error("Pass the path to an existing SQLite database as the first argument")
  }

  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "billing-sqlite-upgrade-check-"))
  const workingCopyPath = path.join(tempDirectory, "source-copy.sqlite")
  const snapshotPath = path.join(tempDirectory, "billing_system.sqlite")
  let sourceDb
  let snapshotDb
  let stage = "copying source database"
  let sqlJsOpenError = null
  let nativeSqliteVersion = null

  try {
    stage = "checking source with sql.js"
    const SQL = await initSqlJs()
    try {
      const sqlJsDb = new SQL.Database(fs.readFileSync(sourcePath))
      sqlJsDb.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      sqlJsDb.close()
    } catch (error) {
      sqlJsOpenError = error.message
    }

    stage = "copying source database"
    fs.copyFileSync(sourcePath, workingCopyPath)
    const walPath = `${sourcePath}-wal`
    if (fs.existsSync(walPath)) fs.copyFileSync(walPath, `${workingCopyPath}-wal`)

    stage = "opening temporary database copy"
    sourceDb = new Database(workingCopyPath, { fileMustExist: true })
    nativeSqliteVersion = sourceDb.prepare("SELECT sqlite_version() AS version").get().version
    stage = "checking temporary database integrity"
    const sourceIntegrity = sourceDb.pragma("integrity_check")
    if (sourceIntegrity.length !== 1 || sourceIntegrity[0].integrity_check !== "ok") {
      throw new Error(`Source copy integrity check failed: ${JSON.stringify(sourceIntegrity)}`)
    }

    stage = "reading temporary database schema"
    const sourceTables = sourceDb.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all().map((row) => row.name)
    const sourceCounts = Object.fromEntries(sourceTables.map((table) => [
      table,
      sourceDb.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get().count,
    ]))

    stage = "creating SQLite backup snapshot"
    await sourceDb.backup(snapshotPath)
    sourceDb.close()
    sourceDb = null

    stage = "opening backup snapshot"
    snapshotDb = new Database(snapshotPath)
    stage = "checking backup snapshot integrity"
    const integrity = snapshotDb.pragma("integrity_check")
    if (integrity.length !== 1 || integrity[0].integrity_check !== "ok") {
      throw new Error(`Snapshot integrity check failed: ${JSON.stringify(integrity)}`)
    }

    stage = "reading backup snapshot schema"
    const snapshotTables = snapshotDb.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all().map((row) => row.name)
    for (const table of requiredTables) {
      if (!snapshotTables.includes(table)) throw new Error(`Required table is missing: ${table}`)
    }

    const snapshotCounts = Object.fromEntries(snapshotTables.map((table) => [
      table,
      snapshotDb.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get().count,
    ]))
    for (const [table, count] of Object.entries(sourceCounts)) {
      if (snapshotCounts[table] !== count) {
        throw new Error(`Row count changed for ${table}: source=${count}, snapshot=${snapshotCounts[table]}`)
      }
    }

    let billsWithInvalidItems = 0
    for (const row of snapshotDb.prepare("SELECT items FROM bills").iterate()) {
      try {
        JSON.parse(row.items || "[]")
      } catch {
        billsWithInvalidItems += 1
      }
    }

    let settingsWithInvalidJson = 0
    for (const row of snapshotDb.prepare("SELECT data FROM settings").iterate()) {
      try {
        JSON.parse(row.data || "{}")
      } catch {
        settingsWithInvalidJson += 1
      }
    }

    console.log(JSON.stringify({
      status: "passed",
      nativeSqliteVersion,
      integrity: integrity[0].integrity_check,
      sqlJsOpenError,
      tableCounts: snapshotCounts,
      billsWithInvalidItems,
      settingsWithInvalidJson,
      sourceWasModified: false,
      walSidecarCopied: fs.existsSync(`${sourcePath}-wal`),
    }, null, 2))
  } catch (error) {
    error.message = `${stage} (native SQLite ${nativeSqliteVersion || "unknown"}, sql.js open error ${sqlJsOpenError || "none"}): ${error.message}`
    throw error
  } finally {
    sourceDb?.close()
    snapshotDb?.close()
    fs.rmSync(tempDirectory, { recursive: true, force: true })
  }
}

app.whenReady().then(() => verifyDatabaseCopy(process.argv[2])
  .then(() => app.exit(0))
  .catch((error) => {
    console.error(error.message)
    app.exit(1)
  }))