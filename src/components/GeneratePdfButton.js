"use client"
import toast from "react-hot-toast"
import PdfGenerator from "./PdfGenerator"

function GeneratePdfButton({ bill, className }) {
  // Helper function to generate PDF bytes
  const generatePdfBytes = async () => {
    // Fetch required data
    const client = await window.api.getClient(bill.clientId)
    const fieldOfficer = await window.api.getFieldOfficer(bill.fieldOfficerId)
    const salesman = await window.api.getSalesman(bill.salesmanId)
    const companyInfo = await window.api.getCompanyInfo()

    // Generate PDF
    const pdfGenerator = new PdfGenerator()
    return await pdfGenerator.generateInvoicePdf(bill, client, companyInfo, fieldOfficer, salesman)
  }

  const generatePdf = async () => {
    try {
      const pdfBytes = await generatePdfBytes()

      // Create a blob and download
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `Invoice-${bill.billId ? bill.billId : bill._id.substring(0, 8)}.pdf`
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

  const printPdf = async () => {
    try {
      const pdfBytes = await generatePdfBytes()
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const blobUrl = URL.createObjectURL(blob)
      const printWindow = window.open(blobUrl)
      printWindow.onload = () => {
        printWindow.focus()
        printWindow.print()
      }
      toast.success("Print dialog opened")
    } catch (error) {
      console.error("Error printing PDF:", error)
      toast.error("Failed to print PDF")
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={generatePdf}
        className={`bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md text-sm ${className}`}
      >
        Download PDF
      </button>
      <button
        onClick={printPdf}
        className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm ${className}`}
      >
        Print
      </button>
    </div>
  )
}

export default GeneratePdfButton
