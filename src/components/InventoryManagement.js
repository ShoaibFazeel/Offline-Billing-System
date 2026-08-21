"use client"

import { useState, useEffect, useRef } from "react"
import toast from "react-hot-toast"
import { useLazyData } from "../hooks/useLazyData"
import dataService from "../services/DataService"

const emptyProduct = {
  productName: "",
  productPrice: 0,
  hasInfiniteQuantity: true,
  quantity: 0,
  companyName: "",
  containerSize: "",
}

function InventoryManagement() {
  const {
    data: products,
    loading: productsLoading,
    error: productsError,
    search: searchProducts,
    refresh: refreshProducts,
    loadMore,
    hasMore,
    total
  } = useLazyData('products', '', 50)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentProduct, setCurrentProduct] = useState(emptyProduct)
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const productNameInputRef = useRef(null)
  const searchInputRef = useRef(null)
  const formRef = useRef(null)

  useEffect(() => {
    searchProducts(searchTerm)
  }, [searchTerm, searchProducts])

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])

  useEffect(() => {
    if (isModalOpen && productNameInputRef.current) {
      setTimeout(() => {
        productNameInputRef.current.focus()
      }, 100)
    }
  }, [isModalOpen])

  const openProductModal = (product = emptyProduct, editing = false) => {
    setCurrentProduct({ ...product })
    setIsEditing(editing)
    setIsModalOpen(true)
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "a" || e.key === "A")) {
        e.preventDefault()
        if (
          !isModalOpen &&
          document.activeElement.tagName !== "INPUT" &&
          document.activeElement.tagName !== "TEXTAREA"
        ) {
          openProductModal()
        }
      }

      if (isModalOpen) {
        if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
          e.preventDefault()
          if (formRef.current) {
            if (typeof formRef.current.requestSubmit === "function") {
              formRef.current.requestSubmit()
            } else {
              formRef.current.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }))
            }
          }
        } else if ((e.metaKey || e.ctrlKey) && (e.key === "c" || e.key === "C")) {
          e.preventDefault()
          setIsModalOpen(false)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isModalOpen])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setCurrentProduct({
      ...currentProduct,
      [name]:
        type === "checkbox"
          ? checked
          : name === "productPrice" || name === "quantity"
            ? Number.parseFloat(value) || 0
            : value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!currentProduct.productName || !currentProduct.productPrice) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!currentProduct.hasInfiniteQuantity && currentProduct.quantity <= 0) {
      toast.error("Please enter a valid quantity for the product")
      return
    }

    try {
      if (isEditing) {
        await window.api.updateProduct(currentProduct)
        toast.success("Product updated successfully")
      } else {
        await window.api.addProduct(currentProduct)
        toast.success("Product added successfully")
      }

      setIsModalOpen(false)
      setCurrentProduct(emptyProduct)
      setIsEditing(false)
      dataService.invalidateCacheOnModification('products')
      await refreshProducts()
    } catch (error) {
      console.error("Error saving product:", error)
      toast.error("Failed to save product")
    }
  }

  const handleEdit = (product) => {
    const productToEdit = {
      ...product,
      hasInfiniteQuantity: product.hasInfiniteQuantity !== undefined ? product.hasInfiniteQuantity : true,
      quantity: product.quantity || 0,
    }
    openProductModal(productToEdit, true)
  }

  const handleDelete = (id) => {
    setConfirmDeleteId(id)
  }

  const performDelete = async (id) => {
    setDeletingId(id)
    try {
      await window.api.deleteProduct(id)
      toast.success("Product deleted successfully")
      dataService.invalidateCacheOnModification('products')
      await refreshProducts()
    } catch (error) {
      console.error("Error deleting product:", error)
      toast.error("Failed to delete product")
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 px-2 sm:px-4">
      {/* Top Header Card */}
      <div className="mb-6 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl shadow-xl p-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
            <svg className="w-7 h-7 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Inventory Management</h1>
            <p className="text-blue-200 text-sm mt-0.5">Manage products, pricing, stock levels, and packaging</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openProductModal()}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Add New Product
          </button>
        </div>
      </div>

      {/* Search Input Card */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-4 mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search products by name, company, or container size..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            ref={searchInputRef}
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-800 text-sm">Product Catalog</h3>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
              {products.length} shown of {total}
            </span>
          </div>
        </div>

        {productsError && (
          <div className="border-b border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center justify-between gap-3">
              <span>{productsError}</span>
              <button
                onClick={() => refreshProducts()}
                className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {productsLoading && products.length === 0 && (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm font-semibold text-gray-600">Loading catalog...</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Product Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Container Size</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Sale Price</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Stock Status</th>
                <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.length > 0 ? (
                products.map((product) => (
                  <tr key={product._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {product.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                      {product.companyName ? <span>🏢 {product.companyName}</span> : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                      {product.containerSize ? <span>📦 {product.containerSize}</span> : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-blue-700">
                      PKR {product.productPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {product.hasInfiniteQuantity !== false ? (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Unlimited Stock
                        </span>
                      ) : product.quantity === 0 ? (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-200">
                          Out of Stock
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                          {product.quantity} in stock
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>

                        {confirmDeleteId === product._id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => performDelete(product._id)}
                              disabled={deletingId === product._id}
                              className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-xl text-xs font-bold shadow-sm"
                            >
                              {deletingId === product._id ? "Deleting..." : "Confirm"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={!!deletingId}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-xl text-xs font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDelete(product._id)}
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
                    {searchTerm
                      ? "No products found matching your search term."
                      : "No products available. Add your first product!"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={productsLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            {productsLoading ? "Loading..." : "Load More Products"}
          </button>
        </div>
      )}

      {/* Modal for adding/editing products */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 transform transition-all">
            <div className="p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                {isEditing ? "Edit Product" : "Add New Product"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} ref={formRef} className="p-6 space-y-4">
              <div>
                <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5" htmlFor="productName">
                  Product Name *
                </label>
                <input
                  type="text"
                  id="productName"
                  name="productName"
                  value={currentProduct.productName}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  required
                  ref={productNameInputRef}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5" htmlFor="productPrice">
                    Price (PKR) *
                  </label>
                  <input
                    type="number"
                    id="productPrice"
                    name="productPrice"
                    value={currentProduct.productPrice}
                    onChange={handleInputChange}
                    className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5" htmlFor="containerSize">
                    Container Size
                  </label>
                  <input
                    type="text"
                    id="containerSize"
                    name="containerSize"
                    value={currentProduct.containerSize}
                    onChange={handleInputChange}
                    className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 500ml, 1kg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5" htmlFor="companyName">
                  Company Name
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={currentProduct.companyName}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-gray-200">
                  <input
                    type="checkbox"
                    name="hasInfiniteQuantity"
                    checked={currentProduct.hasInfiniteQuantity}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-800 text-xs font-bold">Unlimited Quantity Available</span>
                </label>
              </div>

              {!currentProduct.hasInfiniteQuantity && (
                <div>
                  <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5" htmlFor="quantity">
                    Available Stock Quantity *
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={currentProduct.quantity}
                    onChange={handleInputChange}
                    className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                    min="0"
                    required
                  />
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-xl text-xs shadow-md"
                >
                  {isEditing ? "Update Product" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryManagement
