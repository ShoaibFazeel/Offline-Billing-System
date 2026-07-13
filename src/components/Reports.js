"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import GeneratePdfButton from "./GeneratePdfButton"
import SearchBar from "./SearchBar"
import configService from "../services/ConfigService"

function Reports() {
  const getDefaultDateFilter = () => {
    const today = new Date()
    const from = new Date(today)
    from.setMonth(today.getMonth() - 3)

    return {
      from: from.toISOString().split("T")[0],
      to: today.toISOString().split("T")[0],
    }
  }

  const [bills, setBills] = useState([])
  const [clients, setClients] = useState([])
  const [products, setProducts] = useState([])
  const [fieldOfficers, setFieldOfficers] = useState([])
  const [salesmen, setSalesmen] = useState([])
  const [loading, setLoading] = useState(true)
  const [addressFilter, setAddressFilter] = useState("")
  const [salesmanFilter, setSalesmanFilter] = useState("")
  const [fieldOfficerFilter, setFieldOfficerFilter] = useState("")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [addresses, setAddresses] = useState([])
  const [dateFilter, setDateFilter] = useState(getDefaultDateFilter)
  const [groupBy, setGroupBy] = useState("address") // 'address', 'client', 'date'
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [reportType, setReportType] = useState("daily") // 'daily' or 'item'
  const [selectedProduct, setSelectedProduct] = useState("")
  const [selectedProductObj, setSelectedProductObj] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchBillsData = async (currentDateFilter = dateFilter) => {
    const activeDateFilter = {
      from: currentDateFilter?.from || getDefaultDateFilter().from,
      to: currentDateFilter?.to || getDefaultDateFilter().to,
    }

    try {
      if (window.api) {
        const billsData = await window.api.getBills({
          fromDate: activeDateFilter.from,
          toDate: activeDateFilter.to,
        })
        setBills(Array.isArray(billsData) ? billsData : billsData?.data || [])
      } else {
        setBills([
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
            clientId: "client1",
            clientName: "ABC Corporation",
            totalAmount: 3200,
            items: [],
          },
        ])
      }
    } catch (error) {
      console.error("Error fetching bills:", error)
      setError("Failed to load report data. Please try again later.")
      toast.error("Failed to load report data")
    }
  }

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch bills, clients, and products in parallel
      let billsData, clientsData, productsData, fieldOfficersData, salesmenData

      if (window.api) {
        ;[billsData, clientsData, productsData, fieldOfficersData, salesmenData] = await Promise.all([
          window.api.getBills({
            fromDate: dateFilter.from || getDefaultDateFilter().from,
            toDate: dateFilter.to || getDefaultDateFilter().to,
          }),
          window.api.getClients(),
          window.api.getProducts(),
          window.api.getFieldOfficers(),
          window.api.getSalesmen(),
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
        fieldOfficersData = []
        salesmenData = []
      }

      setBills(Array.isArray(billsData) ? billsData : billsData?.data || [])
      setClients(clientsData)
      setFieldOfficers(fieldOfficersData)
      setSalesmen(salesmenData)
      const newProductData = productsData.map((product) => ({
        ...product,
        productNameForDropDown: `${product.productName} (${product.companyName} - ${product.containerSize})`,
      }));
      setProducts(newProductData)

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

  const handleDateFilterChange = async (e) => {
    const { name, value } = e.target
    const nextDateFilter = { ...dateFilter, [name]: value }
    setDateFilter(nextDateFilter)
    await fetchBillsData(nextDateFilter)
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

  const handleResetFilters = async () => {
    setAddressFilter("")
    setSalesmanFilter("")
    setFieldOfficerFilter("")
    const defaultDateFilter = getDefaultDateFilter()
    setDateFilter(defaultDateFilter)
    setSearchTerm("")
    setSelectedProduct("")
    setSelectedProductObj(null)
    await fetchBillsData(defaultDateFilter)
  }

  // Clear selectedProductObj when search term is cleared
  useEffect(() => {
    if (!selectedProduct) {
      setSelectedProductObj(null)
    }
  }, [selectedProduct])

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

      const clientAddress = getClientAddress(bill.clientId) || ""
      const matchesAddress = !addressFilter || clientAddress.toLowerCase().includes(addressFilter.toLowerCase())
      
      const matchesSalesman = !salesmanFilter || bill.salesmanId === salesmanFilter
      const matchesFieldOfficer = !fieldOfficerFilter || bill.fieldOfficerId === fieldOfficerFilter
      
      const clientName = bill.clientName || getClientName(bill.clientId) || ""
      const billIdStr = bill.billId ? String(bill.billId) : (bill._id || "")
      const matchesSearch = !searchTerm || clientName.toLowerCase().includes(searchTerm.toLowerCase()) || billIdStr.toLowerCase().includes(searchTerm.toLowerCase())

      if (!matchesDateRange || !matchesAddress || !matchesSalesman || !matchesFieldOfficer || !matchesSearch) return

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

    const matchesSalesman = !salesmanFilter || bill.salesmanId === salesmanFilter
    const matchesFieldOfficer = !fieldOfficerFilter || bill.fieldOfficerId === fieldOfficerFilter

    return matchesAddress && matchesDateRange && matchesSearch && matchesSalesman && matchesFieldOfficer
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
    const italic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)
    const boldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic)

    // --- Header Section ---
    const companyName = (companyInfo.companyName || "Company Name").replace(/[\r\n]+/g, " ")
    const companyAddress = (companyInfo.companyAddress || "Address").replace(/[\r\n]+/g, " ")
    const ownerInfo = (`Owner: ${companyInfo.ownerName || ""} ${companyInfo.ownerPhone || "Phone"}`).replace(/[\r\n]+/g, " ")

    // Centered Company Name
    const nameSize = 14
    const nameWidth = bold.widthOfTextAtSize(companyName, nameSize)
    page.drawText(companyName, { x: (pageWidth - nameWidth) / 2, y, size: nameSize, font: bold })
    y -= 15

    // Centered Address
    const addrSize = 8
    const addrWidth = bold.widthOfTextAtSize(companyAddress, addrSize)
    page.drawText(companyAddress, { x: (pageWidth - addrWidth) / 2, y, size: addrSize, font: bold })
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
      currentPage.drawText("Invoice No", { x: col.no, y: currentY, size: 8, font: boldItalic })
      currentPage.drawText("Party Name", { x: col.name, y: currentY, size: 8, font: boldItalic })
      currentPage.drawText("Amount", { x: col.amount, y: currentY, size: 8, font: boldItalic })
      currentPage.drawText("Received", { x: col.received, y: currentY, size: 8, font: boldItalic })
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
      page.drawText("City / Area", { x: left, y, size: 8, font: boldItalic })
      page.drawText(group.groupName.toUpperCase(), { x: left + 65, y, size: 10, font: boldItalic })
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
          page.drawText("City / Area", { x: left, y, size: 8, font: boldItalic })
          page.drawText(group.groupName.toUpperCase(), { x: left + 65, y, size: 10, font: boldItalic })
          page.drawLine({
            start: { x: left, y: y - 2 },
            end: { x: right, y: y - 2 },
            thickness: 1,
            color: rgb(0, 0, 0),
          })
          y -= 12
        }

        const billId = String(bill.billId || bill._id).substring(0, 10)
        page.drawText(billId, { x: col.no, y, size: 8, font: italic })

        const clientName = (bill.clientName || getClientName(bill.clientId)).toUpperCase()
        const nextY = drawWrappedText(page, clientName, col.name, y, col.amount - col.name - 10, boldItalic, 7, rgb(0, 0, 0), 1)

        const amount = `${Math.round(bill.totalAmount || 0)}`
        const amountWidth = font.widthOfTextAtSize(amount, 8)
        page.drawText(`${amount}.00`, { x: col.amount + 30 - amountWidth, y, size: 8, font: italic })

        areaTotal += bill.totalAmount || 0
        y = Math.min(y - 11, nextY)
      }

      // Group Footer
      y -= 2
      page.drawLine({
        start: { x: left, y: y + 8 },
        end: { x: right, y: y + 8 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      })

      page.drawText("Total Invoices of This Area:", { x: left + 5, y, size: 8, font: boldItalic })
      page.drawText(String(group.bills.length), { x: left + 120, y, size: 8, font: boldItalic })

      page.drawText("City / Area Total:", { x: left + 165, y, size: 8, font: boldItalic })
      const areaTotalStr = `${Math.round(areaTotal)}`
      const areaTotalWidth = bold.widthOfTextAtSize(areaTotalStr, 8)
      page.drawText(`${areaTotalStr}.00`, { x: col.amount + 30 - areaTotalWidth, y, size: 8, font: boldItalic })

      y -= 10
      page.drawLine({
        start: { x: left, y: y + 8 },
        end: { x: right, y: y + 8 },
        thickness: 1,
        color: rgb(0, 0, 0),
      })

      grandTotal += areaTotal
      y -= 5
    }

    // Grand Total
    if (y < 50) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin - 20
    }

    y -= 5
    page.drawText("Total Amount:", { x: left + 150, y, size: 10, font: boldItalic })
    const grandTotalStr = `${Math.round(grandTotal)}`
    const grandTotalWidth = bold.widthOfTextAtSize(grandTotalStr, 10)
    page.drawText(`${grandTotalStr}.00`, { x: col.amount + 30 - grandTotalWidth, y, size: 10, font: boldItalic })

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
    const italic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)
    const boldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic)

    // Sanitize text to remove newlines
    const sanitize = (text) => (text || "").replace(/[\r\n]+/g, " ")

    // --- Header Section ---
    const companyName = sanitize(companyInfo.companyName || "Company Name")
    const companyAddress = sanitize(companyInfo.companyAddress || "Address")
    const ownerInfo = sanitize(`Owner: ${companyInfo.ownerName || ""} ${companyInfo.ownerPhone || "Phone"}`)

    // Centered Company Name
    const nameSize = 14
    const nameWidth = bold.widthOfTextAtSize(companyName, nameSize)
    page.drawText(companyName, { x: (pageWidth - nameWidth) / 2, y, size: nameSize, font: bold })
    y -= 15

    // Centered Address
    const addrSize = 8
    const addrWidth = bold.widthOfTextAtSize(companyAddress, addrSize)
    page.drawText(companyAddress, { x: (pageWidth - addrWidth) / 2, y, size: addrSize, font: bold })
    y -= 12

    // Centered & Underlined Owner Info
    const ownerSize = 8
    const ownerWidth = bold.widthOfTextAtSize(ownerInfo, ownerSize)
    const ownerX = (pageWidth - ownerWidth) / 2
    page.drawText(ownerInfo, { x: ownerX, y, size: ownerSize, font: bold })
    y -= 2
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: rgb(0, 0, 0) })
    y -= 2

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
    const productCompany = sanitize(selectedProductObj?.companyName || "N/A")
    const packing = sanitize(selectedProductObj?.containerSize || "")
    page.drawText(`Product Name ${productName} (${productCompany})`, { x: left, y, size: 9, font: boldItalic })
    y -= 10
    if (packing) {
      page.drawText(`Packing : ${packing}`, { x: left, y, size: 9, font: italic })
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
      currentPage.drawText("Invoice No.", { x: col.invoiceNo, y: currentY, size: 8, font: boldItalic })
      currentPage.drawText("Date", { x: col.date, y: currentY, size: 8, font: boldItalic })
      currentPage.drawText("Party Name", { x: col.partyName, y: currentY, size: 8, font: boldItalic })
      currentPage.drawText("Address", { x: col.address, y: currentY, size: 8, font: boldItalic })
      currentPage.drawText("Qty", { x: col.quantity, y: currentY, size: 8, font: boldItalic })
      currentPage.drawText("Amount", { x: col.amount, y: currentY, size: 8, font: boldItalic })
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
      y -= 4
      if (y < 80) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin - 20
        y = drawTableHead(page, y)
      }

      const invoiceNo = String(item.billId).substring(0, 10)
      page.drawText(invoiceNo, { x: col.invoiceNo, y, size: 8, font: italic })

      const dateStr = configService.formatDate(item.billDate)
      page.drawText(dateStr, { x: col.date, y, size: 8, font: italic })

      const partyName = sanitize(item.clientName).toUpperCase()
      const partyNameY = drawWrappedText(page, partyName, col.partyName, y, col.address - col.partyName - 5, italic, 7, rgb(0, 0, 0), 1)

      const address = sanitize(item.clientAddress).toUpperCase()
      const addressY = drawWrappedText(page, address, col.address, y, col.quantity - col.address - 5, italic, 7, rgb(0, 0, 0), 1)

      page.drawText(String(item.quantity), { x: col.quantity, y, size: 8, font: italic })

      const amountStr = `${Math.round(item.amount)}`
      const amountWidth = font.widthOfTextAtSize(amountStr, 8)
      page.drawText(`${amountStr}.00`, { x: (right - amountWidth) - 5, y, size: 8, font: italic })

      totalQuantity += item.quantity
      totalAmount += item.amount

      y = Math.min(partyNameY, addressY)
    }

    // Totals Section
    if (y < 60) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin - 20
    }

    y -= 10
    page.drawLine({ start: { x: left, y: y + 10 }, end: { x: right, y: y + 10 }, thickness: 1, color: rgb(0, 0, 0) })
    page.drawLine({ start: { x: left, y: y + 9 }, end: { x: right, y: y + 9 }, thickness: 1, color: rgb(0, 0, 0) })

    page.drawText("Total Amount :", { x: right - 250, y, size: 10, font: boldItalic })
    page.drawText(String(totalQuantity), { x: col.address + 30, y, size: 10, font: boldItalic })
    const totalAmountStr = `${Math.round(totalAmount)}`
    const totalAmountWidth = bold.widthOfTextAtSize(totalAmountStr, 10)
    page.drawText(`${totalAmountStr}.00`, { x: right - totalAmountWidth, y, size: 10, font: boldItalic })

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
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Reports</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8 transition-all">
        <div className="mb-8 border-b border-gray-100 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Report Filters</h2>
            <p className="text-sm text-gray-500 mt-1">Configure parameters to generate your desired report.</p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl w-max border border-gray-200">
            <button
              onClick={() => setReportType("daily")}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                reportType === "daily" 
                  ? "bg-white text-purple-700 shadow-sm ring-1 ring-black/5" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
              }`}
            >
              Daily Sale Report
            </button>
            <button
              onClick={() => setReportType("item")}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                reportType === "item" 
                  ? "bg-white text-purple-700 shadow-sm ring-1 ring-black/5" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
              }`}
            >
              Item Report
            </button>
          </div>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${reportType === 'daily' ? '2' : '3'} gap-5 mb-5`}>
          {reportType === "daily" ? (
            <div>
              <label className="block text-slate-600 text-xs font-semibold mb-2 uppercase tracking-wide">Address Filter</label>
              <SearchBar
                placeholder="Filter by address..."
                items={addresses}
                displayProperty="clientAddress"
                onSelect={handleAddressSelect}
                initialValue={addressFilter}
                searchTerm={addressFilter}
                setSearchTerm={setAddressFilter}
                className="w-full p-0.5 border border-gray-200 rounded-lg bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500 transition-all outline-none"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-2 uppercase tracking-wide">Select Product</label>
                <SearchBar
                  placeholder="Search product..."
                  items={products}
                  displayProperty="productNameForDropDown"
                  onSelect={handleProductSelect}
                  initialValue={selectedProduct}
                  searchTerm={selectedProduct}
                  setSearchTerm={setSelectedProduct}
                  className="w-full p-0.5 border border-gray-200 rounded-lg bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-2 uppercase tracking-wide">Address Filter</label>
                <SearchBar
                  placeholder="Filter by address..."
                  items={addresses}
                  displayProperty="clientAddress"
                  onSelect={handleAddressSelect}
                  initialValue={addressFilter}
                  searchTerm={addressFilter}
                  setSearchTerm={setAddressFilter}
                  className="w-full p-0.5 border border-gray-200 rounded-lg bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500 transition-all outline-none"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-slate-600 text-xs font-semibold mb-2 uppercase tracking-wide">Search Client/Invoice</label>
            <input
              type="text"
              placeholder="Search..."
              className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
          <div>
            <label className="block text-slate-600 text-xs font-semibold mb-2 uppercase tracking-wide">From Date</label>
            <input
              type="date"
              name="from"
              className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none text-gray-700"
              value={dateFilter.from}
              onChange={handleDateFilterChange}
            />
          </div>
          <div>
            <label className="block text-slate-600 text-xs font-semibold mb-2 uppercase tracking-wide">To Date</label>
            <input
              type="date"
              name="to"
              className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none text-gray-700"
              value={dateFilter.to}
              onChange={handleDateFilterChange}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleResetFilters}
              className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center text-sm border border-gray-200 h-[42px]"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Reset Filters
            </button>
          </div>
        </div>

        <div className="mb-5">
          <button 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-purple-600 hover:text-purple-700 font-semibold text-sm flex items-center transition-colors"
          >
            {showAdvancedFilters ? "Hide Advanced Filters" : "Show Advanced Filters"}
            <svg className={`w-4 h-4 ml-1 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 p-5 bg-slate-50 rounded-xl border border-slate-200/60 shadow-inner">
            <div>
              <label className="block text-slate-600 text-xs font-semibold mb-2 uppercase tracking-wide">Salesman Filter</label>
              <select
                className="w-full p-2.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none"
                value={salesmanFilter}
                onChange={(e) => setSalesmanFilter(e.target.value)}
              >
                <option value="">All Salesmen</option>
                {salesmen.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 text-xs font-semibold mb-2 uppercase tracking-wide">Field Officer Filter</label>
              <select
                className="w-full p-2.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none"
                value={fieldOfficerFilter}
                onChange={(e) => setFieldOfficerFilter(e.target.value)}
              >
                <option value="">All Field Officers</option>
                {fieldOfficers.map((f) => (
                  <option key={f._id} value={f._id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {reportType === "daily" && (
          <div className="mb-6">
            <label className="block text-slate-600 text-xs font-semibold mb-3 uppercase tracking-wide">Group By</label>
            <div className="flex flex-wrap gap-2">
              {['address', 'client', 'date'].map((type) => (
                <button
                  key={type}
                  onClick={() => setGroupBy(type)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    groupBy === type
                      ? "bg-purple-100 border-purple-200 text-purple-700 shadow-sm"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)} {type === 'date' ? '(Month/Year)' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center mt-8 pt-6 border-t border-gray-100 gap-4">
          <button onClick={fetchData} className="flex items-center text-gray-600 bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-lg font-medium transition-colors text-sm w-full sm:w-auto justify-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            Refresh Data
          </button>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={printReportPdf}
              className="flex-1 sm:flex-none flex items-center justify-center bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
              Print Report
            </button>
            <button
              onClick={generateReportPdf}
              className="flex-1 sm:flex-none flex items-center justify-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Generate PDF
            </button>
          </div>
        </div>
      </div>

      {reportType === "daily" ? (
        groupedBills().length > 0 ? (
          <div className="space-y-8">
            {groupedBills().map((group, groupIndex) => (
              <div key={groupIndex} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div className="flex items-center">
                    <div className="w-1.5 h-6 bg-purple-500 rounded-full mr-3"></div>
                    <h2 className="text-lg font-bold text-gray-800">{group.groupName}</h2>
                  </div>
                  <div className="text-right sm:text-left">
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Total Amount</div>
                    <div className="text-xl font-bold text-purple-700">PKR {group.totalAmount.toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Invoice No.
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Party Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Address
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {group.bills.map((bill) => (
                        <tr key={bill._id} className="hover:bg-slate-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            #{bill.billId ? bill.billId : bill._id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                            {bill.clientName || getClientName(bill.clientId)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {bill.clientAddress || getClientAddress(bill.clientId)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">
                            PKR {bill.totalAmount ? bill.totalAmount.toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : "0.00"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-3">
                            <a
                              href={`#/bill/${bill._id}`}
                              className="text-purple-600 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-md transition-colors"
                              onClick={() => {
                                storageService.setLocalItem("billSourcePage", "reports")
                              }}
                            >
                              View
                            </a>
                            <GeneratePdfButton bill={bill} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex justify-end">
              <div className="text-right">
                <div className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Grand Total</div>
                <div className="text-3xl font-extrabold text-gray-900">
                  PKR {calculateGrandTotal().toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 mx-auto bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No reports found</h3>
            <p className="text-gray-500">
              {addressFilter || dateFilter.from || dateFilter.to || searchTerm
                ? "We couldn't find any bills matching your current filter criteria."
                : "There are no bills available to display."}
            </p>
          </div>
        )
      ) : (
        // Item Report table rendering
        getItemReportData().length > 0 ? (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice No.</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Party Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {getItemReportData().map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">#{item.billId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{configService.formatDate(item.billDate)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{item.clientName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.clientAddress}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{item.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">PKR {item.amount.toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="bg-purple-50 px-6 py-3 rounded-xl border border-purple-100 flex items-center w-full sm:w-auto">
                <div className="text-sm text-purple-600 font-bold uppercase tracking-wider mr-4">Total Quantity</div>
                <div className="text-2xl font-black text-purple-700">{calculateItemTotals().totalQuantity}</div>
              </div>
              <div className="text-right w-full sm:w-auto">
                <div className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Total Amount</div>
                <div className="text-3xl font-extrabold text-gray-900">PKR {calculateItemTotals().totalAmount.toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 mx-auto bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No sales found</h3>
            <p className="text-gray-500">
              {selectedProductObj
                ? "No sales found for this product in the selected date range."
                : "Please select a product and date range to view the report."}
            </p>
          </div>
        )
      )}
    </div>
  )
}

export default Reports
