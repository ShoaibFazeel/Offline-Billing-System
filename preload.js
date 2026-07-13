const { contextBridge, ipcRenderer } = require("electron")

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("api", {
  appVersion: process.env.npm_package_version || "1.0.0",
  // Products
  getProducts: (opts) => ipcRenderer.invoke("get-products", opts),
  getLowStockProducts: (opts) => ipcRenderer.invoke("get-low-stock-products", opts),
  deleteProduct: (id) => ipcRenderer.invoke("delete-product", id),
  addProduct: (product) => ipcRenderer.invoke("add-product", product),
  updateProduct: (product) => ipcRenderer.invoke("update-product", product),
  importProducts: (products) => ipcRenderer.invoke("import-products", products),
  updateExistingProductsPurchasePrice: () => ipcRenderer.invoke("update-existing-products-purchase-price"),

  // Clients
  getClients: (opts) => ipcRenderer.invoke("get-clients", opts),
  deleteClient: (id) => ipcRenderer.invoke("delete-client", id),
  addClient: (client) => ipcRenderer.invoke("add-client", client),
  updateClient: (client) => ipcRenderer.invoke("update-client", client),
  importClients: (clients) => ipcRenderer.invoke("import-clients", clients),
  getClient: (clientId) => ipcRenderer.invoke("get-client", clientId),

  // Field Officers
  getFieldOfficers: (opts) => ipcRenderer.invoke("get-field-officers", opts),
  addFieldOfficer: (fieldOfficer) => ipcRenderer.invoke("add-field-officer", fieldOfficer),
  updateFieldOfficer: (fieldOfficer) => ipcRenderer.invoke("update-field-officer", fieldOfficer),
  deleteFieldOfficer: (id) => ipcRenderer.invoke("delete-field-officer", id),
  clearFieldOfficers: () => ipcRenderer.invoke("clear-field-officers"),
  importFieldOfficers: (fieldOfficers) => ipcRenderer.invoke("import-field-officers", fieldOfficers),
  getFieldOfficer: (fieldOfficerId) => ipcRenderer.invoke("get-field-officer", fieldOfficerId),

  // Salesmen
  getSalesmen: (opts) => ipcRenderer.invoke("get-salesmen", opts),
  addSalesman: (salesman) => ipcRenderer.invoke("add-salesman", salesman),
  updateSalesman: (salesman) => ipcRenderer.invoke("update-salesman", salesman),
  deleteSalesman: (id) => ipcRenderer.invoke("delete-salesman", id),
  clearSalesmen: () => ipcRenderer.invoke("clear-salesmen"),
  importSalesmen: (salesmen) => ipcRenderer.invoke("import-salesmen", salesmen),
  getSalesman: (salesmanId) => ipcRenderer.invoke("get-salesman", salesmanId),

  // Bills
  getBills: (opts) => ipcRenderer.invoke("get-bills", opts),
  getBill: (billId) => ipcRenderer.invoke("get-bill", billId),
  addBill: (bill) => ipcRenderer.invoke("add-bill", bill),
  updateBill: (bill) => ipcRenderer.invoke("update-bill", bill),
  deleteBill: (billId) => ipcRenderer.invoke("delete-bill", billId),
  importBills: (bills) => ipcRenderer.invoke("import-bills", bills),

  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke("get-dashboard-stats"),

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

  // PDF Handling
  openPdf: (pdfData) => ipcRenderer.invoke("open-pdf", pdfData),
  // Application Configuration
  getAppConfig: () => ipcRenderer.invoke("get-app-config"),
  updateAppConfig: (config) => ipcRenderer.invoke("update-app-config", config),

  // Auto-updates
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  onUpdateStatus: (callback) => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on("update-status", listener)
    return () => ipcRenderer.removeListener("update-status", listener)
  },
})
