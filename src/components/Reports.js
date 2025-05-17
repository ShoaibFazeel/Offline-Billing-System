"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import GeneratePdfButton from "./GeneratePdfButton"
import SearchBar from "./SearchBar"

function Reports() {
  const [bills, setBills] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [addressFilter, setAddressFilter] = useState("")
  const [addresses, setAddresses] = useState([])
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" })
  const [groupBy, setGroupBy] = useState("address") // 'address', 'client', 'date'
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch bills and clients in parallel
      let billsData, clientsData

      if (window.api) {
        ;[billsData, clientsData] = await Promise.all([window.api.getBills(), window.api.getClients()])
      } else {
        // Mock data for testing
        console.warn("API not available, using mock data")
        billsData = [
          {
            _id: "bill1",
            billNumber: "B001",
            billDate: new Date().toISOString(),
            clientId: "client1",
            clientName: "ABC Corporation",
            totalAmount: 5000,
            items: [],
          },
          {
            _id: "bill2",
            billNumber: "B002",
            billDate: new Date().toISOString(),
            clientId: "client2",
            clientName: "XYZ Ltd",
            totalAmount: 7500,
            items: [],
          },
          {
            _id: "bill3",
            billNumber: "B003",
            billDate: new Date().toISOString(),
            clientId: "client1", // Same client as bill1
            clientName: "ABC Corporation",
            totalAmount: 3200,
            items: [],
          },
        ]

        clientsData = [
          { _id: "client1", clientName: "ABC Corporation", clientAddress: "Lahore" },
          { _id: "client2", clientName: "XYZ Ltd", clientAddress: "Karachi" },
          { _id: "client3", clientName: "123 Industries", clientAddress: "Lahore" },
        ]
      }

      setBills(billsData)
      setClients(clientsData)

      // Extract unique addresses from clients
      const uniqueAddresses = [...new Set(clientsData.map((client) => client.clientAddress))]
        .filter(Boolean) // Remove empty addresses
        .sort()

      // Convert addresses to objects for SearchBar component
      const addressObjects = uniqueAddresses.map((address) => ({
        _id: address,
        clientAddress: address,
      }))

      setAddresses(addressObjects)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Failed to load report data. Please try again later.")
      toast.error("Failed to load report data")
      setLoading(false)
    }
  }

  const handleDateFilterChange = (e) => {
    const { name, value } = e.target
    setDateFilter({ ...dateFilter, [name]: value })
  }

  const handleSearch = (term) => {
    setSearchTerm(term)
  }

  const handleAddressSelect = (address) => {
    setAddressFilter(address.clientAddress)
  }

  // Get client by ID
  const getClient = (clientId) => {
    return clients.find((c) => c._id === clientId) || null
  }

  // Get client address by client ID
  const getClientAddress = (clientId) => {
    const client = getClient(clientId)
    return client ? client.clientAddress : "Unknown"
  }

  // Get client name by client ID
  const getClientName = (clientId) => {
    const client = getClient(clientId)
    return client ? client.clientName : "Unknown Client"
  }

  // Filter bills based on client address, date range, and search term
  const filteredBills = bills.filter((bill) => {
    if (!bill || !bill.clientId) return false

    // Get client address
    const clientAddress = getClientAddress(bill.clientId) || ""
    const clientName = bill.clientName || getClientName(bill.clientId) || ""
    const billId = bill._id || ""

    // Filter by address
    const matchesAddress = !addressFilter || clientAddress.toLowerCase().includes(addressFilter.toLowerCase())

    // Filter by date range
    let matchesDateRange = true
    if (dateFilter.from && bill.billDate) {
      matchesDateRange = matchesDateRange && new Date(bill.billDate) >= new Date(dateFilter.from)
    }
    if (dateFilter.to && bill.billDate) {
      matchesDateRange = matchesDateRange && new Date(bill.billDate) <= new Date(dateFilter.to)
    }

    // Filter by search term (client name or bill ID)
    const matchesSearch =
      !searchTerm ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      billId.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesAddress && matchesDateRange && matchesSearch
  })

  // Group bills by selected criteria
  const groupedBills = () => {
    if (groupBy === "address") {
      // Group by client address
      const groups = {}

      filteredBills.forEach((bill) => {
        const address = getClientAddress(bill.clientId)
        if (!groups[address]) {
          groups[address] = []
        }
        groups[address].push(bill)
      })

      // Convert to array and sort by address
      return Object.entries(groups)
        .sort(([addressA], [addressB]) => addressA.localeCompare(addressB))
        .map(([address, bills]) => ({
          groupName: address,
          bills,
          totalAmount: bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0),
        }))
    } else if (groupBy === "client") {
      // Group by client name
      const groups = {}

      filteredBills.forEach((bill) => {
        const clientName = bill.clientName || getClientName(bill.clientId)

        if (!groups[clientName]) {
          groups[clientName] = []
        }
        groups[clientName].push(bill)
      })

      // Convert to array and sort by client name
      return Object.entries(groups)
        .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
        .map(([clientName, bills]) => ({
          groupName: clientName,
          bills,
          totalAmount: bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0),
        }))
    } else if (groupBy === "date") {
      // Group by month/year
      const groups = {}

      filteredBills.forEach((bill) => {
        if (!bill.billDate) return

        const date = new Date(bill.billDate)
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

        if (!groups[monthYear]) {
          groups[monthYear] = []
        }
        groups[monthYear].push(bill)
      })

      // Convert to array and sort by date (newest first)
      return Object.entries(groups)
        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
        .map(([monthYear, bills]) => {
          const [year, month] = monthYear.split("-")
          const monthNames = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
          ]

          return {
            groupName: `${monthNames[Number.parseInt(month) - 1]} ${year}`,
            bills,
            totalAmount: bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0),
          }
        })
    }

    return []
  }

  const calculateGrandTotal = () => {
    return filteredBills.reduce((total, bill) => total + (bill.totalAmount || 0), 0)
  }

  // Generate a report PDF for the filtered data
  const generateReportPdf = async () => {
    try {
      toast.success("Report generation started")

      // Get company info
      const companyInfo = await window.api.getCompanyInfo()

      // Create a new PDF document with A5 size
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib")
      const pdfDoc = await PDFDocument.create()

      // A5 size in points (148 × 210 mm)
      const pageWidth = 420 // 148mm in points
      const pageHeight = 595 // 210mm in points

      // Add a page with A5 size
      let page = pdfDoc.addPage([pageWidth, pageHeight])

      // Get fonts
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

      // Set margins
      const margin = 30

      // Current Y position (start from top)
      let yPos = pageHeight - margin

      // Draw company header
      const centerX = pageWidth / 2

      // Company name
      page.drawText(companyInfo.companyName.toUpperCase(), {
        x: centerX - helveticaBold.widthOfTextAtSize(companyInfo.companyName.toUpperCase(), 14) / 2,
        y: yPos,
        size: 14,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      })

      yPos -= 20

      // Report title
      const reportTitle = `${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)} Report`
      page.drawText(reportTitle, {
        x: centerX - helveticaBold.widthOfTextAtSize(reportTitle, 12) / 2,
        y: yPos,
        size: 12,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      })

      yPos -= 15

      // Date range if specified
      if (dateFilter.from || dateFilter.to) {
        const dateRangeText = `Date Range: ${dateFilter.from || "All"} to ${dateFilter.to || "Present"}`
        page.drawText(dateRangeText, {
          x: centerX - helveticaFont.widthOfTextAtSize(dateRangeText, 10) / 2,
          y: yPos,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        })
        yPos -= 15
      }

      // Address filter if specified
      if (addressFilter) {
        const addressFilterText = `Address Filter: ${addressFilter}`
        page.drawText(addressFilterText, {
          x: centerX - helveticaFont.widthOfTextAtSize(addressFilterText, 10) / 2,
          y: yPos,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        })
        yPos -= 15
      }

      // Draw a line under the header
      page.drawLine({
        start: { x: margin, y: yPos },
        end: { x: pageWidth - margin, y: yPos },
        thickness: 1,
        color: rgb(0.5, 0.5, 0.5),
      })

      yPos -= 20

      // Get grouped data
      const groups = groupedBills()

      // Draw each group
      for (const group of groups) {
        // Check if we need a new page
        if (yPos < 100) {
          // Add a new page
          page = pdfDoc.addPage([pageWidth, pageHeight])
          yPos = pageHeight - margin
        }

        // Draw group header
        page.drawText(group.groupName, {
          x: margin,
          y: yPos,
          size: 12,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        })

        yPos -= 15

        // Draw group total
        const totalText = `Total: PKR ${group.totalAmount.toFixed(2)}`
        page.drawText(totalText, {
          x: pageWidth - margin - helveticaBold.widthOfTextAtSize(totalText, 10),
          y: yPos,
          size: 10,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        })

        yPos -= 15

        // Draw table header
        const colWidths = {
          id: 60,
          client: 120,
          date: 80,
          amount: 80,
        }

        const startX = margin

        // Draw header background
        page.drawRectangle({
          x: startX,
          y: yPos - 15,
          width: pageWidth - 2 * margin,
          height: 15,
          color: rgb(0.95, 0.95, 0.95),
        })

        // Draw header text
        page.drawText("Bill ID", {
          x: startX + 5,
          y: yPos - 10,
          size: 8,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        })

        page.drawText("Client", {
          x: startX + colWidths.id + 5,
          y: yPos - 10,
          size: 8,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        })

        page.drawText("Date", {
          x: startX + colWidths.id + colWidths.client + 5,
          y: yPos - 10,
          size: 8,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        })

        page.drawText("Amount", {
          x: startX + colWidths.id + colWidths.client + colWidths.date + 5,
          y: yPos - 10,
          size: 8,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        })

        yPos -= 15

        // Draw bills for this group
        for (const bill of group.bills) {
          // Check if we need a new page
          if (yPos < 50) {
            // Add a new page
            page = pdfDoc.addPage([pageWidth, pageHeight])
            yPos = pageHeight - margin

            // Redraw table header on new page
            page.drawRectangle({
              x: startX,
              y: yPos - 15,
              width: pageWidth - 2 * margin,
              height: 15,
              color: rgb(0.95, 0.95, 0.95),
            })

            page.drawText("Bill ID", {
              x: startX + 5,
              y: yPos - 10,
              size: 8,
              font: helveticaBold,
              color: rgb(0, 0, 0),
            })

            page.drawText("Client", {
              x: startX + colWidths.id + 5,
              y: yPos - 10,
              size: 8,
              font: helveticaBold,
              color: rgb(0, 0, 0),
            })

            page.drawText("Date", {
              x: startX + colWidths.id + colWidths.client + 5,
              y: yPos - 10,
              size: 8,
              font: helveticaBold,
              color: rgb(0, 0, 0),
            })

            page.drawText("Amount", {
              x: startX + colWidths.id + colWidths.client + colWidths.date + 5,
              y: yPos - 10,
              size: 8,
              font: helveticaBold,
              color: rgb(0, 0, 0),
            })

            yPos -= 15
          }

          // Draw bill row
          const billId = bill._id ? `#${bill._id.substring(0, 8)}` : "N/A"
          const clientName = bill.clientName || getClientName(bill.clientId)
          const billDate = bill.billDate ? new Date(bill.billDate).toLocaleDateString() : "N/A"
          const amount = `PKR ${bill.totalAmount ? bill.totalAmount.toFixed(2) : "0.00"}`

          page.drawText(billId, {
            x: startX + 5,
            y: yPos - 10,
            size: 8,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          })

          page.drawText(clientName.length > 20 ? clientName.substring(0, 20) + "..." : clientName, {
            x: startX + colWidths.id + 5,
            y: yPos - 10,
            size: 8,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          })

          page.drawText(billDate, {
            x: startX + colWidths.id + colWidths.client + 5,
            y: yPos - 10,
            size: 8,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          })

          page.drawText(amount, {
            x: startX + colWidths.id + colWidths.client + colWidths.date + 5,
            y: yPos - 10,
            size: 8,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          })

          yPos -= 15
        }

        // Add space after each group
        yPos -= 10

        // Draw a line after each group
        page.drawLine({
          start: { x: margin, y: yPos },
          end: { x: pageWidth - margin, y: yPos },
          thickness: 0.5,
          color: rgb(0.7, 0.7, 0.7),
        })

        yPos -= 15
      }

      // Add grand total at the end
      const grandTotalText = `Grand Total: PKR ${calculateGrandTotal().toFixed(2)}`
      page.drawText(grandTotalText, {
        x: pageWidth - margin - helveticaBold.widthOfTextAtSize(grandTotalText, 12),
        y: yPos,
        size: 12,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      })

      // Save the PDF
      const pdfBytes = await pdfDoc.save()

      // Create a blob and download
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `${groupBy}_report_${new Date().toISOString().split("T")[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)

      toast.success("Report generated successfully")
    } catch (error) {
      console.error("Error generating report:", error)
      toast.error("Failed to generate report")
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-500 mb-4">{error}</div>
        <button onClick={fetchData} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Reports</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Address Filter</label>
            <SearchBar
              placeholder="Filter by address..."
              items={addresses}
              displayProperty="clientAddress"
              onSelect={handleAddressSelect}
              initialValue={addressFilter}
              searchTerm={addressFilter}
              setSearchTerm={setAddressFilter}
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

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Group By</label>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="groupBy"
                value="address"
                checked={groupBy === "address"}
                onChange={() => setGroupBy("address")}
              />
              <span className="ml-2">Address</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="groupBy"
                value="client"
                checked={groupBy === "client"}
                onChange={() => setGroupBy("client")}
              />
              <span className="ml-2">Client</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="groupBy"
                value="date"
                checked={groupBy === "date"}
                onChange={() => setGroupBy("date")}
              />
              <span className="ml-2">Date (Month/Year)</span>
            </label>
          </div>
        </div>

        <div className="flex justify-between">
          <button onClick={fetchData} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md">
            Refresh Data
          </button>
          <button
            onClick={generateReportPdf}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md"
          >
            Generate Report PDF
          </button>
        </div>
      </div>

      {groupedBills().length > 0 ? (
        <div>
          {groupedBills().map((group, groupIndex) => (
            <div key={groupIndex} className="mb-8">
              <h2 className="text-xl font-semibold mb-4 bg-gray-100 p-3 rounded-md flex justify-between">
                <span>{group.groupName}</span>
                <span>Total: PKR {group.totalAmount.toFixed(2)}</span>
              </h2>

              <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bill ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
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
                    {group.bills.map((bill) => (
                      <tr key={bill._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{bill._id ? bill._id.substring(0, 8) : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bill.clientName || getClientName(bill.clientId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bill.billDate ? new Date(bill.billDate).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          PKR {bill.totalAmount ? bill.totalAmount.toFixed(2) : "0.00"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <a
                            href={`#/bill/${bill._id}`}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                            onClick={() => {
                              localStorage.setItem("billSourcePage", "reports")
                            }}
                          >
                            View
                          </a>
                          <GeneratePdfButton bill={bill} className="text-purple-600 hover:text-purple-900" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div className="bg-white rounded-lg shadow p-4 mt-4">
            <div className="text-xl font-bold text-right">Grand Total: PKR {calculateGrandTotal().toFixed(2)}</div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          {addressFilter || dateFilter.from || dateFilter.to || searchTerm
            ? "No bills found matching your search criteria."
            : "No bills available."}
        </div>
      )}
    </div>
  )
}

export default Reports
