"use client"

import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { useDashboardStats } from "../hooks/useLazyData"
import { useLazyData } from "../hooks/useLazyData"
import dataService from "../services/DataService"
import configService from "../services/ConfigService"
import storageService from "../services/StorageService"

function Dashboard() {
  const {
    stats,
    companyInfo,
    loading,
    error,
    refresh: refreshStats
  } = useDashboardStats()

  const [lowStockThreshold, setLowStockThreshold] = useState(50)

  const {
    data: lowStockProducts,
    loading: lowStockLoading,
    total: lowStockTotal,
    currentPage: lowStockPage,
    goToPage: goLowStockPage,
    hasMore: lowStockHasMore
  } = useLazyData('lowStockProducts', '', 10, { threshold: lowStockThreshold })

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

  const recentBills = useMemo(() => {
    if (!stats?.recentBills?.length) return []

    return [...stats.recentBills].sort((a, b) => {
      const aInvoice = a.billId ? String(a.billId) : a._id || ""
      const bInvoice = b.billId ? String(b.billId) : b._id || ""

      if (!aInvoice && !bInvoice) return 0
      if (!aInvoice) return 1
      if (!bInvoice) return -1

      if (!isNaN(aInvoice) && !isNaN(bInvoice)) {
        return Number(bInvoice) - Number(aInvoice)
      }

      return bInvoice.localeCompare(aInvoice, undefined, { numeric: true, sensitivity: "base" })
    })
  }, [stats?.recentBills])

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4 text-center">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl shadow-sm">
          <h2 className="text-xl font-bold mb-2">Error Loading Dashboard</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-3 text-sm font-semibold text-gray-600">Loading Dashboard Metrics...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 px-2 sm:px-4">
      {/* Company Info Top Header Card */}
      <div className="mb-6 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl shadow-xl p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 shadow-inner">
            <svg className="w-8 h-8 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {companyInfo?.companyName || "Billing & Management System"}
            </h1>
            <p className="text-blue-200 text-sm mt-0.5 font-medium flex items-center gap-2">
              <span>📍 {companyInfo?.companyAddress || "Business Dashboard Overview"}</span>
            </p>
          </div>
        </div>

        {companyInfo && (
          <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 text-xs text-blue-100">
            <div className="pr-3 border-r border-white/20">
              <span className="text-blue-300 font-semibold block uppercase tracking-wider text-[10px]">Owner</span>
              <strong className="text-white font-bold">{companyInfo.ownerName}</strong>
              <span className="block text-[11px] text-blue-200">📞 {companyInfo.ownerPhone}</span>
            </div>
            <div className="pl-1">
              <span className="text-blue-300 font-semibold block uppercase tracking-wider text-[10px]">General Manager</span>
              <strong className="text-white font-bold">{companyInfo.managerName}</strong>
              <span className="block text-[11px] text-blue-200">📞 {companyInfo.managerPhone}</span>
            </div>
          </div>
        )}
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Products"
          value={stats.products}
          icon="box"
          linkTo="/inventory"
          gradient="from-blue-600 to-indigo-600"
          subtitle="Inventory Catalog"
        />
        <StatCard
          title="Registered Clients"
          value={stats.clients}
          icon="users"
          linkTo="/clients"
          gradient="from-indigo-600 to-purple-600"
          subtitle="Active Parties"
        />
        <StatCard
          title="Total Generated Bills"
          value={stats.bills}
          icon="file-text"
          linkTo="/bills"
          gradient="from-emerald-600 to-teal-600"
          subtitle="Sales Invoices"
        />
      </div>

      {/* Low Stock Alert Section */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-xl border border-amber-200">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">Low Stock Alert</h2>
              <p className="text-xs text-gray-500 font-medium">Products requiring reorder attention</p>
            </div>
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-black text-xs rounded-full border border-amber-200">
              {lowStockTotal} items
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-gray-200">
            <label htmlFor="threshold" className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              Alert Threshold:
            </label>
            <input
              id="threshold"
              type="number"
              min="0"
              value={lowStockThreshold}
              onChange={handleThresholdChange}
              className="w-16 p-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {lowStockLoading ? (
          <div className="text-center py-8 text-xs font-semibold text-gray-500">
            Loading low stock products...
          </div>
        ) : lowStockProducts.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Current Stock</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lowStockProducts.map((product) => (
                    <tr key={product._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {product.productName}
                        {(product.companyName || product.containerSize) && (
                          <div className="text-xs text-gray-500 font-normal mt-0.5">
                            {product.companyName && <span>🏢 {product.companyName}</span>}
                            {product.companyName && product.containerSize && <span> • </span>}
                            {product.containerSize && <span>📦 {product.containerSize}</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-extrabold text-gray-800">
                        {product.quantity} units
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm">
                        {product.quantity === 0 ? (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-200">
                            Out of Stock
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            Low Stock
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-right">
                        <Link
                          to="/inventory"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
                        >
                          Update Stock
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-4 text-xs font-medium text-gray-600">
              <div>
                Showing <strong>{(lowStockPage - 1) * 10 + 1}</strong> to <strong>{Math.min(lowStockPage * 10, lowStockTotal)}</strong> of <strong>{lowStockTotal}</strong> items
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goLowStockPage(lowStockPage - 1)}
                  disabled={lowStockPage === 1}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg font-bold text-gray-700 transition-colors"
                >
                  Previous
                </button>
                <span className="px-2 font-bold text-gray-900">Page {lowStockPage}</span>
                <button
                  onClick={() => goLowStockPage(lowStockPage + 1)}
                  disabled={!lowStockHasMore}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg font-bold text-gray-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-gray-200 text-xs text-gray-500">
            ✅ All products are adequately stocked above the threshold of {lowStockThreshold} units.
          </div>
        )}
      </div>

      {/* Recent Bills Section */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl border border-blue-200">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">Recent Invoices</h2>
              <p className="text-xs text-gray-500 font-medium">Latest billing transactions generated</p>
            </div>
          </div>
          <Link
            to="/bills"
            className="inline-flex items-center gap-1 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
          >
            View All History →
          </Link>
        </div>

        {recentBills.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice No.</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Party Name</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total Amount</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentBills.map((bill) => (
                  <tr key={bill._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-bold text-blue-700">
                      <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                        #{bill.billId ? bill.billId : bill._id.substring(0, 8)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-bold text-gray-900">{bill.clientName}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 font-medium">
                      {configService.formatDate(bill.billDate)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-extrabold text-gray-900">
                      PKR {Number(bill.totalAmount || 0).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-right">
                      <Link
                        to={`/bill/${bill._id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
                        onClick={() => {
                          storageService.setLocalItem("billSourcePage", "dashboard")
                        }}
                      >
                        View Invoice
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-gray-200 text-xs text-gray-500">
            No bills generated yet. Create your first invoice from the "New Bill" menu!
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, linkTo, gradient, subtitle }) {
  return (
    <Link
      to={linkTo}
      className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 block relative overflow-hidden group`}
    >
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-white/5 transform skew-x-12 group-hover:translate-x-2 transition-transform"></div>
      <div className="flex items-center justify-between relative z-10">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-white/80 block">{subtitle}</span>
          <h3 className="text-lg font-bold mt-0.5">{title}</h3>
          <p className="text-3xl sm:text-4xl font-black tracking-tight mt-2">{value}</p>
        </div>
        <div className="p-3.5 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {icon === "box" && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            )}
            {icon === "users" && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            )}
            {icon === "file-text" && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            )}
          </svg>
        </div>
      </div>
    </Link>
  )
}

export default Dashboard
