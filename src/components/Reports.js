"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import GeneratePdfButton from "./GeneratePdfButton"
import SearchBar from "./SearchBar"
import configService from "../services/ConfigService"

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
  const [reportType, setReportType] = useState("daily") // 'daily' or 'item'
  const [selectedProduct, setSelectedProduct] = useState("")
  const [selectedProductObj, setSelectedProductObj] = useState(null)

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

  const handleProductSelect = (product) => {
    setSelectedProductObj(product)
    setSelectedProduct(product.productName)
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

  // Get Item Report Data - filter bills containing selected product
  const getItemReportData = () => {
    if (!selectedProductObj) return []

    const itemData = []

    bills.forEach((bill) => {
      if (!bill || !bill.items || !Array.isArray(bill.items)) return

      // Filter by date range
      const billDateStr = bill.billDate ? new Date(bill.billDate).toISOString().split("T")[0] : ""
      let matchesDateRange = true
      if (dateFilter.from) {
        matchesDateRange = matchesDateRange && billDateStr >= dateFilter.from
      }
      if (dateFilter.to) {
        matchesDateRange = matchesDateRange && billDateStr <= dateFilter.to
      }

      if (!matchesDateRange) return

      // Find items matching selected product
      bill.items.forEach((item) => {
        if (item.productId === selectedProductObj._id) {
          const client = getClient(bill.clientId)
          itemData.push({
            billId: bill.billId || bill._id,
            billDate: bill.billDate,
            clientName: bill.clientName || client?.clientName || "Unknown",
            clientAddress: client?.clientAddress || "Unknown",
            quantity: item.quantity || 0,
            amount: item.total || 0,
          })
        }
      })
    })

    return itemData
  }

  // Calculate totals for Item Report
  const calculateItemTotals = () => {
    const data = getItemReportData()
    return {
      totalQuantity: data.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: data.reduce((sum, item) => sum + item.amount, 0),
    }
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
    const billDateStr = bill.billDate ? new Date(bill.billDate).toISOString().split("T")[0] : ""
    let matchesDateRange = true
    if (dateFilter.from) {
      matchesDateRange = matchesDateRange && billDateStr >= dateFilter.from
    }
    if (dateFilter.to) {
      matchesDateRange = matchesDateRange && billDateStr <= dateFilter.to
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
        const monthYear = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`

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

  // Helper function to draw wrapped text
  const drawWrappedText = (page, text, x, y, maxWidth, font, fontSize, color, lineHeightMultiplier = 1.2) => {
    const words = text.split(" ")
    let line = ""
    let lineY = y
    const lineHeight = fontSize * lineHeightMultiplier
    for (const word of words) {
      const testLine = line + (line ? " " : "") + word
      const testWidth = font.widthOfTextAtSize(testLine, fontSize)
      if (testWidth > maxWidth && line !== "") {
        page.drawText(line, { x, y: lineY, size: fontSize, font, color })
        line = word
        lineY -= lineHeight
      } else {
        line = testLine
      }
    }
    if (line) {
      page.drawText(line, { x, y: lineY, size: fontSize, font, color })
    }
    return lineY - lineHeight
  }

  // Helper to generate PDF bytes for the report
  const generateReportPdfBytes = async () => {
    const companyInfo = await window.api.getCompanyInfo()
    const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib")
    const pdfDoc = await PDFDocument.create()

    // Page dimensions matching Bill PDF
    const pageWidth = 410 // approx 15cm
    const pageHeight = 595.3 // approx 21cm
    const margin = 20
    const left = margin
    const right = pageWidth - margin

    let page = pdfDoc.addPage([pageWidth, pageHeight])
    let y = pageHeight - margin

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // --- Header Section ---
    const companyName = companyInfo.companyName || "BHATTI DAWAKHANA"
    const companyAddress = companyInfo.companyAddress || "Kachehri Road, Opposit Toyota Stand, Pasrur"
    const ownerInfo = `HAKEEM SHAH NAWAZ BHATTI ${companyInfo.ownerPhone || "03007169315, 03187135940"}`

    // Centered Company Name
    const nameSize = 14
    const nameWidth = bold.widthOfTextAtSize(companyName, nameSize)
    page.drawText(companyName, { x: (pageWidth - nameWidth) / 2, y, size: nameSize, font: bold })
    y -= 15

    // Centered Address
    const addrSize = 8
    const addrWidth = font.widthOfTextAtSize(companyAddress, addrSize)
    page.drawText(companyAddress, { x: (pageWidth - addrWidth) / 2, y, size: addrSize, font })
    y -= 12

    // Centered & Underlined Owner Info
    const ownerSize = 8
    const ownerWidth = bold.widthOfTextAtSize(ownerInfo, ownerSize)
    const ownerX = (pageWidth - ownerWidth) / 2
    page.drawText(ownerInfo, { x: ownerX, y, size: ownerSize, font: bold })
    page.drawLine({
      start: { x: ownerX, y: y - 2 },
      end: { x: ownerX + ownerWidth, y: y - 2 },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    })
    y -= 15

    // Report Date Box (Top Right)
    const boxWidth = 70
    const boxHeight = 25
    const boxX = right - boxWidth
    const boxY = pageHeight - margin + 10
    page.drawRectangle({
      x: boxX,
      y: boxY - boxHeight,
      width: boxWidth,
      height: boxHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    })
    page.drawLine({ start: { x: boxX, y: boxY - 10 }, end: { x: right, y: boxY - 10 }, thickness: 1, color: rgb(0, 0, 0) })

    const dateLabel = "Report Date"
    const dateLabelWidth = bold.widthOfTextAtSize(dateLabel, 7)
    page.drawText(dateLabel, { x: boxX + (boxWidth - dateLabelWidth) / 2, y: boxY - 8, size: 7, font: bold })

    const dateValue = configService.formatDate(new Date())
    const dateValueWidth = font.widthOfTextAtSize(dateValue, 8)
    page.drawText(dateValue, { x: boxX + (boxWidth - dateValueWidth) / 2, y: boxY - 20, size: 8, font })

    // Report Title

    const reportTitle = "Daily Sale Report"
    const titleWidth = bold.widthOfTextAtSize(reportTitle, 10)
    page.drawText(reportTitle, { x: (pageWidth - titleWidth) / 2, y, size: 10, font: bold })

    y -= 5

    // Header Line
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: rgb(0, 0, 0) })
    y -= 15

    // Table Headers
    const col = {
      no: left,
      name: left + 65,
      amount: left + 250,
      received: left + 310,
    }

    const drawTableHead = (currentPage, currentY) => {
      currentPage.drawLine({
        start: { x: left, y: currentY + 10 },
        end: { x: right, y: currentY + 10 },
        thickness: 1,
        color: rgb(0, 0, 0),
      })
      currentPage.drawText("Invoice No", { x: col.no, y: currentY, size: 8, font: bold })
      currentPage.drawText("Party Name", { x: col.name, y: currentY, size: 8, font: bold })
      currentPage.drawText("Amount", { x: col.amount, y: currentY, size: 8, font: bold })
      currentPage.drawText("Received", { x: col.received, y: currentY, size: 8, font: bold })
      currentPage.drawLine({
        start: { x: left, y: currentY - 5 },
        end: { x: right, y: currentY - 5 },
        thickness: 1,
        color: rgb(0, 0, 0),
      })
      return currentY - 15
    }

    y = drawTableHead(page, y)

    const groups = groupedBills()
    let grandTotal = 0

    for (const group of groups) {
      // Check for page break before group header
      if (y < 80) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin - 20
        y = drawTableHead(page, y)
      }

      // Group Header (City / Area)
      page.drawText("City / Area", { x: left, y, size: 8, font: bold })
      page.drawText(group.groupName.toUpperCase(), { x: left + 65, y, size: 8, font: bold })
      page.drawLine({
        start: { x: left, y: y - 2 },
        end: { x: right, y: y - 2 },
        thickness: 1,
        color: rgb(0, 0, 0),
      })
      y -= 12

      let areaTotal = 0
      for (const bill of group.bills) {
        // Check for page break before row
        if (y < 60) {
          page = pdfDoc.addPage([pageWidth, pageHeight])
          y = pageHeight - margin - 20
          y = drawTableHead(page, y)
          // Re-draw group header on new page if it was in the middle of a group
          page.drawText("City / Area", { x: left, y, size: 8, font: bold })
          page.drawText(group.groupName.toUpperCase(), { x: left + 65, y, size: 8, font: bold })
          page.drawLine({
            start: { x: left, y: y - 2 },
            end: { x: right, y: y - 2 },
            thickness: 1,
            color: rgb(0, 0, 0),
          })
          y -= 12
        }

        const billId = String(bill.billId || bill._id).substring(0, 10)
        page.drawText(billId, { x: col.no, y, size: 8, font })

        const clientName = (bill.clientName || getClientName(bill.clientId)).toUpperCase()
        drawWrappedText(page, clientName, col.name, y, col.amount - col.name - 10, bold, 7, rgb(0, 0, 0), 1)

        const amount = (bill.totalAmount || 0).toFixed(2)
        const amountWidth = font.widthOfTextAtSize(amount, 8)
        page.drawText(amount, { x: col.amount + 30 - amountWidth, y, size: 8, font })

        areaTotal += bill.totalAmount || 0
        y -= 11
      }

      // Group Footer
      y -= 2
      page.drawLine({
        start: { x: left, y: y + 8 },
        end: { x: right, y: y + 8 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      })

      page.drawText("Total Invoices of This Area:", { x: left + 5, y, size: 8, font: bold })
      page.drawText(String(group.bills.length), { x: left + 120, y, size: 8, font: bold })

      page.drawText("City / Area Total:", { x: left + 165, y, size: 8, font: bold })
      const areaTotalStr = areaTotal.toFixed(2)
      const areaTotalWidth = bold.widthOfTextAtSize(areaTotalStr, 8)
      page.drawText(areaTotalStr, { x: col.amount + 30 - areaTotalWidth, y, size: 8, font: bold })

      y -= 10
      page.drawLine({
        start: { x: left, y: y + 8 },
        end: { x: right, y: y + 8 },
        thickness: 1,
        color: rgb(0, 0, 0),
      })

      grandTotal += areaTotal
      y -= 10
    }

    // Grand Total
    if (y < 50) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin - 20
    }

    y -= 10
    page.drawText("Total Amount:", { x: left + 150, y, size: 10, font: bold })
    const grandTotalStr = grandTotal.toFixed(2)
    const grandTotalWidth = bold.widthOfTextAtSize(grandTotalStr, 10)
    page.drawText(grandTotalStr, { x: col.amount + 30 - grandTotalWidth, y, size: 10, font: bold })

    return await pdfDoc.save()
  }

  // Helper to generate PDF bytes for Item Report
  const generateItemReportPdfBytes = async () => {
    const companyInfo = await window.api.getCompanyInfo()
    const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib")
    const pdfDoc = await PDFDocument.create()

    // Page dimensions matching Bill PDF
    const pageWidth = 410 // approx 15cm
    const pageHeight = 595.3 // approx 21cm
    const margin = 20
    const left = margin
    const right = pageWidth - margin

    let page = pdfDoc.addPage([pageWidth, pageHeight])
    let y = pageHeight - margin

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Sanitize text to remove newlines
    const sanitize = (text) => (text || "").replace(/[\r\n]+/g, " ")

    // --- Header Section ---
    const companyName = sanitize(companyInfo.companyName || "BHATTI DAWAKHANA")
    const companyAddress = sanitize(companyInfo.companyAddress || "Kachehri Road, Opposit Toyota Stand, Pasrur")
    const ownerInfo = sanitize(`HAKEEM SHAH NAWAZ BHATTI ${companyInfo.ownerPhone || "03007169315, 03187135940"}`)

    // Centered Company Name
    const nameSize = 14
    const nameWidth = bold.widthOfTextAtSize(companyName, nameSize)
    page.drawText(companyName, { x: (pageWidth - nameWidth) / 2, y, size: nameSize, font: bold })
    y -= 15

    // Centered Address
    const addrSize = 8
    const addrWidth = font.widthOfTextAtSize(companyAddress, addrSize)
    page.drawText(companyAddress, { x: (pageWidth - addrWidth) / 2, y, size: addrSize, font })
    y -= 12

    // Centered & Underlined Owner Info
    const ownerSize = 8
    const ownerWidth = bold.widthOfTextAtSize(ownerInfo, ownerSize)
    const ownerX = (pageWidth - ownerWidth) / 2
    page.drawText(ownerInfo, { x: ownerX, y, size: ownerSize, font: bold })
    page.drawLine({
      start: { x: ownerX, y: y - 2 },
      end: { x: ownerX + ownerWidth, y: y - 2 },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    })
    y -= 20

    // Header Line
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: rgb(0, 0, 0) })
    y -= 15

    // Report Title
    const reportTitle = "Item Report"
    const titleWidth = bold.widthOfTextAtSize(reportTitle, 12)
    page.drawText(reportTitle, { x: (pageWidth - titleWidth) / 2, y, size: 12, font: bold })
    y -= 15

    // Product Name and Packing
    const productName = sanitize(selectedProductObj?.productName || "N/A")
    const packing = sanitize(selectedProductObj?.containerSize || "")
    page.drawText(`Product Name ${productName}`, { x: left, y, size: 9, font: bold })
    y -= 10
    if (packing) {
      page.drawText(`Packing : ${packing}`, { x: left, y, size: 9, font })
      y -= 10
    }

    // Header Line
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: rgb(0, 0, 0) })
    y -= 15

    // Table Headers
    const col = {
      invoiceNo: left,
      date: left + 50,
      partyName: left + 105,
      address: left + 240,
      quantity: left + 310,
      amount: left + 345,
    }

    const drawTableHead = (currentPage, currentY) => {
      currentPage.drawLine({
        start: { x: left, y: currentY + 10 },
        end: { x: right, y: currentY + 10 },
        thickness: 1,
        color: rgb(0, 0, 0),
      })
      currentPage.drawText("Invoice No.", { x: col.invoiceNo, y: currentY, size: 8, font: bold })
      currentPage.drawText("Date", { x: col.date, y: currentY, size: 8, font: bold })
      currentPage.drawText("Party Name", { x: col.partyName, y: currentY, size: 8, font: bold })
      currentPage.drawText("Address", { x: col.address, y: currentY, size: 8, font: bold })
      currentPage.drawText("Qty", { x: col.quantity, y: currentY, size: 8, font: bold })
      currentPage.drawText("Amount", { x: col.amount, y: currentY, size: 8, font: bold })
      currentPage.drawLine({
        start: { x: left, y: currentY - 5 },
        end: { x: right, y: currentY - 5 },
        thickness: 1,
        color: rgb(0, 0, 0),
      })
      return currentY - 15
    }

    y = drawTableHead(page, y)

    const itemData = getItemReportData()
    let totalQuantity = 0
    let totalAmount = 0

    for (const item of itemData) {
      // Check for page break
      if (y < 80) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin - 20
        y = drawTableHead(page, y)
      }

      const invoiceNo = String(item.billId).substring(0, 10)
      page.drawText(invoiceNo, { x: col.invoiceNo, y, size: 8, font })

      const dateStr = configService.formatDate(item.billDate)
      page.drawText(dateStr, { x: col.date, y, size: 8, font })

      const partyName = sanitize(item.clientName).toUpperCase()
      drawWrappedText(page, partyName, col.partyName, y, col.address - col.partyName - 5, font, 7, rgb(0, 0, 0), 1)

      const address = sanitize(item.clientAddress).toUpperCase()
      drawWrappedText(page, address, col.address, y, col.quantity - col.address - 5, font, 7, rgb(0, 0, 0), 1)

      page.drawText(String(item.quantity), { x: col.quantity, y, size: 8, font })

      const amountStr = item.amount.toFixed(2)
      const amountWidth = font.widthOfTextAtSize(amountStr, 8)
      page.drawText(amountStr, { x: right - amountWidth, y, size: 8, font })

      totalQuantity += item.quantity
      totalAmount += item.amount

      y -= 12
    }

    // Totals Section
    if (y < 60) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin - 20
    }

    y -= 10
    page.drawLine({ start: { x: left, y: y + 10 }, end: { x: right, y: y + 10 }, thickness: 1, color: rgb(0, 0, 0) })
    page.drawLine({ start: { x: left, y: y + 9 }, end: { x: right, y: y + 9 }, thickness: 1, color: rgb(0, 0, 0) })

    page.drawText("Total Amount :", { x: right - 150, y, size: 10, font: bold })
    page.drawText(String(totalQuantity), { x: col.quantity, y, size: 10, font: bold })
    const totalAmountStr = totalAmount.toFixed(2)
    const totalAmountWidth = bold.widthOfTextAtSize(totalAmountStr, 10)
    page.drawText(totalAmountStr, { x: right - totalAmountWidth, y, size: 10, font: bold })

    return await pdfDoc.save()
  }

  // Download PDF
  const generateReportPdf = async () => {
    try {
      const pdfBytes = reportType === "item" ? await generateItemReportPdfBytes() : await generateReportPdfBytes()
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      const fileName = reportType === "item"
        ? `ItemReport-${selectedProduct.replace(/\s+/g, "_")}-${new Date().toISOString().split("T")[0]}.pdf`
        : `DailySaleReport-${new Date().toISOString().split("T")[0]}.pdf`
      link.download = fileName
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

  // Print PDF (Open in System Viewer)
  const printReportPdf = async () => {
    try {
      const pdfBytes = reportType === "item" ? await generateItemReportPdfBytes() : await generateReportPdfBytes()
      const blob = new Blob([pdfBytes], { type: "application/pdf" })

      const base64String = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result.split(',')[1])
        reader.readAsDataURL(blob)
      })

      if (window.api && window.api.openPdf) {
        await window.api.openPdf(base64String)
        toast.success("Opening Report...")
      } else {
        const blobUrl = URL.createObjectURL(blob)
        const printWindow = window.open(blobUrl)
        printWindow.onload = () => {
          printWindow.focus()
          printWindow.print()
        }
      }
    } catch (error) {
      toast.error("Failed to open report")
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
        <div className="mb-6 border-b pb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Select Report Type</label>
          <div className="flex space-x-6">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio h-5 w-5 text-purple-600"
                name="reportType"
                value="daily"
                checked={reportType === "daily"}
                onChange={() => setReportType("daily")}
              />
              <span className="ml-2 font-medium">Daily Sale Report</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio h-5 w-5 text-purple-600"
                name="reportType"
                value="item"
                checked={reportType === "item"}
                onChange={() => setReportType("item")}
              />
              <span className="ml-2 font-medium">Item Report</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {reportType === "daily" ? (
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
          ) : (
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Select Product</label>
              <SearchBar
                placeholder="Search product..."
                items={products}
                displayProperty="productName"
                onSelect={handleProductSelect}
                initialValue={selectedProduct}
                searchTerm={selectedProduct}
                setSearchTerm={setSelectedProduct}
              />
            </div>
          )}
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

        {reportType === "daily" && (
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
        )}

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

      {reportType === "daily" ? (
        groupedBills().length > 0 ? (
          <div>
            {groupedBills().map((group, groupIndex) => (
              <div key={groupIndex} className="mb-8">
                <h2 className="text-xl font-semibold mb-4 bg-gray-100 p-3 rounded-md flex justify-between">
                  <span>{group.groupName}</span>
                  <div className="text-right">
                    <div>Total: PKR {group.totalAmount.toFixed(2)}</div>
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
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            {addressFilter || dateFilter.from || dateFilter.to || searchTerm
              ? "No bills found matching your search criteria."
              : "No bills available."}
          </div>
        )
      ) : (
        // Item Report table rendering
        getItemReportData().length > 0 ? (
          <div>
            <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getItemReportData().map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{item.billId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{configService.formatDate(item.billDate)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.clientName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.clientAddress}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">PKR {item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-lg shadow p-4 mt-4">
              <div className="text-xl font-bold flex justify-between items-center">
                <div className="text-purple-600">Total Quantity: {calculateItemTotals().totalQuantity}</div>
                <div className="text-right">Total Amount: PKR {calculateItemTotals().totalAmount.toFixed(2)}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            {selectedProductObj
              ? "No sales found for this product in the selected date range."
              : "Please select a product and date range to view the report."}
          </div>
        )
      )}
    </div>
  )
}

export default Reports
