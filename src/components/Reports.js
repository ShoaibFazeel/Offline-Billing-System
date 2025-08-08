"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import GeneratePdfButton from "./GeneratePdfButton"
import SearchBar from "./SearchBar"

function Reports() {
  const [bills, setBills] = useState([])
  const [clients, setClients] = useState([])
  const [products, setProducts] = useState([])
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
      // Fetch bills, clients, and products in parallel
      let billsData, clientsData, productsData

      if (window.api) {
        ;[billsData, clientsData, productsData] = await Promise.all([
          window.api.getBills(),
          window.api.getClients(),
          window.api.getProducts(),
        ])
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

        productsData = [
          { _id: "product1", productName: "Product 1", productPrice: 100, purchasePrice: 80 },
          { _id: "product2", productName: "Product 2", productPrice: 150, purchasePrice: 120 },
        ]
      }

      setBills(billsData)
      setClients(clientsData)
      setProducts(productsData)

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

  // Calculate profit for a single item
  const calculateItemProfit = (item) => {
    const product = products.find(p => p._id === item.productId)
    if (!product || !product.purchasePrice) return 0

    const purchasePrice = product.purchasePrice
    const salePrice = item.rate || product.productPrice
    const quantity = item.quantity || 0
    const discount = item.discount || 0
    const extraDiscount = item.extraDiscount || 0

    // Calculate final sale price after discounts
    const afterDiscount = salePrice * (1 - discount / 100)
    const finalSalePrice = afterDiscount * (1 - extraDiscount / 100)

    // Calculate profit per unit
    const profitPerUnit = finalSalePrice - purchasePrice

    // Return total profit for this item
    return profitPerUnit * quantity
  }

  // Calculate total profit for a bill
  const calculateBillProfit = (bill) => {
    if (!bill.items || !Array.isArray(bill.items)) return 0

    return bill.items.reduce((totalProfit, item) => {
      if (!item.isBonus) { // Only calculate profit for non-bonus items
        return totalProfit + calculateItemProfit(item)
      }
      return totalProfit
    }, 0)
  }

  // Calculate total profit for all filtered bills
  const calculateTotalProfit = () => {
    return filteredBills.reduce((totalProfit, bill) => {
      return totalProfit + calculateBillProfit(bill)
    }, 0)
  }

  // Filter bills based on client address, date range, and search term
  const filteredBills = bills.filter((bill) => {
    if (!bill || !bill.clientId) return false

    // Get client address
    const clientAddress = getClientAddress(bill.clientId) || ""
    const clientName = bill.clientName || getClientName(bill.clientId) || ""
    const billId = bill.billId ? String(bill.billId) : (bill._id || "")

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
          totalProfit: bills.reduce((sum, bill) => sum + calculateBillProfit(bill), 0),
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
          totalProfit: bills.reduce((sum, bill) => sum + calculateBillProfit(bill), 0),
        }))
    } else if (groupBy === "date") {
      // Group by month/year
      const groups = {}

      filteredBills.forEach((bill) => {
        const date = new Date(bill.billDate)
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

        if (!groups[monthYear]) {
          groups[monthYear] = []
        }
        groups[monthYear].push(bill)
      })

      // Convert to array and sort by date
      return Object.entries(groups)
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([monthYear, bills]) => ({
          groupName: monthYear,
            bills,
            totalAmount: bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0),
          totalProfit: bills.reduce((sum, bill) => sum + calculateBillProfit(bill), 0),
        }))
    }

    return []
  }

  const calculateGrandTotal = () => {
    return filteredBills.reduce((total, bill) => total + (bill.totalAmount || 0), 0)
  }

  // Helper to generate PDF bytes for the report
  const generateReportPdfBytes = async () => {
    // (Same logic as generateReportPdf, but return pdfBytes instead of downloading)
    const companyInfo = await window.api.getCompanyInfo()
    const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib")
    const pdfDoc = await PDFDocument.create()
    const pageWidth = 595.28
    const pageHeight = 841.89
    const left = 40
    const right = 555
    let y = 800
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const margin = 40
    
    // Improved column layout with better spacing to prevent overlapping
    const tableWidth = right - left
    const col = {
      invoiceNo: { x: left, width: 70 },
      partyName: { x: left + 75, width: 120 },
      address: { x: left + 200, width: 140 },
      amount: { x: left + 345, width: 80 },
      profit: { x: left + 430, width: 80 }
    }
    
    // Helper function to truncate text with ellipsis
    const truncateText = (text, maxWidth, fontSize, fontObj) => {
      if (!text) return ""
      const textWidth = fontObj.widthOfTextAtSize(text, fontSize)
      if (textWidth <= maxWidth) return text
      
      let truncated = text
      while (fontObj.widthOfTextAtSize(truncated + "...", fontSize) > maxWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1)
      }
      return truncated + "..."
    }
    
    // Helper function to draw table row with background
    const drawTableRow = (page, y, rowData, isHeader = false, isTotal = false, isAlternate = false) => {
      const rowHeight = 16
      const padding = 2
      
      // Draw background for alternating rows or totals
      if (isAlternate && !isHeader && !isTotal) {
        page.drawRectangle({
          x: left - 2,
          y: y - padding,
          width: tableWidth + 4,
          height: rowHeight,
          color: rgb(0.98, 0.98, 0.98)
        })
      }
      
      if (isTotal) {
        page.drawRectangle({
          x: left - 2,
          y: y - padding,
          width: tableWidth + 4,
          height: rowHeight,
          color: rgb(0.95, 0.95, 0.95)
        })
      }
      
      // Draw horizontal line above row (except for first row)
      if (!isHeader) {
        page.drawLine({
          start: { x: left, y: y + rowHeight/2 },
          end: { x: right, y: y + rowHeight/2 },
          thickness: 0.3,
          color: rgb(0.8, 0.8, 0.8)
        })
      }
      
      const fontSize = isHeader ? 11 : 10
      const fontWeight = (isHeader || isTotal) ? bold : font
      
      // Draw cell contents with proper alignment
      if (rowData.invoiceNo !== undefined) {
        page.drawText(
          truncateText(String(rowData.invoiceNo), col.invoiceNo.width - 5, fontSize, fontWeight),
          { x: col.invoiceNo.x + 2, y, size: fontSize, font: fontWeight }
        )
      }
      
      if (rowData.partyName !== undefined) {
        page.drawText(
          truncateText(String(rowData.partyName), col.partyName.width - 5, fontSize, fontWeight),
          { x: col.partyName.x + 2, y, size: fontSize, font: fontWeight }
        )
      }
      
      if (rowData.address !== undefined) {
        page.drawText(
          truncateText(String(rowData.address), col.address.width - 5, fontSize, fontWeight),
          { x: col.address.x + 2, y, size: fontSize, font: fontWeight }
        )
      }
      
      if (rowData.amount !== undefined) {
        const amountText = String(rowData.amount)
        const amountWidth = fontWeight.widthOfTextAtSize(amountText, fontSize)
        page.drawText(
          amountText,
          { x: col.amount.x + col.amount.width - amountWidth - 2, y, size: fontSize, font: fontWeight }
        )
      }
      
      if (rowData.profit !== undefined) {
        const profitText = String(rowData.profit)
        const profitWidth = fontWeight.widthOfTextAtSize(profitText, fontSize)
        page.drawText(
          profitText,
          { x: col.profit.x + col.profit.width - profitWidth - 2, y, size: fontSize, font: fontWeight }
        )
      }
      
      return y - rowHeight - 2
    }
    
    // --- Header ---
    const companyName = companyInfo.companyName || "Company Name"
    const companyAddress = companyInfo.companyAddress || "Address"
    const companyNameWidth = bold.widthOfTextAtSize(companyName, 16)
    const companyAddressWidth = font.widthOfTextAtSize(companyAddress, 10)
    
    // Centered company name
    pdfDoc.addPage([pageWidth, pageHeight])
    let page = pdfDoc.getPages()[0]
    page.drawText(companyName, {
      x: (pageWidth - companyNameWidth) / 2,
      y,
      size: 16,
      font: bold,
      color: rgb(0, 0, 0),
    })
    
    // Centered address
    page.drawText(companyAddress, {
      x: (pageWidth - companyAddressWidth) / 2,
      y: y - 20,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    })
    
    // Report Date box (top right)
    const reportDateLabel = "Report Date"
    const reportDate = new Date().toLocaleDateString()
    page.drawRectangle({ 
      x: right - 40, y: y - 5, width: 90, height: 32, 
      borderColor: rgb(0,0,0), borderWidth: 1, color: rgb(1,1,1) 
    })
    page.drawText(reportDateLabel, { x: right - 35, y: y + 15, size: 10, font: bold, color: rgb(0,0,0) })
    page.drawText(reportDate, { x: right - 35, y: y, size: 10, font, color: rgb(0,0,0) })
    y -= 50
    
    // Horizontal line
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: rgb(0,0,0) })
    y -= 25
    
    // --- Report Title ---
    const reportTitle = "Daily Sale Report"
    const reportTitleWidth = bold.widthOfTextAtSize(reportTitle, 16)
    page.drawText(reportTitle, {
      x: (pageWidth - reportTitleWidth) / 2,
      y,
      size: 16,
      font: bold,
      color: rgb(0, 0, 0),
    })
    y -= 35
    
    // --- Grouped by Address (City/Area) ---
    const groups = groupedBills()
    let grandTotal = 0
    let rowCounter = 0
    
    for (const group of groups) {
      // City/Area header with improved styling
      y -= 10
      page.drawRectangle({
        x: left - 5,
        y: y - 5,
        width: tableWidth + 10,
        height: 22,
        color: rgb(0.9, 0.9, 0.9)
      })
      
      page.drawText(`City / Area: ${group.groupName}`, { 
        x: left, y, size: 13, font: bold, color: rgb(0.2, 0.2, 0.2)
      })
      y -= 25
      
      // Table header with background
      page.drawRectangle({
        x: left - 2,
        y: y - 2,
        width: tableWidth + 4,
        height: 18,
        color: rgb(0.85, 0.85, 0.85)
      })
      
      y = drawTableRow(page, y, {
        invoiceNo: "Invoice No.",
        partyName: "Party Name", 
        address: "Address",
        amount: "Amount",
        profit: "Profit"
      }, true)
      
      // Draw thick line under header
      page.drawLine({ 
        start: { x: left, y + 8 }, 
        end: { x: right, y + 8 }, 
        thickness: 1, 
        color: rgb(0.5, 0.5, 0.5) 
      })
      y -= 5
      
      let areaTotal = 0
      rowCounter = 0
      
      for (const bill of group.bills) {
        const isAlternate = rowCounter % 2 === 1
        
        y = drawTableRow(page, y, {
          invoiceNo: bill.billId ? bill.billId : bill._id,
          partyName: bill.clientName || getClientName(bill.clientId),
          address: bill.clientAddress || getClientAddress(bill.clientId),
          amount: bill.totalAmount ? bill.totalAmount.toFixed(2) : "0.00",
          profit: calculateBillProfit(bill).toFixed(2)
        }, false, false, isAlternate)
        
        areaTotal += bill.totalAmount || 0
        rowCounter++
      }
      
      // City/Area Total with background
      y -= 8
      y = drawTableRow(page, y, {
        invoiceNo: "",
        partyName: "",
        address: "City / Area Total:",
        amount: areaTotal.toFixed(2),
        profit: ""
      }, false, true)
      
      y = drawTableRow(page, y, {
        invoiceNo: "",
        partyName: "",
        address: "City / Area Profit:",
        amount: "",
        profit: group.totalProfit.toFixed(2)
      }, false, true)
      
      grandTotal += areaTotal
      y -= 15
      
      // Thick line after group
      page.drawLine({ 
        start: { x: left, y }, 
        end: { x: right, y }, 
        thickness: 1.5, 
        color: rgb(0.3, 0.3, 0.3) 
      })
      y -= 20
      
      // Page break if needed
      if (y < 120) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = 800
      }
    }
    
    // --- Grand Total at the end with enhanced styling ---
    y -= 15
    page.drawRectangle({
      x: left - 5,
      y: y - 10,
      width: tableWidth + 10,
      height: 50,
      color: rgb(0.88, 0.88, 0.88),
      borderColor: rgb(0.5, 0.5, 0.5),
      borderWidth: 1
    })
    
    y = drawTableRow(page, y, {
      invoiceNo: "",
      partyName: "",
      address: "Total Amount:",
      amount: grandTotal.toFixed(2),
      profit: ""
    }, false, true)
    
    y = drawTableRow(page, y, {
      invoiceNo: "",
      partyName: "",
      address: "Total Profit:",
      amount: "",
      profit: calculateTotalProfit().toFixed(2)
    }, false, true)
    
    return await pdfDoc.save()
  }

  // Download PDF
  const generateReportPdf = async () => {
    try {
      const pdfBytes = await generateReportPdfBytes()
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `DailySaleReport-${new Date().toISOString().split("T")[0]}.pdf`
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

  // Print PDF
  const printReportPdf = async () => {
    try {
      const pdfBytes = await generateReportPdfBytes()
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const blobUrl = URL.createObjectURL(blob)
      const printWindow = window.open(blobUrl)
      printWindow.onload = () => {
        printWindow.focus()
        printWindow.print()
      }
    } catch (error) {
      toast.error("Failed to print report")
      console.error(error)
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
          <div className="flex gap-2">
            <button
              onClick={generateReportPdf}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md"
            >
              Generate Report PDF
            </button>
            <button
              onClick={printReportPdf}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Print Report
            </button>
          </div>
        </div>
      </div>

      {groupedBills().length > 0 ? (
        <div>
          {groupedBills().map((group, groupIndex) => (
            <div key={groupIndex} className="mb-8">
              <h2 className="text-xl font-semibold mb-4 bg-gray-100 p-3 rounded-md flex justify-between">
                <span>{group.groupName}</span>
                <div className="text-right">
                  <div>Total: PKR {group.totalAmount.toFixed(2)}</div>
                  <div className="text-sm text-green-600">Profit: PKR {group.totalProfit.toFixed(2)}</div>
                </div>
              </h2>

              <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Profit
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
                          #{bill.billId ? bill.billId : bill._id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bill.clientName || getClientName(bill.clientId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bill.clientAddress || getClientAddress(bill.clientId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          PKR {bill.totalAmount ? bill.totalAmount.toFixed(2) : "0.00"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={calculateBillProfit(bill) >= 0 ? "text-green-600" : "text-red-600"}>
                            PKR {calculateBillProfit(bill).toFixed(2)}
                          </span>
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
            <div className="text-xl font-bold text-right">
              <div>Grand Total: PKR {calculateGrandTotal().toFixed(2)}</div>
              <div className="text-lg text-green-600">Total Profit: PKR {calculateTotalProfit().toFixed(2)}</div>
            </div>
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
