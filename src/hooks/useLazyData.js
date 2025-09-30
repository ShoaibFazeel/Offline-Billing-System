import { useState, useEffect, useCallback, useRef } from 'react'
import dataService from '../services/DataService'

// Custom hook for lazy loading data with search and pagination
export const useLazyData = (dataType, initialSearchTerm = '', initialLimit = 50) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)
  const [limit] = useState(initialLimit)
  const [offset, setOffset] = useState(0)
  
  const abortControllerRef = useRef(null)

  // Fetch data function - using useRef to avoid dependency issues
  const fetchDataRef = useRef(null)
  
  fetchDataRef.current = async (search, resetOffset = true, currentOffset = 0) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    abortControllerRef.current = new AbortController()
    
    setLoading(true)
    setError(null)
    
    try {
      const fetchOffset = resetOffset ? 0 : currentOffset
      
      let result
      switch (dataType) {
        case 'products':
          result = await dataService.getProducts(search, limit, fetchOffset)
          break
        case 'clients':
          result = await dataService.getClients(search, limit, fetchOffset)
          break
        case 'bills':
          result = await dataService.getBills(search, limit, fetchOffset)
          break
        case 'fieldOfficers':
          result = await dataService.getFieldOfficers(search, limit, fetchOffset)
          break
        case 'salesmen':
          result = await dataService.getSalesmen(search, limit, fetchOffset)
          break
        default:
          throw new Error(`Unknown data type: ${dataType}`)
      }

      if (!abortControllerRef.current.signal.aborted) {
        if (resetOffset) {
          setData(result.data)
          setOffset(limit)
        } else {
          setData(prev => [...prev, ...result.data])
          setOffset(prev => prev + limit)
        }
        setHasMore(result.hasMore)
        setTotal(result.total)
      }
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        setError(err.message)
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setLoading(false)
      }
    }
  }

  // Load more data
  const loadMore = useCallback(() => {
    console.log(`LoadMore called: loading=${loading}, hasMore=${hasMore}, offset=${offset}`)
    if (!loading && hasMore && fetchDataRef.current) {
      fetchDataRef.current(searchTerm, false, offset)
    }
  }, [loading, hasMore, searchTerm, offset])

  // Search function
  const search = useCallback((term) => {
    setSearchTerm(term)
    if (fetchDataRef.current) {
      fetchDataRef.current(term, true, 0)
    }
  }, [])

  // Refresh data
  const refresh = useCallback(() => {
    if (fetchDataRef.current) {
      fetchDataRef.current(searchTerm, true, 0)
    }
  }, [searchTerm])

  // Initial load
  useEffect(() => {
    if (fetchDataRef.current) {
      fetchDataRef.current(searchTerm, true, 0)
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [dataType, limit, searchTerm])

  return {
    data,
    loading,
    error,
    hasMore,
    total,
    searchTerm,
    search,
    loadMore,
    refresh,
    setData // Allow manual data updates
  }
}

// Custom hook for dropdown data (all items without pagination)
export const useDropdownData = (dataType) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      let result
      switch (dataType) {
        case 'products':
          result = await dataService.getAllProducts()
          break
        case 'clients':
          result = await dataService.getAllClients()
          break
        case 'fieldOfficers':
          result = await dataService.getAllFieldOfficers()
          break
        case 'salesmen':
          result = await dataService.getAllSalesmen()
          break
        default:
          throw new Error(`Unknown data type: ${dataType}`)
      }
      
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [dataType])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refresh,
    setData
  }
}

// Custom hook for dashboard stats
export const useDashboardStats = () => {
  const [stats, setStats] = useState({
    products: 0,
    clients: 0,
    bills: 0,
    recentBills: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [companyInfo, setCompanyInfo] = useState(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [statsData, companyData] = await Promise.all([
        dataService.getDashboardStats(),
        dataService.getCompanyInfo()
      ])
      
      setStats(statsData)
      setCompanyInfo(companyData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const refresh = useCallback(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    companyInfo,
    loading,
    error,
    refresh
  }
}
