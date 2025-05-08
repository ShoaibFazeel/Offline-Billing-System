"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"

function InventoryManagement() {
  const [products, setProducts] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentProduct, setCurrentProduct] = useState({
    productName: "",
    productPrice: "",
    hasInfiniteQuantity: true,
    quantity: 0,
  })
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const data = await window.api.getProducts()
      setProducts(data)
    } catch (error) {
      console.error("Error fetching products:", error)
      toast.error("Failed to load products")
    }
  }

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
      })
      setIsEditing(false)
      fetchProducts()
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
  }

  const filteredProducts = products.filter((product) =>
    product.productName.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <button
          onClick={() => {
            setCurrentProduct({
              productName: "",
              productPrice: "",
              hasInfiniteQuantity: true,
              quantity: 0,
            })
            setIsEditing(false)
            setIsModalOpen(true)
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Add New Product
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search products..."
          className="w-full p-2 border border-gray-300 rounded-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <tr key={product._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.productName}
                  </td>
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
                    <button onClick={() => handleEdit(product)} className="text-blue-600 hover:text-blue-900">
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                  {searchTerm
                    ? "No products found matching your search."
                    : "No products available. Add your first product!"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for adding/editing products */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">{isEditing ? "Edit Product" : "Add New Product"}</h2>
            <form onSubmit={handleSubmit}>
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
