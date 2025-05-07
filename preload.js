const { contextBridge, ipcRenderer } = require("electron")

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("api", {
  // Products
  getProducts: () => ipcRenderer.invoke("get-products"),
  addProduct: (product) => ipcRenderer.invoke("add-product", product),
  updateProduct: (product) => ipcRenderer.invoke("update-product", product),

  // Clients
  getClients: () => ipcRenderer.invoke("get-clients"),
  addClient: (client) => ipcRenderer.invoke("add-client", client),
  updateClient: (client) => ipcRenderer.invoke("update-client", client),

  // Bills
  getBills: () => ipcRenderer.invoke("get-bills"),
  getBill: (billId) => ipcRenderer.invoke("get-bill", billId),
  addBill: (bill) => ipcRenderer.invoke("add-bill", bill),
  updateBill: (bill) => ipcRenderer.invoke("update-bill", bill),

  // Client-Product history
  getClientProduct: (clientId, productId) => ipcRenderer.invoke("get-client-product", { clientId, productId }),
})

console.log("Preload script loaded")
