"use client"
import toast from "react-hot-toast"
import PdfGenerator from "./PdfGenerator"

function GeneratePdfButton({ bill, className = "", showDiscountAsAmount = false, products = [] }) {
  const generatePdfBytes = async () => {
    const client = await window.api.getClient(bill.clientId)
    const fieldOfficer = await window.api.getFieldOfficer(bill.fieldOfficerId)
    const salesman = await window.api.getSalesman(bill.salesmanId)
    const companyInfo = await window.api.getCompanyInfo()

    const pdfGenerator = new PdfGenerator()
    return await pdfGenerator.generateInvoicePdf(
      bill,
      client,
      companyInfo,
      fieldOfficer,
      salesman,
      showDiscountAsAmount,
      products,
    )
  }

  const generatePdf = async () => {
    try {
      const pdfBytes = await generatePdfBytes()
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

      const base64String = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result.split(",")[1])
        reader.readAsDataURL(blob)
      })

      if (window.api && window.api.openPdf) {
        await window.api.openPdf(base64String)
        toast.success("Opening PDF...")
      } else {
        const blobUrl = URL.createObjectURL(blob)
        const printWindow = window.open(blobUrl)
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.focus()
            printWindow.print()
          }
          toast.success("Print dialog opened")
        } else {
          toast.error("Unable to open print window. Please allow pop-ups and try again.")
        }
      }
    } catch (error) {
      console.error("Error printing PDF:", error)
      toast.error("Failed to print PDF")
    }
  }

  const buttonClass =
    "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm hover:-translate-y-0.5 whitespace-nowrap"

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={generatePdf}
        className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 hover:shadow-md`}
        title="Download PDF"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Download
      </button>
      <button
        onClick={printPdf}
        className={`${buttonClass} bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 hover:border-slate-400 hover:shadow-md`}
        title="Print PDF"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Print
      </button>
    </div>
  )
}

export default GeneratePdfButton
