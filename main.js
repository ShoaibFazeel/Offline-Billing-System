const { app, BrowserWindow, ipcMain } = require("electron")
const path = require("path")
const fs = require("fs")
const { v4: uuidv4 } = require("uuid")
const initSqlJs = require("sql.js")
const { shell } = require("electron")
const os = require("os")

// ─────────────────────────────────────────────────────────────────
// Database bootstrap
// ─────────────────────────────────────────────────────────────────
let SQL = null   // sql.js module
let db = null    // in-memory SQLite database
const DB_PATH = () => path.join(app.getPath("userData"), "billing_system.sqlite")

/** Persist the in-memory database to disk after every write */
function persist() {
  const data = db.export()
  fs.writeFileSync(DB_PATH(), Buffer.from(data))
}

/** Create all tables and indexes */
function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      _id TEXT PRIMARY KEY,
      productName TEXT NOT NULL,
      productPrice REAL DEFAULT 0,
      purchasePrice REAL DEFAULT 0,
      quantity INTEGER DEFAULT 0,
      hasInfiniteQuantity INTEGER DEFAULT 1,
      companyName TEXT DEFAULT '',
      containerSize TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(productName);

    CREATE TABLE IF NOT EXISTS clients (
      _id TEXT PRIMARY KEY,
      clientName TEXT NOT NULL,
      clientNumber TEXT DEFAULT '',
      clientAddress TEXT DEFAULT '',
      isFiler INTEGER DEFAULT 0,
      ntnNumber TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(clientName);

    CREATE TABLE IF NOT EXISTS field_officers (
      _id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phoneNumber TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_fo_name ON field_officers(name);

    CREATE TABLE IF NOT EXISTS salesmen (
      _id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phoneNumber TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_sm_name ON salesmen(name);

    CREATE TABLE IF NOT EXISTS bills (
      _id TEXT PRIMARY KEY,
      billId INTEGER,
      clientId TEXT DEFAULT '',
      clientName TEXT DEFAULT '',
      clientAddress TEXT DEFAULT '',
      fieldOfficerId TEXT DEFAULT '',
      salesmanId TEXT DEFAULT '',
      billDate TEXT DEFAULT '',
      totalAmount REAL DEFAULT 0,
      items TEXT DEFAULT '[]'
    );
    CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(billDate);
    CREATE INDEX IF NOT EXISTS idx_bills_client ON bills(clientId);
    CREATE INDEX IF NOT EXISTS idx_bills_id ON bills(billId);

    CREATE TABLE IF NOT EXISTS client_products (
      _id TEXT PRIMARY KEY,
      clientId TEXT NOT NULL,
      productId TEXT NOT NULL,
      rate REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      extraDiscount REAL DEFAULT 0,
      lastUsed TEXT DEFAULT ''
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_cp_unique ON client_products(clientId, productId);

    CREATE TABLE IF NOT EXISTS settings (
      type TEXT PRIMARY KEY,
      data TEXT DEFAULT '{}'
    );
  `)
}

function toIsoDate(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString()
}

/** Read lines from a NeDB flat file and return parsed objects */
function readNedbFile(filePath) {
  if (!fs.existsSync(filePath)) return []
  const lines = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean)
  const records = {}
  for (const line of lines) {
    try {
      const obj = JSON.parse(line)
      if (obj._id) {
        records[obj._id] = obj  // Last occurrence wins (NeDB append-only logic)
      }
    } catch (_) {
      // Skip malformed lines
    }
  }
  // Filter out tombstone records ($$deleted)
  return Object.values(records).filter(r => !r.$$deleted)
}

/** Auto-migrate existing NeDB files into SQLite */
function migrateFromNedb() {
  const userData = app.getPath("userData")
  const migrations = [
    { file: "products.db", table: "products", mapper: p => ({
      _id: p._id,
      productName: p.productName || "",
      productPrice: p.productPrice || 0,
      purchasePrice: p.purchasePrice || p.productPrice || 0,
      quantity: p.quantity || 0,
      hasInfiniteQuantity: p.hasInfiniteQuantity === false ? 0 : 1,
      companyName: p.companyName || "",
      containerSize: p.containerSize || "",
    })},
    { file: "clients.db", table: "clients", mapper: c => ({
      _id: c._id,
      clientName: c.clientName || "",
      clientNumber: c.clientNumber || "",
      clientAddress: c.clientAddress || "",
      isFiler: c.isFiler ? 1 : 0,
      ntnNumber: c.ntnNumber || "",
    })},
    { file: "fieldOfficers.db", table: "field_officers", mapper: f => ({
      _id: f._id,
      name: f.name || "",
      phoneNumber: f.phoneNumber || "",
    })},
    { file: "salesmen.db", table: "salesmen", mapper: s => ({
      _id: s._id,
      name: s.name || "",
      phoneNumber: s.phoneNumber || "",
    })},
    { file: "bills.db", table: "bills", mapper: b => ({
      _id: b._id,
      billId: b.billId || null,
      clientId: b.clientId || "",
      clientName: b.clientName || "",
      clientAddress: b.clientAddress || "",
      fieldOfficerId: b.fieldOfficerId || "",
      salesmanId: b.salesmanId || "",
      billDate: toIsoDate(b.billDate),
      totalAmount: b.totalAmount || 0,
      items: JSON.stringify(b.items || []),
    })},
    { file: "clientProducts.db", table: "client_products", mapper: cp => ({
      _id: cp._id,
      clientId: cp.clientId || "",
      productId: cp.productId || "",
      rate: cp.rate || 0,
      discount: cp.discount || 0,
      extraDiscount: cp.extraDiscount || 0,
      lastUsed: toIsoDate(cp.lastUsed),
    })},
  ]

  let migrated = false
  for (const { file, table, mapper } of migrations) {
    const filePath = path.join(userData, file)
    if (!fs.existsSync(filePath)) continue
    const records = readNedbFile(filePath)
    if (records.length > 0) {
      const first = mapper(records[0])
      const cols = Object.keys(first)
      const placeholders = cols.map(() => "?").join(", ")
      const stmt = db.prepare(
        `INSERT OR IGNORE INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`
      )
      for (const rec of records) {
        const mapped = mapper(rec)
        stmt.run(Object.values(mapped))
      }
      stmt.free()
      migrated = true
    }
    // Rename to .bak to prevent re-migration
    fs.renameSync(filePath, filePath + ".bak")
  }

  // Migrate settings
  const settingsPath = path.join(userData, "settings.db")
  if (fs.existsSync(settingsPath)) {
    const records = readNedbFile(settingsPath)
    for (const rec of records) {
      if (!rec.type) continue
      const { type, ...rest } = rec
      db.run("INSERT OR IGNORE INTO settings(type, data) VALUES(?, ?)", [type, JSON.stringify(rest)])
    }
    fs.renameSync(settingsPath, settingsPath + ".bak")
    migrated = true
  }

  if (migrated) persist()
}

/** Initialize sql.js and load or create the database */
async function initDatabase() {
  SQL = await initSqlJs()
  const dbPath = DB_PATH()
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }
  createSchema()
  migrateFromNedb()
  persist()
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
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

/** Run a SELECT and return rows as plain objects */
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

/** Run a SELECT and return one row */
function queryOne(sql, params = []) {
  const rows = queryAll(sql, params)
  return rows.length > 0 ? rows[0] : null
}

/** Run a paginated SELECT; returns array when limit=0, else { data, total, hasMore, offset, limit } */
function queryPaginated({ fromWhere, params = [], orderBy = "", limit = 0, offset = 0, parseRow }) {
  const mapRow = parseRow || (row => row)
  const countRow = queryOne(`SELECT COUNT(*) as cnt ${fromWhere}`, params)
  const total = Number(countRow?.cnt || 0)

  let sql = `SELECT * ${fromWhere}`
  if (orderBy) sql += ` ORDER BY ${orderBy}`
  const dataParams = [...params]
  if (limit > 0) {
    sql += " LIMIT ? OFFSET ?"
    dataParams.push(limit, offset)
  }

  const data = queryAll(sql, dataParams).map(mapRow)
  if (limit > 0) {
    return { data, total, hasMore: offset + limit < total, offset, limit }
  }
  return data
}

/** Parse a bill row: inflate items JSON and fix boolean/number fields */
function parseBill(row) {
  if (!row) return null
  return {
    ...row,
    items: (() => { try { return JSON.parse(row.items || "[]") } catch { return [] } })(),
    totalAmount: Number(row.totalAmount || 0),
  }
}

/** Parse a product row */
function parseProduct(row) {
  if (!row) return null
  return {
    ...row,
    productPrice: Number(row.productPrice || 0),
    purchasePrice: Number(row.purchasePrice || 0),
    quantity: Number(row.quantity || 0),
    hasInfiniteQuantity: row.hasInfiniteQuantity === 1 || row.hasInfiniteQuantity === true,
  }
}

/** Parse a client row */
function parseClient(row) {
  if (!row) return null
  return { ...row, isFiler: row.isFiler === 1 || row.isFiler === true }
}

/** Update product quantities (add or subtract) */
function updateProductQuantities(items, isRefund = false) {
  const qtys = new Map()
  for (const item of items) {
    if (item.productId) {
      qtys.set(item.productId, (qtys.get(item.productId) || 0) + (item.quantity || 0))
    }
  }
  for (const [productId, qty] of qtys.entries()) {
    const p = queryOne("SELECT * FROM products WHERE _id = ?", [productId])
    if (!p || p.hasInfiniteQuantity === 1) continue
    const newQty = isRefund ? Number(p.quantity) + qty : Number(p.quantity) - qty
    db.run("UPDATE products SET quantity = ? WHERE _id = ?", [Math.max(0, newQty), productId])
  }
}

// ─────────────────────────────────────────────────────────────────
// Electron window
// ─────────────────────────────────────────────────────────────────
let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  })
  mainWindow.loadFile("index.html")
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools()
  }
}

app.whenReady().then(async () => {
  await initDatabase()
  createWindow()
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

// ─────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────
ipcMain.handle("get-products", async (event, opts = {}) => {
  const { search = "", limit = 0, offset = 0 } = opts || {}
  let fromWhere = "FROM products"
  const params = []
  if (search) {
    fromWhere += " WHERE productName LIKE ? OR companyName LIKE ?"
    params.push(`%${search}%`, `%${search}%`)
  }
  return queryPaginated({ fromWhere, params, orderBy: "productName ASC", limit, offset, parseRow: parseProduct })
})

ipcMain.handle("add-product", async (event, product) => {
  const p = {
    _id: product._id || generateId(),
    productName: product.productName || "",
    productPrice: Number(product.productPrice) || 0,
    purchasePrice: Number(product.purchasePrice != null ? product.purchasePrice : product.productPrice) || 0,
    quantity: Number(product.quantity) || 0,
    hasInfiniteQuantity: product.hasInfiniteQuantity === false ? 0 : 1,
    companyName: product.companyName || "",
    containerSize: product.containerSize || "",
  }
  db.run(
    "INSERT INTO products(_id,productName,productPrice,purchasePrice,quantity,hasInfiniteQuantity,companyName,containerSize) VALUES(?,?,?,?,?,?,?,?)",
    [p._id, p.productName, p.productPrice, p.purchasePrice, p.quantity, p.hasInfiniteQuantity, p.companyName, p.containerSize]
  )
  persist()
  return parseProduct(queryOne("SELECT * FROM products WHERE _id = ?", [p._id]))
})

ipcMain.handle("update-product", async (event, product) => {
  db.run(
    "UPDATE products SET productName=?,productPrice=?,purchasePrice=?,quantity=?,hasInfiniteQuantity=?,companyName=?,containerSize=? WHERE _id=?",
    [
      product.productName || "",
      Number(product.productPrice) || 0,
      Number(product.purchasePrice != null ? product.purchasePrice : product.productPrice) || 0,
      Number(product.quantity) || 0,
      product.hasInfiniteQuantity === false ? 0 : 1,
      product.companyName || "",
      product.containerSize || "",
      product._id,
    ]
  )
  persist()
  return 1
})

ipcMain.handle("delete-product", async (event, id) => {
  db.run("DELETE FROM products WHERE _id = ?", [id])
  persist()
  return 1
})

ipcMain.handle("clear-products", async () => {
  db.run("DELETE FROM products")
  persist()
  return 1
})

ipcMain.handle("import-products", async (event, products) => {
  db.run("DELETE FROM products")
  for (const product of products) {
    const p = {
      _id: product._id || generateId(),
      productName: product.productName || "",
      productPrice: Number(product.productPrice) || 0,
      purchasePrice: Number(product.purchasePrice != null ? product.purchasePrice : product.productPrice) || 0,
      quantity: Number(product.quantity) || 0,
      hasInfiniteQuantity: product.hasInfiniteQuantity === false ? 0 : 1,
      companyName: product.companyName || "",
      containerSize: product.containerSize || "",
    }
    db.run(
      "INSERT OR REPLACE INTO products(_id,productName,productPrice,purchasePrice,quantity,hasInfiniteQuantity,companyName,containerSize) VALUES(?,?,?,?,?,?,?,?)",
      [p._id, p.productName, p.productPrice, p.purchasePrice, p.quantity, p.hasInfiniteQuantity, p.companyName, p.containerSize]
    )
  }
  persist()
  return products.length
})

ipcMain.handle("update-existing-products-purchase-price", async () => {
  db.run("UPDATE products SET purchasePrice = productPrice WHERE purchasePrice IS NULL OR purchasePrice = 0")
  persist()
  return { updated: 1 }
})

// ─────────────────────────────────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────────────────────────────────
ipcMain.handle("get-clients", async (event, opts = {}) => {
  const { search = "", limit = 0, offset = 0 } = opts || {}
  let fromWhere = "FROM clients"
  const params = []
  if (search) {
    fromWhere += " WHERE clientName LIKE ? OR clientNumber LIKE ? OR clientAddress LIKE ?"
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  return queryPaginated({ fromWhere, params, orderBy: "clientName ASC", limit, offset, parseRow: parseClient })
})

ipcMain.handle("get-client", async (event, clientId) => {
  return parseClient(queryOne("SELECT * FROM clients WHERE _id = ?", [clientId]))
})

ipcMain.handle("add-client", async (event, client) => {
  const c = {
    _id: client._id || generateId(),
    clientName: client.clientName || "",
    clientNumber: client.clientNumber || "",
    clientAddress: client.clientAddress || "",
    isFiler: client.isFiler ? 1 : 0,
    ntnNumber: client.ntnNumber || "",
  }
  db.run(
    "INSERT INTO clients(_id,clientName,clientNumber,clientAddress,isFiler,ntnNumber) VALUES(?,?,?,?,?,?)",
    [c._id, c.clientName, c.clientNumber, c.clientAddress, c.isFiler, c.ntnNumber]
  )
  persist()
  return parseClient(queryOne("SELECT * FROM clients WHERE _id = ?", [c._id]))
})

ipcMain.handle("update-client", async (event, client) => {
  db.run(
    "UPDATE clients SET clientName=?,clientNumber=?,clientAddress=?,isFiler=?,ntnNumber=? WHERE _id=?",
    [client.clientName || "", client.clientNumber || "", client.clientAddress || "", client.isFiler ? 1 : 0, client.ntnNumber || "", client._id]
  )
  persist()
  return 1
})

ipcMain.handle("delete-client", async (event, id) => {
  db.run("DELETE FROM clients WHERE _id = ?", [id])
  persist()
  return 1
})

ipcMain.handle("clear-clients", async () => {
  db.run("DELETE FROM clients")
  persist()
  return 1
})

ipcMain.handle("import-clients", async (event, clients) => {
  db.run("DELETE FROM clients")
  for (const client of clients) {
    const c = {
      _id: client._id || generateId(),
      clientName: client.clientName || "",
      clientNumber: client.clientNumber || "",
      clientAddress: client.clientAddress || "",
      isFiler: client.isFiler ? 1 : 0,
      ntnNumber: client.ntnNumber || "",
    }
    db.run(
      "INSERT OR REPLACE INTO clients(_id,clientName,clientNumber,clientAddress,isFiler,ntnNumber) VALUES(?,?,?,?,?,?)",
      [c._id, c.clientName, c.clientNumber, c.clientAddress, c.isFiler, c.ntnNumber]
    )
  }
  persist()
  return clients.length
})

// ─────────────────────────────────────────────────────────────────
// FIELD OFFICERS
// ─────────────────────────────────────────────────────────────────
ipcMain.handle("get-field-officers", async (event, opts = {}) => {
  const { search = "", limit = 0, offset = 0 } = opts || {}
  let fromWhere = "FROM field_officers"
  const params = []
  if (search) {
    fromWhere += " WHERE name LIKE ? OR phoneNumber LIKE ?"
    params.push(`%${search}%`, `%${search}%`)
  }
  return queryPaginated({ fromWhere, params, orderBy: "name ASC", limit, offset })
})

ipcMain.handle("get-field-officer", async (event, id) => {
  return queryOne("SELECT * FROM field_officers WHERE _id = ?", [id])
})

ipcMain.handle("add-field-officer", async (event, fo) => {
  const f = { _id: fo._id || generateId(), name: fo.name || "", phoneNumber: fo.phoneNumber || "" }
  db.run("INSERT INTO field_officers(_id,name,phoneNumber) VALUES(?,?,?)", [f._id, f.name, f.phoneNumber])
  persist()
  return queryOne("SELECT * FROM field_officers WHERE _id = ?", [f._id])
})

ipcMain.handle("update-field-officer", async (event, fo) => {
  db.run("UPDATE field_officers SET name=?,phoneNumber=? WHERE _id=?", [fo.name || "", fo.phoneNumber || "", fo._id])
  persist()
  return 1
})

ipcMain.handle("delete-field-officer", async (event, id) => {
  db.run("DELETE FROM field_officers WHERE _id = ?", [id])
  persist()
  return 1
})

ipcMain.handle("clear-field-officers", async () => {
  db.run("DELETE FROM field_officers")
  persist()
  return 1
})

ipcMain.handle("import-field-officers", async (event, fieldOfficers) => {
  db.run("DELETE FROM field_officers")
  for (const fo of fieldOfficers) {
    db.run("INSERT OR REPLACE INTO field_officers(_id,name,phoneNumber) VALUES(?,?,?)",
      [fo._id || generateId(), fo.name || "", fo.phoneNumber || ""])
  }
  persist()
  return fieldOfficers.length
})

// ─────────────────────────────────────────────────────────────────
// SALESMEN
// ─────────────────────────────────────────────────────────────────
ipcMain.handle("get-salesmen", async (event, opts = {}) => {
  const { search = "", limit = 0, offset = 0 } = opts || {}
  let fromWhere = "FROM salesmen"
  const params = []
  if (search) {
    fromWhere += " WHERE name LIKE ? OR phoneNumber LIKE ?"
    params.push(`%${search}%`, `%${search}%`)
  }
  return queryPaginated({ fromWhere, params, orderBy: "name ASC", limit, offset })
})

ipcMain.handle("get-salesman", async (event, id) => {
  return queryOne("SELECT * FROM salesmen WHERE _id = ?", [id])
})

ipcMain.handle("add-salesman", async (event, s) => {
  const sm = { _id: s._id || generateId(), name: s.name || "", phoneNumber: s.phoneNumber || "" }
  db.run("INSERT INTO salesmen(_id,name,phoneNumber) VALUES(?,?,?)", [sm._id, sm.name, sm.phoneNumber])
  persist()
  return queryOne("SELECT * FROM salesmen WHERE _id = ?", [sm._id])
})

ipcMain.handle("update-salesman", async (event, s) => {
  db.run("UPDATE salesmen SET name=?,phoneNumber=? WHERE _id=?", [s.name || "", s.phoneNumber || "", s._id])
  persist()
  return 1
})

ipcMain.handle("delete-salesman", async (event, id) => {
  db.run("DELETE FROM salesmen WHERE _id = ?", [id])
  persist()
  return 1
})

ipcMain.handle("clear-salesmen", async () => {
  db.run("DELETE FROM salesmen")
  persist()
  return 1
})

ipcMain.handle("import-salesmen", async (event, salesmen) => {
  db.run("DELETE FROM salesmen")
  for (const s of salesmen) {
    db.run("INSERT OR REPLACE INTO salesmen(_id,name,phoneNumber) VALUES(?,?,?)",
      [s._id || generateId(), s.name || "", s.phoneNumber || ""])
  }
  persist()
  return salesmen.length
})

// ─────────────────────────────────────────────────────────────────
// BILLS
// ─────────────────────────────────────────────────────────────────
ipcMain.handle("get-bills", async (event, opts = {}) => {
  const { search = "", limit = 0, offset = 0, fromDate = "", toDate = "" } = opts || {}
  const whereClauses = []
  const params = []

  if (search) {
    whereClauses.push("(clientName LIKE ? OR CAST(billId AS TEXT) LIKE ?)")
    params.push(`%${search}%`, `%${search}%`)
  }

  if (fromDate) {
    whereClauses.push("billDate >= ?")
    params.push(fromDate)
  }

  if (toDate) {
    whereClauses.push("billDate <= ?")
    params.push(toDate)
  }

  const fromWhere = `FROM bills${whereClauses.length ? ` WHERE ${whereClauses.join(" AND ")}` : ""}`

  return queryPaginated({
    fromWhere,
    params,
    orderBy: "billDate DESC, CAST(billId AS INTEGER) DESC",
    limit,
    offset,
    parseRow: parseBill,
  })
})

ipcMain.handle("get-low-stock-products", async (event, opts = {}) => {
  const { threshold = 50, limit = 0, offset = 0 } = opts || {}
  const fromWhere = "FROM products WHERE hasInfiniteQuantity = 0 AND quantity <= ?"
  const params = [threshold]
  return queryPaginated({
    fromWhere,
    params,
    orderBy: "quantity ASC, productName ASC",
    limit,
    offset,
    parseRow: parseProduct,
  })
})

ipcMain.handle("get-dashboard-stats", async () => {
  const products = Number(queryOne("SELECT COUNT(*) as cnt FROM products")?.cnt || 0)
  const clients = Number(queryOne("SELECT COUNT(*) as cnt FROM clients")?.cnt || 0)
  const bills = Number(queryOne("SELECT COUNT(*) as cnt FROM bills")?.cnt || 0)
  const recentBills = queryAll(
    "SELECT * FROM bills ORDER BY billDate DESC, CAST(billId AS INTEGER) DESC LIMIT 5"
  ).map(parseBill)
  return { products, clients, bills, recentBills }
})

ipcMain.handle("get-bill", async (event, billId) => {
  return parseBill(queryOne("SELECT * FROM bills WHERE _id = ?", [billId]))
})

ipcMain.handle("add-bill", async (event, bill) => {
  const billToSave = JSON.parse(JSON.stringify(bill))
  billToSave.items = ensureItemsHaveIds(billToSave.items || [])

  if (!billToSave.billId) {
    const row = queryOne("SELECT MAX(CAST(billId AS INTEGER)) as maxId FROM bills WHERE billId IS NOT NULL")
    billToSave.billId = (row && row.maxId) ? Number(row.maxId) + 1 : 1
  }
  billToSave._id = String(billToSave.billId)

  db.run(
    "INSERT OR REPLACE INTO bills(_id,billId,clientId,clientName,clientAddress,fieldOfficerId,salesmanId,billDate,totalAmount,items) VALUES(?,?,?,?,?,?,?,?,?,?)",
    [
      billToSave._id,
      billToSave.billId,
      billToSave.clientId || "",
      billToSave.clientName || "",
      billToSave.clientAddress || "",
      billToSave.fieldOfficerId || "",
      billToSave.salesmanId || "",
      billToSave.billDate ? toIsoDate(billToSave.billDate) : "",
      Number(billToSave.totalAmount) || 0,
      JSON.stringify(billToSave.items),
    ]
  )

  updateProductQuantities(billToSave.items)

  for (const item of billToSave.items) {
    if (!item.isBonus && item.productId) {
      const cpId = queryOne("SELECT _id FROM client_products WHERE clientId=? AND productId=?", [billToSave.clientId, item.productId])
      db.run(
        "INSERT OR REPLACE INTO client_products(_id,clientId,productId,rate,discount,extraDiscount,lastUsed) VALUES(?,?,?,?,?,?,?)",
        [cpId ? cpId._id : generateId(), billToSave.clientId, item.productId, item.rate || 0, item.discount || 0, item.extraDiscount || 0, toIsoDate(new Date())]
      )
    }
  }
  persist()
  return parseBill(queryOne("SELECT * FROM bills WHERE _id = ?", [billToSave._id]))
})

ipcMain.handle("update-bill", async (event, bill) => {
  const originalBill = parseBill(queryOne("SELECT * FROM bills WHERE _id = ?", [bill._id]))
  if (!originalBill) throw new Error(`Bill ${bill._id} not found`)

  const billToSave = JSON.parse(JSON.stringify(bill))
  billToSave.items = ensureItemsHaveIds(billToSave.items || [])

  updateProductQuantities(originalBill.items, true)
  updateProductQuantities(billToSave.items)

  db.run(
    "UPDATE bills SET clientId=?,clientName=?,clientAddress=?,fieldOfficerId=?,salesmanId=?,billDate=?,totalAmount=?,items=? WHERE _id=?",
    [
      billToSave.clientId || "",
      billToSave.clientName || "",
      billToSave.clientAddress || "",
      billToSave.fieldOfficerId || "",
      billToSave.salesmanId || "",
      billToSave.billDate ? toIsoDate(billToSave.billDate) : "",
      Number(billToSave.totalAmount) || 0,
      JSON.stringify(billToSave.items),
      billToSave._id,
    ]
  )

  for (const item of billToSave.items) {
    if (!item.isBonus && item.productId) {
      const cpId = queryOne("SELECT _id FROM client_products WHERE clientId=? AND productId=?", [billToSave.clientId, item.productId])
      db.run(
        "INSERT OR REPLACE INTO client_products(_id,clientId,productId,rate,discount,extraDiscount,lastUsed) VALUES(?,?,?,?,?,?,?)",
        [cpId ? cpId._id : generateId(), billToSave.clientId, item.productId, item.rate || 0, item.discount || 0, item.extraDiscount || 0, toIsoDate(new Date())]
      )
    }
  }
  persist()
  return 1
})

ipcMain.handle("delete-bill", async (event, billId) => {
  const bill = parseBill(queryOne("SELECT * FROM bills WHERE _id = ?", [billId]))
  if (!bill) throw new Error("Bill not found")
  if (bill.items && bill.items.length > 0) {
    updateProductQuantities(bill.items, true)
  }
  db.run("DELETE FROM bills WHERE _id = ?", [billId])
  persist()
  return { success: true, message: "Bill deleted successfully" }
})

ipcMain.handle("clear-bills", async () => {
  db.run("DELETE FROM bills")
  persist()
  return 1
})

ipcMain.handle("import-bills", async (event, bills) => {
  db.run("DELETE FROM bills")
  for (const bill of bills) {
    const b = {
      _id: bill._id || generateId(),
      billId: bill.billId || null,
      clientId: bill.clientId || "",
      clientName: bill.clientName || "",
      clientAddress: bill.clientAddress || "",
      fieldOfficerId: bill.fieldOfficerId || "",
      salesmanId: bill.salesmanId || "",
      billDate: toIsoDate(bill.billDate),
      totalAmount: Number(bill.totalAmount) || 0,
      items: JSON.stringify(ensureItemsHaveIds(bill.items || [])),
    }
    db.run(
      "INSERT OR REPLACE INTO bills(_id,billId,clientId,clientName,clientAddress,fieldOfficerId,salesmanId,billDate,totalAmount,items) VALUES(?,?,?,?,?,?,?,?,?,?)",
      [b._id, b.billId, b.clientId, b.clientName, b.clientAddress, b.fieldOfficerId, b.salesmanId, b.billDate, b.totalAmount, b.items]
    )
  }
  persist()
  return bills.length
})

// ─────────────────────────────────────────────────────────────────
// CLIENT-PRODUCT HISTORY
// ─────────────────────────────────────────────────────────────────
ipcMain.handle("get-client-product", async (event, { clientId, productId }) => {
  const row = queryOne("SELECT * FROM client_products WHERE clientId=? AND productId=?", [clientId, productId])
  if (!row) return null
  return { ...row, rate: Number(row.rate), discount: Number(row.discount), extraDiscount: Number(row.extraDiscount) }
})

// ─────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────
ipcMain.handle("get-credentials", async () => {
  const row = queryOne("SELECT data FROM settings WHERE type='credentials'")
  if (!row) return null
  try { return JSON.parse(row.data) } catch { return null }
})

ipcMain.handle("update-credentials", async (event, credentials) => {
  db.run("INSERT OR REPLACE INTO settings(type,data) VALUES('credentials',?)", [JSON.stringify(credentials)])
  persist()
  return 1
})

ipcMain.handle("get-company-info", async () => {
  const row = queryOne("SELECT data FROM settings WHERE type='company-info'")
  if (!row) return { companyName: "", companyAddress: "", ownerName: "", ownerPhone: "", managerName: "", managerPhone: "" }
  try { return JSON.parse(row.data) } catch { return {} }
})

ipcMain.handle("update-company-info", async (event, companyInfo) => {
  db.run("INSERT OR REPLACE INTO settings(type,data) VALUES('company-info',?)", [JSON.stringify(companyInfo)])
  persist()
  return 1
})

ipcMain.handle("get-app-config", async () => {
  const row = queryOne("SELECT data FROM settings WHERE type='app-config'")
  if (!row) {
    const localTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"
    return { locale: "en-GB", timezone: localTz || "UTC" }
  }
  try { return JSON.parse(row.data) } catch { return { locale: "en-GB", timezone: "UTC" } }
})

ipcMain.handle("update-app-config", async (event, appConfig) => {
  db.run("INSERT OR REPLACE INTO settings(type,data) VALUES('app-config',?)", [JSON.stringify(appConfig)])
  persist()
  return 1
})

// ─────────────────────────────────────────────────────────────────
// PDF HANDLING
// ─────────────────────────────────────────────────────────────────
ipcMain.handle("open-pdf", async (event, pdfData) => {
  return new Promise((resolve, reject) => {
    try {
      const tempDir = os.tmpdir()
      const fileName = `invoice_${Date.now()}.pdf`
      const filePath = path.join(tempDir, fileName)
      const buffer = Buffer.from(pdfData, "base64")
      fs.writeFile(filePath, buffer, (err) => {
        if (err) { reject(err); return }
        shell.openPath(filePath).then((errorMessage) => {
          if (errorMessage) reject(errorMessage)
          else resolve(true)
        })
      })
    } catch (error) {
      reject(error)
    }
  })
})
