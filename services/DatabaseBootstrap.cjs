async function openApplicationDatabase({ Database, dbPath, createSchema }) {
  const db = new Database(dbPath)
  db.pragma("journal_mode = WAL")
  db.pragma("synchronous = FULL")
  db.pragma("busy_timeout = 5000")
  createSchema(db)
  return { db }
}

module.exports = { openApplicationDatabase }