const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF invoice for an order
 * @param {Object} order - Complete order object with populated customer
 * @param {Object} company - Company/Organization details
 * @param {Object} customData - Custom invoice data from frontend (optional)
 * @returns {Promise<string>} - Path to generated PDF file
 */
const generateInvoicePDF = async (order, company = {}, customData = null) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('=== PDF GENERATOR DEBUG ===');
      console.log('Custom Data:', JSON.stringify(customData, null, 2));
      console.log('Order Customer:', JSON.stringify({
        firstName: order.customer?.firstName,
        lastName: order.customer?.lastName,
        phone: order.customer?.phone,
        email: order.customer?.email,
        deliveryAddress: order.customer?.deliveryAddress
      }, null, 2));

      // Create invoices directory if it doesn't exist
      const invoicesDir = path.join(__dirname, '..', 'invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      // Generate invoice filename
      const invoiceFileName = `invoice-${order.invoice?.invoiceNumber || order.orderNumber}-${Date.now()}.pdf`;
      const invoicePath = path.join(invoicesDir, invoiceFileName);

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Invoice ${order.invoice?.invoiceNumber || order.orderNumber}`,
          Author: company.name || 'Vlite Furnitures',
          Subject: 'Sales Invoice',
        }
      });

      // Pipe to file
      const writeStream = fs.createWriteStream(invoicePath);
      doc.pipe(writeStream);

      // ========================================
      // CLEAN BLACK & WHITE PROFESSIONAL DESIGN
      // ========================================

      // Company Header (Simple, No colors)
      doc.fontSize(26).font('Helvetica-Bold')
        .fillColor('#000000')
        .text(company.name || 'Vlite Furnitures', 50, 50);

      doc.fontSize(9).font('Helvetica')
        .fillColor('#333333')
        .text(company.address || 'Manufacturing Unit, Industrial Area', 50, 85)
        .text(`Phone: ${company.phone || '+91 XXXXXXXXXX'}`, 50, 98)
        .text(`Email: ${company.email || 'info@vlitefurnitures.com'}`, 50, 111)
        .text(`GST No: ${company.gstNumber || 'XXXXXXXXXXXX'}`, 50, 124);

      // Invoice Title Box (Simple border)
      doc.rect(380, 45, 165, 90).stroke('#000000');

      doc.fontSize(18).font('Helvetica-Bold')
        .fillColor('#000000')
        .text('TAX INVOICE', 390, 55);

      // Invoice Details
      const invoiceNumber = customData?.invoiceNumber || order.invoice?.invoiceNumber || order.orderNumber;
      const invoiceDate = customData?.invoiceDate ? new Date(customData.invoiceDate).toLocaleDateString('en-IN')
        : (order.invoice?.invoiceDate ? new Date(order.invoice.invoiceDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'));
      const orderNumber = customData?.orderNumber || order.orderNumber;
      const orderDate = customData?.orderDate ? new Date(customData.orderDate).toLocaleDateString('en-IN')
        : new Date(order.orderDate).toLocaleDateString('en-IN');

      doc.fontSize(9).font('Helvetica')
        .fillColor('#000000')
        .text(`Inv No: ${invoiceNumber}`, 390, 80)
        .text(`Date: ${invoiceDate}`, 390, 95)
        .text(`Order No: ${orderNumber}`, 390, 110)
        .text(`Order Date: ${orderDate}`, 390, 125);

      // Customer Details Section - use custom data if available
      const customerName = customData?.customerName || `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'N/A';
      const customerPhone = customData?.customerPhone || order.customer?.phone || '';
      const customerEmail = customData?.customerEmail || order.customer?.email || '';

      let customerAddress = '';
      if (customData?.customerAddress) {
        // If customData has address, check if it's object or string
        if (typeof customData.customerAddress === 'object') {
          const addr = customData.customerAddress;
          const parts = [
            addr.street,
            addr.area,
            addr.city,
            addr.state ? `${addr.state} - ${addr.zipCode || ''}` : addr.zipCode
          ].filter(Boolean);
          customerAddress = parts.join(', ');
        } else {
          customerAddress = customData.customerAddress;
        }
      } else if (order.customer?.deliveryAddress) {
        const addr = order.customer.deliveryAddress;
        const parts = [
          addr.street,
          addr.city,
          addr.state ? `${addr.state} - ${addr.pincode || ''}` : addr.pincode
        ].filter(Boolean);
        customerAddress = parts.join(', ');
      }

      console.log('Customer Details for PDF:');
      console.log('  Name:', customerName);
      console.log('  Phone:', customerPhone);
      console.log('  Email:', customerEmail);
      console.log('  Address:', customerAddress);
      console.log('Invoice Date for PDF:', invoiceDate);

      // Line separator
      doc.moveTo(50, 150).lineTo(545, 150).stroke('#000000');

      // ========================================
      // CUSTOMER DETAILS SECTION (Simple boxes)
      // ========================================

      // Bill To Box (Simple border)
      doc.rect(50, 165, 230, 90).stroke('#000000');

      doc.fontSize(11).font('Helvetica-Bold')
        .fillColor('#000000')
        .text('BILL TO', 60, 175);

      doc.fontSize(10).font('Helvetica-Bold')
        .fillColor('#000000')
        .text(customerName, 60, 195);

      doc.fontSize(9).font('Helvetica')
        .fillColor('#333333')
        .text(customerPhone, 60, 210)
        .text(customerEmail, 60, 223);

      if (customerAddress && customerAddress.trim()) {
        doc.text(customerAddress, 60, 236, { width: 210 });
      }

      // Deliver To Box (Simple border)
      doc.rect(310, 165, 235, 90).stroke('#000000');

      doc.fontSize(11).font('Helvetica-Bold')
        .fillColor('#000000')
        .text('DELIVER TO', 320, 175);

      doc.fontSize(10).font('Helvetica-Bold')
        .fillColor('#000000')
        .text(customerName, 320, 195);

      if (customerAddress && customerAddress.trim()) {
        doc.fontSize(9).font('Helvetica')
          .fillColor('#333333')
          .text(customerAddress, 320, 210, { width: 215 })
          .text(`Phone: ${customerPhone}`, 320, 238);
      } else {
        doc.fontSize(9).font('Helvetica')
          .fillColor('#333333')
          .text(`Phone: ${customerPhone}`, 320, 210);
      }

      // ========================================
      // TABLE SECTION (Clean design)
      // ========================================
      const tableTop = 270;
      const itemX = 50;
      const productCodeX = 85;
      const productDescX = 230;
      const qtyX = 370;
      const priceX = 430;
      const amountX = 490;

      // Table Header (Bold border, no color fill)
      doc.rect(50, tableTop, 495, 20).stroke('#000000');
      doc.lineWidth(1.5);

      doc.fontSize(9).font('Helvetica-Bold')
        .fillColor('#000000')
        .text('S.No', itemX + 3, tableTop + 6)
        .text('Product', productCodeX, tableTop + 6)
        .text('Product Description', productDescX, tableTop + 6)
        .text('Qty', qtyX, tableTop + 6)
        .text('Price', priceX, tableTop + 6)
        .text('Amount', amountX, tableTop + 6);

      doc.lineWidth(0.5);

      // Table Rows
      const items = customData?.items || order.items;
      let yPosition = tableTop + 28;
      doc.fontSize(9).font('Helvetica').fillColor('#000000');

      items.forEach((item, index) => {
        // Check if we need a new page
        if (yPosition > 680) {
          doc.addPage();
          yPosition = 50;
        }

        // S.No
        doc.text((index + 1).toString(), itemX + 3, yPosition);

        // Product Code (from description field)
        const productCode = item.description || 'N/A';
        doc.text(productCode, productCodeX, yPosition, { width: 140, lineBreak: false, ellipsis: true });

        // Product Description (from product.name or specifications)
        const productDesc = item.product?.name || item.specifications || '-';
        doc.text(productDesc, productDescX, yPosition, { width: 135, lineBreak: false, ellipsis: true });

        // Qty, Price, Amount (right aligned)
        doc.text(item.quantity.toString(), qtyX, yPosition, { align: 'right', width: 50 });
        doc.text(`₹${(item.unitPrice || 0).toLocaleString('en-IN')}`, priceX, yPosition, { align: 'right', width: 50 });
        doc.text(`₹${(item.totalPrice || 0).toLocaleString('en-IN')}`, amountX, yPosition, { align: 'right', width: 50 });

        yPosition += 22;
      });

      // ========================================
      // TOTALS SECTION (Clean box)
      // ========================================

      // Add spacing after table
      yPosition += 10;

      // Draw top line
      doc.moveTo(50, yPosition).lineTo(545, yPosition).stroke('#000000');
      yPosition += 15;

      // Calculate totals
      const subtotal = customData?.totalAmount || order.totalAmount || 0;
      const gstRate = customData?.gstRate || 18;
      const gstAmount = (subtotal * gstRate) / (100 + gstRate);
      const amountBeforeGST = subtotal - gstAmount;
      const cgst = gstAmount / 2;
      const sgst = gstAmount / 2;
      const advanceReceived = customData?.advanceReceived !== undefined ? customData.advanceReceived : (order.advanceReceived || 0);
      const balanceDue = subtotal - advanceReceived;

      // Totals box positioning
      const labelX = 350;
      const valueX = 485;

      doc.fontSize(10).font('Helvetica').fillColor('#000000');

      // Subtotal
      doc.text('Subtotal:', labelX, yPosition);
      doc.text(`₹${amountBeforeGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, valueX, yPosition, { align: 'right', width: 60 });
      yPosition += 18;

      // CGST
      doc.text(`CGST (${gstRate / 2}%):`, labelX, yPosition);
      doc.text(`₹${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, valueX, yPosition, { align: 'right', width: 60 });
      yPosition += 18;

      // SGST
      doc.text(`SGST (${gstRate / 2}%):`, labelX, yPosition);
      doc.text(`₹${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, valueX, yPosition, { align: 'right', width: 60 });
      yPosition += 22;

      // Line before total
      doc.moveTo(350, yPosition).lineTo(545, yPosition).stroke('#000000');
      yPosition += 12;

      // Grand Total (Bold)
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Total Amount:', labelX, yPosition);
      doc.text(`₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, valueX, yPosition, { align: 'right', width: 60 });
      yPosition += 25;

      // Payment Information (if advance paid)
      if (advanceReceived > 0) {
        doc.fontSize(10).font('Helvetica');
        doc.text('Advance Paid:', labelX, yPosition);
        doc.text(`₹${advanceReceived.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, valueX, yPosition, { align: 'right', width: 60 });
        yPosition += 20;

        doc.font('Helvetica-Bold');
        doc.text('Balance Due:', labelX, yPosition);
        doc.text(`₹${balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, valueX, yPosition, { align: 'right', width: 60 });
        yPosition += 25;
      }

      // Amount in words
      yPosition += 10;
      doc.fontSize(10).font('Helvetica-Bold')
        .text(`Amount in Words: ${numberToWords(Math.round(subtotal))} Rupees Only`, 50, yPosition, { width: 500 });

      // Terms and Conditions - use custom terms if available
      yPosition += 40;
      doc.fontSize(11).font('Helvetica-Bold').text('Terms & Conditions:', 50, yPosition);
      yPosition += 20;

      const terms = customData?.terms || [
        'Payment is due within 30 days from invoice date.',
        'Goods once sold will not be taken back.',
        'Interest @ 18% per annum will be charged on delayed payments.',
        'Subject to local jurisdiction only.'
      ];

      doc.fontSize(9).font('Helvetica');
      terms.forEach((term, index) => {
        doc.text(`${index + 1}. ${term}`, 50, yPosition + (index * 15));
      });

      // Footer - Company Stamp and Signature - use custom footer if available
      yPosition = 700;
      const footerCompanyName = customData?.footerCompanyName || company.name || 'Vlite Furnitures';
      const authorizedSignatory = customData?.authorizedSignatory || 'Authorized Signatory';

      doc.fontSize(10).font('Helvetica-Bold')
        .text('For ' + footerCompanyName, 380, yPosition);
      doc.fontSize(9).font('Helvetica')
        .text(authorizedSignatory, 380, yPosition + 50);

      // Finalize PDF
      doc.end();

      // Wait for file to be written
      writeStream.on('finish', () => {
        resolve(invoicePath);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Convert number to words (Indian numbering system)
 */
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num === 0) return 'Zero';

  function convertLessThanThousand(n) {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
  }

  if (num < 1000) {
    return convertLessThanThousand(num);
  }

  if (num < 100000) { // Less than 1 Lakh
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    return convertLessThanThousand(thousands) + ' Thousand' +
      (remainder !== 0 ? ' ' + convertLessThanThousand(remainder) : '');
  }

  if (num < 10000000) { // Less than 1 Crore
    const lakhs = Math.floor(num / 100000);
    const remainder = num % 100000;
    return convertLessThanThousand(lakhs) + ' Lakh' +
      (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
  }

  const crores = Math.floor(num / 10000000);
  const remainder = num % 10000000;
  return convertLessThanThousand(crores) + ' Crore' +
    (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
}

module.exports = {
  generateInvoicePDF,
};
