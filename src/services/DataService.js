// Data Service with caching and server-side pagination
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

  clearCache(key) {
    this.cache.delete(key)
    this.cacheTimestamps.delete(key)
  }

  clearAllCache() {
    this.cache.clear()
    this.cacheTimestamps.clear()
  }

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

  async getProducts(searchTerm = '', limit = this.BATCH_SIZE, offset = 0, useCache = true) {
    const cacheKey = `products_${searchTerm}_${limit}_${offset}`

    return this.fetchWithCache(cacheKey, async () => {
      if (!window.api) {
        throw new Error('API not available')
      }

      return window.api.getProducts({ search: searchTerm, limit, offset })
    }, useCache)
  }

  async getClients(searchTerm = '', limit = this.BATCH_SIZE, offset = 0, useCache = true) {
    const cacheKey = `clients_${searchTerm}_${limit}_${offset}`

    return this.fetchWithCache(cacheKey, async () => {
      if (!window.api) {
        throw new Error('API not available')
      }

      return window.api.getClients({ search: searchTerm, limit, offset })
    }, useCache)
  }

  async getBills(searchTerm = '', limit = this.BATCH_SIZE, offset = 0, useCache = true) {
    const cacheKey = `bills_${searchTerm}_${limit}_${offset}`

    return this.fetchWithCache(cacheKey, async () => {
      if (!window.api) {
        throw new Error('API not available')
      }

      return window.api.getBills({ search: searchTerm, limit, offset })
    }, useCache)
  }

  async getFieldOfficers(searchTerm = '', limit = this.BATCH_SIZE, offset = 0, useCache = true) {
    const cacheKey = `fieldOfficers_${searchTerm}_${limit}_${offset}`

    return this.fetchWithCache(cacheKey, async () => {
      if (!window.api) {
        throw new Error('API not available')
      }

      return window.api.getFieldOfficers({ search: searchTerm, limit, offset })
    }, useCache)
  }

  async getLowStockProducts(threshold = 50, limit = this.BATCH_SIZE, offset = 0, useCache = true) {
    const cacheKey = `lowStockProducts_${threshold}_${limit}_${offset}`

    return this.fetchWithCache(cacheKey, async () => {
      if (!window.api) {
        throw new Error('API not available')
      }

      return window.api.getLowStockProducts({ threshold, limit, offset })
    }, useCache)
  }

  async getSalesmen(searchTerm = '', limit = this.BATCH_SIZE, offset = 0, useCache = true) {
    const cacheKey = `salesmen_${searchTerm}_${limit}_${offset}`

    return this.fetchWithCache(cacheKey, async () => {
      if (!window.api) {
        throw new Error('API not available')
      }

      return window.api.getSalesmen({ search: searchTerm, limit, offset })
    }, useCache)
  }

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

  async getDashboardStats(useCache = true) {
    return this.fetchWithCache('dashboardStats', async () => {
      if (!window.api) {
        throw new Error('API not available')
      }

      return await window.api.getDashboardStats()
    }, useCache)
  }

  async getCompanyInfo(useCache = true) {
    return this.fetchWithCache('companyInfo', async () => {
      if (!window.api) {
        throw new Error('API not available')
      }
      return await window.api.getCompanyInfo()
    }, useCache)
  }

  registerRefreshCallback(type, callback) {
    if (!this.refreshCallbacks.has(type)) {
      this.refreshCallbacks.set(type, new Set())
    }
    this.refreshCallbacks.get(type).add(callback)
  }

  unregisterRefreshCallback(type, callback) {
    if (this.refreshCallbacks.has(type)) {
      this.refreshCallbacks.get(type).delete(callback)
    }
  }

  invalidateCacheOnModification(type) {
    const keysToDelete = []
    for (const key of this.cache.keys()) {
      if (key.includes(type) ||
        key === 'dashboardStats' ||
        key === `all${type.charAt(0).toUpperCase() + type.slice(1)}`) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.clearCache(key))

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

const dataService = new DataService()

export default dataService
