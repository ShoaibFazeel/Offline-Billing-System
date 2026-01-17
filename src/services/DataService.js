// Data Service with caching and lazy loading
class DataService {
  constructor() {
    this.cache = new Map()
    this.cacheTimestamps = new Map()
    this.CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
    this.BATCH_SIZE = 50 // Load data in batches of 50
    this.refreshCallbacks = new Map() // Store refresh callbacks
  }

  // Generic cache management
  isCacheValid(key) {
    const timestamp = this.cacheTimestamps.get(key)
    if (!timestamp) return false
    return Date.now() - timestamp < this.CACHE_DURATION
  }

  setCache(key, data) {
    this.cache.set(key, data)
    this.cacheTimestamps.set(key, Date.now())
  }

  getCache(key) {
    if (this.isCacheValid(key)) {
      return this.cache.get(key)
    }
    this.cache.delete(key)
    this.cacheTimestamps.delete(key)
    return null
  }

  // Clear cache for specific key
  clearCache(key) {
    this.cache.delete(key)
    this.cacheTimestamps.delete(key)
  }

  // Clear all cache
  clearAllCache() {
    this.cache.clear()
    this.cacheTimestamps.clear()
  }

  // Generic fetch with caching
  async fetchWithCache(key, fetchFunction, useCache = true) {
    if (useCache) {
      const cached = this.getCache(key)
      if (cached) {
        return cached
      }
    }

    try {
      const data = await fetchFunction()
      if (useCache) {
        this.setCache(key, data)
      }
      return data
    } catch (error) {
      console.error(`Error fetching ${key}:`, error)
      throw error
    }
  }

  // Products with lazy loading
  async getProducts(searchTerm = '', limit = this.BATCH_SIZE, offset = 0, useCache = true) {
    const cacheKey = `products_${searchTerm}_${limit}_${offset}`

    return this.fetchWithCache(cacheKey, async () => {
      if (!window.api) {
        throw new Error('API not available')
      }

      const allProducts = await window.api.getProducts()

      // Apply search filter
      let filteredProducts = allProducts
      if (searchTerm) {
        filteredProducts = allProducts.filter(product =>
          product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.companyName.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      // Apply pagination
      const paginatedProducts = filteredProducts.slice(offset, offset + limit)

      console.log(`Products pagination: offset=${offset}, limit=${limit}, total=${filteredProducts.length}, returned=${paginatedProducts.length}, hasMore=${offset + limit < filteredProducts.length}`)

      return {
        data: paginatedProducts,
        total: filteredProducts.length,
        hasMore: offset + limit < filteredProducts.length,
        offset,
        limit
      }
    }, useCache)
  }

  // Clients with lazy loading
  async getClients(searchTerm = '', limit = this.BATCH_SIZE, offset = 0, useCache = true) {
    const cacheKey = `clients_${searchTerm}_${limit}_${offset}`

    return this.fetchWithCache(cacheKey, async () => {
      if (!window.api) {
        throw new Error('API not available')
      }

      const allClients = await window.api.getClients()

      // Apply search filter
      let filteredClients = allClients
      if (searchTerm) {
        filteredClients = allClients.filter(client =>
          client.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.clientNumber.includes(searchTerm) ||
          client.clientAddress.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      // Apply pagination
      const paginatedClients = filteredClients.slice(offset, offset + limit)

      console.log(`Clients pagination: offset=${offset}, limit=${limit}, total=${filteredClients.length}, returned=${paginatedClients.length}, hasMore=${offset + limit < filteredClients.length}`)

      return {
        data: paginatedClients,
        total: filteredClients.length,
        hasMore: offset + limit < filteredClients.length,
        offset,
        limit
      }
    }, useCache)
  }

  // Bills with lazy loading
  async getBills(searchTerm = '', limit = this.BATCH_SIZE, offset = 0, useCache = true) {
    const cacheKey = `bills_${searchTerm}_${limit}_${offset}`

    return this.fetchWithCache(cacheKey, async () => {
      if (!window.api) {
        throw new Error('API not available')
      }

      const allBills = await window.api.getBills()

      // Apply search filter
      let filteredBills = allBills
      if (searchTerm) {
        filteredBills = allBills.filter(bill =>
          bill.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bill.billId?.toString().includes(searchTerm)
        )
      }

      // Apply pagination
      const paginatedBills = filteredBills.slice(offset, offset + limit)

      return {
        data: paginatedBills,
        total: filteredBills.length,
        hasMore: offset + limit < filteredBills.length,
        offset,
        limit
      }
    }, useCache)
  }

  // Field officers with lazy loading
  async getFieldOfficers(searchTerm = '', limit = this.BATCH_SIZE, offset = 0, useCache = true) {
    const cacheKey = `fieldOfficers_${searchTerm}_${limit}_${offset}`

    return this.fetchWithCache(cacheKey, async () => {
      if (!window.api) {
        throw new Error('API not available')
      }

      const allFieldOfficers = await window.api.getFieldOfficers()

      // Apply search filter
      let filteredFieldOfficers = allFieldOfficers
      if (searchTerm) {
        filteredFieldOfficers = allFieldOfficers.filter(officer =>
          officer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          officer.phoneNumber.includes(searchTerm)
        )
      }

      // Apply pagination
      const paginatedFieldOfficers = filteredFieldOfficers.slice(offset, offset + limit)

      return {
        data: paginatedFieldOfficers,
        total: filteredFieldOfficers.length,
        hasMore: offset + limit < filteredFieldOfficers.length,
        offset,
        limit
      }
    }, useCache)
  }

  // Low Stock Products with lazy loading
  async getLowStockProducts(threshold = 50, limit = this.BATCH_SIZE, offset = 0, useCache = true) {
    const cacheKey = `lowStockProducts_${threshold}_${limit}_${offset}`

    return this.fetchWithCache(cacheKey, async () => {
      if (!window.api) {
        throw new Error('API not available')
      }

      const allProducts = await window.api.getProducts()

      // Apply filters: not infinite and quantity <= threshold
      const lowStockProducts = allProducts.filter(product =>
        product.hasInfiniteQuantity === false && product.quantity <= threshold
      )

      // Apply pagination
      const paginatedProducts = lowStockProducts.slice(offset, offset + limit)

      console.log(`Low stock products pagination: threshold=${threshold}, offset=${offset}, limit=${limit}, total=${lowStockProducts.length}, returned=${paginatedProducts.length}`)

      return {
        data: paginatedProducts,
        total: lowStockProducts.length,
        hasMore: offset + limit < lowStockProducts.length,
        offset,
        limit
      }
    }, useCache)
  }

  // Salesmen with lazy loading
  async getSalesmen(searchTerm = '', limit = this.BATCH_SIZE, offset = 0, useCache = true) {
    const cacheKey = `salesmen_${searchTerm}_${limit}_${offset}`

    return this.fetchWithCache(cacheKey, async () => {
      if (!window.api) {
        throw new Error('API not available')
      }

      const allSalesmen = await window.api.getSalesmen()

      // Apply search filter
      let filteredSalesmen = allSalesmen
      if (searchTerm) {
        filteredSalesmen = allSalesmen.filter(salesman =>
          salesman.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          salesman.phoneNumber.includes(searchTerm)
        )
      }

      // Apply pagination
      const paginatedSalesmen = filteredSalesmen.slice(offset, offset + limit)

      return {
        data: paginatedSalesmen,
        total: filteredSalesmen.length,
        hasMore: offset + limit < filteredSalesmen.length,
        offset,
        limit
      }
    }, useCache)
  }

  // Get all data without pagination (for dropdowns that need all data)
  async getAllProducts(useCache = true) {
    return this.fetchWithCache('allProducts', async () => {
      if (!window.api) {
        throw new Error('API not available')
      }
      return await window.api.getProducts()
    }, useCache)
  }

  async getAllClients(useCache = true) {
    return this.fetchWithCache('allClients', async () => {
      if (!window.api) {
        throw new Error('API not available')
      }
      return await window.api.getClients()
    }, useCache)
  }

  async getAllFieldOfficers(useCache = true) {
    return this.fetchWithCache('allFieldOfficers', async () => {
      if (!window.api) {
        throw new Error('API not available')
      }
      return await window.api.getFieldOfficers()
    }, useCache)
  }

  async getAllSalesmen(useCache = true) {
    return this.fetchWithCache('allSalesmen', async () => {
      if (!window.api) {
        throw new Error('API not available')
      }
      return await window.api.getSalesmen()
    }, useCache)
  }

  // Statistics methods for dashboard
  async getDashboardStats(useCache = true) {
    return this.fetchWithCache('dashboardStats', async () => {
      if (!window.api) {
        throw new Error('API not available')
      }

      const [products, clients, bills] = await Promise.all([
        window.api.getProducts(),
        window.api.getClients(),
        window.api.getBills()
      ])

      return {
        products: products.length,
        clients: clients.length,
        bills: bills.length,
        recentBills: bills.slice(0, 5)
      }
    }, useCache)
  }

  // Company info
  async getCompanyInfo(useCache = true) {
    return this.fetchWithCache('companyInfo', async () => {
      if (!window.api) {
        throw new Error('API not available')
      }
      return await window.api.getCompanyInfo()
    }, useCache)
  }

  // Register refresh callback for a data type
  registerRefreshCallback(type, callback) {
    if (!this.refreshCallbacks.has(type)) {
      this.refreshCallbacks.set(type, new Set())
    }
    this.refreshCallbacks.get(type).add(callback)
  }

  // Unregister refresh callback
  unregisterRefreshCallback(type, callback) {
    if (this.refreshCallbacks.has(type)) {
      this.refreshCallbacks.get(type).delete(callback)
    }
  }

  // Invalidate cache when data is modified
  invalidateCacheOnModification(type) {
    // Clear all caches related to the modified data type
    const keysToDelete = []
    for (const key of this.cache.keys()) {
      if (key.includes(type) ||
        key === 'dashboardStats' ||
        key === `all${type.charAt(0).toUpperCase() + type.slice(1)}`) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.clearCache(key))
    console.log(`Cache invalidated for ${type}:`, keysToDelete)

    // Trigger refresh callbacks
    if (this.refreshCallbacks.has(type)) {
      this.refreshCallbacks.get(type).forEach(callback => {
        try {
          callback()
        } catch (error) {
          console.error(`Error in refresh callback for ${type}:`, error)
        }
      })
    }
  }
}

// Create a singleton instance
const dataService = new DataService()

export default dataService
