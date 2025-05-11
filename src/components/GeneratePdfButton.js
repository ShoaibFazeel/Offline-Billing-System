"use client"
import toast from "react-hot-toast"
import PdfGenerator from "./PdfGenerator"

function GeneratePdfButton({ bill, className }) {
  const generatePdf = async () => {
    try {
      // Fetch required data
      const client = await window.api.getClient(bill.clientId)
      const fieldOfficer = await window.api.getFieldOfficer(bill.fieldOfficerId)
      const salesman = await window.api.getSalesman(bill.salesmanId)
      const companyInfo = await window.api.getCompanyInfo()

      // Generate PDF
      const pdfGenerator = new PdfGenerator()
      const pdfBytes = await pdfGenerator.generateInvoicePdf(bill, client, companyInfo, fieldOfficer, salesman)

      // Create a blob and download
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `Invoice-${bill._id.substring(0, 8)}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)

      toast.success("PDF generated successfully")
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Failed to generate PDF")
    }
  }

  return (
    <button
      onClick={generatePdf}
      className={`bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md ${className}`}
    >
      Generate PDF
    </button>
  )
}

export default GeneratePdfButton
