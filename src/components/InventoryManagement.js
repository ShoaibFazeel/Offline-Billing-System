"use client"

import { useState, useEffect, useRef } from "react"
import toast from "react-hot-toast"
import { useLazyData } from "../hooks/useLazyData"
import dataService from "../services/DataService"

function InventoryManagement() {
  // Use lazy loading for products
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
  const [currentProduct, setCurrentProduct] = useState({
    productName: "",
    productPrice: "",
    hasInfiniteQuantity: true,
    quantity: 0,
    companyName: "",
    containerSize: "",
  })
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Add refs for auto-focus
  const productNameInputRef = useRef(null)
  const searchInputRef = useRef(null)
  const formRef = useRef(null)

  // Handle search term changes
  useEffect(() => {
    searchProducts(searchTerm)
  }, [searchTerm, searchProducts])



  useEffect(() => {
    // Auto-focus on the search input when component mounts
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])

  useEffect(() => {
    // Auto-focus on the product name input when the modal opens
    if (isModalOpen && productNameInputRef.current) {
      setTimeout(() => {
        productNameInputRef.current.focus()
      }, 100)
    }
  }, [isModalOpen])

  // Add keyboard shortcuts for Cmd/Ctrl + A to trigger the add functionality
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Cmd+A (Mac) or Ctrl+A (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && (e.key === "a" || e.key === "A")) {
        // Prevent the default behavior (select all text)
        e.preventDefault()

        // Only trigger if not in a text input or textarea
        if (
          !isModalOpen &&
          document.activeElement.tagName !== "INPUT" &&
          document.activeElement.tagName !== "TEXTAREA"
        ) {
          setCurrentProduct({
            productName: "",
            productPrice: "",
            hasInfiniteQuantity: true,
            quantity: 0,
            companyName: "",
            containerSize: "",
          })
          setIsEditing(false)
          setIsModalOpen(true)
        }
      }

      // Add keyboard shortcuts for modal when it's open
      if (isModalOpen) {
        // Cmd/Ctrl + S to submit form
        if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
          e.preventDefault()
          if (formRef.current) {
            formRef.current.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }))
          }
        }
        // Cmd/Ctrl + C to close modal
        else if ((e.metaKey || e.ctrlKey) && (e.key === "c" || e.key === "C")) {
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
      setCurrentProduct({
        productName: "",
        productPrice: "",
        hasInfiniteQuantity: true,
        quantity: 0,
        companyName: "",
        containerSize: "",
      })
      setIsEditing(false)
      // Invalidate cache and refresh data
      dataService.invalidateCacheOnModification('products')
      refreshProducts()
    } catch (error) {
      console.error("Error saving product:", error)
      toast.error("Failed to save product")
    }
  }

  const handleEdit = (product) => {
    // Ensure product has the hasInfiniteQuantity property (for backward compatibility)
    const productToEdit = {
      ...product,
      hasInfiniteQuantity: product.hasInfiniteQuantity !== undefined ? product.hasInfiniteQuantity : true,
      quantity: product.quantity || 0,
    }
    setCurrentProduct(productToEdit)
    setIsEditing(true)
    setIsModalOpen(true)
    // Focus on the product name input when the edit modal opens
    if (productNameInputRef.current) {
      productNameInputRef.current.focus()
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product? This action cannot be undone and will restore product quantities.")) {
      return
    }

    try {
      await window.api.deleteProduct(id);
      toast.success("Product deleted successfully");
      // Invalidate cache and refresh data
      dataService.invalidateCacheOnModification('products')
      refreshProducts()
    } catch (error) {
      console.error("Error deleting product:", error)
      toast.error("Failed to delete product")
    }
  }

  // Products are already filtered by the search function, no need to filter again

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Inventory Management: ({products.length} of {total})</h1>
        <button
          onClick={() => {
            setCurrentProduct({
              productName: "",
              productPrice: "",
              hasInfiniteQuantity: true,
              quantity: 0,
              companyName: "",
              containerSize: "",
            })
            setIsEditing(false)
            setIsModalOpen(true)
            // Focus on the product name input when the add modal opens
            if (productNameInputRef.current) {
              productNameInputRef.current.focus()
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Add New Product
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search products by name or company..."
          className="w-full p-2 border border-gray-300 rounded-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          ref={searchInputRef}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
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
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading products...</p>
          </div>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Container Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.length > 0 ? (
              products.map((product) => (
                <tr key={product._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.productName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.companyName || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.containerSize || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    PKR{product.productPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.hasInfiniteQuantity !== false ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Unlimited
                      </span>
                    ) : (
                      product.quantity
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleEdit(product)} className="text-blue-600 hover:text-blue-900 mr-4">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(product._id)} className="text-red-600 hover:text-red-900">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                  {searchTerm
                    ? "No products found matching your search."
                    : "No products available. Add your first product!"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMore}
            disabled={productsLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md"
          >
            {productsLoading ? 'Loading...' : 'Load More Products'}
          </button>
        </div>
      )}

      {/* Modal for adding/editing products */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{isEditing ? "Edit Product" : "Add New Product"}</h2>
              <div className="text-sm text-gray-500">
                <span className="mr-2">
                  <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">Ctrl+S</kbd> Save
                </span>
                <span>
                  <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">Ctrl+C</kbd> Cancel
                </span>
              </div>
            </div>
            <form onSubmit={handleSubmit} ref={formRef}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="productName">
                  Product Name *
                </label>
                <input
                  type="text"
                  id="productName"
                  name="productName"
                  value={currentProduct.productName}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                  ref={productNameInputRef}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="productPrice">
                  Price *
                </label>
                <input
                  type="number"
                  id="productPrice"
                  name="productPrice"
                  value={currentProduct.productPrice}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="companyName">
                  Company Name
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={currentProduct.companyName}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="containerSize">
                  Container Size
                </label>
                <input
                  type="text"
                  id="containerSize"
                  name="containerSize"
                  value={currentProduct.containerSize}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 500ml, 1kg, etc."
                />
              </div>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="hasInfiniteQuantity"
                    checked={currentProduct.hasInfiniteQuantity}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-gray-700 text-sm font-bold">Unlimited Quantity</span>
                </label>
              </div>
              {!currentProduct.hasInfiniteQuantity && (
                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="quantity">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={currentProduct.quantity}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    min="0"
                    required
                  />
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md mr-2"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
                  {isEditing ? "Update" : "Add"}
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
