const { contextBridge, ipcRenderer } = require("electron")

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("api", {
  // Products
  getProducts: () => ipcRenderer.invoke("get-products"),
  addProduct: (product) => ipcRenderer.invoke("add-product", product),
  updateProduct: (product) => ipcRenderer.invoke("update-product", product),
  importProducts: (products) => ipcRenderer.invoke("import-products", products),

  // Clients
  getClients: () => ipcRenderer.invoke("get-clients"),
  addClient: (client) => ipcRenderer.invoke("add-client", client),
  updateClient: (client) => ipcRenderer.invoke("update-client", client),
  importClients: (clients) => ipcRenderer.invoke("import-clients", clients),

  // Field Officers
  getFieldOfficers: () => ipcRenderer.invoke("get-field-officers"),
  addFieldOfficer: (fieldOfficer) => ipcRenderer.invoke("add-field-officer", fieldOfficer),
  updateFieldOfficer: (fieldOfficer) => ipcRenderer.invoke("update-field-officer", fieldOfficer),
  deleteFieldOfficer: (id) => ipcRenderer.invoke("delete-field-officer", id),
  clearFieldOfficers: () => ipcRenderer.invoke("clear-field-officers"),
  importFieldOfficers: (fieldOfficers) => ipcRenderer.invoke("import-field-officers", fieldOfficers),

  // Salesmen
  getSalesmen: () => ipcRenderer.invoke("get-salesmen"),
  addSalesman: (salesman) => ipcRenderer.invoke("add-salesman", salesman),
  updateSalesman: (salesman) => ipcRenderer.invoke("update-salesman", salesman),
  deleteSalesman: (id) => ipcRenderer.invoke("delete-salesman", id),
  clearSalesmen: () => ipcRenderer.invoke("clear-salesmen"),
  importSalesmen: (salesmen) => ipcRenderer.invoke("import-salesmen", salesmen),

  // Bills
  getBills: () => ipcRenderer.invoke("get-bills"),
  getBill: (billId) => ipcRenderer.invoke("get-bill", billId),
  addBill: (bill) => ipcRenderer.invoke("add-bill", bill),
  updateBill: (bill) => ipcRenderer.invoke("update-bill", bill),
  importBills: (bills) => ipcRenderer.invoke("import-bills", bills),

  // Client-Product history
  getClientProduct: (clientId, productId) => ipcRenderer.invoke("get-client-product", { clientId, productId }),

  // Settings and Company Info
  getCredentials: () => ipcRenderer.invoke("get-credentials"),
  updateCredentials: (credentials) => ipcRenderer.invoke("update-credentials", credentials),
  getCompanyInfo: () => ipcRenderer.invoke("get-company-info"),
  updateCompanyInfo: (companyInfo) => ipcRenderer.invoke("update-company-info", companyInfo),

  // Database Management
  clearProducts: () => ipcRenderer.invoke("clear-products"),
  clearClients: () => ipcRenderer.invoke("clear-clients"),
  clearBills: () => ipcRenderer.invoke("clear-bills"),
})

console.log("Preload script loaded")
