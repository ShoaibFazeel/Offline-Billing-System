const { app } = require("electron")
const fs = require("fs")
const os = require("os")
const path = require("path")
const Database = require("better-sqlite3")
const { openApplicationDatabase } = require("../services/DatabaseBootstrap.cjs")

async function verify() {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "billing-database-bootstrap-"))
  const dbPath = path.join(userData, "billing_system.sqlite")
  const createSchema = db => db.exec("CREATE TABLE IF NOT EXISTS products (_id TEXT PRIMARY KEY, productName TEXT NOT NULL)")
  let db

  try {
    let opened = await openApplicationDatabase({ Database, dbPath, createSchema })
    db = opened.db
    if (db.prepare("SELECT COUNT(*) AS count FROM products").get().count !== 0) {
      throw new Error("Fresh database startup did not create a clean database")
    }

    db.prepare("INSERT INTO products (_id, productName) VALUES (?, ?)").run("p1", "Native product")
    db.close()
    db = null

    opened = await openApplicationDatabase({ Database, dbPath, createSchema })
    db = opened.db
    if (db.prepare("SELECT productName FROM products WHERE _id = ?").get("p1")?.productName !== "Native product") {
      throw new Error("Existing native SQLite data did not survive a second startup")
    }
    db.close()
    db = null
    console.log("Fresh and existing native SQLite bootstrap checks passed")
  } finally {
    db?.close()
    fs.rmSync(userData, { recursive: true, force: true })
  }
}

app.whenReady().then(() => verify()
  .then(() => app.exit(0))
  .catch(error => {
    console.error(error)
    app.exit(1)
  }))