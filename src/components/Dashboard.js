"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useDashboardStats } from "../hooks/useLazyData"
import { useLazyData } from "../hooks/useLazyData"
import dataService from "../services/DataService"

function Dashboard() {
  // Use the dashboard stats hook
  const {
    stats,
    companyInfo,
    loading,
    error,
    refresh: refreshStats
  } = useDashboardStats()

  const [lowStockThreshold, setLowStockThreshold] = useState(50)

  // Use lazy loading specifically for low stock products
  const {
    data: lowStockProducts,
    loading: lowStockLoading,
    total: lowStockTotal,
    currentPage: lowStockPage,
    goToPage: goLowStockPage,
    hasMore: lowStockHasMore
  } = useLazyData('lowStockProducts', '', 10, { threshold: lowStockThreshold })

  // Register refresh callbacks for dashboard updates
  useEffect(() => {
    dataService.registerRefreshCallback('products', refreshStats)
    dataService.registerRefreshCallback('clients', refreshStats)
    dataService.registerRefreshCallback('bills', refreshStats)

    return () => {
      dataService.unregisterRefreshCallback('products', refreshStats)
      dataService.unregisterRefreshCallback('clients', refreshStats)
      dataService.unregisterRefreshCallback('bills', refreshStats)
    }
  }, [refreshStats])


  const handleThresholdChange = (e) => {
    const value = Number.parseInt(e.target.value)
    if (!isNaN(value) && value >= 0) {
      setLowStockThreshold(value)
    }
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error: {error}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-10">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* Company Information */}
      {companyInfo && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">{companyInfo.companyName}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">{companyInfo.companyAddress}</p>
            </div>
            <div>
              <div className="mb-2">
                <span className="font-medium">Owner:</span> {companyInfo.ownerName} ({companyInfo.ownerPhone})
              </div>
              <div>
                <span className="font-medium">General Manager:</span> {companyInfo.managerName} (
                {companyInfo.managerPhone})
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Products" value={stats.products} icon="box" linkTo="/inventory" />
        <StatCard title="Clients" value={stats.clients} icon="users" linkTo="/clients" />
        <StatCard title="Total Bills" value={stats.bills} icon="file-text" linkTo="/bills" />
      </div>

      {/* Low Stock Alert Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <h2 className="text-xl font-semibold">Low Stock Alert ({lowStockTotal})</h2>
          <div className="flex items-center mt-2 sm:mt-0">
            <label htmlFor="threshold" className="mr-2 text-sm font-medium">
              Threshold:
            </label>
            <input
              id="threshold"
              type="number"
              min="0"
              value={lowStockThreshold}
              onChange={handleThresholdChange}
              className="w-20 p-1 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {lowStockLoading ? (
          <div className="text-center py-4 text-gray-500">Loading low stock items...</div>
        ) : lowStockProducts.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lowStockProducts.map((product) => (
                    <tr key={product._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {product.productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.quantity === 0 ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Out of Stock
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Low Stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link to="/inventory" className="text-blue-600 hover:text-blue-900">
                          Update Stock
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => goLowStockPage(lowStockPage - 1)}
                  disabled={lowStockPage === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => goLowStockPage(lowStockPage + 1)}
                  disabled={!lowStockHasMore}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(lowStockPage - 1) * 10 + 1}</span> to <span className="font-medium">{Math.min(lowStockPage * 10, lowStockTotal)}</span> of{' '}
                    <span className="font-medium">{lowStockTotal}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => goLowStockPage(lowStockPage - 1)}
                      disabled={lowStockPage === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 010 1.06L8.832 10l3.958 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0">
                      Page {lowStockPage}
                    </span>
                    <button
                      onClick={() => goLowStockPage(lowStockPage + 1)}
                      disabled={!lowStockHasMore}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 010-1.06L11.168 10 7.21 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No products below the threshold of {lowStockThreshold} units.
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Bills</h2>
          <Link to="/bills" className="text-blue-600 hover:text-blue-800">
            View All
          </Link>
        </div>

        {stats.recentBills.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice No.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Party Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recentBills.map((bill) => (
                  <tr key={bill._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{bill._id.substring(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.clientName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(bill.billDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      PKR {bill.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/bill/${bill._id}`}
                        className="text-blue-600 hover:text-blue-900"
                        onClick={() => {
                          localStorage.setItem("billSourcePage", "dashboard")
                        }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No bills generated yet.</p>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, linkTo }) {
  return (
    <Link to={linkTo} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {icon === "box" && (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            )}
            {icon === "users" && (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            )}
            {icon === "file-text" && (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            )}
          </svg>
        </div>
        <div className="ml-5">
          <p className="text-gray-500">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </div>
    </Link>
  )
}

export default Dashboard
