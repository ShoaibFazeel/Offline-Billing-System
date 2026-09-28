"use client"

import { Fragment, useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useNavigate, Link } from "react-router-dom"
import toast from "react-hot-toast"
import { useDropdownData } from "../hooks/useLazyData"
import dataService from "../services/DataService"
import configService from "../services/ConfigService"

function generateUniqueId() {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function calculateItemTotal(quantity, rate, discount = 0, extraDiscount = 0) {
  const afterDiscount = Number(quantity || 0) * Number(rate || 0) * (1 - Number(discount || 0) / 100)
  const finalTotal = afterDiscount * (1 - Number(extraDiscount || 0) / 100)
  return Math.round(finalTotal * 100) / 100
}

function emptyProductItem() {
  return {
    id: Date.now(),
    _id: generateUniqueId(),
    productId: "",
    productName: "",
    companyName: "",
    containerSize: "",
    quantity: 1,
    rate: 0,
    discount: 0,
    extraDiscount: 0,
    total: 0,
    isBonus: false,
    bonusItems: [],
  }
}

export default function BulkBillGeneration() {
  // Data loaded once & cached
  const { data: clients, refresh: refreshClients } = useDropdownData("clients")
  const { data: products, refresh: refreshProducts } = useDropdownData("products")
  const { data: fieldOfficers, refresh: refreshFieldOfficers } = useDropdownData("fieldOfficers")
  const { data: salesmen, refresh: refreshSalesmen } = useDropdownData("salesmen")

  // Shared batch params
  const [billDate, setBillDate] = useState(configService.getTodayIsoDate())
  const [selectedFieldOfficer, setSelectedFieldOfficer] = useState(null)
  const [selectedSalesman, setSelectedSalesman] = useState(null)
  const [fieldOfficerSearchTerm, setFieldOfficerSearchTerm] = useState("")
  const [salesmanSearchTerm, setSalesmanSearchTerm] = useState("")
  const [selectedFieldOfficerIndex, setSelectedFieldOfficerIndex] = useState(-1)
  const [selectedSalesmanIndex, setSelectedSalesmanIndex] = useState(-1)

  // Batch queue
  const [queuedBills, setQueuedBills] = useState([])
  const [editingBillIndex, setEditingBillIndex] = useState(null)
  const [isBillModalOpen, setIsBillModalOpen] = useState(false)
  const [isSavingBatch, setIsSavingBatch] = useState(false)
  const [savedBatchResult, setSavedBatchResult] = useState(null)
  const [confirmationDialog, setConfirmationDialog] = useState(null)

  // Bill composer (inside modal)
  const [currentBillClient, setCurrentBillClient] = useState(null)
  const [clientSearchTerm, setClientSearchTerm] = useState("")
  const [selectedClientIndex, setSelectedClientIndex] = useState(-1)
  const [currentBillItems, setCurrentBillItems] = useState([])
  const [billTotal, setBillTotal] = useState(0)

  // Product modal (mirrors BillGeneration)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingItemIndex, setEditingItemIndex] = useState(null)
  const [addedItemsSearchTerm, setAddedItemsSearchTerm] = useState("")
  const [currentItem, setCurrentItem] = useState(emptyProductItem())
  const [productSearchTerm, setProductSearchTerm] = useState("")
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1)
  const [bonusProductSearchTerms, setBonusProductSearchTerms] = useState({})
  const [showBonusProductDropdowns, setShowBonusProductDropdowns] = useState({})
  const [selectedBonusProductIndex, setSelectedBonusProductIndex] = useState({})

  // Refs
  const fieldOfficerSearchRef = useRef(null)
  const salesmanSearchRef = useRef(null)
  const clientSearchRef = useRef(null)
  const productSearchRef = useRef(null)
  const bonusProductSearchRefs = useRef({})
  const addProductButtonRef = useRef(null)
  const fieldOfficerDropdownRef = useRef(null)
  const salesmanDropdownRef = useRef(null)
  const clientDropdownRef = useRef(null)
  const productDropdownRef = useRef(null)
  const bonusProductDropdownRefs = useRef({})
  const confirmationButtonRef = useRef(null)
  const confirmationReturnFocusRef = useRef(null)

  // Register cache callbacks
  useEffect(() => {
    dataService.registerRefreshCallback("products", refreshProducts)
    dataService.registerRefreshCallback("clients", refreshClients)
    dataService.registerRefreshCallback("fieldOfficers", refreshFieldOfficers)
    dataService.registerRefreshCallback("salesmen", refreshSalesmen)
    return () => {
      dataService.unregisterRefreshCallback("products", refreshProducts)
      dataService.unregisterRefreshCallback("clients", refreshClients)
      dataService.unregisterRefreshCallback("fieldOfficers", refreshFieldOfficers)
      dataService.unregisterRefreshCallback("salesmen", refreshSalesmen)
    }
  }, [refreshProducts, refreshClients, refreshFieldOfficers, refreshSalesmen])

  // Recalculate bill total when items change
  useEffect(() => {
    const total = currentBillItems.reduce((sum, item) => (!item.isBonus ? sum + Number(item.total || 0) : sum), 0)
    setBillTotal(Math.round(total * 100) / 100)
  }, [currentBillItems])

  // Auto-focus product search when modal opens
  useEffect(() => {
    if (isProductModalOpen) {
      setTimeout(() => { if (productSearchRef.current) productSearchRef.current.focus() }, 150)
    }
  }, [isProductModalOpen])

  // Click-outside: close all dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fieldOfficerDropdownRef.current && !fieldOfficerDropdownRef.current.contains(event.target) &&
          fieldOfficerSearchRef.current && !fieldOfficerSearchRef.current.contains(event.target)) {
        setFieldOfficerSearchTerm("")
      }
      if (salesmanDropdownRef.current && !salesmanDropdownRef.current.contains(event.target) &&
          salesmanSearchRef.current && !salesmanSearchRef.current.contains(event.target)) {
        setSalesmanSearchTerm("")
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target) &&
          clientSearchRef.current && !clientSearchRef.current.contains(event.target)) {
        setClientSearchTerm("")
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target) &&
          productSearchRef.current && !productSearchRef.current.contains(event.target)) {
        setShowProductDropdown(false)
      }
      Object.keys(bonusProductDropdownRefs.current).forEach((key) => {
        const dr = bonusProductDropdownRefs.current[key]
        const ir = bonusProductSearchRefs.current[key]
        if (dr && !dr.contains(event.target) && ir && !ir.contains(event.target)) {
          setShowBonusProductDropdowns((prev) => ({ ...prev, [key]: false }))
        }
      })
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Keyboard shortcuts inside product modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      const modifierPressed = e.ctrlKey || e.metaKey

      if (confirmationDialog) {
        if (e.key === "Escape") {
          e.preventDefault()
          setConfirmationDialog(null)
        }
        return
      }

      if (e.key === "Escape" && isProductModalOpen) { e.preventDefault(); closeProductModal(); return }
      if (modifierPressed && e.shiftKey && e.key.toLowerCase() === "a" && isBillModalOpen && !isProductModalOpen) {
        e.preventDefault(); openAddProductModal(); return
      }
      if (modifierPressed && e.shiftKey && e.key.toLowerCase() === "b" && !isBillModalOpen && !isProductModalOpen) {
        e.preventDefault(); openNewBillModal(); return
      }
      if (modifierPressed && e.shiftKey && e.key === "Enter" && isProductModalOpen) {
        e.preventDefault(); closeProductModal(); return
      }
      if (modifierPressed && !e.shiftKey && e.key.toLowerCase() === "s" && !isBillModalOpen && !isProductModalOpen) {
        e.preventDefault()
        if (queuedBills.length > 0) handleSaveAllBills()
        return
      }
      if (modifierPressed && !e.shiftKey && e.key === "Enter") {
        if (isProductModalOpen && currentItem.productId) { e.preventDefault(); addCurrentItemToBill() }
        else if (isBillModalOpen && !isProductModalOpen) { e.preventDefault(); handleDoneCurrentBill() }
      } else if (modifierPressed && !e.shiftKey && e.key.toLowerCase() === "b") {
        if (isProductModalOpen) {
          e.preventDefault()
          if (currentItem.productId) addBonusItem()
          else toast.error("Please select a product first before adding a bonus item")
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    currentItem,
    currentBillClient,
    currentBillItems,
    billDate,
    editingBillIndex,
    queuedBills,
    products,
    batchStats,
    selectedFieldOfficer,
    selectedSalesman,
    isSavingBatch,
    confirmationDialog,
    isBillModalOpen,
    isProductModalOpen,
    editingItemIndex,
  ])

  useEffect(() => {
    if (confirmationDialog) {
      confirmationButtonRef.current?.focus()
    } else if (confirmationReturnFocusRef.current) {
      confirmationReturnFocusRef.current.focus()
      confirmationReturnFocusRef.current = null
    }
  }, [confirmationDialog])

  const openConfirmationDialog = (dialog) => {
    confirmationReturnFocusRef.current = document.activeElement
    setConfirmationDialog(dialog)
  }

  const confirmDialogAction = () => {
    const action = confirmationDialog?.onConfirm
    setConfirmationDialog(null)
    action?.()
  }

  // Scroll selected dropdown item into view
  useEffect(() => {
    if (selectedClientIndex >= 0 && clientDropdownRef.current) {
      const el = clientDropdownRef.current.children[selectedClientIndex]
      if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [selectedClientIndex])
  useEffect(() => {
    if (selectedFieldOfficerIndex >= 0 && fieldOfficerDropdownRef.current) {
      const el = fieldOfficerDropdownRef.current.children[selectedFieldOfficerIndex]
      if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [selectedFieldOfficerIndex])
  useEffect(() => {
    if (selectedSalesmanIndex >= 0 && salesmanDropdownRef.current) {
      const el = salesmanDropdownRef.current.children[selectedSalesmanIndex]
      if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [selectedSalesmanIndex])
  useEffect(() => {
    if (selectedProductIndex >= 0 && productDropdownRef.current) {
      const el = productDropdownRef.current.children[selectedProductIndex]
      if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [selectedProductIndex])
  useEffect(() => {
    Object.keys(selectedBonusProductIndex).forEach((key) => {
      const idx = selectedBonusProductIndex[key]
      if (idx >= 0 && bonusProductDropdownRefs.current[key]) {
        const el = bonusProductDropdownRefs.current[key].children[idx]
        if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" })
      }
    })
  }, [selectedBonusProductIndex])

  // --- Memoised filtered lists ---
  const filteredFieldOfficers = useMemo(() => {
    if (!fieldOfficerSearchTerm.trim()) return []
    const term = fieldOfficerSearchTerm.toLowerCase()
    const m = []
    for (let i = 0; i < fieldOfficers.length; i++) {
      const o = fieldOfficers[i]
      if ((o.name && o.name.toLowerCase().includes(term)) || (o.phoneNumber && o.phoneNumber.includes(term))) { m.push(o); if (m.length >= 50) break }
    }
    return m
  }, [fieldOfficers, fieldOfficerSearchTerm])

  const filteredSalesmen = useMemo(() => {
    if (!salesmanSearchTerm.trim()) return []
    const term = salesmanSearchTerm.toLowerCase()
    const m = []
    for (let i = 0; i < salesmen.length; i++) {
      const s = salesmen[i]
      if ((s.name && s.name.toLowerCase().includes(term)) || (s.phoneNumber && s.phoneNumber.includes(term))) { m.push(s); if (m.length >= 50) break }
    }
    return m
  }, [salesmen, salesmanSearchTerm])

  const filteredClients = useMemo(() => {
    if (!clientSearchTerm.trim()) return []
    const term = clientSearchTerm.toLowerCase()
    const m = []
    for (let i = 0; i < clients.length; i++) {
      const c = clients[i]
      if ((c.clientName && c.clientName.toLowerCase().includes(term)) || (c.clientNumber && c.clientNumber.includes(term))) { m.push(c); if (m.length >= 50) break }
    }
    return m
  }, [clients, clientSearchTerm])

  const getFilteredProducts = useCallback((searchTerm, maxLimit = 50) => {
    if (!searchTerm || !searchTerm.trim()) return []
    const term = searchTerm.toLowerCase().trim()
    const m = []
    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      if ((p.productName && p.productName.toLowerCase().includes(term)) || (p.companyName && p.companyName.toLowerCase().includes(term))) { m.push(p); if (m.length >= maxLimit) break }
    }
    return m
  }, [products])

  const currentFilteredProducts = useMemo(() => getFilteredProducts(productSearchTerm, 50), [getFilteredProducts, productSearchTerm])
  const filteredBonusProducts = useCallback((term) => getFilteredProducts(term, 50), [getFilteredProducts])

  const filteredAddedBillItems = useMemo(() => {
    if (!addedItemsSearchTerm) return currentBillItems
    const term = addedItemsSearchTerm.toLowerCase().trim()
    return currentBillItems.filter((item) =>
      (item.productName && item.productName.toLowerCase().includes(term)) ||
      (item.companyName && item.companyName.toLowerCase().includes(term))
    )
  }, [addedItemsSearchTerm, currentBillItems])

  const batchStats = useMemo(() => ({
    totalBills: queuedBills.length,
    totalAmount: Math.round(queuedBills.reduce((s, b) => s + Number(b.totalAmount || 0), 0) * 100) / 100,
    totalItems: queuedBills.reduce((s, b) => s + (b.items ? b.items.length : 0), 0),
  }), [queuedBills])

  // --- Keyboard handlers ---
  const handleFieldOfficerKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); setFieldOfficerSearchTerm(""); return }
    if (!filteredFieldOfficers.length) return
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedFieldOfficerIndex((p) => p === -1 ? 0 : Math.min(p + 1, filteredFieldOfficers.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedFieldOfficerIndex((p) => p === -1 ? 0 : Math.max(p - 1, 0)) }
    else if (e.key === "Enter" && selectedFieldOfficerIndex >= 0) { e.preventDefault(); handleFieldOfficerSelect(filteredFieldOfficers[selectedFieldOfficerIndex]) }
  }
  const handleSalesmanKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); setSalesmanSearchTerm(""); return }
    if (!filteredSalesmen.length) return
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedSalesmanIndex((p) => p === -1 ? 0 : Math.min(p + 1, filteredSalesmen.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedSalesmanIndex((p) => p === -1 ? 0 : Math.max(p - 1, 0)) }
    else if (e.key === "Enter" && selectedSalesmanIndex >= 0) { e.preventDefault(); handleSalesmanSelect(filteredSalesmen[selectedSalesmanIndex]) }
  }
  const handleClientKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); setClientSearchTerm(""); return }
    if (!filteredClients.length) return
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedClientIndex((p) => p === -1 ? 0 : Math.min(p + 1, filteredClients.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedClientIndex((p) => p === -1 ? 0 : Math.max(p - 1, 0)) }
    else if (e.key === "Enter" && selectedClientIndex >= 0) { e.preventDefault(); handleClientSelect(filteredClients[selectedClientIndex]) }
  }
  const handleProductKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); setShowProductDropdown(false); return }
    if (!showProductDropdown || !currentFilteredProducts.length) return
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedProductIndex((p) => Math.min(p + 1, currentFilteredProducts.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedProductIndex((p) => Math.max(p - 1, 0)) }
    else if (e.key === "Enter" && selectedProductIndex >= 0) { e.preventDefault(); const pr = currentFilteredProducts[selectedProductIndex]; if (pr) handleProductSelect(pr._id) }
  }
  const handleBonusProductKeyDown = (e, bonusIndex) => {
    const key = `${bonusIndex}`
    if (e.key === "Escape") { e.preventDefault(); setShowBonusProductDropdowns((p) => ({ ...p, [key]: false })); return }
    const filtered = filteredBonusProducts(bonusProductSearchTerms[key] || "")
    if (!showBonusProductDropdowns[key] || !filtered.length) return
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedBonusProductIndex((p) => ({ ...p, [key]: Math.min((p[key] ?? -1) + 1, filtered.length - 1) })) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedBonusProductIndex((p) => ({ ...p, [key]: Math.max((p[key] ?? 0) - 1, 0) })) }
    else if (e.key === "Enter") { e.preventDefault(); const idx = selectedBonusProductIndex[key]; const pr = (idx !== undefined && idx >= 0) ? filtered[idx] : filtered[0]; if (pr) handleBonusProductSelect(bonusIndex, pr._id) }
  }

  // --- Select handlers ---
  const handleFieldOfficerSelect = (officer) => { setSelectedFieldOfficer(officer); setFieldOfficerSearchTerm(""); setSelectedFieldOfficerIndex(-1) }
  const handleSalesmanSelect = (salesman) => { setSelectedSalesman(salesman); setSalesmanSearchTerm(""); setSelectedSalesmanIndex(-1) }
  const handleClientSelect = (client) => { setCurrentBillClient(client); setClientSearchTerm(""); setSelectedClientIndex(-1) }

  const handleProductSelect = async (productId) => {
    const product = products.find((p) => p._id === productId)
    if (!product) return
    let rate = product.productPrice, discount = 0, extraDiscount = 0
    if (currentBillClient) {
      try {
        const cp = await window.api.getClientProduct(currentBillClient._id, productId)
        if (cp) { rate = cp.rate; discount = cp.discount; extraDiscount = cp.extraDiscount || 0 }
      } catch (err) { console.error("Error fetching client product history:", err) }
    }
    setCurrentItem({
      ...currentItem, productId, productName: product.productName,
      companyName: product.companyName || "", containerSize: product.containerSize || "",
      rate, discount, extraDiscount,
      total: calculateItemTotal(currentItem.quantity, rate, discount, extraDiscount),
      availableQuantity: product.hasInfiniteQuantity !== false ? Infinity : product.quantity,
      hasInfiniteQuantity: product.hasInfiniteQuantity !== false,
    })
    setProductSearchTerm(""); setShowProductDropdown(false); setSelectedProductIndex(-1)
    setTimeout(() => { const q = document.getElementById("bulk-item-quantity"); if (q) { q.focus(); q.select() } }, 100)
  }

  const handleInputChange = (field, value) => {
    if (["quantity", "rate", "discount", "extraDiscount"].includes(field)) value = parseFloat(value) || 0
    if (field === "quantity" && !currentItem.hasInfiniteQuantity && value > currentItem.availableQuantity) {
      toast.error(`Only ${currentItem.availableQuantity} units of ${currentItem.productName} are available`)
      value = currentItem.availableQuantity
    }
    const updated = { ...currentItem, [field]: value }
    if (["quantity", "rate", "discount", "extraDiscount"].includes(field)) {
      updated.total = calculateItemTotal(updated.quantity, updated.rate, updated.discount, updated.extraDiscount)
    }
    setCurrentItem(updated)
  }

  const handleBonusInputChange = (bonusIndex, field, value) => {
    const updatedBonusItems = [...currentItem.bonusItems]
    if (["quantity", "rate", "discount"].includes(field)) value = parseFloat(value) || 0
    const bonusItem = updatedBonusItems[bonusIndex]
    if (field === "quantity" && bonusItem.hasInfiniteQuantity === false && value > bonusItem.availableQuantity) {
      toast.error(`Only ${bonusItem.availableQuantity} units of ${bonusItem.productName} are available`)
      value = bonusItem.availableQuantity
    }
    updatedBonusItems[bonusIndex] = { ...updatedBonusItems[bonusIndex], [field]: value }
    if (["quantity", "rate", "discount"].includes(field)) {
      updatedBonusItems[bonusIndex].total = calculateItemTotal(updatedBonusItems[bonusIndex].quantity, updatedBonusItems[bonusIndex].rate, updatedBonusItems[bonusIndex].discount)
    }
    setCurrentItem({ ...currentItem, bonusItems: updatedBonusItems })
  }

  const handleBonusProductSelect = async (bonusIndex, productId) => {
    const product = products.find((p) => p._id === productId)
    if (!product) return
    const updatedBonusItems = [...currentItem.bonusItems]
    updatedBonusItems[bonusIndex] = {
      ...updatedBonusItems[bonusIndex], productId, productName: product.productName,
      companyName: product.companyName || "", containerSize: product.containerSize || "",
      rate: product.productPrice,
      availableQuantity: product.hasInfiniteQuantity !== false ? Infinity : product.quantity,
      hasInfiniteQuantity: product.hasInfiniteQuantity !== false,
      total: calculateItemTotal(updatedBonusItems[bonusIndex].quantity, product.productPrice, updatedBonusItems[bonusIndex].discount),
    }
    setCurrentItem({ ...currentItem, bonusItems: updatedBonusItems })
    const key = `${bonusIndex}`
    setBonusProductSearchTerms((p) => ({ ...p, [key]: "" }))
    setShowBonusProductDropdowns((p) => ({ ...p, [key]: false }))
    setSelectedBonusProductIndex((p) => ({ ...p, [key]: -1 }))
    setTimeout(() => { const q = document.getElementById(`bonus-quantity-${bonusIndex}`); if (q) { q.focus(); q.select() } }, 100)
  }

  const handleProductSearchChange = (value) => { setProductSearchTerm(value); setShowProductDropdown(value.trim() !== ""); setSelectedProductIndex(-1) }
  const handleBonusProductSearchChange = (bonusIndex, value) => {
    const key = `${bonusIndex}`
    setBonusProductSearchTerms((p) => ({ ...p, [key]: value }))
    setShowBonusProductDropdowns((p) => ({ ...p, [key]: value.trim() !== "" }))
    setSelectedBonusProductIndex((p) => ({ ...p, [key]: value.trim() !== "" ? 0 : -1 }))
  }

  const clearProductSelection = () => {
    setCurrentItem({ ...currentItem, productId: "", productName: "", companyName: "", containerSize: "", rate: 0, discount: 0, extraDiscount: 0, total: 0 })
    setProductSearchTerm("")
  }
  const clearBonusProductSelection = (bonusIndex) => {
    const updatedBonusItems = [...currentItem.bonusItems]
    updatedBonusItems[bonusIndex] = { ...updatedBonusItems[bonusIndex], productId: "", productName: "", companyName: "", containerSize: "", rate: 0, discount: 0, total: 0 }
    setCurrentItem({ ...currentItem, bonusItems: updatedBonusItems })
    const key = `${bonusIndex}`
    setBonusProductSearchTerms((p) => ({ ...p, [key]: "" }))
    setSelectedBonusProductIndex((p) => ({ ...p, [key]: -1 }))
  }

  // Product modal open/close/add/edit
  const openAddProductModal = () => {
    if (!currentBillClient) { toast.error("Please select a client first"); clientSearchRef.current?.focus(); return }
    setCurrentItem(emptyProductItem()); setProductSearchTerm(""); setAddedItemsSearchTerm(""); setEditingItemIndex(null); setIsProductModalOpen(true)
  }
  const closeProductModal = () => {
    setIsProductModalOpen(false)
    setEditingItemIndex(null)
    setProductSearchTerm("")
    setAddedItemsSearchTerm("")
    setTimeout(() => addProductButtonRef.current?.focus(), 0)
  }

  const addCurrentItemToBill = () => {
    if (!currentItem.productId) { toast.error("Please select a product first"); return }
    const itemToAdd = { ...currentItem, isBonus: false, total: calculateItemTotal(currentItem.quantity, currentItem.rate, currentItem.discount, currentItem.extraDiscount) }
    if (editingItemIndex !== null) {
      const updated = [...currentBillItems]; updated[editingItemIndex] = itemToAdd; setCurrentBillItems(updated)
      toast.success("Item updated"); setEditingItemIndex(null)
    } else {
      setCurrentBillItems((prev) => [...prev, itemToAdd]); toast.success(`${itemToAdd.productName} added to bill`)
    }
    setCurrentItem(emptyProductItem()); setProductSearchTerm("")
    setTimeout(() => { if (productSearchRef.current) productSearchRef.current.focus() }, 100)
  }

  const removeItemFromBill = (index) => {
    setCurrentBillItems((prev) => prev.filter((_, i) => i !== index))
    if (editingItemIndex === index) { setEditingItemIndex(null); setCurrentItem(emptyProductItem()) }
    else if (editingItemIndex !== null && editingItemIndex > index) setEditingItemIndex(editingItemIndex - 1)
    toast.success("Item removed")
  }
  const editItemFromBill = (index) => { setCurrentItem({ ...currentBillItems[index] }); setEditingItemIndex(index); setProductSearchTerm(""); setIsProductModalOpen(true) }

  const addBonusItem = () => {
    const updatedBonusItems = [...currentItem.bonusItems, { id: Date.now(), _id: generateUniqueId(), productId: "", productName: "", companyName: "", containerSize: "", quantity: 1, rate: 0, discount: 0, total: 0, isBonus: true }]
    setCurrentItem({ ...currentItem, bonusItems: updatedBonusItems })
    setTimeout(() => { const key = currentItem.bonusItems.length - 1; if (bonusProductSearchRefs.current[key]) bonusProductSearchRefs.current[key].focus() }, 100)
  }
  const removeBonusItem = (bonusIndex) => {
    const updatedBonusItems = currentItem.bonusItems.filter((_, i) => i !== bonusIndex)
    setCurrentItem({ ...currentItem, bonusItems: updatedBonusItems })
    const key = `${bonusIndex}`
    setBonusProductSearchTerms((p) => { const n = { ...p }; delete n[key]; return n })
    setShowBonusProductDropdowns((p) => { const n = { ...p }; delete n[key]; return n })
    setSelectedBonusProductIndex((p) => { const n = { ...p }; delete n[key]; return n })
  }

  // Bill modal open/close/commit
  const openNewBillModal = () => {
    if (!selectedFieldOfficer) { toast.error("Please select a Field Officer first"); fieldOfficerSearchRef.current?.focus(); return }
    if (!selectedSalesman) { toast.error("Please select a Salesman first"); salesmanSearchRef.current?.focus(); return }
    setEditingBillIndex(null); setCurrentBillClient(null); setClientSearchTerm(""); setCurrentBillItems([]); setBillTotal(0)
    setIsBillModalOpen(true)
    setTimeout(() => clientSearchRef.current?.focus(), 150)
  }
  const openEditBillModal = (index) => {
    const b = queuedBills[index]
    setEditingBillIndex(index)
    setCurrentBillClient({ _id: b.clientId, clientName: b.clientName, clientAddress: b.clientAddress, isFiler: b.isFiler, clientNumber: b.clientNumber || "" })
    setClientSearchTerm(""); setCurrentBillItems(JSON.parse(JSON.stringify(b.rawItems || b.items || []))); setIsBillModalOpen(true)
  }

  const handleDoneCurrentBill = () => {
    if (!currentBillClient) { toast.error("Please select a client for this bill"); clientSearchRef.current?.focus(); return }
    if (!currentBillItems.length) { toast.error("Please add at least one product to this bill"); return }

    const allBillItems = []
    currentBillItems.forEach((item) => {
      allBillItems.push({ _id: item._id || generateUniqueId(), productId: item.productId, productName: item.productName, companyName: item.companyName || "", containerSize: item.containerSize || "", quantity: item.quantity, rate: item.rate, discount: item.discount, extraDiscount: item.extraDiscount, total: item.total, isBonus: false })
      if (item.bonusItems && item.bonusItems.length > 0) {
        item.bonusItems.forEach((bonus) => {
          if (bonus.productId) allBillItems.push({ _id: bonus._id || generateUniqueId(), productId: bonus.productId, productName: bonus.productName, companyName: bonus.companyName || "", containerSize: bonus.containerSize || "", quantity: bonus.quantity, rate: bonus.rate, discount: bonus.discount, total: 0, isBonus: true })
        })
      }
    })

    const roundedTotal = Math.round(allBillItems.reduce((sum, it) => (!it.isBonus ? sum + Number(it.total || 0) : sum), 0) * 100) / 100
    const billPayload = {
      clientId: currentBillClient._id, clientName: currentBillClient.clientName, clientAddress: currentBillClient.clientAddress || "",
      clientNumber: currentBillClient.clientNumber || "", isFiler: currentBillClient.isFiler,
      fieldOfficerId: selectedFieldOfficer._id, fieldOfficerName: selectedFieldOfficer.name,
      salesmanId: selectedSalesman._id, salesmanName: selectedSalesman.name,
      billDate, items: allBillItems, rawItems: currentBillItems, totalAmount: roundedTotal,
    }

    if (editingBillIndex !== null) {
      const updated = [...queuedBills]; updated[editingBillIndex] = billPayload; setQueuedBills(updated)
      toast.success(`Updated bill for ${currentBillClient.clientName}`)
    } else {
      setQueuedBills((prev) => [...prev, billPayload]); toast.success(`Added bill for ${currentBillClient.clientName} to batch!`)
    }
    setIsBillModalOpen(false)
  }

  const removeBillFromQueue = (index) => {
    const bill = queuedBills[index]
    openConfirmationDialog({
      title: "Remove bill from batch?",
      message: `Remove the bill for ${bill.clientName} from this batch queue?`,
      confirmLabel: "Remove bill",
      variant: "danger",
      onConfirm: () => {
        setQueuedBills((prev) => prev.filter((_, billIndex) => billIndex !== index))
        toast.success("Bill removed from batch")
      },
    })
  }

  const saveAllQueuedBills = async () => {
    if (isSavingBatch) return
    setConfirmationDialog(null)
    setIsSavingBatch(true)
    try {
      const payload = queuedBills.map((bill) => ({ clientId: bill.clientId, clientName: bill.clientName, clientAddress: bill.clientAddress, fieldOfficerId: selectedFieldOfficer._id, salesmanId: selectedSalesman._id, billDate: new Date(`${bill.billDate}T00:00:00`), items: bill.items, totalAmount: bill.totalAmount }))
      const savedBills = await window.api.addBills(payload)
      dataService.invalidateCacheOnModification("bills"); dataService.invalidateCacheOnModification("dashboardStats")
      setSavedBatchResult(savedBills)
      setQueuedBills([])
      setIsBillModalOpen(false)
      setIsProductModalOpen(false)
      setShowProductDropdown(false)
      setShowBonusProductDropdowns({})
      toast.success(`Successfully saved ${savedBills.length} bills!`)
    } catch (error) {
      console.error("Error saving bulk bills:", error); toast.error(error.message || "Failed to save bills batch")
    } finally { setIsSavingBatch(false) }
  }

  const handleSaveAllBills = () => {
    if (!queuedBills.length) { toast.error("There are no bills in the batch queue to save"); return }
    const productUsage = new Map()
    queuedBills.forEach((bill) => bill.items.forEach((item) => {
      if (item.productId) productUsage.set(item.productId, (productUsage.get(item.productId) || 0) + item.quantity)
    }))
    for (const [prodId, totalNeeded] of productUsage.entries()) {
      const prod = products.find((p) => p._id === prodId)
      if (prod && prod.hasInfiniteQuantity === false && prod.quantity < totalNeeded) { toast.error(`Batch requires ${totalNeeded} of "${prod.productName}", but only ${prod.quantity} are in stock.`); return }
    }
    openConfirmationDialog({
      title: "Save all bills?",
      message: `Save ${queuedBills.length} bills with a total of PKR ${batchStats.totalAmount.toLocaleString()}?`,
      confirmLabel: `Save ${queuedBills.length} bills`,
      variant: "primary",
      onConfirm: saveAllQueuedBills,
    })
  }

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto pb-16 px-2 sm:px-4">
      {/* Header */}
      <div className="mb-6 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl shadow-xl p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-600/30 border border-blue-400/20 text-blue-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white">Bulk Bill Creation</h1>
          </div>
          <p className="text-xs text-blue-200/80 mt-1 font-medium">Create and save multiple customer invoices together under the same date, field officer, and salesman.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/bill/new" className="px-4 py-2 text-xs font-bold text-blue-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all">← Single Bill Mode</Link>
          <Link to="/bills" className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all">Bill History</Link>
        </div>
      </div>

      {/* Shared batch details */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">1. Shared Batch Details (Applies to all bills in this session)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Date */}
          <div>
            <label className="block text-gray-700 font-semibold text-xs uppercase tracking-wider mb-2">📅 Invoice Date *</label>
            <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold transition-all" />
          </div>
          {/* Field Officer */}
          <div>
            <label className="block text-gray-700 font-semibold text-xs uppercase tracking-wider mb-2">👔 Field Officer *</label>
            <div className="relative">
              <input type="text" placeholder={selectedFieldOfficer ? selectedFieldOfficer.name : "Search Field Officer..."} value={fieldOfficerSearchTerm} onChange={(e) => { setFieldOfficerSearchTerm(e.target.value); setSelectedFieldOfficerIndex(-1) }} onKeyDown={handleFieldOfficerKeyDown} ref={fieldOfficerSearchRef} className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold transition-all" />
              {fieldOfficerSearchTerm && filteredFieldOfficers.length > 0 && (
                <div ref={fieldOfficerDropdownRef} className="absolute z-30 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto divide-y divide-gray-100">
                  {filteredFieldOfficers.map((officer, index) => (
                    <div key={officer._id} onClick={() => handleFieldOfficerSelect(officer)} className={`p-3 hover:bg-indigo-50 cursor-pointer transition-colors ${index === selectedFieldOfficerIndex ? "bg-indigo-100/70" : ""}`}>
                      <div className="font-bold text-gray-900 text-sm">{officer.name}</div>
                      <div className="text-xs text-gray-500">📞 {officer.phoneNumber}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedFieldOfficer && (
              <div className="mt-2 p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <div className="font-bold text-gray-900 text-sm">{selectedFieldOfficer.name}</div>
                <div className="text-xs text-gray-600">📞 {selectedFieldOfficer.phoneNumber}</div>
              </div>
            )}
          </div>
          {/* Salesman */}
          <div>
            <label className="block text-gray-700 font-semibold text-xs uppercase tracking-wider mb-2">💼 Salesman *</label>
            <div className="relative">
              <input type="text" placeholder={selectedSalesman ? selectedSalesman.name : "Search Salesman..."} value={salesmanSearchTerm} onChange={(e) => { setSalesmanSearchTerm(e.target.value); setSelectedSalesmanIndex(-1) }} onKeyDown={handleSalesmanKeyDown} ref={salesmanSearchRef} className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold transition-all" />
              {salesmanSearchTerm && filteredSalesmen.length > 0 && (
                <div ref={salesmanDropdownRef} className="absolute z-30 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto divide-y divide-gray-100">
                  {filteredSalesmen.map((salesman, index) => (
                    <div key={salesman._id} onClick={() => handleSalesmanSelect(salesman)} className={`p-3 hover:bg-emerald-50 cursor-pointer transition-colors ${index === selectedSalesmanIndex ? "bg-emerald-100/70" : ""}`}>
                      <div className="font-bold text-gray-900 text-sm">{salesman.name}</div>
                      <div className="text-xs text-gray-500">📞 {salesman.phoneNumber}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedSalesman && (
              <div className="mt-2 p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                <div className="font-bold text-gray-900 text-sm">{selectedSalesman.name}</div>
                <div className="text-xs text-gray-600">📞 {selectedSalesman.phoneNumber}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats + Add Bill */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-700"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
          <div><div className="text-xs font-semibold uppercase text-gray-500">Queued Bills</div><div className="text-xl font-black text-gray-900">{batchStats.totalBills}</div></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
          <div><div className="text-xs font-semibold uppercase text-gray-500">Total Amount</div><div className="text-xl font-black text-emerald-700">PKR {batchStats.totalAmount.toLocaleString()}</div></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-700"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></div>
          <div><div className="text-xs font-semibold uppercase text-gray-500">Total Items</div><div className="text-xl font-black text-gray-900">{batchStats.totalItems}</div></div>
        </div>
        <button onClick={openNewBillModal} title="Add a bill to batch (Ctrl+Shift+B)" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold p-4 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
          <span>Add a Bill to Batch <kbd className="ml-1 rounded bg-white/15 px-1.5 py-0.5 text-[10px]">Ctrl+Shift+B</kbd></span>
        </button>
      </div>

      {/* Queued bills */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">2. Bills in this Batch Queue</h3>
            <p className="text-xs text-gray-500">Each bill will be saved with sequential invoice numbers.</p>
          </div>
          {queuedBills.length > 0 && (
            <button
              onClick={() => openConfirmationDialog({
                title: "Clear batch queue?",
                message: "Remove all queued bills? This action cannot be undone.",
                confirmLabel: "Clear queue",
                variant: "danger",
                onConfirm: () => setQueuedBills([]),
              })}
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 transition-colors"
            >Clear Queue</button>
          )}
        </div>

        {queuedBills.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-slate-50/50">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></div>
            <h4 className="text-base font-bold text-gray-800">No bills added yet</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">Select Field Officer &amp; Salesman above, then click "+ Add a Bill to Batch".</p>
            <button onClick={openNewBillModal} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition-all">Add First Bill</button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <tr><th className="px-4 py-3 text-left">#</th><th className="px-4 py-3 text-left">Client</th><th className="px-4 py-3 text-left">Address</th><th className="px-4 py-3 text-left">Products</th><th className="px-4 py-3 text-right">Bill Total</th><th className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {queuedBills.map((b, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-500">#{idx + 1}</td>
                    <td className="px-4 py-3"><div className="font-bold text-gray-900">{b.clientName}</div>{b.clientNumber && <div className="text-xs text-gray-500">📞 {b.clientNumber}</div>}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate">{b.clientAddress || "—"}</td>
                    <td className="px-4 py-3 text-xs"><span className="font-bold text-gray-900">{b.items.length} items</span><div className="text-[11px] text-gray-500 truncate max-w-[220px]">{b.items.map((it) => it.productName).join(", ")}</div></td>
                    <td className="px-4 py-3 text-right font-black text-emerald-700 text-base">PKR {b.totalAmount.toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => openEditBillModal(idx)} className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">Edit</button>
                      <button onClick={() => removeBillFromQueue(idx)} className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {queuedBills.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">Ready to save <strong className="text-gray-900">{queuedBills.length} bills</strong> — <strong className="text-emerald-700">PKR {batchStats.totalAmount.toLocaleString()}</strong></div>
            <button onClick={handleSaveAllBills} disabled={isSavingBatch} title="Save all queued bills (Ctrl+S)" className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white font-extrabold text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0">
              {isSavingBatch ? (<><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg><span>Saving...</span></>) : (<><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg><span>Save All {queuedBills.length} Bills Now <kbd className="ml-1 rounded bg-white/15 px-1.5 py-0.5 text-[10px]">Ctrl+S</kbd></span></>)}
            </button>
          </div>
        )}
      </div>

      {/* ── Bill Composer Modal ─────────────────────────────────────────────── */}
      {isBillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-4 sm:p-5 border-b border-gray-200 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">{editingBillIndex !== null ? `Edit Bill #${editingBillIndex + 1}` : "Add Bill to Batch"}</h3>
                <p className="text-xs text-blue-200">Date: {billDate} • Officer: {selectedFieldOfficer?.name} • Salesman: {selectedSalesman?.name}</p>
              </div>
              <button onClick={() => setIsBillModalOpen(false)} className="text-gray-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
              {/* Client */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-gray-800 font-bold text-xs uppercase tracking-wider">Select Client *</label>
                  {currentBillClient && <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">Selected ✓</span>}
                </div>
                <div className="relative">
                  <input type="text" placeholder="Search client by name or phone..." value={clientSearchTerm} onChange={(e) => { setClientSearchTerm(e.target.value); setSelectedClientIndex(-1) }} onKeyDown={handleClientKeyDown} ref={clientSearchRef} className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold transition-all" />
                  {clientSearchTerm && filteredClients.length > 0 && (
                    <div ref={clientDropdownRef} className="absolute z-30 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-auto divide-y divide-gray-100">
                      {filteredClients.map((client, index) => (
                        <div key={client._id} onClick={() => handleClientSelect(client)} className={`p-3 hover:bg-blue-50 cursor-pointer transition-colors ${index === selectedClientIndex ? "bg-blue-100/70" : ""}`}>
                          <div className="font-bold text-gray-900 text-sm">{client.clientName}</div>
                          <div className="text-xs text-gray-500">📞 {client.clientNumber} • 📍 {client.clientAddress}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {currentBillClient && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-gray-900 text-sm">{currentBillClient.clientName}</div>
                      <div className="text-xs text-gray-600 mt-0.5">📞 {currentBillClient.clientNumber} • 📍 {currentBillClient.clientAddress}</div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${currentBillClient.isFiler ? "bg-green-100 text-green-800 border-green-200" : "bg-amber-100 text-amber-800 border-amber-200"}`}>{currentBillClient.isFiler ? "Filer" : "Non-Filer"}</span>
                  </div>
                )}
              </div>

              {/* Products in bill */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Products in This Bill ({currentBillItems.length})</h4>
                  <div className="flex items-center gap-2">
                    {currentBillItems.length > 0 && <span className="text-sm font-black text-blue-800">PKR {billTotal.toLocaleString("en-PK", { minimumFractionDigits: 2 })}</span>}
                    <button type="button" onClick={openAddProductModal} ref={addProductButtonRef} title="Add product (Ctrl+Shift+A)" className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                      Add Product <kbd className="rounded bg-white/15 px-1 py-0.5 text-[10px]">Ctrl+Shift+A</kbd>
                    </button>
                  </div>
                </div>
                {currentBillItems.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400">
                    No products added to this bill yet.{!currentBillClient && " Select a client first."}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-slate-50 font-bold text-gray-500 uppercase">
                        <tr><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Rate</th><th className="px-3 py-2 text-right">Disc %</th><th className="px-3 py-2 text-right">X-Disc %</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-right">Actions</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {currentBillItems.map((item, idx) => (
                          <Fragment key={item.id || idx}>
                            <tr className={item.isBonus ? "bg-emerald-50/70 hover:bg-emerald-100/60" : "hover:bg-slate-50/80 transition-colors"}>
                              <td className="px-3 py-2 font-bold text-gray-900">
                                <div className="flex items-center gap-1.5">{item.isBonus && <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded bg-emerald-100 text-emerald-800 border border-emerald-200">BONUS</span>}{item.productName}</div>
                                {(item.companyName || item.containerSize) && <div className="text-[11px] text-gray-500 font-normal mt-0.5">{item.companyName && <span>🏢 {item.companyName}</span>}{item.companyName && item.containerSize && <span> • </span>}{item.containerSize && <span>📦 {item.containerSize}</span>}</div>}
                              </td>
                              <td className="px-3 py-2 text-right">{item.quantity}</td>
                              <td className="px-3 py-2 text-right">PKR {Number(item.rate).toFixed(2)}</td>
                              <td className="px-3 py-2 text-right">{item.isBonus ? "—" : `${item.discount}%`}</td>
                              <td className="px-3 py-2 text-right">{item.isBonus ? "—" : `${item.extraDiscount}%`}</td>
                              <td className="px-3 py-2 text-right font-bold text-emerald-700">{item.isBonus ? <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">FREE</span> : `PKR ${Number(item.total).toFixed(2)}`}</td>
                              <td className="px-3 py-2 text-right"><div className="flex justify-end gap-1"><button onClick={() => editItemFromBill(idx)} className="px-2 py-1 text-[11px] font-bold rounded bg-blue-50 text-blue-700 hover:bg-blue-100">Edit</button><button onClick={() => removeItemFromBill(idx)} className="px-2 py-1 text-[11px] font-bold rounded bg-red-50 text-red-600 hover:bg-red-100">✕</button></div></td>
                            </tr>
                            {item.bonusItems?.map((bonus, bIdx) => (
                              <tr key={`${idx}-b-${bIdx}`} className="bg-emerald-50/50">
                                <td className="px-3 py-2 pl-6 text-sm"><div className="flex items-center gap-1.5"><span>↳</span><span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded bg-emerald-100 text-emerald-800 border border-emerald-200">BONUS</span><span className="font-semibold text-gray-800">{bonus.productName}</span></div></td>
                                <td className="px-3 py-2 text-right text-xs">{bonus.quantity}</td>
                                <td className="px-3 py-2 text-right text-xs">PKR {Number(bonus.rate).toFixed(2)}</td>
                                <td className="px-3 py-2 text-right text-xs">—</td><td className="px-3 py-2 text-right text-xs">—</td>
                                <td className="px-3 py-2 text-right"><span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">FREE</span></td>
                                <td className="px-3 py-2 text-right text-gray-400">—</td>
                              </tr>
                            ))}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-3">
              <button type="button" onClick={() => setIsBillModalOpen(false)} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleDoneCurrentBill} title="Add this bill to the batch queue (Ctrl+Enter)" className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md transition-all">Done — Add Bill to Batch Queue <kbd className="ml-1 rounded bg-white/15 px-1.5 py-0.5 text-[10px]">Ctrl+Enter</kbd> ✓</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Product Modal (same layout as BillGeneration) ─────────────────── */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 border-b border-gray-200 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white gap-3 rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">Current Total:</span>
                <span className="text-base sm:text-lg font-extrabold text-blue-300 bg-white/10 px-3 py-1 rounded-lg border border-white/15 shadow-inner">PKR {billTotal.toLocaleString("en-PK", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 border border-white/15 px-3.5 py-1.5 rounded-xl shadow-inner">
                <svg className="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-200">Client:</span>
                <span className="text-sm font-extrabold text-white truncate max-w-[200px] sm:max-w-[300px]">{currentBillClient ? currentBillClient.clientName : "No Client Selected"}</span>
              </div>
              <button onClick={closeProductModal} className="text-gray-300 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors ml-auto sm:ml-0" title="Close (Esc)">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Side panel */}
                <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[520px]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">Items in Bill</h4>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{currentBillItems.length} {currentBillItems.length === 1 ? "item" : "items"}</span>
                  </div>
                  <div className="relative mb-3">
                    <input type="text" placeholder="Search added items..." className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium" value={addedItemsSearchTerm} onChange={(e) => setAddedItemsSearchTerm(e.target.value)} />
                    <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    {addedItemsSearchTerm && <button onClick={() => setAddedItemsSearchTerm("")} className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button>}
                  </div>
                  <div className="flex-1 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-100 bg-slate-50/50 p-1 space-y-1.5">
                    {filteredAddedBillItems.length > 0 ? filteredAddedBillItems.map((item) => {
                      const actualIndex = currentBillItems.findIndex((bi) => bi.id === item.id)
                      const isBeingEdited = editingItemIndex === actualIndex
                      return (
                        <div key={item.id} className={`p-3 rounded-xl transition-all border ${isBeingEdited ? "bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-400/30" : "bg-white border-gray-200/80 hover:border-blue-200 hover:shadow-sm"}`}>
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-1.5"><span className="text-[10px] font-bold text-gray-400">#{actualIndex + 1}</span><span className="font-bold text-xs text-gray-900 truncate max-w-[150px]">{item.productName}</span></div>
                            <span className="text-xs font-extrabold text-blue-700">PKR {item.total.toFixed(2)}</span>
                          </div>
                          {(item.companyName || item.containerSize) && <div className="text-[11px] text-gray-500 font-medium mt-1">{item.companyName && <span>🏢 {item.companyName}</span>}{item.companyName && item.containerSize && <span> • </span>}{item.containerSize && <span>📦 {item.containerSize}</span>}</div>}
                          <div className="text-[11px] text-gray-600 mt-1 flex items-center justify-between">
                            <span>Qty: <strong>{item.quantity}</strong> @ PKR {item.rate.toFixed(2)}</span>
                            {(item.discount > 0 || item.extraDiscount > 0) && <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Disc: {item.discount}%{item.extraDiscount ? ` + ${item.extraDiscount}%` : ""}</span>}
                          </div>
                          {item.bonusItems?.length > 0 && (
                            <div className="mt-1.5 pt-1.5 border-t border-dashed border-gray-200 space-y-1">
                              {item.bonusItems.map((bItem, bIdx) => (
                                <div key={bIdx} className="text-[10px] font-semibold text-emerald-800 flex items-center justify-between bg-emerald-50/70 p-1 rounded">
                                  <span>🎁 {bItem.productName}</span><span>Qty: {bItem.quantity} (FREE)</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end gap-1.5">
                            <button type="button" onClick={() => editItemFromBill(actualIndex)} className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${isBeingEdited ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}>{isBeingEdited ? "Editing" : "Edit"}</button>
                            <button type="button" onClick={() => removeItemFromBill(actualIndex)} className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-50 text-red-600 hover:bg-red-100">Remove</button>
                          </div>
                        </div>
                      )
                    }) : (
                      <div className="p-8 text-center text-xs text-gray-400">{currentBillItems.length === 0 ? "No products added yet. Use the form on the right!" : `No items match "${addedItemsSearchTerm}"`}</div>
                    )}
                  </div>
                </div>

                {/* Main form */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {editingItemIndex !== null ? `Edit Item #${editingItemIndex + 1}` : "Add New Product"}
                    </h3>
                    {editingItemIndex !== null && (
                      <button type="button" onClick={() => { setEditingItemIndex(null); setCurrentItem(emptyProductItem()); setProductSearchTerm("") }} className="text-xs font-semibold text-blue-600 hover:underline">+ Switch to Add New Item</button>
                    )}
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      <div className="md:col-span-12 lg:col-span-4">
                        <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5">Product Name *</label>
                        <div className="relative">
                          <div className="flex">
                            <input type="text" placeholder="Type product name to search..." className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-all" value={productSearchTerm || ""} onChange={(e) => handleProductSearchChange(e.target.value)} onFocus={() => { if (productSearchTerm?.trim()) setShowProductDropdown(true) }} onKeyDown={handleProductKeyDown} ref={productSearchRef} />
                            {currentItem.productId && (
                              <button onClick={clearProductSelection} className="ml-2 p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors" title="Clear selection">
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                              </button>
                            )}
                          </div>
                          {showProductDropdown && productSearchTerm && currentFilteredProducts.length > 0 && (
                            <div className="absolute z-40 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-72 overflow-auto divide-y divide-gray-100" ref={productDropdownRef}>
                              {currentFilteredProducts.map((product, productIndex) => (
                                <div key={product._id} className={`p-3 hover:bg-blue-50 cursor-pointer transition-colors ${productIndex === selectedProductIndex ? "bg-blue-100/80" : ""}`} onClick={() => handleProductSelect(product._id)}>
                                  <div className="font-semibold text-gray-900 text-sm">{product.productName}</div>
                                  {(product.companyName || product.containerSize) && <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">{product.companyName && <span>🏢 {product.companyName}</span>}{product.containerSize && <span>📦 {product.containerSize}</span>}</div>}
                                  <div className="text-xs font-semibold text-blue-600 mt-1">PKR {product.productPrice.toFixed(2)}{product.hasInfiniteQuantity === false && ` (${product.quantity} in stock)`}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          {currentItem.productId && (
                            <div className="mt-2 p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl">
                              <div className="font-bold text-gray-900 text-xs">{currentItem.productName}</div>
                              {(currentItem.companyName || currentItem.containerSize) && <div className="text-[11px] text-gray-600 font-medium mt-0.5 flex flex-wrap items-center gap-1.5">{currentItem.companyName && <span>🏢 {currentItem.companyName}</span>}{currentItem.companyName && currentItem.containerSize && <span>•</span>}{currentItem.containerSize && <span>📦 {currentItem.containerSize}</span>}</div>}
                              <div className="text-xs font-bold text-blue-700 mt-1">PKR {currentItem.rate.toFixed(2)}{currentItem.hasInfiniteQuantity === false && ` (Available: ${currentItem.availableQuantity})`}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-6 lg:col-span-2">
                        <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5">Quantity</label>
                        <input id="bulk-item-quantity" type="number" value={currentItem.quantity} onChange={(e) => handleInputChange("quantity", e.target.value)} className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold transition-all" min="1" />
                        {currentItem.productId && currentItem.hasInfiniteQuantity === false && <div className="text-[11px] text-gray-500 mt-1">Max: {currentItem.availableQuantity}</div>}
                      </div>
                      <div className="md:col-span-6 lg:col-span-2">
                        <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5">Rate (PKR)</label>
                        <input type="number" value={currentItem.rate} onChange={(e) => handleInputChange("rate", e.target.value)} className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold transition-all" step="0.01" min="0" />
                      </div>
                      <div className="md:col-span-6 lg:col-span-2">
                        <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5">Disc %</label>
                        <input type="number" value={currentItem.discount} onChange={(e) => handleInputChange("discount", e.target.value)} className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold transition-all" step="0.1" min="0" max="100" />
                      </div>
                      <div className="md:col-span-6 lg:col-span-2">
                        <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5">X-Disc %</label>
                        <input type="number" value={currentItem.extraDiscount} onChange={(e) => handleInputChange("extraDiscount", e.target.value)} className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold transition-all" step="0.1" min="0" max="100" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-xs font-bold text-gray-500 uppercase">Item Total</span>
                      <span className="text-lg font-black text-blue-700">PKR {currentItem.total.toFixed(2)}</span>
                    </div>

                    <button type="button" onClick={addCurrentItemToBill} disabled={!currentItem.productId} className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                      {editingItemIndex !== null ? "Update Item" : "Add Item to Bill"}
                      <kbd className="text-xs opacity-80 ml-1">Ctrl+Enter</kbd>
                    </button>
                  </div>

                  {/* Bonus items */}
                  {currentItem.productId && (
                    <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">🎁 Bonus Items for {currentItem.productName}</h4>
                        <button type="button" onClick={addBonusItem} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                          Add Bonus <span className="opacity-70">(Ctrl+B)</span>
                        </button>
                      </div>
                      {currentItem.bonusItems.length === 0 ? (
                        <div className="py-4 text-center text-xs text-emerald-600/70 border border-dashed border-emerald-300 rounded-xl">No bonus items added. Click "Add Bonus" to attach a free product.</div>
                      ) : (
                        <div className="space-y-3">
                          {currentItem.bonusItems.map((bonusItem, bonusIndex) => {
                            const bonusKey = `${bonusIndex}`
                            return (
                              <div key={bonusItem.id || bonusIndex} className="bg-white p-3 rounded-xl border border-emerald-200 shadow-sm">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                                  <div className="md:col-span-6">
                                    <label className="block text-gray-700 text-xs font-bold mb-1">Bonus Product *</label>
                                    <div className="relative">
                                      <div className="flex">
                                        <input type="text" placeholder="Search product..." value={bonusProductSearchTerms[bonusKey] || ""} onChange={(e) => handleBonusProductSearchChange(bonusIndex, e.target.value)} onFocus={() => { if (bonusProductSearchTerms[bonusKey]?.trim()) setShowBonusProductDropdowns((p) => ({ ...p, [bonusKey]: true })) }} onKeyDown={(e) => handleBonusProductKeyDown(e, bonusIndex)} ref={(el) => (bonusProductSearchRefs.current[bonusKey] = el)} className="w-full p-2 bg-slate-50 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-400" />
                                        {bonusItem.productId && <button onClick={() => clearBonusProductSelection(bonusIndex)} className="ml-1 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-500"><svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg></button>}
                                      </div>
                                      {showBonusProductDropdowns[bonusKey] && bonusProductSearchTerms[bonusKey] && filteredBonusProducts(bonusProductSearchTerms[bonusKey]).length > 0 && (
                                        <div className="absolute z-40 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-auto divide-y divide-gray-100" ref={(el) => (bonusProductDropdownRefs.current[bonusKey] = el)}>
                                          {filteredBonusProducts(bonusProductSearchTerms[bonusKey]).map((product, productIndex) => (
                                            <div key={product._id} className={`p-2 hover:bg-emerald-50 cursor-pointer text-xs ${productIndex === selectedBonusProductIndex[bonusKey] ? "bg-emerald-100" : ""}`} onClick={() => handleBonusProductSelect(bonusIndex, product._id)}>
                                              <div className="font-semibold text-gray-900">{product.productName}</div>
                                              {(product.companyName || product.containerSize) && <div className="text-[11px] text-gray-500 mt-0.5">{product.companyName && <span>🏢 {product.companyName}</span>}{product.containerSize && <span> • 📦 {product.containerSize}</span>}</div>}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {bonusItem.productId && (
                                        <div className="mt-1.5 p-2 bg-emerald-100/70 rounded-lg border border-emerald-200">
                                          <div className="font-bold text-xs text-emerald-950">{bonusItem.productName}</div>
                                          {(bonusItem.companyName || bonusItem.containerSize) && <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">{bonusItem.companyName && <span>🏢 {bonusItem.companyName}</span>}{bonusItem.companyName && bonusItem.containerSize && <span> • </span>}{bonusItem.containerSize && <span>📦 {bonusItem.containerSize}</span>}</div>}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="md:col-span-3">
                                    <label className="block text-gray-700 text-xs font-bold mb-1">Bonus Qty</label>
                                    <input id={`bonus-quantity-${bonusIndex}`} type="number" value={bonusItem.quantity} onChange={(e) => handleBonusInputChange(bonusIndex, "quantity", e.target.value)} className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold" min="1" />
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className="block text-gray-700 text-xs font-bold mb-1">Price Tag</label>
                                    <div className="p-2 bg-emerald-100/80 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 text-center">FREE (Bonus)</div>
                                  </div>
                                  <div className="md:col-span-1 flex justify-end items-start pt-5">
                                    <button type="button" onClick={() => removeBonusItem(bonusIndex)} className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors" title="Remove bonus item">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Keyboard shortcuts */}
              <div className="mt-6 p-3.5 bg-slate-100/70 border border-slate-200 rounded-xl text-xs text-gray-600 flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-3">
                  <span><kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[11px] font-semibold">Ctrl+Enter</kbd> Add item</span>
                  <span><kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[11px] font-semibold">Ctrl+Shift+Enter</kbd> Done</span>
                  <span><kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[11px] font-semibold">Ctrl+Shift+A</kbd> Add product</span>
                  <span><kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[11px] font-semibold">Ctrl+B</kbd> Bonus item</span>
                  <span><kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[11px] font-semibold">Esc</kbd> Close</span>
                </div>
                <button type="button" onClick={closeProductModal} className="text-gray-500 hover:text-gray-800 font-semibold transition-colors">Done <kbd className="ml-1 rounded bg-slate-200 px-1.5 py-0.5 text-[10px]">Ctrl+Shift+Enter</kbd></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Batch Saved Success Modal ────────────────────────────────────────── */}
      {savedBatchResult && (
        <div className="mb-6 flex justify-center animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gray-200 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg></div>
            <h3 className="text-xl font-black text-gray-900 mb-1">Batch Saved Successfully!</h3>
            <p className="text-xs text-gray-500 mb-6">Saved {savedBatchResult.length} invoices to the SQLite database. Stock quantities and pricing histories have been updated.</p>
            <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl p-2 mb-6 divide-y divide-gray-100 text-left text-xs">
              {savedBatchResult.map((b) => (
                <div key={b._id} className="py-2 flex justify-between items-center">
                  <div><span className="font-extrabold text-blue-700 mr-2">Invoice #{b.billId || b._id}</span><span className="font-bold text-gray-800">{b.clientName}</span></div>
                  <span className="font-bold text-emerald-700">PKR {Number(b.totalAmount).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setSavedBatchResult(null)} className="px-5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50">Create Another Batch</button>
              <Link to="/bills" className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md">Go to Bill History →</Link>
            </div>
          </div>
        </div>
      )}

      {confirmationDialog && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fadeIn"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmationDialog(null)
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="bulk-confirmation-title"
            aria-describedby="bulk-confirmation-message"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start gap-4 border-b border-slate-100 p-5">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${confirmationDialog.variant === "danger" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"}`}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  {confirmationDialog.variant === "danger" ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v4m0 4h.01M10.3 3.86L1.82 18a2 2 0 001.7 3h16.96a2 2 0 001.7-3L13.7 3.86a2 2 0 00-3.4 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  )}
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="bulk-confirmation-title" className="text-base font-extrabold text-slate-900">{confirmationDialog.title}</h2>
                <p id="bulk-confirmation-message" className="mt-1.5 text-sm leading-5 text-slate-600">{confirmationDialog.message}</p>
              </div>
              <button type="button" onClick={() => setConfirmationDialog(null)} aria-label="Close confirmation" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <div className="flex justify-end gap-2 bg-slate-50 px-5 py-4">
              <button type="button" onClick={() => setConfirmationDialog(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">Cancel <kbd className="ml-1 text-[10px] text-slate-400">Esc</kbd></button>
              <button
                ref={confirmationButtonRef}
                type="button"
                onClick={confirmDialogAction}
                className={`rounded-lg px-4 py-2 text-sm font-extrabold text-white shadow-sm ${confirmationDialog.variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
              >{confirmationDialog.confirmLabel}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
