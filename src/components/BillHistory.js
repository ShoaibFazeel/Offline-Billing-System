"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import toast from "react-hot-toast"

function BillHistory() {
  const [bills, setBills] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" })

  useEffect(() => {
    fetchBills()
  }, [])

  const fetchBills = async () => {
    try {
      const data = await window.api.getBills()
      setBills(data)
    } catch (error) {
      console.error("Error fetching bills:", error)
      toast.error("Failed to load bills")
    }
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleDateFilterChange = (e) => {
    const { name, value } = e.target
    setDateFilter({ ...dateFilter, [name]: value })
  }

  const filteredBills = bills.filter((bill) => {
    // Filter by search term (client name or bill ID)
    const matchesSearch =
      bill.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bill.billId ? String(bill.billId).includes(searchTerm) : bill._id.toLowerCase().includes(searchTerm.toLowerCase()))

    // Filter by date range
    let matchesDateRange = true
    if (dateFilter.from) {
      matchesDateRange = matchesDateRange && new Date(bill.billDate) >= new Date(dateFilter.from)
    }
    if (dateFilter.to) {
      matchesDateRange = matchesDateRange && new Date(bill.billDate) <= new Date(dateFilter.to)
    }

    return matchesSearch && matchesDateRange
  })

  const calculateGrandTotal = () => {
    return filteredBills.reduce((total, bill) => total + bill.totalAmount, 0)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Bill History</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className="block text-gray-700 text-sm font-bold mb-2">Search</label>
            <input
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
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice No.
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Party Name
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
                <tr key={bill._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{bill.billId ? bill.billId : bill._id}
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
                      to={`/bill/${bill.billId ? bill.billId : bill._id}`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                      onClick={() => {
                        localStorage.setItem("billSourcePage", "bills")
                      }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
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
            <div className="text-lg font-bold">Grand Total: PKR {calculateGrandTotal().toFixed(2)}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BillHistory
