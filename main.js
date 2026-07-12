const { app, BrowserWindow, ipcMain } = require("electron")
const path = require("path")
const Datastore = require("nedb")
const fs = require("fs")
const { v4: uuidv4 } = require("uuid")

// Initialize databases
const db = {
  products: new Datastore({ filename: path.join(app.getPath("userData"), "products.db") }),
  clients: new Datastore({ filename: path.join(app.getPath("userData"), "clients.db") }),
  bills: new Datastore({ filename: path.join(app.getPath("userData"), "bills.db") }),
  clientProducts: new Datastore({ filename: path.join(app.getPath("userData"), "clientProducts.db") }),
  settings: new Datastore({ filename: path.join(app.getPath("userData"), "settings.db") }),
  fieldOfficers: new Datastore({ filename: path.join(app.getPath("userData"), "fieldOfficers.db") }),
  salesmen: new Datastore({ filename: path.join(app.getPath("userData"), "salesmen.db") }),
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

  // Open DevTools only in development
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools()
  }
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

// Helper function to update product quantities
async function updateProductQuantities(items, isRefund = false) {
  // Create a map to track total quantities for each product
  const productQuantities = new Map()

  // Calculate total quantities for each product
  items.forEach((item) => {
    if (item.productId) {
      const currentQty = productQuantities.get(item.productId) || 0
      productQuantities.set(item.productId, currentQty + item.quantity)
    }
  })

  // Update product quantities in the database
  const updatePromises = []

  for (const [productId, quantity] of productQuantities.entries()) {
    updatePromises.push(
      new Promise((resolve, reject) => {
        // First get the product
        db.products.findOne({ _id: productId }, (err, product) => {
          if (err) {
            reject(err)
            return
          }

          // Skip if product has infinite quantity
          if (!product || product.hasInfiniteQuantity !== false) {
            resolve()
            return
          }

          // Update the quantity
          const newQuantity = isRefund ? product.quantity + quantity : product.quantity - quantity

          db.products.update(
            { _id: productId },
            { $set: { quantity: Math.max(0, newQuantity) } },
            {},
            (err, numReplaced) => {
              if (err) {
                reject(err)
              } else {
                resolve(numReplaced)
              }
            },
          )
        })
      }),
    )
  }

  return Promise.all(updatePromises)
}

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

ipcMain.handle("delete-product", async (event, id) => {
  return new Promise((resolve, reject) => {
    db.products.remove({ _id: id }, {}, (err, numRemoved) => {
      if (err) reject(err)
      else resolve(numRemoved)
    })
  })
})

ipcMain.handle("add-product", async (event, product) => {
  return new Promise((resolve, reject) => {
    // Ensure hasInfiniteQuantity is set
    if (product.hasInfiniteQuantity === undefined) {
      product.hasInfiniteQuantity = true
    }

    // Ensure quantity is set if not infinite
    if (!product.hasInfiniteQuantity && product.quantity === undefined) {
      product.quantity = 0
    }

    // Ensure purchasePrice is set (default to productPrice if not provided)
    if (product.purchasePrice === undefined || product.purchasePrice === null) {
      product.purchasePrice = product.productPrice || 0
    }

    db.products.insert(product, (err, newProduct) => {
      if (err) reject(err)
      else resolve(newProduct)
    })
  })
})

ipcMain.handle("update-product", async (event, product) => {
  return new Promise((resolve, reject) => {
    // Ensure hasInfiniteQuantity is set
    if (product.hasInfiniteQuantity === undefined) {
      product.hasInfiniteQuantity = true
    }

    // Ensure quantity is set if not infinite
    if (!product.hasInfiniteQuantity && product.quantity === undefined) {
      product.quantity = 0
    }

    // Ensure purchasePrice is set (default to productPrice if not provided)
    if (product.purchasePrice === undefined || product.purchasePrice === null) {
      product.purchasePrice = product.productPrice || 0
    }

    db.products.update({ _id: product._id }, product, {}, (err, numReplaced) => {
      if (err) reject(err)
      else resolve(numReplaced)
    })
  })
})

ipcMain.handle("import-products", async (event, products) => {
  return new Promise((resolve, reject) => {
    // First clear existing products
    db.products.remove({}, { multi: true }, (err) => {
      if (err) {
        reject(err)
        return
      }

      // Then insert the new products
      db.products.insert(products, (err, newProducts) => {
        if (err) reject(err)
        else resolve(newProducts)
      })
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

// Get a single client
ipcMain.handle("get-client", async (event, clientId) => {
  return new Promise((resolve, reject) => {
    db.clients.findOne({ _id: clientId }, (err, client) => {
      if (err) reject(err)
      else resolve(client)
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

ipcMain.handle("delete-client", async (event, id) => {
  return new Promise((resolve, reject) => {
    db.clients.remove({ _id: id }, {}, (err, numRemoved) => {
      if (err) reject(err)
      else resolve(numRemoved)
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

ipcMain.handle("import-clients", async (event, clients) => {
  return new Promise((resolve, reject) => {
    // First clear existing clients
    db.clients.remove({}, { multi: true }, (err) => {
      if (err) {
        reject(err)
        return
      }

      // Then insert the new clients
      db.clients.insert(clients, (err, newClients) => {
        if (err) reject(err)
        else resolve(newClients)
      })
    })
  })
})

// Field Officers
ipcMain.handle("get-field-officers", async () => {
  return new Promise((resolve, reject) => {
    db.fieldOfficers
      .find({})
      .sort({ name: 1 })
      .exec((err, fieldOfficers) => {
        if (err) reject(err)
        else resolve(fieldOfficers)
      })
  })
})

// Get a single field officer
ipcMain.handle("get-field-officer", async (event, fieldOfficerId) => {
  return new Promise((resolve, reject) => {
    db.fieldOfficers.findOne({ _id: fieldOfficerId }, (err, fieldOfficer) => {
      if (err) reject(err)
      else resolve(fieldOfficer)
    })
  })
})

ipcMain.handle("add-field-officer", async (event, fieldOfficer) => {
  return new Promise((resolve, reject) => {
    db.fieldOfficers.insert(fieldOfficer, (err, newFieldOfficer) => {
      if (err) reject(err)
      else resolve(newFieldOfficer)
    })
  })
})

ipcMain.handle("update-field-officer", async (event, fieldOfficer) => {
  return new Promise((resolve, reject) => {
    db.fieldOfficers.update({ _id: fieldOfficer._id }, fieldOfficer, {}, (err, numReplaced) => {
      if (err) reject(err)
      else resolve(numReplaced)
    })
  })
})

ipcMain.handle("delete-field-officer", async (event, id) => {
  return new Promise((resolve, reject) => {
    db.fieldOfficers.remove({ _id: id }, {}, (err, numRemoved) => {
      if (err) reject(err)
      else resolve(numRemoved)
    })
  })
})

ipcMain.handle("clear-field-officers", async () => {
  return new Promise((resolve, reject) => {
    db.fieldOfficers.remove({}, { multi: true }, (err, numRemoved) => {
      if (err) reject(err)
      else resolve(numRemoved)
    })
  })
})

ipcMain.handle("import-field-officers", async (event, fieldOfficers) => {
  return new Promise((resolve, reject) => {
    // First clear existing field officers
    db.fieldOfficers.remove({}, { multi: true }, (err) => {
      if (err) {
        reject(err)
        return
      }

      // Then insert the new field officers
      db.fieldOfficers.insert(fieldOfficers, (err, newFieldOfficers) => {
        if (err) reject(err)
        else resolve(newFieldOfficers)
      })
    })
  })
})

// Salesmen
ipcMain.handle("get-salesmen", async () => {
  return new Promise((resolve, reject) => {
    db.salesmen
      .find({})
      .sort({ name: 1 })
      .exec((err, salesmen) => {
        if (err) reject(err)
        else resolve(salesmen)
      })
  })
})

// Get a single salesman
ipcMain.handle("get-salesman", async (event, salesmanId) => {
  return new Promise((resolve, reject) => {
    db.salesmen.findOne({ _id: salesmanId }, (err, salesman) => {
      if (err) reject(err)
      else resolve(salesman)
    })
  })
})

ipcMain.handle("add-salesman", async (event, salesman) => {
  return new Promise((resolve, reject) => {
    db.salesmen.insert(salesman, (err, newSalesman) => {
      if (err) reject(err)
      else resolve(newSalesman)
    })
  })
})

ipcMain.handle("update-salesman", async (event, salesman) => {
  return new Promise((resolve, reject) => {
    db.salesmen.update({ _id: salesman._id }, salesman, {}, (err, numReplaced) => {
      if (err) reject(err)
      else resolve(numReplaced)
    })
  })
})

ipcMain.handle("delete-salesman", async (event, id) => {
  return new Promise((resolve, reject) => {
    db.salesmen.remove({ _id: id }, {}, (err, numRemoved) => {
      if (err) reject(err)
      else resolve(numRemoved)
    })
  })
})

ipcMain.handle("clear-salesmen", async () => {
  return new Promise((resolve, reject) => {
    db.salesmen.remove({}, { multi: true }, (err, numRemoved) => {
      if (err) reject(err)
      else resolve(numRemoved)
    })
  })
})

ipcMain.handle("import-salesmen", async (event, salesmen) => {
  return new Promise((resolve, reject) => {
    // First clear existing salesmen
    db.salesmen.remove({}, { multi: true }, (err) => {
      if (err) {
        reject(err)
        return
      }

      // Then insert the new salesmen
      db.salesmen.insert(salesmen, (err, newSalesmen) => {
        if (err) reject(err)
        else resolve(newSalesmen)
      })
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

ipcMain.handle("delete-bill", async (event, billId) => {
  return new Promise(async (resolve, reject) => {
    try {
      // First, get the bill to check if we need to update product quantities
      const bill = await new Promise((resolve, reject) => {
        db.bills.findOne({ _id: billId }, (err, bill) => {
          if (err) reject(err)
          else resolve(bill)
        })
      })

      if (!bill) {
        reject(new Error("Bill not found"))
        return
      }

      // Update product quantities (add back the quantities that were sold)
      if (bill.items && bill.items.length > 0) {
        await updateProductQuantities(bill.items, true) // true = refund mode
      }

      // Delete the bill
      db.bills.remove({ _id: billId }, {}, (err, numRemoved) => {
        if (err) {
          reject(err)
        } else if (numRemoved === 0) {
          reject(new Error("Bill not found"))
        } else {
          resolve({ success: true, message: "Bill deleted successfully" })
        }
      })
    } catch (error) {
      reject(error)
    }
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

ipcMain.handle("import-bills", async (event, bills) => {
  return new Promise((resolve, reject) => {
    // First clear existing bills
    db.bills.remove({}, { multi: true }, (err) => {
      if (err) {
        reject(err)
        return
      }

      // Then insert the new bills
      db.bills.insert(bills, (err, newBills) => {
        if (err) reject(err)
        else resolve(newBills)
      })
    })
  })
})

ipcMain.handle("add-bill", async (event, bill) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Create a deep copy of the bill to avoid modifying the original
      const billToSave = JSON.parse(JSON.stringify(bill))

      // Generate a new numeric billId if not present
      if (!billToSave.billId) {
        // Find the current max billId
        db.bills
          .find({ billId: { $exists: true } })
          .sort({ billId: -1 })
          .limit(1)
          .exec((err, docs) => {
            let newBillId = 1
            if (!err && docs && docs.length > 0 && typeof docs[0].billId === 'number') {
              newBillId = docs[0].billId + 1
            }
            billToSave.billId = newBillId
            billToSave._id = String(newBillId) // Use string for NeDB _id

            // Ensure all items have an _id
            billToSave.items = ensureItemsHaveIds(billToSave.items)

            // Update product quantities
            updateProductQuantities(billToSave.items)
              .then(() => {
                // Insert the bill into the database
                db.bills.insert(billToSave, (err, newBill) => {
                  if (err) {
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
                          extraDiscount: item.extraDiscount || 0,
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
              })
              .catch(reject)
          })
      } else {
        // If billId already present, just use it
        billToSave._id = String(billToSave.billId)
        billToSave.items = ensureItemsHaveIds(billToSave.items)
        try {
          await updateProductQuantities(billToSave.items)
        } catch (error) {
          reject(error)
          return
        }
        db.bills.insert(billToSave, (err, newBill) => {
          if (err) {
            reject(err)
          } else {
            billToSave.items.forEach((item) => {
              if (!item.isBonus) {
                const clientProduct = {
                  clientId: billToSave.clientId,
                  productId: item.productId,
                  rate: item.rate,
                  discount: item.discount,
                  extraDiscount: item.extraDiscount || 0,
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
      }
    } catch (error) {
      reject(error)
    }
  })
})

ipcMain.handle("update-bill", async (event, bill) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Get the original bill to compare items
      const originalBill = await new Promise((resolve, reject) => {
        db.bills.findOne({ _id: bill._id }, (err, existingBill) => {
          if (err) {
            reject(err)
          } else if (!existingBill) {
            reject(new Error(`Bill with ID ${bill._id} not found`))
          } else {
            resolve(existingBill)
          }
        })
      })

      // Create a deep copy of the bill to avoid modifying the original
      const billToSave = JSON.parse(JSON.stringify(bill))

      // Ensure all items have an _id
      billToSave.items = ensureItemsHaveIds(billToSave.items)

      // First, refund the quantities from the original bill
      try {
        await updateProductQuantities(originalBill.items, true)
      } catch (error) {
        reject(error)
        return
      }

      // Then, deduct the quantities for the updated bill
      try {
        await updateProductQuantities(billToSave.items)
      } catch (error) {
        // Try to restore the original quantities
        await updateProductQuantities(originalBill.items)
        reject(error)
        return
      }

      // Update the bill in the database
      db.bills.update({ _id: billToSave._id }, billToSave, {}, (err, numReplaced) => {
        if (err) {
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
                extraDiscount: item.extraDiscount || 0,
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

// Settings and Company Info
ipcMain.handle("get-credentials", async () => {
  return new Promise((resolve, reject) => {
    db.settings.findOne({ type: "credentials" }, (err, credentials) => {
      if (err) reject(err)
      else resolve(credentials)
    })
  })
})

ipcMain.handle("update-credentials", async (event, credentials) => {
  return new Promise((resolve, reject) => {
    db.settings.update(
      { type: "credentials" },
      { ...credentials, type: "credentials" },
      { upsert: true },
      (err, numReplaced) => {
        if (err) reject(err)
        else resolve(numReplaced)
      },
    )
  })
})

ipcMain.handle("get-company-info", async () => {
  return new Promise((resolve, reject) => {
    db.settings.findOne({ type: "company-info" }, (err, companyInfo) => {
      if (err) reject(err)
      else {
        // Return default empty object if no company info exists
        if (!companyInfo) {
          resolve({
            companyName: "",
            companyAddress: "",
            ownerName: "",
            ownerPhone: "",
            managerName: "",
            managerPhone: "",
          })
        } else {
          resolve(companyInfo)
        }
      }
    })
  })
})

ipcMain.handle("update-company-info", async (event, companyInfo) => {
  return new Promise((resolve, reject) => {
    db.settings.update(
      { type: "company-info" },
      { ...companyInfo, type: "company-info" },
      { upsert: true },
      (err, numReplaced) => {
        if (err) reject(err)
        else resolve(numReplaced)
      },
    )
  })
})

ipcMain.handle("get-app-config", async () => {
  return new Promise((resolve, reject) => {
    db.settings.findOne({ type: "app-config" }, (err, appConfig) => {
      if (err) reject(err)
      else {
        // Return default values if no config exists
        if (!appConfig) {
          const localTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
          resolve({
            locale: "en-GB",
            timezone: localTz || "UTC",
          })
        } else {
          resolve(appConfig)
        }
      }
    })
  })
})

ipcMain.handle("update-app-config", async (event, appConfig) => {
  return new Promise((resolve, reject) => {
    db.settings.update(
      { type: "app-config" },
      { ...appConfig, type: "app-config" },
      { upsert: true },
      (err, numReplaced) => {
        if (err) reject(err)
        else resolve(numReplaced)
      },
    )
  })
})

// Database Management
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

// PDF Handling
const { shell } = require("electron")
const os = require("os")

ipcMain.handle("open-pdf", async (event, pdfData) => {
  return new Promise((resolve, reject) => {
    try {
      const tempDir = os.tmpdir()
      const fileName = `invoice_${Date.now()}.pdf`
      const filePath = path.join(tempDir, fileName)

      const buffer = Buffer.from(pdfData, 'base64')

      fs.writeFile(filePath, buffer, (err) => {
        if (err) {
          console.error("Error saving PDF:", err)
          reject(err)
          return
        }

        shell.openPath(filePath).then((errorMessage) => {
          if (errorMessage) {
            console.error("Error opening PDF:", errorMessage)
            reject(errorMessage)
          } else {
            resolve(true)
          }
        })
      })
    } catch (error) {
      console.error("Error in open-pdf handler:", error)
      reject(error)
    }
  })
})

ipcMain.handle("update-existing-products-purchase-price", async () => {
  return new Promise((resolve, reject) => {
    // Find all products that don't have purchasePrice set
    db.products.find({ $or: [{ purchasePrice: { $exists: false } }, { purchasePrice: null }] }, (err, products) => {
      if (err) {
        reject(err)
        return
      }

      // Update each product to set purchasePrice equal to productPrice
      const updatePromises = products.map((product) => {
        return new Promise((resolveUpdate, rejectUpdate) => {
          const updatedProduct = {
            ...product,
            purchasePrice: product.productPrice || 0
          }
          db.products.update({ _id: product._id }, updatedProduct, {}, (err, numReplaced) => {
            if (err) rejectUpdate(err)
            else resolveUpdate(numReplaced)
          })
        })
      })

      Promise.all(updatePromises)
        .then((results) => {
          resolve({ updated: results.length, total: products.length })
        })
        .catch(reject)
    })
  })
})
