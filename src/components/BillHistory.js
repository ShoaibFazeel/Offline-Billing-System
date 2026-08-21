"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Link } from "react-router-dom"
import toast from "react-hot-toast"
import configService from "../services/ConfigService"
import { useLazyData } from "../hooks/useLazyData"
import dataService from "../services/DataService"
import storageService from "../services/StorageService"

function BillHistory() {
  const {
    data: bills,
    loading: billsLoading,
    error: billsError,
    search: searchBills,
    refresh: refreshBills,
    loadMore,
    hasMore,
    total,
  } = useLazyData("bills", "", 50)

  const [searchTerm, setSearchTerm] = useState(() => storageService.getLocalItem("billHistorySearchTerm") || "")
  const [dateFilter, setDateFilter] = useState(() => ({
    from: storageService.getLocalItem("billHistoryDateFrom") || "",
    to: storageService.getLocalItem("billHistoryDateTo") || "",
  }))
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const searchInputRef = useRef(null)
  const normalizedSearchTerm = searchTerm.trim().toLowerCase()

  useEffect(() => {
    searchBills(searchTerm)
  }, [searchTerm, searchBills])

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])

  const handleSearch = (e) => {
    const value = e.target.value
    setSearchTerm(value)
    storageService.setLocalItem("billHistorySearchTerm", value)
  }

  const handleDateFilterChange = (e) => {
    const { name, value } = e.target
    setDateFilter((prev) => {
      const nextFilter = { ...prev, [name]: value }
      storageService.setLocalItem(`billHistoryDate${name.charAt(0).toUpperCase() + name.slice(1)}`, value)
      return nextFilter
    })
  }

  const resetFilters = () => {
    setSearchTerm("")
    setDateFilter({ from: "", to: "" })
    storageService.setLocalItem("billHistorySearchTerm", "")
    storageService.setLocalItem("billHistoryDateFrom", "")
    storageService.setLocalItem("billHistoryDateTo", "")
  }

  const handleDeleteBill = (billId) => {
    setConfirmDeleteId(billId)
  }

  const performDeleteBill = async (billId) => {
    setDeletingId(billId)
    try {
      await window.api.deleteBill(billId)
      toast.success("Bill deleted successfully")
      dataService.invalidateCacheOnModification("bills")
      await refreshBills()
    } catch (error) {
      console.error("Error deleting bill:", error)
      toast.error("Failed to delete bill")
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const handleViewBill = () => {
    storageService.setLocalItem("billSourcePage", "bills")
    storageService.setLocalItem("billHistorySearchTerm", searchTerm)
    storageService.setLocalItem("billHistoryDateFrom", dateFilter.from)
    storageService.setLocalItem("billHistoryDateTo", dateFilter.to)
  }

  const filteredBills = useMemo(() => {
    const matched = bills.filter((bill) => {
      const clientName = bill.clientName || ""
      const billId = bill.billId ? String(bill.billId) : bill._id || ""
      const matchesSearch =
        clientName.toLowerCase().includes(normalizedSearchTerm) ||
        billId.toLowerCase().includes(normalizedSearchTerm)

      const billDateStr = bill.billDate ? configService.formatIsoDate(bill.billDate) : ""
      let matchesDateRange = true
      if (dateFilter.from) {
        matchesDateRange = matchesDateRange && billDateStr >= dateFilter.from
      }
      if (dateFilter.to) {
        matchesDateRange = matchesDateRange && billDateStr <= dateFilter.to
      }

      return matchesSearch && matchesDateRange
    })

    return matched.sort((a, b) => {
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
  }, [bills, normalizedSearchTerm, dateFilter])

  const grandTotal = useMemo(
    () => filteredBills.reduce((total, bill) => total + Number(bill.totalAmount || 0), 0),
    [filteredBills],
  )

  return (
    <div className="max-w-7xl mx-auto pb-12 px-2 sm:px-4">
      {/* Top Header Banner Card */}
      <div className="mb-6 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl shadow-xl p-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
            <svg className="w-7 h-7 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Bill History & Invoices</h1>
            <p className="text-blue-200 text-sm mt-0.5">View, filter, edit, or delete existing customer invoices</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15">
          <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="text-xs uppercase tracking-wider text-blue-200 font-semibold block">Total Revenue</span>
            <span className="text-xl font-bold tracking-tight text-white">
              PKR {grandTotal.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Options Card */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter Invoices
          </h2>
          {(searchTerm || dateFilter.from || dateFilter.to) && (
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5">
              Search Invoice / Party Name
            </label>
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Type party name or invoice number..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-all"
                value={searchTerm}
                onChange={handleSearch}
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div>
            <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5">From Date</label>
            <input
              type="date"
              name="from"
              className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-all"
              value={dateFilter.from}
              onChange={handleDateFilterChange}
            />
          </div>
          <div>
            <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5">To Date</label>
            <input
              type="date"
              name="to"
              className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-all"
              value={dateFilter.to}
              onChange={handleDateFilterChange}
            />
          </div>
        </div>
      </div>

      {/* Bill History Table */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-800 text-sm">Invoice Records</h3>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
              {filteredBills.length} shown of {total}
            </span>
          </div>
        </div>

        {billsError && (
          <div className="border-b border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center justify-between gap-3">
              <span>{billsError}</span>
              <button
                onClick={() => refreshBills()}
                className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {billsLoading && bills.length === 0 && (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm font-medium text-gray-600">Loading bills...</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice No.</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Party Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total Amount</th>
                <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBills.length > 0 ? (
                filteredBills.map((bill) => (
                  <tr key={bill._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700">
                      <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                        #{bill.billId ? bill.billId : bill._id.substring(0, 8)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{bill.clientName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.clientAddress || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                      {configService.formatDate(bill.billDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-gray-900">
                      PKR {Number(bill.totalAmount || 0).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <div className="flex justify-end items-center gap-2">
                        <Link
                          to={`/bill/${bill._id}`}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors ${
                            deletingId ? "opacity-50 pointer-events-none" : ""
                          }`}
                          onClick={handleViewBill}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View / Edit
                        </Link>

                        {confirmDeleteId === bill._id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => performDeleteBill(bill._id)}
                              disabled={deletingId === bill._id}
                              className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-xl text-xs font-bold shadow-sm transition-all"
                            >
                              {deletingId === bill._id ? "Deleting..." : "Confirm"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={!!deletingId}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-xl text-xs font-bold transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDeleteBill(bill._id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors"
                            disabled={!!deletingId}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-sm text-gray-500">
                    <div className="w-12 h-12 bg-slate-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    {searchTerm || dateFilter.from || dateFilter.to
                      ? "No bills found matching your search filters."
                      : "No bills available in the history."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredBills.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-slate-50 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filtered Items Total</span>
            <div className="text-xl font-black text-gray-900">
              PKR {grandTotal.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        )}
      </div>

      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={billsLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            {billsLoading ? "Loading..." : "Load More Bills"}
          </button>
        </div>
      )}
    </div>
  )
}

export default BillHistory
