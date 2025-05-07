const { app, BrowserWindow, ipcMain } = require("electron")
const path = require("path")
const Datastore = require("nedb")
const fs = require("fs")
const { v4: uuidv4 } = require('uuid');

// Initialize databases
const db = {
  products: new Datastore({ filename: path.join(app.getPath("userData"), "products.db") }),
  clients: new Datastore({ filename: path.join(app.getPath("userData"), "clients.db") }),
  bills: new Datastore({ filename: path.join(app.getPath("userData"), "bills.db") }),
  clientProducts: new Datastore({ filename: path.join(app.getPath("userData"), "clientProducts.db") }),
}

// Load databases
Object.values(db).forEach((database) => {
  database.loadDatabase((err) => {
    if (err) console.error("Database loading error:", err)
  })
})

let mainWindow

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  })

  // Load the index.html file
  mainWindow.loadFile("index.html")

  // Open DevTools in development
  mainWindow.webContents.openDevTools()
}

// When Electron has finished initialization
app.whenReady().then(() => {
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

// IPC handlers for database operations

// Products
ipcMain.handle("get-products", async () => {
  return new Promise((resolve, reject) => {
    db.products
      .find({})
      .sort({ productName: 1 })
      .exec((err, products) => {
        if (err) reject(err)
        else resolve(products)
      })
  })
})

ipcMain.handle("add-product", async (event, product) => {
  return new Promise((resolve, reject) => {
    db.products.insert(product, (err, newProduct) => {
      if (err) reject(err)
      else resolve(newProduct)
    })
  })
})

ipcMain.handle("update-product", async (event, product) => {
  return new Promise((resolve, reject) => {
    db.products.update({ _id: product._id }, product, {}, (err, numReplaced) => {
      if (err) reject(err)
      else resolve(numReplaced)
    })
  })
})

// Clients
ipcMain.handle("get-clients", async () => {
  return new Promise((resolve, reject) => {
    db.clients
      .find({})
      .sort({ clientName: 1 })
      .exec((err, clients) => {
        if (err) reject(err)
        else resolve(clients)
      })
  })
})

ipcMain.handle("add-client", async (event, client) => {
  return new Promise((resolve, reject) => {
    db.clients.insert(client, (err, newClient) => {
      if (err) reject(err)
      else resolve(newClient)
    })
  })
})

ipcMain.handle("update-client", async (event, client) => {
  return new Promise((resolve, reject) => {
    db.clients.update({ _id: client._id }, client, {}, (err, numReplaced) => {
      if (err) reject(err)
      else resolve(numReplaced)
    })
  })
})

// Bills
ipcMain.handle("get-bills", async () => {
  return new Promise((resolve, reject) => {
    db.bills
      .find({})
      .sort({ billDate: -1 })
      .exec((err, bills) => {
        if (err) reject(err)
        else resolve(bills)
      })
  })
})

ipcMain.handle("get-bill", async (event, billId) => {
  return new Promise((resolve, reject) => {
    db.bills.findOne({ _id: billId }, (err, bill) => {
      if (err) reject(err)
      else resolve(bill)
    })
  })
})

// Helper function to generate a unique ID
function generateUniqueId() {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Helper function to ensure all items have an _id
function ensureItemsHaveIds(items) {
  if (!items || !Array.isArray(items)) return []

  return items.map((item) => {
    // Create a new object to avoid modifying the original
    const newItem = { ...item }

    // Ensure item has an _id
    if (!newItem._id) {
      newItem._id = generateUniqueId()
    }

    return newItem
  })
}

ipcMain.handle("add-bill", async (event, bill) => {
  return new Promise((resolve, reject) => {
    try {
      console.log("Received bill for adding:", JSON.stringify(bill))

      // Create a deep copy of the bill to avoid modifying the original
      const billToSave = JSON.parse(JSON.stringify(bill))

      // Ensure the bill has a unique billId
      if (!billToSave.billId) {
        billToSave.billId = uuidv4();
      }

      // Ensure all items have an _id
      billToSave.items = ensureItemsHaveIds(billToSave.items)

      console.log("Processed bill for adding:", JSON.stringify(billToSave))

      // Insert the bill into the database
      db.bills.insert(billToSave, (err, newBill) => {
        if (err) {
          console.error("Error inserting bill:", err)
          reject(err)
        } else {
          // Update client-product history
          billToSave.items.forEach((item) => {
            if (!item.isBonus) {
              const clientProduct = {
                clientId: billToSave.clientId,
                productId: item.productId,
                rate: item.rate,
                discount: item.discount,
                lastUsed: new Date(),
              }

              db.clientProducts.update(
                { clientId: billToSave.clientId, productId: item.productId },
                clientProduct,
                { upsert: true },
                (err) => {
                  if (err) console.error("Error updating client product history:", err)
                },
              )
            }
          })
          resolve(newBill)
        }
      })
    } catch (error) {
      console.error("Error processing bill:", error)
      reject(error)
    }
  })
})

ipcMain.handle("update-bill", async (event, bill) => {
  return new Promise((resolve, reject) => {
    try {
      console.log("Received bill for updating:", JSON.stringify(bill))

      // Create a deep copy of the bill to avoid modifying the original
      const billToSave = JSON.parse(JSON.stringify(bill))

      // Ensure all items have an _id
      billToSave.items = ensureItemsHaveIds(billToSave.items)

      console.log("Processed bill for updating:", JSON.stringify(billToSave))

      // Update the bill in the database
      db.bills.update({ _id: billToSave._id }, billToSave, {}, (err, numReplaced) => {
        if (err) {
          console.error("Error updating bill:", err)
          reject(err)
        } else {
          // Update client-product history
          billToSave.items.forEach((item) => {
            if (!item.isBonus) {
              const clientProduct = {
                clientId: billToSave.clientId,
                productId: item.productId,
                rate: item.rate,
                discount: item.discount,
                lastUsed: new Date(),
              }

              db.clientProducts.update(
                { clientId: billToSave.clientId, productId: item.productId },
                clientProduct,
                { upsert: true },
                (err) => {
                  if (err) console.error("Error updating client product history:", err)
                },
              )
            }
          })
          resolve(numReplaced)
        }
      })
    } catch (error) {
      console.error("Error processing bill update:", error)
      reject(error)
    }
  })
})

// Client-Product history
ipcMain.handle("get-client-product", async (event, { clientId, productId }) => {
  return new Promise((resolve, reject) => {
    db.clientProducts.findOne({ clientId, productId }, (err, clientProduct) => {
      if (err) reject(err)
      else resolve(clientProduct)
    })
  })
})

ipcMain.handle("clear-products", async () => {
  return new Promise((resolve, reject) => {
    db.products.remove({}, { multi: true }, (err, numRemoved) => {
      if (err) reject(err)
      else resolve(numRemoved)
    })
  })
})

ipcMain.handle("clear-clients", async () => {
  return new Promise((resolve, reject) => {
    db.clients.remove({}, { multi: true }, (err, numRemoved) => {
      if (err) reject(err)
      else resolve(numRemoved)
    })
  })
})

ipcMain.handle("clear-bills", async () => {
  return new Promise((resolve, reject) => {
    db.bills.remove({}, { multi: true }, (err, numRemoved) => {
      if (err) reject(err)
      else resolve(numRemoved)
    })
  })
})
