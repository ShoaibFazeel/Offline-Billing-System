import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

// PDF Generator component for creating invoices
class PdfGenerator {
  constructor(bill, companyInfo) {
    this.bill = bill
    this.companyInfo = companyInfo
    this.doc = null
    this.pageWidth = 410 // 15cm in points
    this.pageHeight = 595.3 // 21cm in points
    this.margin = 15 // reduce margin for smaller page
    this.fontSize = {
      title: 16,
      subtitle: 12,
      header: 10,
      normal: 9,
      small: 8,
    }
    this.colors = {
      black: rgb(0, 0, 0),
      gray: rgb(0.5, 0.5, 0.5),
      lightGray: rgb(0.9, 0.9, 0.9),
      white: rgb(1, 1, 1),
      headerBg: rgb(0.95, 0.95, 0.95),
    }
  }

  async generateInvoicePdf(bill, client, companyInfo, fieldOfficer, salesman, showDiscountAsAmount = false, products = []) {
    try {
      const pdfDoc = await PDFDocument.create()
      let page = pdfDoc.addPage([this.pageWidth, this.pageHeight])
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      let y = this.pageHeight - this.margin
      const left = this.margin
      const right = this.pageWidth - this.margin
      const minFooterSpace = 20
      // --- HEADER ---
      const companyName = companyInfo.companyName || "Company Name"
      const companyAddress = companyInfo.companyAddress || "Address"
      const companyOwner = companyInfo.ownerName || "Owner"
      const companyOwnerPhone = companyInfo.ownerPhone || "Phone"
      const companyOwnerNameAndNumberWidth = bold.widthOfTextAtSize(`Owner: ${companyOwner} ${companyOwnerPhone}`, 9)
      const companyNameWidth = bold.widthOfTextAtSize(companyName, 15)
      const companyAddressWidth = font.widthOfTextAtSize(companyAddress, 10)
      page.drawText(companyName, { x: (this.pageWidth-companyNameWidth)/2, y, size: 15, font: bold, color: this.colors.black })
      y -= 10
      page.drawText(companyAddress, { x: (this.pageWidth-companyAddressWidth)/2, y, size: 10, font, color: this.colors.black })
      y -= 10
      page.drawText(`Owner: ${companyOwner} ${companyOwnerPhone}`, { x: (this.pageWidth - companyOwnerNameAndNumberWidth) / 2, y, size: 9, font: bold, color: this.colors.black })
      y -= 5
      page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: this.colors.black })
      y -= 10
      // --- INVOICE INFO ---
      page.drawText(`Invoice No: ${bill.billId ? bill.billId : bill._id}`, { x: left, y, size: 10, font: bold })
      const now = new Date()
      page.drawText(`Date: ${new Date(bill.billDate).toLocaleDateString()}`, { x: right-120, y, size: 10, font })
      y -= 10
      page.drawText(`Name:`, { x: left, y, size: 10, font: bold })
      page.drawText(client.clientName || "N/A", { x: left+50, y, size: 10, font: bold })
      page.drawText(`Printing Date: ${now.toLocaleDateString()}`, { x: right-120, y, size: 10, font })
      y -= 10
      const today = new Date().toLocaleDateString("en-US", {
        weekday: "long"
      });
      page.drawText(`Day: ${today}`, { x: right-120, y, size: 10, font })
      if (client.clientNumber) {
        page.drawText(`Phone:`, { x: left, y, size: 10, font })
        page.drawText(client.clientNumber, { x: left+50, y, size: 10, font })
        y -= 10
      }
      page.drawText(`Address:`, { x: left, y, size: 10, font })
      page.drawText(client.clientAddress || "N/A", { x: left+50, y, size: 10, font })
      y -= 10
      page.drawText(`F. Officer: ${fieldOfficer.name || "N/A"} ${fieldOfficer.phoneNumber || ""}`, { x: left, y, size: 8, font })
      // y -= 13
      page.drawText(`Salesman: ${salesman.name || "N/A"} ${salesman.phoneNumber || ""}`, { x: right-160, y, size: 8, font })
      y -= 5
      // --- TABLE HEADER ---
      page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: this.colors.black })
      y -= 10
      const col = [left, left+18, left+210, left+235, left+260, left+300, left+340]
      page.drawText("S#", { x: col[0], y, size: 10, font: bold })
      page.drawText("Description", { x: col[1], y, size: 10, font: bold })
      page.drawText("Qty", { x: col[2], y, size: 10, font: bold })
      page.drawText("Bns", { x: col[3], y, size: 10, font: bold })
      page.drawText("Rate", { x: col[4], y, size: 10, font: bold })
      page.drawText("Disc", { x: col[5], y, size: 10, font: bold })
      page.drawText("Total", { x: col[6], y, size: 10, font: bold })
      y -= 5
      page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: this.colors.black })
      y -= 10
      // --- TABLE ROWS ---
      for (let idx = 0; idx < bill.items.length; idx++) {
        const item = bill.items[idx]
        if (!item.productName) continue
        const product = products.find(p => p._id === item.productId) || {}
        const descColWidth = col[2] - col[1] - 4
        let tempY = y
        tempY = this.drawWrappedText(page, item.productName.trim(), col[1], tempY, descColWidth, bold, 10, this.colors.black, true)
        if (product.companyName || product.containerSize) {
          let companyText = product.companyName.trim() || ""
          let sizeText = product.containerSize.trim() || ""
          let extra = companyText + (companyText && sizeText ? " - " : "") + sizeText
          if (extra) {
            tempY = this.drawWrappedText(page, extra, col[1], tempY, descColWidth, font, 8, rgb(0.3,0.3,0.3), true)
          }
        }
        const rowHeight = y - tempY + 4
        // PAGE BREAK if not enough space for row + footer
        if (y - rowHeight < minFooterSpace) {
          page = pdfDoc.addPage([this.pageWidth, this.pageHeight])
          y = this.pageHeight - this.margin
          // Redraw table header
          page.drawText(`Invoice No: ${bill.billId ? bill.billId : bill._id}`, { x: left, y, size: 10, font: bold })
          const now = new Date()
          page.drawText(`Date: ${new Date(bill.billDate).toLocaleDateString()}`, { x: right-120, y, size: 10, font })
          y -= 10
          page.drawText(`Name:`, { x: left, y, size: 10, font: bold })
          page.drawText(client.clientName || "N/A", { x: left+50, y, size: 10, font: bold })
          page.drawText(`Printing Date: ${now.toLocaleDateString()}`, { x: right-120, y, size: 10, font })
          y -= 10
          const today = new Date().toLocaleDateString("en-US", {
            weekday: "long"
          });
          page.drawText(`Day: ${today}`, { x: right-120, y, size: 10, font })
          if (client.clientNumber) {
            page.drawText(`Phone:`, { x: left, y, size: 10, font })
            page.drawText(client.clientNumber, { x: left+50, y, size: 10, font })
            y -= 10
          }
          page.drawText(`Address:`, { x: left, y, size: 10, font })
          page.drawText(client.clientAddress || "N/A", { x: left+50, y, size: 10, font })
          y -= 10
          page.drawText(`F. Officer: ${fieldOfficer.name || "N/A"} ${fieldOfficer.phoneNumber || ""}`, { x: left, y, size: 8, font })
          // y -= 13
          page.drawText(`Salesman: ${salesman.name || "N/A"} ${salesman.phoneNumber || ""}`, { x: right-160, y, size: 8, font })
          y -= 5
          // --- TABLE HEADER ---
          page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: this.colors.black })
          y -= 10
          page.drawText("S#", { x: col[0], y, size: 10, font: bold })
          page.drawText("Description", { x: col[1], y, size: 10, font: bold })
          page.drawText("Qty", { x: col[2], y, size: 10, font: bold })
          page.drawText("Bns", { x: col[3], y, size: 10, font: bold })
          page.drawText("Rate", { x: col[4], y, size: 10, font: bold })
          page.drawText("Disc", { x: col[5], y, size: 10, font: bold })
          page.drawText("Total", { x: col[6], y, size: 10, font: bold })
          y -= 5
          page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: this.colors.black })
          y -= 12
        }

        page.drawText(String(idx + 1), { x: col[0], y: y, size: 10, font })
        let companyText = product.companyName || ""
        let sizeText = product.containerSize || ""
        let extra = companyText + (companyText && sizeText ? "-" : "") + sizeText
        let y2 = this.drawWrappedText(page, item.productName.trim(), col[1], y, descColWidth, bold, 10, this.colors.black)
        if (product.companyName || product.containerSize) {
          let companyText = product.companyName.trim() || ""
          let sizeText = product.containerSize || ""
          let extra = companyText + (companyText && sizeText ? " - " : "") + sizeText
          if (extra) {
            y2 = this.drawWrappedText(page, extra, col[1], y2 + 4, descColWidth, font, 8, rgb(0.3,0.3,0.3))
          }
        }
        // Reset y to top of row for other columns
        const colY = y
        page.drawText(String(item.quantity), { x: col[2], y: colY, size: 10, font })
        page.drawText(item.isBonus ? String(item.quantity) : "0", { x: col[3], y: colY, size: 10, font })
        page.drawText(item.rate.toFixed(2), { x: col[4], y: colY, size: 10, font })
        if (showDiscountAsAmount) {
          const discAmt = ((item.rate * item.quantity * (item.discount || 0)) / 100).toFixed(2)
          page.drawText(discAmt, { x: col[5] + 5, y: colY, size: 10, font })
        } else {
          page.drawText(`${item.discount || 0}%`, { x: col[5] + 5, y: colY, size: 10, font })
        }
        page.drawText(item.total.toFixed(2), { x: col[6], y: colY, size: 10, font })
        y -= Math.ceil(y - y2) + 1
      }
      y += 5
      page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: this.colors.black })
      y -= 15
      // --- TOTALS & FOOTER ---
      if (y < minFooterSpace || y < 130) {
        page = pdfDoc.addPage([this.pageWidth, this.pageHeight])
        y = this.pageHeight - this.margin

        page.drawText(`Invoice No: ${bill.billId ? bill.billId : bill._id}`, { x: left, y, size: 10, font: bold })
          const now = new Date()
          page.drawText(`Date: ${new Date(bill.billDate).toLocaleDateString()}`, { x: right-120, y, size: 10, font })
          y -= 10
          page.drawText(`Name:`, { x: left, y, size: 10, font: bold })
          page.drawText(client.clientName || "N/A", { x: left+50, y, size: 10, font: bold })
          page.drawText(`Printing Date: ${now.toLocaleDateString()}`, { x: right-120, y, size: 10, font })
          y -= 10
          const today = new Date().toLocaleDateString("en-US", {
            weekday: "long"
          });
          page.drawText(`Day: ${today}`, { x: right-120, y, size: 10, font })
          if (client.clientNumber) {
            page.drawText(`Phone:`, { x: left, y, size: 10, font })
            page.drawText(client.clientNumber, { x: left+50, y, size: 10, font })
            y -= 10
          }
          page.drawText(`Address:`, { x: left, y, size: 10, font })
          page.drawText(client.clientAddress || "N/A", { x: left+50, y, size: 10, font })
          y -= 10
          page.drawText(`F. Officer: ${fieldOfficer.name || "N/A"} ${fieldOfficer.phoneNumber || ""}`, { x: left, y, size: 8, font })
          // y -= 13
          page.drawText(`Salesman: ${salesman.name || "N/A"} ${salesman.phoneNumber || ""}`, { x: right-160, y, size: 8, font })
          y -= 5
          // --- TABLE HEADER ---
          page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: this.colors.black })
          y -= 15
      }
      // Totals
      const grossAmount = bill.items.reduce((sum, item) => !item.isBonus ? sum + item.quantity * item.rate : sum, 0)
      const totalDiscount = bill.items.reduce((sum, item) => !item.isBonus ? sum + ((item.rate * item.quantity * (item.discount || 0)) / 100) : sum, 0)
      const partyStatus = client.isFiler ? "FILER" : "NON FILER"
      // const ntn = client.ntnNumber || ""
      page.drawText(`Party Status: ${partyStatus}`, { x: left, y, size: 10, font: bold })
      // page.drawText(`NTN No: ${ntn}`, { x: left + 120, y, size: 10, font })
      const boxX = left + 140
      const boxY = y + 10
      const boxWidth = 240
      const boxHeight = 40
      page.drawRectangle({ x: boxX, y: boxY - boxHeight, width: boxWidth, height: boxHeight, borderColor: this.colors.black, borderWidth: 1, color: rgb(0.97,0.97,0.97) })
      let boxTextY = boxY - 16
      page.drawText(`Gross Amount`, { x: boxX + 4, y: boxY - 10, size: 8, font })
      page.drawText(grossAmount.toFixed(2), { x: boxX + 14, y: boxY - 30, size: 9, font })
      boxTextY -= 14
      page.drawText(`Advance Tax`, { x: boxX + 64, y: boxY - 10, size: 8, font })
      page.drawText("0.00", { x: boxX + 74, y: boxY - 30, size: 9, font })
      boxTextY -= 14
      page.drawText(`Discount`, { x: boxX + 124, y: boxY - 10, size: 8, font })
      page.drawText(totalDiscount.toFixed(2), { x: boxX + 130, y: boxY - 30, size: 9, font })
      boxTextY -= 14
      page.drawText(`TOTAL AMOUNT`, { x: boxX + 174, y: boxY - 10, size: 8, font })
      page.drawText(bill.totalAmount.toFixed(2), { x: boxX + 187, y: boxY - 30, size: 9, font })
      y -= boxHeight
      page.drawLine({ start: { x: boxX, y: boxY - 15 }, end: { x: boxX + boxWidth, y: boxY - 15 }, thickness: 0.5, color: this.colors.black })
      y += 7
      page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: this.colors.black })
      // Footer
      let footerY = 70
      page.drawLine({ start: { x: left, y: footerY + 38 }, end: { x: right, y: footerY + 38 }, thickness: 0.5, color: this.colors.black })
      page.drawLine({ start: { x: left, y: footerY + 37 }, end: { x: right, y: footerY + 37 }, thickness: 0.5, color: this.colors.black })
      page.drawLine({ start: { x: left + 8, y: footerY + 33 }, end: { x: left + 70, y: footerY + 33 }, thickness: 0.5, color: this.colors.black })
      page.drawLine({ start: { x: left + 88, y: footerY + 33 }, end: { x: left + 150, y: footerY + 33 }, thickness: 0.5, color: this.colors.black })
      page.drawText("Prepared By", { x: left + 10, y: footerY + 24, size: 9, font })
      page.drawText("Checked By", { x: left + 90, y: footerY + 24, size: 9, font })
      page.drawText("TOTAL AMOUNT:", { x: left + 250, y: footerY + 24, size: 9, font: bold })
      page.drawText(bill.totalAmount.toFixed(2), { x: left + 330, y: footerY + 24, size: 9, font: bold })
      
      page.drawRectangle({ x: left, y: footerY - 27, width: 380, height: 46, borderColor: this.colors.black, borderWidth: 1})
      page.drawText("General Warranty:", { x: left + 5, y: footerY + 10, size: 8, font: bold })
      page.drawText(" under alternative medicine & health products (enlistment) Rules 2014", { x: left + 75, y: footerY + 10, size: 7, font: bold })
      page.drawText("We as the authorised distributors/agents and on behalf of the Principals/Manufacturer hereby give warranty that the", { x: left  + 6, y: footerY + 2, size: 6, font })
      page.drawText("supplied alternative medicines & health products mentioned herein do not contravene any provision of the prevailing DRAP Act & rules", { x: left  + 6, y: footerY - 6, size: 6, font })
      page.drawText("Note:", { x: left + 5, y: footerY - 15, size: 8, font: bold })
      page.drawText(" (A) For dated (expired) items, Please inform 6 months before actual expiry date.", { x: left + 25, y: footerY - 15, size: 6, font })
      page.drawText(" (B) This warranty does not apply to the ayurvedic, general items, unani, food items mentioned in this cash memo/invoice.", { x: left + 25, y: footerY - 22, size: 6, font })
      page.drawText("Designed By: Shoaib Fazeel B - 24/7 Hours Help Line (0347-8405935, 0307-6341160)", { x: left, y: footerY - 35, size: 7, font })
      return await pdfDoc.save()
    } catch (error) {
      console.error("Error generating PDF:", error)
      throw error
    }
  }

  // Helper function to draw wrapped text - Fixed to handle newlines properly
  drawWrappedText(page, text, x, y, maxWidth, font, fontSize, color, measureOnly = false) {
    const words = text.split(" ");
    let line = "";
    let lineY = y;
    const lineHeight = fontSize * 1.2;
    for (const word of words) {
      const testLine = line + (line ? " " : "") + word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth > maxWidth && line !== "") {
        if (!measureOnly) {
          page.drawText(line, { x, y: lineY, size: fontSize, font, color });
        }
        line = word;
        lineY -= lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line) {
      if (!measureOnly) {
        page.drawText(line, { x, y: lineY, size: fontSize, font, color });
      }
    }
    return lineY - lineHeight;
  }
}

export default PdfGenerator
