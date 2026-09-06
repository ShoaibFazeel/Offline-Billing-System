"use client"

import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import toast from "react-hot-toast"
import GeneratePdfButton from "./GeneratePdfButton"
import SearchBar from "./SearchBar"
import configService from "../services/ConfigService"
import storageService from "../services/StorageService"

function Reports() {
  const getDefaultDateFilter = () => {
    const todayStr = configService.getTodayIsoDate()

    return {
      from: todayStr,
      to: todayStr,
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
  const [reportType, setReportType] = useState("daily") // 'daily', 'item', or 'itemCompany'

  // Item Report State
  const [selectedProduct, setSelectedProduct] = useState("")
  const [selectedProductObj, setSelectedProductObj] = useState(null)

  // Item Company Report State
  const [selectedItemName, setSelectedItemName] = useState("")
  const [selectedCompanyForItem, setSelectedCompanyForItem] = useState("")

  // Company Filter for Daily Sale Report
  const [companies, setCompanies] = useState([])
  const [companyFilter, setCompanyFilter] = useState("")

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
            billId: 101,
            billNumber: "B001",
            billDate: new Date().toISOString(),
            clientId: "client1",
            clientName: "ABC Corporation",
            clientAddress: "Lahore",
            totalAmount: 5000,
            items: [
              {
                _id: "item1",
                productId: "product1",
                productName: "Product 1",
                quantity: 10,
                rate: 100,
                discount: 10,
                extraDiscount: 0,
                total: 900,
              },
            ],
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
        billsData = []
        clientsData = []
        productsData = []
        fieldOfficersData = []
        salesmenData = []
      }

      setBills(Array.isArray(billsData) ? billsData : billsData?.data || [])
      setClients(clientsData || [])
      setFieldOfficers(fieldOfficersData || [])
      setSalesmen(salesmenData || [])

      const newProductData = (productsData || []).map((product) => ({
        ...product,
        productName: (product.productName || "").trim(),
        companyName: (product.companyName || "").trim(),
        containerSize: (product.containerSize || "").trim(),
        productNameForDropDown: `${(product.productName || "").trim()} (${(product.companyName || "N/A").trim()} - ${(product.containerSize || "N/A").trim()})`,
      }))
      setProducts(newProductData)

      // Extract unique company names from products for Daily Report company filter
      const uniqueCompanies = [...new Set(newProductData.map((p) => p.companyName).filter(Boolean))].sort()
      setCompanies(uniqueCompanies)

      // Extract unique addresses from clients
      const uniqueAddresses = [...new Set((clientsData || []).map((client) => client.clientAddress))]
        .filter(Boolean)
        .sort()

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

  // Unique item names list for Item Company Report
  const uniqueProductItems = useMemo(() => {
    const map = new Map()
    products.forEach((p) => {
      const name = (p.productName || "").trim()
      if (!name) return
      if (!map.has(name)) {
        map.set(name, { _id: name, productName: name, companies: new Set() })
      }
      if (p.companyName) {
        map.get(name).companies.add(p.companyName.trim())
      }
    })
    return Array.from(map.values())
      .map((item) => ({
        _id: item._id,
        productName: item.productName,
        companies: Array.from(item.companies),
        companiesCount: item.companies.size,
      }))
      .sort((a, b) => a.productName.localeCompare(b.productName))
  }, [products])

  // Available companies for currently selected item in Item Company Report
  const availableCompaniesForItem = useMemo(() => {
    if (!selectedItemName) return []
    const cleanSearch = selectedItemName.trim().toLowerCase()
    const matching = products.filter(
      (p) => (p.productName || "").trim().toLowerCase() === cleanSearch
    )
    return [...new Set(matching.map((p) => (p.companyName || "").trim()).filter(Boolean))].sort()
  }, [products, selectedItemName])

  // Auto-adjust selected company if item changes
  useEffect(() => {
    if (availableCompaniesForItem.length === 1) {
      setSelectedCompanyForItem(availableCompaniesForItem[0])
    } else if (selectedCompanyForItem && !availableCompaniesForItem.includes(selectedCompanyForItem)) {
      setSelectedCompanyForItem("")
    }
  }, [availableCompaniesForItem])

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
    setAddressFilter(address ? address.clientAddress : "")
  }

  const handleProductSelect = (product) => {
    if (product) {
      setSelectedProductObj(product)
      setSelectedProduct(product.productName)
    } else {
      setSelectedProductObj(null)
      setSelectedProduct("")
    }
  }

  const handleItemSelect = (item) => {
    if (item) {
      const prodName = (item.productName || "").trim()
      setSelectedItemName(prodName)
    } else {
      setSelectedItemName("")
      setSelectedCompanyForItem("")
    }
  }

  const handleCompanySelect = (companyItem) => {
    const name = companyItem?.name || ""
    setCompanyFilter(name)
  }

  const handleResetFilters = async () => {
    setAddressFilter("")
    setSalesmanFilter("")
    setFieldOfficerFilter("")
    setCompanyFilter("")
    setSearchTerm("")
    setSelectedProduct("")
    setSelectedProductObj(null)
    setSelectedItemName("")
    setSelectedCompanyForItem("")
    const defaultDateFilter = getDefaultDateFilter()
    setDateFilter(defaultDateFilter)
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
    return client ? client.clientName : "Unknown"
  }

  // Calculate profit for a bill
  const calculateBillProfit = (bill) => {
    if (!bill.items || !Array.isArray(bill.items)) return 0

    return bill.items.reduce((totalProfit, item) => {
      if (item.isBonus) return totalProfit

      const product = products.find((p) => p._id === item.productId)
      if (!product) return totalProfit

      const purchasePrice = product.purchasePrice || 0
      const salePrice = item.total || 0
      const itemCost = purchasePrice * (item.quantity || 0)

      return totalProfit + (salePrice - itemCost)
    }, 0)
  }

  // ─────────────────────────────────────────────────────────────────
  // ITEM REPORT DATA
  // ─────────────────────────────────────────────────────────────────
  const itemReportData = useMemo(() => {
    if (!selectedProductObj) return []

    const data = []

    bills.forEach((bill) => {
      if (!bill || !bill.items || !Array.isArray(bill.items)) return

      const billDateStr = bill.billDate ? configService.formatIsoDate(bill.billDate) : ""
      let matchesDateRange = true
      if (dateFilter.from) {
        matchesDateRange = matchesDateRange && billDateStr >= dateFilter.from
      }
      if (dateFilter.to) {
        matchesDateRange = matchesDateRange && billDateStr <= dateFilter.to
      }

      const client = getClient(bill.clientId)
      const clientAddress = bill.clientAddress || client?.clientAddress || ""
      const matchesAddress = !addressFilter || clientAddress.toLowerCase().includes(addressFilter.toLowerCase())
      const matchesSalesman = !salesmanFilter || bill.salesmanId === salesmanFilter
      const matchesFieldOfficer = !fieldOfficerFilter || bill.fieldOfficerId === fieldOfficerFilter

      const clientName = bill.clientName || client?.clientName || ""
      const billIdStr = bill.billId ? String(bill.billId) : (bill._id || "")
      const matchesSearch =
        !searchTerm ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        billIdStr.toLowerCase().includes(searchTerm.toLowerCase())

      if (!matchesDateRange || !matchesAddress || !matchesSalesman || !matchesFieldOfficer || !matchesSearch) return

      bill.items.forEach((item) => {
        if (item.productId === selectedProductObj._id) {
          data.push({
            billId: bill.billId || bill._id,
            billDate: bill.billDate,
            clientName: bill.clientName || client?.clientName || "Unknown",
            clientAddress: clientAddress || "Unknown",
            quantity: item.quantity || 0,
            amount: item.total || 0,
          })
        }
      })
    })

    return data
  }, [bills, selectedProductObj, dateFilter, addressFilter, salesmanFilter, fieldOfficerFilter, searchTerm, clients])

  const itemTotals = useMemo(
    () => ({
      totalQuantity: itemReportData.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: itemReportData.reduce((sum, item) => sum + item.amount, 0),
    }),
    [itemReportData]
  )

  // ─────────────────────────────────────────────────────────────────
  // ITEM COMPANY REPORT DATA
  // ─────────────────────────────────────────────────────────────────
  const itemCompanyReportData = useMemo(() => {
    if (!selectedItemName) return []

    const cleanItemName = selectedItemName.trim().toLowerCase()

    // Build target product set matching selected item and (optionally) company
    const targetProductIds = new Set()
    products.forEach((p) => {
      const pName = (p.productName || "").trim().toLowerCase()
      const pComp = (p.companyName || "").trim()
      const matchesName = pName === cleanItemName
      const matchesCompany =
        !selectedCompanyForItem || pComp.toLowerCase() === selectedCompanyForItem.trim().toLowerCase()
      if (matchesName && matchesCompany) {
        targetProductIds.add(p._id)
      }
    })

    if (targetProductIds.size === 0) return []

    const data = []

    bills.forEach((bill) => {
      if (!bill || !bill.items || !Array.isArray(bill.items)) return

      const billDateStr = bill.billDate ? configService.formatIsoDate(bill.billDate) : ""
      let matchesDateRange = true
      if (dateFilter.from) {
        matchesDateRange = matchesDateRange && billDateStr >= dateFilter.from
      }
      if (dateFilter.to) {
        matchesDateRange = matchesDateRange && billDateStr <= dateFilter.to
      }

      const client = getClient(bill.clientId)
      const clientAddress = bill.clientAddress || client?.clientAddress || ""
      const matchesAddress = !addressFilter || clientAddress.toLowerCase().includes(addressFilter.toLowerCase())
      const matchesSalesman = !salesmanFilter || bill.salesmanId === salesmanFilter
      const matchesFieldOfficer = !fieldOfficerFilter || bill.fieldOfficerId === fieldOfficerFilter

      const clientName = bill.clientName || client?.clientName || ""
      const clientPhone = client?.clientNumber || client?.phoneNumber || "N/A"
      const billIdStr = bill.billId ? String(bill.billId) : (bill._id || "")
      const matchesSearch =
        !searchTerm ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        billIdStr.toLowerCase().includes(searchTerm.toLowerCase())

      if (!matchesDateRange || !matchesAddress || !matchesSalesman || !matchesFieldOfficer || !matchesSearch) return

      bill.items.forEach((item) => {
        let matches = targetProductIds.has(item.productId)

        if (!matches && item.productName) {
          const itemProdName = item.productName.trim().toLowerCase()
          if (itemProdName === cleanItemName) {
            const p = products.find((prod) => prod._id === item.productId)
            const pComp = (p?.companyName || "").trim()
            if (!selectedCompanyForItem || pComp.toLowerCase() === selectedCompanyForItem.trim().toLowerCase()) {
              matches = true
            }
          }
        }

        if (matches) {
          const qty = Number(item.quantity) || 0
          const rate = Number(item.rate) || 0
          const discount = Number(item.discount) || 0
          const extraDiscount = Number(item.extraDiscount) || 0
          const total =
            Number(item.total) ||
            Math.round(qty * rate * (1 - discount / 100) * (1 - extraDiscount / 100) * 100) / 100

          data.push({
            _id: item._id || `${bill._id}_${item.productId}`,
            billId: bill.billId || bill._id,
            billDate: bill.billDate,
            clientId: bill.clientId,
            clientName: clientName || "Unknown",
            clientAddress: clientAddress || "Unknown",
            clientPhone,
            quantity: qty,
            rate,
            discount,
            extraDiscount,
            total,
            isBonus: item.isBonus || false,
          })
        }
      })
    })

    return data
  }, [
    bills,
    selectedItemName,
    selectedCompanyForItem,
    dateFilter,
    addressFilter,
    salesmanFilter,
    fieldOfficerFilter,
    searchTerm,
    clients,
    products,
  ])

  const itemCompanyTotals = useMemo(
    () => ({
      totalQuantity: itemCompanyReportData.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: itemCompanyReportData.reduce((sum, item) => sum + item.total, 0),
      recordCount: itemCompanyReportData.length,
    }),
    [itemCompanyReportData]
  )

  // ─────────────────────────────────────────────────────────────────
  // DAILY SALE REPORT DATA
  // ─────────────────────────────────────────────────────────────────
  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      if (!bill || !bill.clientId) return false

      const client = getClient(bill.clientId)
      const clientAddress = bill.clientAddress || client?.clientAddress || ""
      const clientName = bill.clientName || client?.clientName || ""
      const billId = bill.billId ? String(bill.billId) : (bill._id || "")

      const matchesAddress = !addressFilter || clientAddress.toLowerCase().includes(addressFilter.toLowerCase())

      const billDateStr = bill.billDate ? configService.formatIsoDate(bill.billDate) : ""
      let matchesDateRange = true
      if (dateFilter.from) {
        matchesDateRange = matchesDateRange && billDateStr >= dateFilter.from
      }
      if (dateFilter.to) {
        matchesDateRange = matchesDateRange && billDateStr <= dateFilter.to
      }

      const matchesSearch =
        !searchTerm ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        billId.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesSalesman = !salesmanFilter || bill.salesmanId === salesmanFilter
      const matchesFieldOfficer = !fieldOfficerFilter || bill.fieldOfficerId === fieldOfficerFilter

      let matchesCompany = true
      if (companyFilter) {
        const productIdsOfCompany = new Set(
          products.filter((p) => p.companyName === companyFilter).map((p) => p._id)
        )
        matchesCompany = Array.isArray(bill.items) && bill.items.some((item) => productIdsOfCompany.has(item.productId))
      }

      return (
        matchesAddress &&
        matchesDateRange &&
        matchesSearch &&
        matchesSalesman &&
        matchesFieldOfficer &&
        matchesCompany
      )
    })
  }, [bills, addressFilter, dateFilter, searchTerm, salesmanFilter, fieldOfficerFilter, clients, companyFilter, products])

  // Group bills by selected criteria
  const groupedBills = useMemo(() => {
    if (groupBy === "address") {
      const groups = {}

      filteredBills.forEach((bill) => {
        const client = getClient(bill.clientId)
        const address = bill.clientAddress || client?.clientAddress || "Unknown Address"

        if (!groups[address]) {
          groups[address] = []
        }
        groups[address].push(bill)
      })

      return Object.entries(groups)
        .sort(([addrA], [addrB]) => addrA.localeCompare(addrB))
        .map(([address, bills]) => ({
          groupName: address,
          bills,
          totalAmount: bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0),
          totalProfit: bills.reduce((sum, bill) => sum + calculateBillProfit(bill), 0),
        }))
    } else if (groupBy === "client") {
      const groups = {}

      filteredBills.forEach((bill) => {
        const clientName = bill.clientName || getClientName(bill.clientId) || "Unknown Client"

        if (!groups[clientName]) {
          groups[clientName] = []
        }
        groups[clientName].push(bill)
      })

      return Object.entries(groups)
        .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
        .map(([clientName, bills]) => ({
          groupName: clientName,
          bills,
          totalAmount: bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0),
          totalProfit: bills.reduce((sum, bill) => sum + calculateBillProfit(bill), 0),
        }))
    } else if (groupBy === "date") {
      const groups = {}

      filteredBills.forEach((bill) => {
        const date = new Date(bill.billDate)
        if (Number.isNaN(date.getTime())) return
        const monthYear = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`

        if (!groups[monthYear]) {
          groups[monthYear] = []
        }
        groups[monthYear].push(bill)
      })

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
  }, [filteredBills, groupBy, clients])

  const calculateGrandTotal = useMemo(() => {
    return filteredBills.reduce((total, bill) => total + (bill.totalAmount || 0), 0)
  }, [filteredBills])

  // Helper function to draw wrapped text
  const drawWrappedText = (page, text, x, y, maxWidth, font, fontSize, color, lineHeightMultiplier = 1.2) => {
    const words = String(text || "").split(" ")
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

  // ─────────────────────────────────────────────────────────────────
  // PDF GENERATION: DAILY SALE REPORT
  // ─────────────────────────────────────────────────────────────────
  const generateReportPdfBytes = async () => {
    const companyInfo = await window.api.getCompanyInfo()
    const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib")
    const pdfDoc = await PDFDocument.create()

    const pageWidth = 410
    const pageHeight = 595.3
    const margin = 20
    const left = margin
    const right = pageWidth - margin

    let page = pdfDoc.addPage([pageWidth, pageHeight])
    let y = pageHeight - margin

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const italic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)
    const boldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic)

    const companyName = (companyInfo.companyName || "Company Name").replace(/[\r\n]+/g, " ")
    const companyAddress = (companyInfo.companyAddress || "Address").replace(/[\r\n]+/g, " ")
    const ownerInfo = `Owner: ${companyInfo.ownerName || ""} ${companyInfo.ownerPhone || "Phone"}`.replace(/[\r\n]+/g, " ")

    const nameSize = 14
    const nameWidth = bold.widthOfTextAtSize(companyName, nameSize)
    page.drawText(companyName, { x: (pageWidth - nameWidth) / 2, y, size: nameSize, font: bold })
    y -= 15

    const addrSize = 8
    const addrWidth = bold.widthOfTextAtSize(companyAddress, addrSize)
    page.drawText(companyAddress, { x: (pageWidth - addrWidth) / 2, y, size: addrSize, font: bold })
    y -= 12

    const ownerSize = 8
    const ownerWidth = bold.widthOfTextAtSize(ownerInfo, ownerSize)
    const ownerX = (pageWidth - ownerWidth) / 2
    page.drawText(ownerInfo, { x: ownerX, y, size: ownerSize, font: bold })
    y -= 2
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: rgb(0, 0, 0) })
    y -= 2

    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: rgb(0, 0, 0) })
    y -= 15

    const reportTitle = "Daily Sale Report"
    const titleWidth = bold.widthOfTextAtSize(reportTitle, 12)
    page.drawText(reportTitle, { x: (pageWidth - titleWidth) / 2, y, size: 12, font: bold })
    y -= 15

    const fromDateStr = dateFilter.from ? configService.formatDate(dateFilter.from) : "All"
    const toDateStr = dateFilter.to ? configService.formatDate(dateFilter.to) : "All"
    const dateRangeText = `Period: ${fromDateStr} to ${toDateStr}`
    page.drawText(dateRangeText, { x: left, y, size: 8, font: italic })
    y -= 12

    const col = {
      invoiceNo: left,
      partyName: left + 60,
      address: left + 200,
      amount: left + 300,
    }

    const drawTableHead = (currentPage, currentY) => {
      currentPage.drawLine({
        start: { x: left, y: currentY + 10 },
        end: { x: right, y: currentY + 10 },
        thickness: 1,
        color: rgb(0, 0, 0),
      })
      currentPage.drawText("Invoice No.", { x: col.invoiceNo, y: currentY, size: 8, font: boldItalic })
      currentPage.drawText("Party Name", { x: col.partyName, y: currentY, size: 8, font: boldItalic })
      currentPage.drawText("Address", { x: col.address, y: currentY, size: 8, font: boldItalic })
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

    let totalAmount = 0

    for (const group of groupedBills) {
      if (y < 80) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin - 20
        y = drawTableHead(page, y)
      }

      page.drawText(group.groupName, { x: left, y, size: 9, font: bold })
      y -= 12

      for (const bill of group.bills) {
        if (y < 60) {
          page = pdfDoc.addPage([pageWidth, pageHeight])
          y = pageHeight - margin - 20
          y = drawTableHead(page, y)
        }

        const inv = String(bill.billId || bill._id).substring(0, 10)
        page.drawText(`#${inv}`, { x: col.invoiceNo, y, size: 8, font: italic })

        const partyName = (bill.clientName || getClientName(bill.clientId)).toUpperCase()
        const partyNameY = drawWrappedText(page, partyName, col.partyName, y, col.address - col.partyName - 5, italic, 7, rgb(0, 0, 0), 1)

        const client = getClient(bill.clientId)
        const address = (bill.clientAddress || client?.clientAddress || "").toUpperCase()
        const addressY = drawWrappedText(page, address, col.address, y, col.amount - col.address - 5, italic, 7, rgb(0, 0, 0), 1)

        const amtStr = `${Math.round(bill.totalAmount || 0)}.00`
        const amtWidth = font.widthOfTextAtSize(amtStr, 8)
        page.drawText(amtStr, { x: right - amtWidth, y, size: 8, font: italic })

        totalAmount += bill.totalAmount || 0
        y = Math.min(partyNameY, addressY) - 4
      }
      y -= 4
    }

    if (y < 50) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin - 20
    }

    page.drawLine({ start: { x: left, y: y + 8 }, end: { x: right, y: y + 8 }, thickness: 1, color: rgb(0, 0, 0) })
    page.drawText("Grand Total :", { x: right - 160, y, size: 10, font: boldItalic })
    const grandStr = `${Math.round(totalAmount)}.00`
    const grandWidth = bold.widthOfTextAtSize(grandStr, 10)
    page.drawText(grandStr, { x: right - grandWidth, y, size: 10, font: boldItalic })

    return await pdfDoc.save()
  }

  // ─────────────────────────────────────────────────────────────────
  // PDF GENERATION: ITEM REPORT
  // ─────────────────────────────────────────────────────────────────
  const generateItemReportPdfBytes = async () => {
    const companyInfo = await window.api.getCompanyInfo()
    const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib")
    const pdfDoc = await PDFDocument.create()

    const pageWidth = 410
    const pageHeight = 595.3
    const margin = 20
    const left = margin
    const right = pageWidth - margin

    let page = pdfDoc.addPage([pageWidth, pageHeight])
    let y = pageHeight - margin

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const italic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)
    const boldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic)

    const sanitize = (text) => (text || "").replace(/[\r\n]+/g, " ")

    const companyName = sanitize(companyInfo.companyName || "Company Name")
    const companyAddress = sanitize(companyInfo.companyAddress || "Address")
    const ownerInfo = sanitize(`Owner: ${companyInfo.ownerName || ""} ${companyInfo.ownerPhone || "Phone"}`)

    const nameSize = 14
    const nameWidth = bold.widthOfTextAtSize(companyName, nameSize)
    page.drawText(companyName, { x: (pageWidth - nameWidth) / 2, y, size: nameSize, font: bold })
    y -= 15

    const addrSize = 8
    const addrWidth = bold.widthOfTextAtSize(companyAddress, addrSize)
    page.drawText(companyAddress, { x: (pageWidth - addrWidth) / 2, y, size: addrSize, font: bold })
    y -= 12

    const ownerSize = 8
    const ownerWidth = bold.widthOfTextAtSize(ownerInfo, ownerSize)
    page.drawText(ownerInfo, { x: (pageWidth - ownerWidth) / 2, y, size: ownerSize, font: bold })
    y -= 2
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: rgb(0, 0, 0) })
    y -= 2
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: rgb(0, 0, 0) })
    y -= 15

    const reportTitle = "Item Report"
    const titleWidth = bold.widthOfTextAtSize(reportTitle, 12)
    page.drawText(reportTitle, { x: (pageWidth - titleWidth) / 2, y, size: 12, font: bold })
    y -= 15

    const productName = sanitize(selectedProductObj?.productName || "N/A")
    const productCompany = sanitize(selectedProductObj?.companyName || "N/A")
    const packing = sanitize(selectedProductObj?.containerSize || "")
    page.drawText(`Product: ${productName} (${productCompany})`, { x: left, y, size: 9, font: boldItalic })
    y -= 10
    if (packing) {
      page.drawText(`Packing : ${packing}`, { x: left, y, size: 9, font: italic })
      y -= 10
    }
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: rgb(0, 0, 0) })
    y -= 15

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

    let totalQuantity = 0
    let totalAmount = 0

    for (const item of itemReportData) {
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
      page.drawText(`${amountStr}.00`, { x: right - amountWidth - 5, y, size: 8, font: italic })

      totalQuantity += item.quantity
      totalAmount += item.amount

      y = Math.min(partyNameY, addressY)
    }

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

  // ─────────────────────────────────────────────────────────────────
  // PDF GENERATION: ITEM COMPANY REPORT (NEW FEATURE)
  // ─────────────────────────────────────────────────────────────────
  const generateItemCompanyReportPdfBytes = async () => {
    const companyInfo = await window.api.getCompanyInfo()
    const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib")
    const pdfDoc = await PDFDocument.create()

    const pageWidth = 595.3
    const pageHeight = 841.9
    const margin = 25
    const left = margin
    const right = pageWidth - margin

    let page = pdfDoc.addPage([pageWidth, pageHeight])
    let y = pageHeight - margin

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const italic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)
    const boldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic)

    const sanitize = (text) => (text || "").replace(/[\r\n]+/g, " ")

    const companyName = sanitize(companyInfo.companyName || "Company Name")
    const companyAddress = sanitize(companyInfo.companyAddress || "Address")
    const ownerInfo = sanitize(`Owner: ${companyInfo.ownerName || ""} ${companyInfo.ownerPhone || "Phone"}`)

    const nameSize = 15
    const nameWidth = bold.widthOfTextAtSize(companyName, nameSize)
    page.drawText(companyName, { x: (pageWidth - nameWidth) / 2, y, size: nameSize, font: bold })
    y -= 16

    const addrSize = 8.5
    const addrWidth = bold.widthOfTextAtSize(companyAddress, addrSize)
    page.drawText(companyAddress, { x: (pageWidth - addrWidth) / 2, y, size: addrSize, font: bold })
    y -= 13

    const ownerSize = 8.5
    const ownerWidth = bold.widthOfTextAtSize(ownerInfo, ownerSize)
    page.drawText(ownerInfo, { x: (pageWidth - ownerWidth) / 2, y, size: ownerSize, font: bold })
    y -= 3
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: rgb(0, 0, 0) })
    y -= 3
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: rgb(0, 0, 0) })
    y -= 16

    const reportTitle = "Item Company Report"
    const titleWidth = bold.widthOfTextAtSize(reportTitle, 13)
    page.drawText(reportTitle, { x: (pageWidth - titleWidth) / 2, y, size: 13, font: bold })
    y -= 16

    const filterLine = `Item: ${selectedItemName}  |  Company: ${selectedCompanyForItem || "All Companies"}  |  Date: ${dateFilter.from} to ${dateFilter.to}`
    page.drawText(filterLine, { x: left, y, size: 9, font: boldItalic })
    y -= 12
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.8, color: rgb(0.2, 0.2, 0.2) })
    y -= 14

    const col = {
      billNo: left,
      date: left + 55,
      partyName: left + 120,
      phone: left + 250,
      address: left + 325,
      qty: left + 415,
      rate: left + 445,
      disc: left + 480,
      amount: left + 515,
    }

    const drawTableHead = (currentPage, currentY) => {
      currentPage.drawLine({
        start: { x: left, y: currentY + 9 },
        end: { x: right, y: currentY + 9 },
        thickness: 1,
        color: rgb(0, 0, 0),
      })
      currentPage.drawText("Bill #", { x: col.billNo, y: currentY, size: 8, font: boldItalic })
      currentPage.drawText("Date", { x: col.date, y: currentY, size: 8, font: boldItalic })
      currentPage.drawText("Party Name", { x: col.partyName, y: currentY, size: 8, font: boldItalic })
      currentPage.drawText("Phone", { x: col.phone, y: currentY, size: 8, font: boldItalic })
      currentPage.drawText("Address", { x: col.address, y: currentY, size: 8, font: boldItalic })
      currentPage.drawText("Qty", { x: col.qty, y: currentY, size: 8, font: boldItalic })
      currentPage.drawText("Rate", { x: col.rate, y: currentY, size: 8, font: boldItalic })
      currentPage.drawText("Disc %", { x: col.disc, y: currentY, size: 8, font: boldItalic })
      currentPage.drawText("Amount", { x: col.amount, y: currentY, size: 8, font: boldItalic })
      currentPage.drawLine({
        start: { x: left, y: currentY - 5 },
        end: { x: right, y: currentY - 5 },
        thickness: 1,
        color: rgb(0, 0, 0),
      })
      return currentY - 14
    }

    y = drawTableHead(page, y)

    let totalQuantity = 0
    let totalAmount = 0

    for (const item of itemCompanyReportData) {
      y -= 3
      if (y < 70) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin - 20
        y = drawTableHead(page, y)
      }

      page.drawText(`#${item.billId}`, { x: col.billNo, y, size: 7.5, font: italic })
      page.drawText(configService.formatDate(item.billDate), { x: col.date, y, size: 7.5, font: italic })

      const partyName = sanitize(item.clientName).toUpperCase()
      const partyNameY = drawWrappedText(page, partyName, col.partyName, y, col.phone - col.partyName - 5, italic, 7, rgb(0, 0, 0), 1)

      page.drawText(sanitize(item.clientPhone), { x: col.phone, y, size: 7, font: italic })

      const address = sanitize(item.clientAddress).toUpperCase()
      const addressY = drawWrappedText(page, address, col.address, y, col.qty - col.address - 5, italic, 7, rgb(0, 0, 0), 1)

      page.drawText(String(item.quantity), { x: col.qty, y, size: 7.5, font: italic })
      page.drawText(String(item.rate), { x: col.rate, y, size: 7.5, font: italic })

      const discStr = item.extraDiscount ? `${item.discount}+${item.extraDiscount}%` : `${item.discount}%`
      page.drawText(discStr, { x: col.disc, y, size: 7.5, font: italic })

      const amountStr = `${Math.round(item.total)}.00`
      const amountWidth = font.widthOfTextAtSize(amountStr, 7.5)
      page.drawText(amountStr, { x: right - amountWidth - 2, y, size: 7.5, font: italic })

      totalQuantity += item.quantity
      totalAmount += item.total

      y = Math.min(partyNameY, addressY) - 3
    }

    if (y < 60) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin - 20
    }

    y -= 8
    page.drawLine({ start: { x: left, y: y + 9 }, end: { x: right, y: y + 9 }, thickness: 1, color: rgb(0, 0, 0) })
    page.drawLine({ start: { x: left, y: y + 8 }, end: { x: right, y: y + 8 }, thickness: 1, color: rgb(0, 0, 0) })

    page.drawText("Total :", { x: col.address, y, size: 9, font: boldItalic })
    page.drawText(String(totalQuantity), { x: col.qty, y, size: 9, font: boldItalic })
    const totalAmountStr = `${Math.round(totalAmount)}.00`
    const totalAmountWidth = bold.widthOfTextAtSize(totalAmountStr, 9)
    page.drawText(totalAmountStr, { x: right - totalAmountWidth - 2, y, size: 9, font: boldItalic })

    return await pdfDoc.save()
  }

  // Download PDF
  const generateReportPdf = async () => {
    try {
      let pdfBytes
      let fileName
      const today = configService.getTodayIsoDate()

      if (reportType === "daily") {
        pdfBytes = await generateReportPdfBytes()
        fileName = `DailySaleReport-${today}.pdf`
      } else if (reportType === "item") {
        if (!selectedProductObj) {
          toast.error("Please select a product first")
          return
        }
        pdfBytes = await generateItemReportPdfBytes()
        fileName = `ItemReport-${(selectedProduct || "Product").replace(/\s+/g, "_")}-${today}.pdf`
      } else if (reportType === "itemCompany") {
        if (!selectedItemName) {
          toast.error("Please select an item first")
          return
        }
        pdfBytes = await generateItemCompanyReportPdfBytes()
        const compTag = selectedCompanyForItem ? selectedCompanyForItem.replace(/\s+/g, "_") : "AllCompanies"
        fileName = `ItemCompanyReport-${selectedItemName.replace(/\s+/g, "_")}-${compTag}-${today}.pdf`
      }

      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
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
      let pdfBytes
      if (reportType === "daily") {
        pdfBytes = await generateReportPdfBytes()
      } else if (reportType === "item") {
        if (!selectedProductObj) {
          toast.error("Please select a product first")
          return
        }
        pdfBytes = await generateItemReportPdfBytes()
      } else if (reportType === "itemCompany") {
        if (!selectedItemName) {
          toast.error("Please select an item first")
          return
        }
        pdfBytes = await generateItemCompanyReportPdfBytes()
      }

      const blob = new Blob([pdfBytes], { type: "application/pdf" })

      const base64String = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result.split(",")[1])
        reader.readAsDataURL(blob)
      })

      if (window.api && window.api.openPdf) {
        await window.api.openPdf(base64String)
        toast.success("Opening Report...")
      } else {
        const blobUrl = URL.createObjectURL(blob)
        const printWindow = window.open(blobUrl)

        if (!printWindow) {
          URL.revokeObjectURL(blobUrl)
          toast.error("Popup blocked. Please allow popups to print.")
          return
        }

        const cleanup = () => {
          URL.revokeObjectURL(blobUrl)
          printWindow.onbeforeunload = null
          printWindow.onafterprint = null
        }

        printWindow.onload = () => {
          printWindow.focus()
          printWindow.print()
        }
        printWindow.onafterprint = cleanup
        printWindow.onbeforeunload = cleanup
      }
    } catch (error) {
      toast.error("Failed to open report")
      console.error(error)
    }
  }

  const handleViewBill = () => {
    storageService.setLocalItem("billSourcePage", "reports")
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-3 text-sm font-semibold text-gray-600">Loading Report Data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Error Loading Data</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <button onClick={fetchData} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const currentTotal =
    reportType === "daily"
      ? calculateGrandTotal
      : reportType === "item"
      ? itemTotals.totalAmount
      : itemCompanyTotals.totalAmount

  const bannerLabel =
    reportType === "daily"
      ? "Daily Total"
      : reportType === "item"
      ? "Item Total"
      : "Item Company Total"

  return (
    <div className="max-w-7xl mx-auto pb-12 px-2 sm:px-4">
      {/* Top Header Banner */}
      <div className="mb-6 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl shadow-xl p-6 text-white flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
            <svg className="w-7 h-7 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Sales Reports</h1>
            <p className="text-blue-200 text-sm mt-0.5">Analyze daily sales, item performance, and company reports</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15">
          <svg className="w-5 h-5 text-blue-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="text-xs uppercase tracking-wider text-blue-200 font-semibold block">
              {bannerLabel}
            </span>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-white">
              PKR {currentTotal.toLocaleString("en-PK", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-5 mb-6">
        {/* Report Type Selector Tabs */}
        <div className="mb-5">
          <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-2">Report Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-slate-100 border border-slate-200 rounded-2xl shadow-inner">
            <button
              onClick={() => setReportType("daily")}
              aria-pressed={reportType === "daily"}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                reportType === "daily"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 13h4v8H3v-8zm7-6h4v14h-4V7zm7-4h4v18h-4V3z" />
              </svg>
              Daily Sale Report
            </button>
            <button
              onClick={() => setReportType("item")}
              aria-pressed={reportType === "item"}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                reportType === "item"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h10" />
              </svg>
              Item Report
            </button>
            <button
              onClick={() => setReportType("itemCompany")}
              aria-pressed={reportType === "itemCompany"}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                reportType === "itemCompany"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Item Company Report
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Report Filters
          </h2>
          <button
            onClick={handleResetFilters}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            Reset Filters
          </button>
        </div>

        {/* Dynamic Filters depending on report type */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {reportType === "daily" && (
            <>
              <div>
                <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>📍 Address Filter</span>
                  {addressFilter && (
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">Active</span>
                  )}
                </label>
                <SearchBar
                  placeholder="Select or search address..."
                  items={addresses}
                  displayProperty="clientAddress"
                  iconType="address"
                  accentColor="blue"
                  onSelect={handleAddressSelect}
                  initialValue={addressFilter}
                  searchTerm={addressFilter}
                  setSearchTerm={setAddressFilter}
                />
              </div>
              <div>
                <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>🏢 Company Filter</span>
                  {companyFilter && (
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">Active</span>
                  )}
                </label>
                <SearchBar
                  placeholder="Select or search company..."
                  items={companies.map((c) => ({ _id: c, name: c }))}
                  displayProperty="name"
                  iconType="company"
                  accentColor="blue"
                  onSelect={handleCompanySelect}
                  initialValue={companyFilter}
                  searchTerm={companyFilter}
                  setSearchTerm={setCompanyFilter}
                />
              </div>
            </>
          )}

          {reportType === "item" && (
            <>
              <div>
                <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>📦 Select Product <span className="text-emerald-600">*</span></span>
                  {selectedProduct && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">Selected</span>
                  )}
                </label>
                <SearchBar
                  placeholder="Select or search product..."
                  items={products}
                  displayProperty="productName"
                  iconType="product"
                  accentColor="emerald"
                  onSelect={handleProductSelect}
                  initialValue={selectedProduct}
                  searchTerm={selectedProduct}
                  setSearchTerm={setSelectedProduct}
                />
                {selectedProductObj && (
                  <div className="mt-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                    <span className="font-semibold truncate">
                      🏢 {selectedProductObj.companyName} • 📦 {selectedProductObj.containerSize}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleProductSelect(null)}
                      className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>📍 Address Filter</span>
                  {addressFilter && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">Active</span>
                  )}
                </label>
                <SearchBar
                  placeholder="Select or search address..."
                  items={addresses}
                  displayProperty="clientAddress"
                  iconType="address"
                  accentColor="emerald"
                  onSelect={handleAddressSelect}
                  initialValue={addressFilter}
                  searchTerm={addressFilter}
                  setSearchTerm={setAddressFilter}
                />
              </div>
            </>
          )}

          {reportType === "itemCompany" && (
            <>
              <div>
                <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>📦 1. Select Item <span className="text-purple-600">*</span></span>
                  {selectedItemName && (
                    <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-semibold">Selected</span>
                  )}
                </label>
                <SearchBar
                  placeholder="Select or search item name..."
                  items={uniqueProductItems}
                  displayProperty="productName"
                  iconType="product"
                  accentColor="purple"
                  onSelect={handleItemSelect}
                  initialValue={selectedItemName}
                  searchTerm={selectedItemName}
                  setSearchTerm={setSelectedItemName}
                />
                {selectedItemName && (
                  <div className="mt-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between text-xs text-purple-900">
                    <span className="font-semibold truncate">
                      {availableCompaniesForItem.length} compan{availableCompaniesForItem.length === 1 ? "y" : "ies"} available
                    </span>
                    <button
                      type="button"
                      onClick={() => handleItemSelect(null)}
                      className="text-purple-700 hover:text-purple-900 font-bold ml-2 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>🏢 2. Select Company</span>
                  {selectedCompanyForItem && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-semibold">Active</span>
                  )}
                </label>
                <SearchBar
                  placeholder={
                    !selectedItemName
                      ? "Select an item first..."
                      : availableCompaniesForItem.length === 0
                      ? "No companies found"
                      : "All Companies or select..."
                  }
                  items={availableCompaniesForItem.map((c) => ({ _id: c, name: c }))}
                  displayProperty="name"
                  iconType="company"
                  accentColor="purple"
                  disabled={!selectedItemName || availableCompaniesForItem.length === 0}
                  onSelect={(comp) => setSelectedCompanyForItem(comp ? comp.name : "")}
                  initialValue={selectedCompanyForItem}
                  searchTerm={selectedCompanyForItem}
                  setSearchTerm={setSelectedCompanyForItem}
                />
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>📍 Address Filter</span>
                  {addressFilter && (
                    <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-semibold">Active</span>
                  )}
                </label>
                <SearchBar
                  placeholder="Select or search address..."
                  items={addresses}
                  displayProperty="clientAddress"
                  iconType="address"
                  accentColor="purple"
                  onSelect={handleAddressSelect}
                  initialValue={addressFilter}
                  searchTerm={addressFilter}
                  setSearchTerm={setAddressFilter}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span>🔍 Search Client / Invoice</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center justify-center w-4 h-4">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Type party name or invoice number..."
                className="w-full pl-10 pr-10 h-11 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-all text-gray-800 placeholder-gray-400 shadow-sm"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 hover:bg-slate-200/80 rounded-full transition-colors"
                  title="Clear search"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Date Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span>📅 From Date</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center justify-center w-4 h-4">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="date"
                name="from"
                className="w-full pl-10 pr-4 h-11 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-all text-gray-800 shadow-sm"
                value={dateFilter.from}
                onChange={handleDateFilterChange}
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span>📅 To Date</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center justify-center w-4 h-4">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="date"
                name="to"
                className="w-full pl-10 pr-4 h-11 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-all text-gray-800 shadow-sm"
                value={dateFilter.to}
                onChange={handleDateFilterChange}
              />
            </div>
          </div>
        </div>

        {/* Advanced Filters (Salesman / Field Officer) */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase tracking-wider flex items-center transition-colors mb-4"
        >
          {showAdvancedFilters ? "Hide Advanced Filters" : "Show Advanced Filters"}
          <svg className={`w-4 h-4 ml-1 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvancedFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span>👤 Salesman Filter</span>
                {salesmanFilter && (
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">Active</span>
                )}
              </label>
              <SearchBar
                placeholder="All Salesmen (select to filter)..."
                items={salesmen}
                displayProperty="name"
                secondaryProperty="phoneNumber"
                iconType="user"
                onSelect={(s) => setSalesmanFilter(s ? s._id : "")}
                initialValue={salesmen.find((s) => s._id === salesmanFilter)?.name || ""}
                searchTerm={salesmen.find((s) => s._id === salesmanFilter)?.name || ""}
                setSearchTerm={(val) => {
                  if (!val) setSalesmanFilter("")
                }}
              />
            </div>
            <div>
              <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span>🛡️ Field Officer Filter</span>
                {fieldOfficerFilter && (
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">Active</span>
                )}
              </label>
              <SearchBar
                placeholder="All Field Officers (select to filter)..."
                items={fieldOfficers}
                displayProperty="name"
                secondaryProperty="phoneNumber"
                iconType="user"
                onSelect={(f) => setFieldOfficerFilter(f ? f._id : "")}
                initialValue={fieldOfficers.find((f) => f._id === fieldOfficerFilter)?.name || ""}
                searchTerm={fieldOfficers.find((f) => f._id === fieldOfficerFilter)?.name || ""}
                setSearchTerm={(val) => {
                  if (!val) setFieldOfficerFilter("")
                }}
              />
            </div>
          </div>
        )}

        {reportType === "daily" && (
          <div className="mb-4">
            <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-2">Group By</label>
            <div className="flex flex-wrap gap-2">
              {["address", "client", "date"].map((type) => (
                <button
                  key={type}
                  onClick={() => setGroupBy(type)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                    groupBy === type
                      ? "bg-blue-100 border-blue-200 text-blue-800 shadow-sm"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}{type === "date" ? " (Month/Year)" : ""}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 text-gray-600 bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-xl font-bold transition-colors text-sm w-full sm:w-auto justify-center border border-gray-200 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </button>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={printReportPdf}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Report
            </button>
            <button
              onClick={generateReportPdf}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg text-sm ${
                reportType === "itemCompany"
                  ? "bg-purple-600 hover:bg-purple-700"
                  : reportType === "item"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate PDF
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. DAILY SALE REPORT TABLE VIEW */}
      {/* ───────────────────────────────────────────────────────────── */}
      {reportType === "daily" && (
        groupedBills.length > 0 ? (
          <div className="space-y-6">
            {groupedBills.map((group, groupIndex) => (
              <div key={groupIndex} className="bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-800 text-sm">{group.groupName}</h3>
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                      {group.bills.length} invoice{group.bills.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-blue-700">
                    PKR {group.totalAmount.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice No.</th>
                        <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Party Name</th>
                        <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Address</th>
                        <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {group.bills.map((bill) => (
                        <tr key={bill._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700">
                            <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                              #{bill.billId ? bill.billId : bill._id}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                            {configService.formatDate(bill.billDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                            {bill.clientName || getClientName(bill.clientId)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {bill.clientAddress || getClientAddress(bill.clientId)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-gray-900">
                            PKR {(bill.totalAmount || 0).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                            <div className="flex justify-end items-center gap-2">
                              <Link
                                to={`/bill/${bill._id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
                                onClick={handleViewBill}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </Link>
                              <GeneratePdfButton bill={bill} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-4 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Grand Total</span>
              <div className="text-xl font-black text-gray-900">
                PKR {calculateGrandTotal.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-12 text-center">
            <div className="w-12 h-12 bg-slate-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">No reports found</h3>
            <p className="text-sm text-gray-500">
              {addressFilter || dateFilter.from || dateFilter.to || searchTerm
                ? "No bills match your current filter criteria."
                : "There are no bills available to display."}
            </p>
          </div>
        )
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. ITEM REPORT TABLE VIEW */}
      {/* ───────────────────────────────────────────────────────────── */}
      {reportType === "item" && (
        itemReportData.length > 0 ? (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-800 text-sm">Item Sales</h3>
                  {selectedProductObj && (
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                      {selectedProductObj.productName}
                    </span>
                  )}
                </div>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                  {itemReportData.length} record{itemReportData.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice No.</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Party Name</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Address</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {itemReportData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-700">
                          <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">#{item.billId}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                          {configService.formatDate(item.billDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{item.clientName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.clientAddress}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">{item.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-gray-900">
                          PKR {item.amount.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          <Link
                            to={`/bill/${item.billId}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors"
                            onClick={handleViewBill}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-gray-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Quantity Sold</span>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-black rounded-lg">{itemTotals.totalQuantity}</span>
                </div>
                <div className="text-xl font-black text-gray-900">
                  PKR {itemTotals.totalAmount.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-12 text-center">
            <div className="w-12 h-12 bg-slate-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">No sales found</h3>
            <p className="text-sm text-gray-500">
              {selectedProductObj
                ? "No sales found for this product in the selected date range."
                : "Please select a product and date range to view the report."}
            </p>
          </div>
        )
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. ITEM COMPANY REPORT TABLE VIEW (NEW FEATURE) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {reportType === "itemCompany" && (
        itemCompanyReportData.length > 0 ? (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-gray-800 text-sm">Item Sold Report</h3>
                  <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">
                    {selectedItemName}
                  </span>
                  {selectedCompanyForItem && (
                    <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full">
                      {selectedCompanyForItem}
                    </span>
                  )}
                </div>
                <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">
                  {itemCompanyTotals.recordCount} invoice{itemCompanyTotals.recordCount !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Bill Number</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Party Name</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Address</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Phone Number</th>
                      <th className="px-4 py-3.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-4 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Rate</th>
                      <th className="px-4 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Discount</th>
                      <th className="px-4 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total (PKR)</th>
                      <th className="px-4 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {itemCompanyReportData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-purple-50/40 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap text-sm font-bold text-purple-700">
                          <span className="px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-lg">#{row.billId}</span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600 font-medium">
                          {configService.formatDate(row.billDate)}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-sm font-bold text-gray-900">
                          {row.clientName}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-500">
                          {row.clientAddress}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600 font-mono">
                          {row.clientPhone}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-sm font-black text-gray-900 text-center">
                          {row.quantity}
                          {row.isBonus && (
                            <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                              Bonus
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700 font-semibold text-right">
                          PKR {row.rate.toLocaleString("en-PK")}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-700 font-medium text-right">
                          {row.discount}%{row.extraDiscount ? ` + ${row.extraDiscount}%` : ""}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-sm font-extrabold text-gray-900 text-right">
                          PKR {row.total.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-sm text-right font-medium">
                          <Link
                            to={`/bill/${row.billId}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition-colors"
                            onClick={handleViewBill}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Cards */}
              <div className="p-4 border-t border-gray-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Quantity:</span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-black rounded-lg">
                      {itemCompanyTotals.totalQuantity} units
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Invoices:</span>
                    <span className="px-3 py-1 bg-slate-200 text-slate-800 text-sm font-black rounded-lg">
                      {itemCompanyTotals.recordCount}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Amount:</span>
                  <div className="text-xl font-black text-purple-900">
                    PKR {itemCompanyTotals.totalAmount.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-12 text-center">
            <div className="w-12 h-12 bg-purple-50 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              {!selectedItemName ? "Please select an item" : "No sales found"}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              {!selectedItemName
                ? "Select an item from the dropdown above to view its companies and sales details."
                : `No sales records found for "${selectedItemName}" ${selectedCompanyForItem ? `by ${selectedCompanyForItem}` : ""} within the selected date range.`}
            </p>
          </div>
        )
      )}
    </div>
  )
}

export default Reports
