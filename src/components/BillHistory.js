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

  const handleDeleteBill = (billId) => {
    // Trigger inline confirmation for this bill
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Bill History: ({filteredBills.length} shown of {total})</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className="block text-gray-700 text-sm font-bold mb-2">Search</label>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by party name or invoice no..."
              className="w-full p-2 border border-gray-300 rounded-md"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">From Date</label>
            <input
              type="date"
              name="from"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={dateFilter.from}
              onChange={handleDateFilterChange}
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">To Date</label>
            <input
              type="date"
              name="to"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={dateFilter.to}
              onChange={handleDateFilterChange}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
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
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading bills...</p>
          </div>
        )}

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
                Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredBills.length > 0 ? (
              filteredBills.map((bill) => (
                <tr key={bill._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {bill.billId ? bill.billId : bill._id.substring(0, 8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.clientName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.clientAddress}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {configService.formatDate(bill.billDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">PKR {Number(bill.totalAmount || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Link
                        to={`/bill/${bill._id}`}
                        className={`text-blue-600 hover:text-blue-900 ${deletingId ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={handleViewBill}
                      >
                        View
                      </Link>
                      {confirmDeleteId === bill._id ? (
                        <>
                          <button
                            onClick={() => performDeleteBill(bill._id)}
                            disabled={deletingId === bill._id}
                            className="bg-red-600 text-white px-2 py-1 rounded-md"
                          >
                            {deletingId === bill._id ? "Deleting..." : "Confirm Delete"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={!!deletingId}
                            className="border border-gray-300 px-2 py-1 rounded-md"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleDeleteBill(bill._id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={!!deletingId}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                  {searchTerm || dateFilter.from || dateFilter.to
                    ? "No bills found matching your search criteria."
                    : "No bills available."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {filteredBills.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
            <div className="text-lg font-bold">Grand Total: PKR {grandTotal.toFixed(2)}</div>
          </div>
        )}
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMore}
            disabled={billsLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md"
          >
            {billsLoading ? "Loading..." : "Load More Bills"}
          </button>
        </div>
      )}
    </div>
  )
}

export default BillHistory
