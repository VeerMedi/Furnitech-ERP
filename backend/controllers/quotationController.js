const Quotation = require('../models/vlite/Quotation');
const Customer = require('../models/vlite/Customer');
const Inquiry = require('../models/vlite/Inquiry');
const Order = require('../models/vlite/Order');
const Organization = require('../models/shared/Organization');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/vlite/User');
const EmailService = require('../utils/emailService');
const { cleanQuotationDescription } = require('../utils/descriptionCleaner');

// Get all quotations
exports.getAllQuotations = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const { search, status, page = 1, limit = 100 } = req.query;

    const query = { organizationId: new mongoose.Types.ObjectId(organizationId) };

    if (search) {
      query.$or = [
        { quotationNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [quotations, total] = await Promise.all([
      Quotation.find(query)
        .select('quotationNumber customer totalAmount status validUntil')
        .populate('customer', 'name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Quotation.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: quotations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({ message: 'Error fetching quotations', error: error.message });
  }
};

// Get quotation by ID
exports.getQuotationById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-tenant-id'];

    const quotation = await Quotation.findOne({
      _id: id,
      organizationId: new mongoose.Types.ObjectId(organizationId)
    }).populate('customer');

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    res.status(200).json({
      success: true,
      data: quotation
    });
  } catch (error) {
    console.error('Error fetching quotation:', error);
    res.status(500).json({ message: 'Error fetching quotation', error: error.message });
  }
};

// Get all quotations with filters
exports.getQuotations = async (req, res) => {
  console.log('🚀 GET QUOTATIONS CALLED AT:', new Date().toISOString());
  try {
    const { status, search, startDate, endDate } = req.query;
    const organizationId = req.user.organizationId || req.user.organization || req.organization?._id;
    const userId = req.user._id || req.user.id;
    const userRole = req.user.userRole;

    console.log('🔍 Fetching quotations for org:', organizationId);
    console.log('📝 User type:', req.userType);
    console.log('📝 User details:', {
      userId,
      userOrgId: req.user.organizationId,
      reqOrgId: req.organization?._id,
      userRole
    });

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID not found in request'
      });
    }

    let query = { organizationId };

    console.log('🎯 DEBUG - User Role Check:');
    console.log('   userRole from req.user:', userRole);
    console.log('   userRole type:', typeof userRole);
    console.log('   Comparison result (userRole === "Salesman"):', userRole === 'Salesman');

    // Check if user is Main Account / Admin (Bypass filters)
    const userEmail = req.user?.email?.toLowerCase() || '';
    const isMainAccount = userEmail.includes('jasleen') ||
      userEmail.includes('admin');

    console.log('👤 User Email:', userEmail);
    console.log('🔑 Is Main Account (Bypass Filter):', isMainAccount);

    // If user is a Salesman AND NOT Main account, show quotations created by them
    if (userRole && userRole === 'Salesman' && !isMainAccount) {
      console.log('✅ SALESMAN DETECTED - Filtering quotations by createdBy:', userId);

      // Show quotations created by this salesman
      query.createdBy = userId;
      console.log('✅ Salesman filter applied - showing quotations created by this user');
    } else {
      console.log('❌ NOT A SALESMAN - userRole:', userRole, '- Showing ALL quotations for organization');
      console.log('   No createdBy filter - Main Account/POC/Admin will see all quotations');
    }

    if (status) query.approvalStatus = status;
    if (search) {
      query.$or = [
        { quotationNumber: { $regex: search, $options: 'i' } }
      ];
    }
    if (startDate || endDate) {
      query.validFrom = {};
      if (startDate) query.validFrom.$gte = new Date(startDate);
      if (endDate) query.validFrom.$lte = new Date(endDate);
    }

    console.log('🔎 Query:', JSON.stringify(query));

    const quotations = await Quotation.find(query)
      .populate('customer', 'companyName tradeName emails gstNumber customerCode')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    console.log(`📋 Found ${quotations.length} quotations for user ${userId}`);

    res.json({ success: true, data: quotations });
  } catch (err) {
    console.error('Error fetching quotations:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get quotation by ID
exports.getQuotationById = async (req, res) => {
  try {
    const organizationId = req.user.organizationId || req.user.organization || req.organization?._id;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID not found'
      });
    }

    const quotation = await Quotation.findOne({
      _id: req.params.id,
      organizationId
    })
      .populate('customer')
      .populate('createdBy', 'firstName lastName email')
      .populate('inquiry', 'inquiryNumber');

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }


    // Transform items for view mode - clean text without emojis
    const quotationForView = quotation.toObject();
    quotationForView.items = quotationForView.items.map(item => {
      // If item has structured products/materials OR AI-generated description, clean it
      const hasAIFormat = item.description?.includes('📦 Product Used:') || item.description?.includes('🔧 Materials Used:');
      if (item.selectedProducts?.length > 0 || item.selectedMaterials?.length > 0 || hasAIFormat) {
        let cleanDescription = item.layoutDescription || '';

        // Add product names (no prices, no emojis)
        if (item.selectedProducts?.length > 0) {
          const productNames = item.selectedProducts.map(p => p.name).join(', ');
          cleanDescription += `\n${productNames}`;
        }

        // Add material names (no prices, no emojis)
        if (item.selectedMaterials?.length > 0) {
          const materialNames = item.selectedMaterials.map(m => m.name).join(', ');
          cleanDescription += `\n${materialNames}`;
        }

        // Add specifications if available
        if (item.specifications && typeof item.specifications === 'string') {
          cleanDescription += `\n${item.specifications}`;
        }

        return {
          ...item,
          description: cleanDescription.trim()
        };
      }

      return item;
    });

    res.json({ success: true, data: quotationForView });
  } catch (err) {
    console.error('Error fetching quotation:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Create quotation
exports.createQuotation = async (req, res) => {
  try {
    const organizationId = req.user.organizationId || req.user.organization;
    const userId = req.user._id || req.user.id;

    console.log('📝 Creating Quotation - Request Body:', JSON.stringify(req.body, null, 2));

    const quotationData = {
      organizationId,
      customer: req.body.customer || null,
      customerName: req.body.customerName || '',
      customerEmail: req.body.customerEmail || '',
      companyName: req.body.companyName || '',
      inquiryProductDetails: req.body.inquiryProductDetails || '',
      validFrom: req.body.validFrom || new Date(),
      validUntil: req.body.validUntil,
      items: req.body.items || [],
      // Do NOT manually set amounts here. Let the pre('save') hook calculate them.
      // passing explicit 0s overrides the hook's ability to see them as "calculated" in some edge cases
      // or if logic differs.
      discount: req.body.discount || 0,
      bankDetails: req.body.bankDetails || {},
      notes: req.body.notes || '',
      emailMessage: req.body.emailMessage || '',
      termsAndConditions: req.body.termsAndConditions || [],
      approvalStatus: req.body.approvalStatus || 'DRAFT',
      createdBy: userId === 'hardcoded-admin-system' ? null : userId,
      paymentTerms: req.body.paymentTerms || {},
      deliveryTerms: req.body.deliveryTerms || {},
      inquiry: req.body.inquiry || null,
      fileDescription: req.body.fileDescription || '',
    };

    // If explicit amounts ARE provided (e.g. migration or manual override), we can set them,
    // but for standard creation via UI which sends items, we should trust the items.
    // The UI sends 'items' with 'unitPrice', 'quantity', 'taxPerUnit'.

    // Create new instance
    const quotation = new Quotation(quotationData);

    // Save triggers pre('save') hook which calculates:
    // taxableAmount, cgst, sgst, igst, totalAmount, quotationNumber
    await quotation.save();

    console.log(`✅ Quotation Created: ${quotation.quotationNumber}, Total: ${quotation.totalAmount}`);

    const populated = await Quotation.findById(quotation._id)
      .populate('customer', 'companyName tradeName primaryEmail')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Error creating quotation:', err);
    res.status(400).json({ message: err.message });
  }
};

// Update quotation
exports.updateQuotation = async (req, res) => {
  try {
    const organizationId = req.user.organizationId || req.user.organization;

    const quotation = await Quotation.findOne({
      _id: req.params.id,
      organizationId
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Apply updates
    const updateData = { ...req.body };

    // Prevent BSON error if createdBy is hardcoded string
    if (updateData.createdBy === 'hardcoded-admin-system') {
      delete updateData.createdBy;
    } else if (updateData.createdBy === '' || updateData.createdBy === null) {
      // Don't delete existing createdBy if not provided or empty
      delete updateData.createdBy;
    }

    // Update fields on the document
    Object.keys(updateData).forEach(key => {
      // Don't update _id or unmodifiable fields
      if (key !== '_id' && key !== 'organizationId' && key !== 'createdAt' && key !== 'updatedAt' && key !== '__v') {
        quotation[key] = updateData[key];
      }
    });

    // Save triggers the pre('save') hook which recalculates totals
    await quotation.save();

    const populated = await Quotation.findById(quotation._id)
      .populate('customer', 'companyName tradeName primaryEmail')
      .populate('createdBy', 'firstName lastName');

    res.json(populated);
  } catch (err) {
    console.error('Error updating quotation:', err);
    res.status(400).json({ message: err.message });
  }
};

// Delete quotation
exports.deleteQuotation = async (req, res) => {
  try {
    const organizationId = req.user.organizationId || req.user.organization;
    const quotation = await Quotation.findOneAndDelete({
      _id: req.params.id,
      organizationId
    });

    if (!quotation) return res.status(404).json({ message: 'Quotation not found' });

    res.json({ message: 'Quotation deleted successfully' });
  } catch (err) {
    console.error('Error deleting quotation:', err);
    res.status(500).json({ message: err.message });
  }
};

// Helper to generate PDF Buffer
const generatePDFBuffer = async (quotation, org) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    fillPDFContent(doc, quotation, org);
  });
};

// Helper function to fill PDF content
const fillPDFContent = (doc, quotation, org) => {
  console.log('🎨 NEW TEMPLATE FUNCTION CALLED - Using Vlite Template');
  const pageWidth = 595.28; // A4 width in points
  const pageHeight = 841.89; // A4 height in points
  const margin = 40;

  // Add logo at top left
  const logoPath = path.join(__dirname, '../public/assets/vlite-logo.jpg');
  console.log('📁 Logo path:', logoPath);
  console.log('📁 Logo exists:', fs.existsSync(logoPath));
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, margin, margin, { width: 100 });
  }

  // Company details at top right
  const rightX = pageWidth - margin - 200;
  doc.fontSize(8).fillColor('#C8102E').font('Helvetica');
  doc.text('C-329, 334, 3rd Floor, Antop Hill, Ware Housing Co. Ltd', rightX, margin, { width: 200, align: 'right' });
  doc.text('Vrt College Road, Wadala (E), Mumbai - 400037', rightX, margin + 10, { width: 200, align: 'right' });
  doc.fontSize(7).fillColor('#333');
  doc.text('022 - 50020256 / 50020069 | sales@vlitefurnitech.com', rightX, margin + 20, { width: 200, align: 'right' });

  // Customer section
  let currentY = margin + 80;
  doc.fontSize(9).fillColor('#000').font('Helvetica');
  doc.text('To', margin, currentY);
  currentY += 12;

  const customerName = quotation.customer
    ? (quotation.customer.companyName || quotation.customer.tradeName || `${quotation.customer.firstName} ${quotation.customer.lastName}`)
    : quotation.customerName || 'Customer Name';
  doc.text(customerName, margin, currentY);
  currentY += 12;

  // Customer address
  const billAddr = quotation.customer?.billingAddress;
  if (billAddr) {
    let addrText = '';
    if (billAddr.address) addrText += billAddr.address;
    if (billAddr.city) addrText += (addrText ? ', ' : '') + billAddr.city;
    if (billAddr.state) addrText += (addrText ? ', ' : '') + billAddr.state;
    if (billAddr.pincode) addrText += ' - ' + billAddr.pincode;
    if (addrText) {
      doc.text(addrText, margin, currentY, { width: 300 });
      currentY += 12;
    }
  } else {
    doc.text('Address', margin, currentY);
    currentY += 12;
  }

  // Date on right
  doc.text('Date', pageWidth - margin - 100, margin + 80);
  doc.text(new Date(quotation.validFrom).toLocaleDateString('en-IN'), pageWidth - margin - 100, margin + 92);

  currentY += 8;
  doc.text('Dear Sir/Ma\'am,', margin, currentY);
  currentY += 12;
  doc.fontSize(8);
  doc.text('We are thankful to you for giving us the opportunity to forward our quotation.', margin, currentY);
  currentY += 15;

  // Title
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000');
  doc.text('Quotation Modular Furniture ( Mumbai )', margin, currentY, { align: 'center', width: pageWidth - 2 * margin });
  currentY += 20;

  // Table
  const tableTop = currentY;
  const colWidths = {
    srNo: 30,
    layout: 70,
    description: 130,
    qty: 45,
    rate: 70,
    amount: 80,
    image: 70
  };

  let xPos = margin;

  // Table header
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#000');
  const headerHeight = 20;
  doc.rect(margin, tableTop, pageWidth - 2 * margin, headerHeight).stroke();

  doc.text('Sr.No', xPos + 5, tableTop + 7, { width: colWidths.srNo });
  xPos += colWidths.srNo;
  doc.rect(xPos, tableTop, 0, headerHeight).stroke();

  doc.text('Layout\nDescription', xPos + 5, tableTop + 3, { width: colWidths.layout, align: 'center' });
  xPos += colWidths.layout;
  doc.rect(xPos, tableTop, 0, headerHeight).stroke();

  doc.text('Description', xPos + 5, tableTop + 7, { width: colWidths.description });
  xPos += colWidths.description;
  doc.rect(xPos, tableTop, 0, headerHeight).stroke();

  doc.text('Qty/\nin Nos', xPos + 5, tableTop + 3, { width: colWidths.qty, align: 'center' });
  xPos += colWidths.qty;
  doc.rect(xPos, tableTop, 0, headerHeight).stroke();

  doc.text('Rate', xPos + 5, tableTop + 7, { width: colWidths.rate, align: 'center' });
  xPos += colWidths.rate;
  doc.rect(xPos, tableTop, 0, headerHeight).stroke();

  doc.text('Amount', xPos + 5, tableTop + 7, { width: colWidths.amount, align: 'center' });
  xPos += colWidths.amount;
  doc.rect(xPos, tableTop, 0, headerHeight).stroke();

  doc.text('Image', xPos + 5, tableTop + 7, { width: colWidths.image, align: 'center' });

  // Table rows (7 rows as per template)
  let rowY = tableTop + headerHeight;
  const rowHeight = 40;
  doc.font('Helvetica').fontSize(7);

  // Draw items (max 7 rows to match template)
  for (let i = 0; i < 7; i++) {
    xPos = margin;
    doc.rect(margin, rowY, pageWidth - 2 * margin, rowHeight).stroke();

    if (i < quotation.items.length) {
      const item = quotation.items[i];

      // Sr.No
      doc.text((i + 1).toString(), xPos + 5, rowY + 15, { width: colWidths.srNo });
      xPos += colWidths.srNo;
      doc.rect(xPos, rowY, 0, rowHeight).stroke();

      // Layout Description
      doc.text(item.layoutDescription || '', xPos + 5, rowY + 5, { width: colWidths.layout - 10, height: rowHeight - 10 });
      xPos += colWidths.layout;
      doc.rect(xPos, rowY, 0, rowHeight).stroke();

      // Description - use clean version
      let descText = cleanQuotationDescription(item);
      if (item.details) {
        descText += `\n\n${item.details}`;
      }
      doc.text(descText, xPos + 5, rowY + 5, { width: colWidths.description - 10, height: rowHeight - 10 });
      xPos += colWidths.description;
      doc.rect(xPos, rowY, 0, rowHeight).stroke();

      // Qty
      doc.text(item.quantity.toString(), xPos + 5, rowY + 15, { width: colWidths.qty, align: 'center' });
      xPos += colWidths.qty;
      doc.rect(xPos, rowY, 0, rowHeight).stroke();

      // Rate
      doc.text(item.unitPrice.toLocaleString('en-IN'), xPos + 2, rowY + 15, { width: colWidths.rate - 4, align: 'right' });
      xPos += colWidths.rate;
      doc.rect(xPos, rowY, 0, rowHeight).stroke();

      // Amount
      doc.text(item.amount.toLocaleString('en-IN'), xPos + 2, rowY + 15, { width: colWidths.amount - 4, align: 'right' });
      xPos += colWidths.amount;
      doc.rect(xPos, rowY, 0, rowHeight).stroke();

      // Image column (empty)
    } else {
      // Empty row
      xPos += colWidths.srNo;
      doc.rect(xPos, rowY, 0, rowHeight).stroke();
      xPos += colWidths.layout;
      doc.rect(xPos, rowY, 0, rowHeight).stroke();
      xPos += colWidths.description;
      doc.rect(xPos, rowY, 0, rowHeight).stroke();
      xPos += colWidths.qty;
      doc.rect(xPos, rowY, 0, rowHeight).stroke();
      xPos += colWidths.rate;
      doc.rect(xPos, rowY, 0, rowHeight).stroke();
      xPos += colWidths.amount;
      doc.rect(xPos, rowY, 0, rowHeight).stroke();
    }

    rowY += rowHeight;
  }

  // Summary section
  const summaryStartX = pageWidth - margin - colWidths.amount - colWidths.rate - 20;
  doc.fontSize(8).font('Helvetica-Bold');

  console.log('💰 Quotation amounts:', {
    taxableAmount: quotation.taxableAmount,
    cgst: quotation.cgst,
    sgst: quotation.sgst,
    totalAmount: quotation.totalAmount
  });

  doc.text('Total', summaryStartX, rowY + 5);
  doc.text(quotation.taxableAmount.toLocaleString('en-IN'), summaryStartX + 80, rowY + 5, { width: 60, align: 'right' });
  rowY += 12;

  doc.text('Transportation', summaryStartX, rowY + 5);
  doc.text('0', summaryStartX + 80, rowY + 5, { width: 60, align: 'right' });
  rowY += 12;

  doc.text('CGST 9%', summaryStartX, rowY + 5);
  doc.text(quotation.cgst.toLocaleString('en-IN'), summaryStartX + 80, rowY + 5, { width: 60, align: 'right' });
  rowY += 12;

  doc.text('SGST 9%', summaryStartX, rowY + 5);
  doc.text(quotation.sgst.toLocaleString('en-IN'), summaryStartX + 80, rowY + 5, { width: 60, align: 'right' });
  rowY += 12;

  doc.text('Grand Total', summaryStartX, rowY + 5);
  doc.text(quotation.totalAmount.toLocaleString('en-IN'), summaryStartX + 80, rowY + 5, { width: 60, align: 'right' });
  rowY += 25;

  // Terms & Conditions
  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('Terms & Conditions:', margin, rowY);
  rowY += 12;

  doc.fontSize(7).font('Helvetica');

  // Use terms from quotation or fallback to empty array
  const terms = [...(quotation.termsAndConditions || [])];

  // Append notes as the last term if present
  if (quotation.notes) {
    terms.push(`Note: ${quotation.notes}`);
  }

  terms.forEach((term, index) => {
    const termText = `${index + 1}) ${term}`;
    const textHeight = doc.heightOfString(termText, { width: pageWidth - 2 * margin });
    doc.text(termText, margin, rowY, { width: pageWidth - 2 * margin });
    rowY += textHeight + 2; // Add 2 points spacing between lines
  });

  rowY += 8;

  // Bank Details
  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('Company Name: Vlite Furnitech LLP', margin, rowY);
  rowY += 10;
  doc.fontSize(7).font('Helvetica');
  doc.text('Bank Name: DBS Bank', margin, rowY);
  rowY += 9;
  doc.text('Branch: Todi', margin, rowY);
  rowY += 9;
  doc.text('Account No: 1000000001', margin, rowY);
  rowY += 9;
  doc.text('IFSC Code: DBSS0IN0811', margin, rowY);

  const rightColX = margin + 200;
  doc.text('PAN No: AAHFV8261D', rightColX, rowY - 27);
  doc.text('Reg. No: AAH-FV-8261-D', rightColX, rowY - 18);
  doc.text('GST: 27AAHFV8261D1ZR', rightColX, rowY - 9);

  // Signature section
  rowY += 15;
  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('For Vlite Furnitech LLP', pageWidth - margin - 150, rowY);
  rowY += 25;

  const salesPerson = quotation.createdBy
    ? `${quotation.createdBy.firstName || ''} ${quotation.createdBy.lastName || ''}`.trim()
    : 'Sales Person Name';

  doc.fontSize(7).font('Helvetica');
  doc.text(salesPerson, pageWidth - margin - 150, rowY);
  rowY += 8;
  doc.text('Contact Number', pageWidth - margin - 150, rowY);
  rowY += 8;
  doc.text('Designation', pageWidth - margin - 150, rowY);

  doc.end();
};

// Generate PDF Action
exports.generatePDF = async (req, res) => {
  try {
    const organizationId = req.user.organizationId || req.user.organization;
    const quotation = await Quotation.findOne({
      _id: req.params.id,
      organizationId
    })
      .populate('customer')
      .populate('createdBy', 'firstName lastName');

    if (!quotation) return res.status(404).json({ message: 'Quotation not found' });

    // Fetch organization details
    const org = await Organization.findById(organizationId);

    // Calculate amounts if not present
    if (!quotation.taxableAmount || !quotation.totalAmount) {
      let taxableAmount = 0;
      let totalTax = 0;

      quotation.items?.forEach(item => {
        const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
        const taxRate = (item.taxPerUnit || 18) / 100;
        const taxAmount = lineTotal * taxRate;
        taxableAmount += lineTotal;
        totalTax += taxAmount;

        // Ensure item.amount is set
        if (!item.amount) {
          item.amount = lineTotal + taxAmount;
        }
      });

      const cgst = totalTax / 2;
      const sgst = totalTax / 2;
      const totalAmount = taxableAmount + totalTax - (quotation.discount || 0);

      // Add calculated values to quotation object
      quotation.taxableAmount = taxableAmount;
      quotation.cgst = cgst;
      quotation.sgst = sgst;
      quotation.totalAmount = totalAmount;
    }

    // Transform items for PDF - clean text without emojis
    quotation.items = quotation.items.map(item => {
      if (item.selectedProducts?.length > 0 || item.selectedMaterials?.length > 0) {
        let cleanDescription = item.layoutDescription || '';

        if (item.selectedProducts?.length > 0) {
          const productNames = item.selectedProducts.map(p => p.name).join(', ');
          cleanDescription += `\n${productNames}`;
        }

        if (item.selectedMaterials?.length > 0) {
          const materialNames = item.selectedMaterials.map(m => m.name).join(', ');
          cleanDescription += `\n${materialNames}`;
        }

        if (item.specifications && typeof item.specifications === 'string') {
          cleanDescription += `\n${item.specifications}`;
        }

        return {
          ...item,
          description: cleanDescription.trim()
        };
      }
      return item;
    });

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=quotation-${quotation.quotationNumber}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Fill content
    fillPDFContent(doc, quotation, org);
  } catch (err) {
    console.error('Error generating PDF:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: err.message });
    }
  }
};

// Send quotation via email
exports.sendQuotationEmail = async (req, res) => {
  try {
    const organizationId = req.user.organizationId || req.user.organization;
    const quotation = await Quotation.findOne({
      _id: req.params.id,
      organizationId
    }).populate('customer').populate('createdBy', 'firstName lastName email');

    if (!quotation) return res.status(404).json({ message: 'Quotation not found' });

    // Fetch organization details for the PDF
    const org = await Organization.findById(organizationId);

    // Transform items for PDF - clean text without emojis
    quotation.items = quotation.items.map(item => {
      if (item.selectedProducts?.length > 0 || item.selectedMaterials?.length > 0) {
        let cleanDescription = item.layoutDescription || '';

        if (item.selectedProducts?.length > 0) {
          const productNames = item.selectedProducts.map(p => p.name).join(', ');
          cleanDescription += `\n${productNames}`;
        }

        if (item.selectedMaterials?.length > 0) {
          const materialNames = item.selectedMaterials.map(m => m.name).join(', ');
          cleanDescription += `\n${materialNames}`;
        }

        if (item.specifications && typeof item.specifications === 'string') {
          cleanDescription += `\n${item.specifications}`;
        }

        return {
          ...item,
          description: cleanDescription.trim()
        };
      }
      return item;
    });

    // Generate PDF Buffer
    const pdfBuffer = await generatePDFBuffer(quotation, org);

    // Get customer name and email
    const customerName = quotation.customerName ||
      (quotation.customer ? `${quotation.customer.firstName} ${quotation.customer.lastName}` : 'Valued Customer');
    const customerEmail = quotation.customerEmail || quotation.customer?.primaryEmail || quotation.customer?.emails?.[0]?.email;

    // Salesman Email for the mailto link
    const salesmanEmail = quotation.createdBy?.email || 'sales@vlitefurnitures.com';
    const mailtoSubject = encodeURIComponent(`Approval for Quotation ${quotation.quotationNumber}`);
    const mailtoBody = encodeURIComponent(`Dear Team,\n\nI have reviewed the quotation ${quotation.quotationNumber} for Rs. ${quotation.totalAmount.toLocaleString('en-IN')} and I would like to proceed with this order.\n\nRegards,\n${customerName}`);
    const approvalLink = `mailto:${salesmanEmail}?subject=${mailtoSubject}&body=${mailtoBody}`;

    if (!customerEmail) {
      return res.status(400).json({ message: 'Customer email not found' });
    }

    // Send email via EmailService with attachment
    const emailResult = await EmailService.sendEmail({
      to: customerEmail,
      subject: `Quotation ${quotation.quotationNumber} from Vlite Furnitures`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8ed; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #2c3e50; color: #fff; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Vlite Furnitures</h1>
            <p style="margin: 5px 0 0; opacity: 0.8;">Quality Furniture for Modern Living</p>
          </div>
          
          <div style="padding: 30px;">
            <h2 style="color: #2c3e50; border-bottom: 2px solid #f1f1f1; padding-bottom: 10px; margin-top: 0;">Quotation: ${quotation.quotationNumber}</h2>
            
            <p>Dear <strong>${customerName}</strong>,</p>
            
            <p>Thank you for choosing <strong>Vlite Furnitures</strong>. We are pleased to provide you with the quotation for your requirements.</p>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 25px 0; border: 1px dashed #cbd5e0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0; color: #718096;">Quotation Number:</td>
                  <td style="padding: 5px 0; text-align: right; font-weight: bold;">${quotation.quotationNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #718096;">Date:</td>
                  <td style="padding: 5px 0; text-align: right;">${new Date(quotation.validFrom).toLocaleDateString()}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #718096; border-bottom: 1px solid #edf2f7;">Valid Until:</td>
                  <td style="padding: 5px 0; text-align: right; border-bottom: 1px solid #edf2f7;">${new Date(quotation.validUntil).toLocaleDateString()}</td>
                </tr>
                <tr>
                  <td style="padding: 15px 0 5px; font-size: 18px; color: #2c3e50;">Total Amount:</td>
                  <td style="padding: 15px 0 5px; text-align: right; font-size: 20px; color: #d53f8c; font-weight: bold;">Rs. ${quotation.totalAmount.toLocaleString('en-IN')}</td>
                </tr>
              </table>
            </div>

            <p style="text-align: center; margin: 30px 0;">
              <a href="${approvalLink}" 
                 style="background-color: #27ae60; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">
                ✅ CLICK TO APPROVE & NOTIFY TEAM
              </a>
              <br>
              <span style="font-size: 12px; color: #718096; margin-top: 10px; display: block;">Clicking this will prepare an approval email to our sales executive.</span>
            </p>

            ${quotation.emailMessage ? `
            <div style="margin-bottom: 25px;">
              <h4 style="margin-bottom: 10px; color: #4a5568;">Message from Team:</h4>
              <p style="white-space: pre-wrap; color: #4a5568; background: #fff; padding: 10px; border: 1px solid #edf2f7;">${quotation.emailMessage}</p>
            </div>
            ` : ''}

            <p>A detailed PDF of the quotation has been attached to this email for your reference.</p>
            
            <p style="margin-top: 30px;">If you have any questions or would like to proceed with the order, please don't hesitate to reach out to us.</p>
            
            <div style="margin-top: 40px; border-top: 1px solid #f1f1f1; padding-top: 20px;">
              <p style="margin: 0; color: #718096; font-size: 14px;">Best Regards,</p>
              <p style="margin: 5px 0 0; font-weight: bold; color: #2c3e50;">Vlite Furniture Team</p>
              <p style="margin: 5px 0 0; color: #718096; font-size: 12px;">Phone: ${org?.phone || '+91 XXXXXXXXXX'}</p>
              <p style="margin: 2px 0 0; color: #718096; font-size: 12px;">Email: ${org?.email || 'info@vlitefurnitures.com'}</p>
            </div>
          </div>
          
          <div style="background-color: #f7fafc; padding: 15px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7;">
            This is an automated quotation sent from Vlite Furnitures ERP System.
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Quotation-${quotation.quotationNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    if (!emailResult.success) {
      throw new Error(emailResult.error);
    }

    console.log(`✉️  Quotation PDF Email sent successfully to ${customerEmail}`);

    // Update status to SENT if it was DRAFT
    if (quotation.approvalStatus === 'DRAFT') {
      quotation.approvalStatus = 'SENT';
      await quotation.save();
    }

    res.json({
      success: true,
      message: 'Quotation sent successfully with PDF attachment',
      quotation,
      emailSent: true
    });
  } catch (err) {
    console.error('Error sending quotation:', err);
    res.status(500).json({ message: err.message });
  }
};

// Approve quotation
exports.approveQuotation = async (req, res) => {
  try {
    const organizationId = req.user.organizationId || req.user.organization;
    const userId = req.user._id || req.user.id;
    const { comments, autoConvertToOrder = true } = req.body;

    const quotation = await Quotation.findOne({
      _id: req.params.id,
      organizationId
    });

    if (!quotation) return res.status(404).json({ message: 'Quotation not found' });

    quotation.approvalStatus = 'APPROVED';
    quotation.approvalWorkflow.push({
      approver: userId,
      level: 1,
      status: 'APPROVED',
      comments,
      actionDate: new Date()
    });

    await quotation.save();

    console.log(`🔍 Approval Hook Check: Quotation ${quotation.quotationNumber}`);
    console.log(`   Linked Inquiry ID:`, quotation.inquiry);
    console.log(`   Linked Customer ID:`, quotation.customer);

    // 🔄 AUTO-ONBOARDING: If linked to inquiry but no customer, create customer now
    if (quotation.inquiry && !quotation.customer) {
      try {
        console.log(`📋 ONBOARDING CHECK:`);
        console.log(`   Quotation ${quotation.quotationNumber} has inquiry link: ${quotation.inquiry}`);

        const inquiry = await Inquiry.findById(quotation.inquiry);

        if (!inquiry) {
          console.log(`⚠️ Inquiry not found with ID: ${quotation.inquiry}`);
          console.log(`❌ AUTO-ONBOARDING SKIPPED - inquiry.inquiry not found`); throw new Error('Linked inquiry not found');
        }

        console.log(`   Inquiry found: Customer=${inquiry.meta?.customerName}, isOnboarded=${inquiry.isOnboarded}`);

        // Only onboard if inquiry exists and is not already onboarded
        if (inquiry && !inquiry.isOnboarded) {
          console.log(`🚀 STARTING AUTO-ONBOARDING for quotation ${quotation.quotationNumber}...`);

          // Generate customer code
          const customerCode = await Customer.generateCustomerCode(organizationId);
          console.log(`   ✅ Generated customer code: ${customerCode}`);

          // Extract names
          const nameString = quotation.customerName || inquiry.meta?.customerName || '';
          const nameParts = nameString.trim().split(' ');
          const firstName = nameParts[0] || 'Unknown';
          const lastName = nameParts.slice(1).join(' ') || '';

          // Get company name from inquiry (top-level field or meta)
          const finalCompanyName = inquiry.companyName || inquiry.meta?.companyName || quotation.companyName || '';

          console.log(`   📋 CUSTOMER DATA PREPARATION:`);
          console.log(`      Person Name: ${nameString}`);
          console.log(`      Company Name: ${finalCompanyName}`);

          // Create Customer
          const customerData = {
            organizationId,
            customerCode,
            firstName,
            lastName,
            companyName: finalCompanyName, // Use actual company name from inquiry
            email: quotation.customerEmail || inquiry.meta?.email || '',
            phone: inquiry.meta?.contact || '',
            address: {
              street: inquiry.meta?.address || '',
              city: '', state: '', zipCode: ''
            },
            source: 'Quotation Approval',
            customerType: 'End Customer',
            status: 'Active',
            registrationDate: new Date(),
            fromInquiry: inquiry._id
          };

          const customer = new Customer(customerData);
          await customer.save();

          console.log(`   ✅ Customer created successfully: ${customerCode}`);

          // Update Inquiry
          inquiry.isOnboarded = true;
          inquiry.onboardedAt = new Date();
          inquiry.onboardedCustomer = customer._id;
          inquiry.onboardedCustomerCode = customer.customerCode;
          inquiry.leadStatus = 'CONVERTED';
          await inquiry.save();
          console.log(`   ✅ Inquiry ${inquiry._id} marked as CONVERTED and onboarded`);

          // Update Quotation with new customer AND customer details
          quotation.customer = customer._id;
          quotation.companyName = finalCompanyName; // Update quotation's company name
          quotation.customerId = customer.customerCode; // Add customer code to quotation
          await quotation.save();
          console.log(`   ✅ Quotation linked to customer ${customer.customerCode}`);
          console.log(`   ✅ Quotation updated with companyName: ${finalCompanyName}, customerId: ${customer.customerCode}`);

          console.log(`🎉 AUTO-ONBOARDING COMPLETED SUCCESSFULLY!`);
        } else if (inquiry.isOnboarded) {
          console.log(`⚠️ Inquiry is already onboarded (Customer: ${inquiry.onboardedCustomerCode})`);
          console.log(`❌ AUTO-ONBOARDING SKIPPED - already onboarded`);
        }
      } catch (onboardError) {
        console.error('⚠️ AUTO-ONBOARDING FAILED but quotation was approved:', onboardError);
        console.error('   Error details:', onboardError.message);
        console.error('   Stack:', onboardError.stack);
        // Don't fail the request, just log it
      }
    } else {
      console.log(`ℹ️ Auto-onboarding not applicable:`);
      console.log(`   Has inquiry link: ${!!quotation.inquiry}`);
      console.log(`   Has customer link: ${!!quotation.customer}`);
      console.log(`   Reason: ${!quotation.inquiry ? 'No inquiry linked' : 'Customer already linked'}`);
    }

    // 🔄 AUTO-ORDER CREATION: Create order from approved quotation
    try {
      console.log(`📦 CREATING ORDER from approved quotation ${quotation.quotationNumber}...`);

      // Check if order already exists for this quotation
      const existingOrder = await Order.findOne({ quotation: quotation._id });
      if (existingOrder) {
        console.log(`⚠️ Order already exists for this quotation: ${existingOrder.orderNumber}`);
      } else {
        // Create order from quotation
        const orderData = {
          organizationId,
          customer: quotation.customer,
          quotation: quotation._id,
          orderDate: new Date(),
          deliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          items: quotation.items.map(item => ({
            ...item,
            status: 'Pending'
          })),
          totalAmount: quotation.totalAmount,
          status: 'Pending',
          paymentStatus: 'Pending',
          createdBy: userId
        };

        const order = new Order(orderData);
        await order.save();
        console.log(`   ✅ Order created successfully: ${order.orderNumber}`);
        console.log(`🎉 AUTO-ORDER CREATION COMPLETED!`);
      }
    } catch (orderError) {
      console.error('⚠️ AUTO-ORDER CREATION FAILED but quotation was approved:', orderError);
      console.error('   Error details:', orderError.message);
      // Don't fail the request, just log it
    }

    const populated = await Quotation.findById(quotation._id)
      .populate('customer', 'companyName tradeName primaryEmail')
      .populate('createdBy', 'firstName lastName');

    console.log(`✅ Quotation ${quotation.quotationNumber} approved by user ${userId}`);

    // Notify the creator (if email exists)
    if (populated.createdBy && populated.createdBy.email) {
      await EmailService.sendQuotationApprovalEmail(populated, [populated.createdBy]);
    }

    // AUTO-CONVERT TO PRODUCTION ORDER WITH TASK AUTOMATION
    let automationResult = null;
    if (autoConvertToOrder && !quotation.convertedToOrder) {
      try {
        const orderAutomationService = require('../services/orderAutomationService');
        automationResult = await orderAutomationService.convertQuotationToOrder(quotation._id, {
          createdBy: userId,
          priority: 'MEDIUM',
          autoAssign: true
        });
        console.log(`🤖 Automated order creation: ${automationResult.order.orderNumber}`);
        console.log(`📋 Tasks created: ${automationResult.workflowResult.tasksCreated}`);
        console.log(`👥 Tasks assigned: ${automationResult.assignmentResult.assigned}/${automationResult.assignmentResult.total}`);
      } catch (automationError) {
        console.error('⚠️ Error in order automation:', automationError);
        // Don't fail the approval if automation fails
      }
    }

    res.json({
      ...populated.toObject(),
      automation: automationResult ? {
        success: true,
        orderNumber: automationResult.order.orderNumber,
        tasksCreated: automationResult.workflowResult.tasksCreated,
        tasksAssigned: automationResult.assignmentResult.assigned
      } : null
    });
  } catch (err) {
    console.error('Error approving quotation:', err);
    res.status(400).json({ message: err.message });
  }
};

// Reject quotation
exports.rejectQuotation = async (req, res) => {
  try {
    const organizationId = req.user.organizationId || req.user.organization;
    const userId = req.user._id || req.user.id;
    const { comments } = req.body;

    const quotation = await Quotation.findOne({
      _id: req.params.id,
      organizationId
    });

    if (!quotation) return res.status(404).json({ message: 'Quotation not found' });

    quotation.approvalStatus = 'REJECTED';
    quotation.approvalWorkflow.push({
      approver: userId,
      level: 1,
      status: 'REJECTED',
      comments,
      actionDate: new Date()
    });

    await quotation.save();

    const populated = await Quotation.findById(quotation._id)
      .populate('customer', 'companyName tradeName primaryEmail')
      .populate('createdBy', 'firstName lastName');

    console.log(`❌ Quotation ${quotation.quotationNumber} rejected by user ${userId}`);

    res.json(populated);
  } catch (err) {
    console.error('Error rejecting quotation:', err);
    res.status(400).json({ message: err.message });
  }
};
// Customer Approve Quotation via Email Link - NOTIFICATION ONLY
exports.customerApproveQuotation = async (req, res) => {
  try {
    const { id } = req.params;

    // Find quotation and populate the creator (salesman)
    const quotation = await Quotation.findById(id).populate('createdBy');

    if (!quotation) {
      return res.status(404).send('<h1>Quotation not found</h1><p>We could not find the quotation record.</p>');
    }

    // Only notify if salesman has email
    if (quotation.createdBy && quotation.createdBy.email) {
      // Send notification to salesman
      await EmailService.sendQuotationCustomerApprovalNotification(quotation, quotation.createdBy);
      console.log(`✉️ Approval Notification sent to salesman ${quotation.createdBy.email} for ${quotation.quotationNumber}`);
    }

    // Show a success message to the customer (database is NOT updated)
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Confirmation Sent</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f7fafc; }
          .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; }
          .icon { font-size: 64px; color: #27ae60; margin-bottom: 20px; }
          h1 { color: #2c3e50; margin-bottom: 10px; }
          p { color: #718096; line-height: 1.5; }
          .footer { margin-top: 30px; font-size: 12px; color: #a0aec0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">📩</div>
          <h1>Notification Sent!</h1>
          <p>We have notified our sales representative about your interest in Quotation <strong>${quotation.quotationNumber}</strong>.</p>
          <p>Our team will contact you shortly to discuss the next steps.</p>
          <div class="footer">Vlite Furnitures ERP System</div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Error in customerApproveQuotation notification:', err);
    res.status(500).send('<h1>Notification Error</h1><p>We could not process your request at this moment. Please contact your sales representative directly.</p>');
  }
};

// 🚀 Scan Layout PDF and Extract Furniture Inventory
exports.scanLayoutPDF = async (req, res) => {
  const { spawn } = require('child_process');
  const fs = require('fs').promises;
  const jsonMatcher = require('../utils/jsonMatcher');

  try {
    console.log('🎯 Scan Layout PDF Request Received');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No PDF file uploaded'
      });
    }

    // Get quotation ID from request body or query
    const quotationId = req.body.quotationId || req.query.quotationId;
    console.log('📋 Quotation ID:', quotationId);

    // Define paths
    const projectRoot = path.join(__dirname, '../..');
    const scannerDir = path.join(projectRoot, 'AI/inventory_scanner');
    const pdfInputDir = path.join(scannerDir, 'pdf_inputs');
    const scanResultsDir = path.join(scannerDir, 'scan_results');
    const scanScript = path.join(scannerDir, 'scan_folder.py');

    console.log('📁 Scanner Directory:', scannerDir);
    console.log('📂 PDF Input Directory:', pdfInputDir);
    console.log('📂 Scan Results Directory:', scanResultsDir);

    // Ensure directories exist
    await fs.mkdir(pdfInputDir, { recursive: true });
    await fs.mkdir(scanResultsDir, { recursive: true });

    // ==========================================
    // NEW: Check for existing JSON first
    // ==========================================
    console.log('🔍 Checking for pre-existing JSON:', req.file.originalname);
    const existingMatch = await jsonMatcher.getMostRecentMatch(
      req.file.originalname,
      scanResultsDir
    );

    if (existingMatch) {
      console.log('✅ Found existing JSON:', existingMatch.filename);
      console.log('⚡ Using demo mode - skipping AI scan');

      // Save PDF for reference
      const timestamp = Date.now();
      const sanitizedFilename = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const pdfFilename = `${timestamp}_${sanitizedFilename}`;
      const pdfFilePath = path.join(pdfInputDir, pdfFilename);
      await fs.writeFile(pdfFilePath, req.file.buffer);
      console.log('💾 PDF saved to:', pdfFilePath);

      // Read existing JSON
      try {
        const scanResult = await jsonMatcher.readJsonFile(existingMatch.fullPath);
        const validation = jsonMatcher.validateScanResult(scanResult);

        if (!validation.valid) {
          console.warn('⚠️ Existing JSON invalid, falling back to AI scan');
          console.warn('⚠️ Validation error:', validation.error);
          // Continue to AI scanning below (don't return, fall through)
        } else {
          // Use existing JSON
          const itemsFound = scanResult.pages?.[0]?.analysis?.data?.summary?.total_items || 0;
          console.log('📊 Total items found (from existing JSON):', itemsFound);

          // Update quotation with COMPLETED status
          if (quotationId) {
            await Quotation.findByIdAndUpdate(quotationId, {
              'scannedLayout.filename': pdfFilename,
              'scannedLayout.resultFile': existingMatch.filename,
              'scannedLayout.itemsFound': itemsFound,
              'scannedLayout.scanDate': new Date(),
              'scannedLayout.status': 'COMPLETED'
            });
            console.log('📝 Updated quotation with COMPLETED scan status (demo mode)');
          }

          // Return immediately with existing results
          return res.json({
            success: true,
            message: 'Layout loaded from existing JSON successfully',
            data: scanResult,
            metadata: {
              filename: pdfFilename,
              resultFile: existingMatch.filename,
              itemsFound: itemsFound,
              quotationId: quotationId,
              timestamp: new Date().toISOString(),
              mode: 'EXISTING_JSON'
            }
          });
        }
      } catch (jsonError) {
        console.error('⚠️ Error reading existing JSON:', jsonError.message);
        console.warn('⚠️ Falling back to AI scan');
        // Continue to AI scanning below (don't return, fall through)
      }
    } else {
      console.log('🤖 No matching JSON found, proceeding with AI scan');
    }

    // ==========================================
    // No existing JSON found or invalid
    // Continue with normal AI scanning
    // ==========================================

    // Save uploaded PDF to pdf_inputs folder
    const timestamp = Date.now();
    const sanitizedFilename = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const pdfFilename = `${timestamp}_${sanitizedFilename}`;
    const pdfFilePath = path.join(pdfInputDir, pdfFilename);

    console.log('💾 Saving PDF to:', pdfFilePath);
    await fs.writeFile(pdfFilePath, req.file.buffer);
    console.log('✅ PDF saved successfully');

    // Update quotation with scan status - PENDING
    if (quotationId) {
      await Quotation.findByIdAndUpdate(quotationId, {
        scannedLayout: {
          filename: pdfFilename,
          scanDate: new Date(),
          status: 'PENDING'
        }
      });
      console.log('📝 Updated quotation with PENDING scan status');
    }

    // Run Python scanner script using virtual environment
    console.log('🐍 Running Python scanner script...');

    // Detect platform and use correct Python path
    // Use the AI/venv directory (shared across all AI modules)
    const aiDir = path.join(projectRoot, 'AI');
    const isWindows = process.platform === 'win32';
    const pythonPath = isWindows
      ? path.join(aiDir, 'venv', 'Scripts', 'python.exe')
      : path.join(aiDir, 'venv', 'bin', 'python3');

    console.log('🐍 Python Path:', pythonPath);

    const pythonProcess = spawn(pythonPath, [scanScript], {
      cwd: scannerDir,
      env: { ...process.env }
    });

    let scriptOutput = '';
    let scriptError = '';

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      scriptOutput += output;
      console.log('🐍 Python Output:', output);
    });

    pythonProcess.stderr.on('data', (data) => {
      const error = data.toString();
      scriptError += error;
      console.error('🐍 Python Error:', error);
    });

    // Wait for Python script to complete
    await new Promise((resolve, reject) => {
      pythonProcess.on('close', async (code) => {
        if (code !== 0) {
          console.error('❌ Python script exited with code:', code);

          // Update quotation with FAILED status
          if (quotationId) {
            await Quotation.findByIdAndUpdate(quotationId, {
              'scannedLayout.status': 'FAILED'
            });
          }

          reject(new Error(`Scanner script failed with code ${code}: ${scriptError}`));
        } else {
          console.log('✅ Python script completed successfully');
          resolve();
        }
      });

      pythonProcess.on('error', async (err) => {
        console.error('❌ Failed to start Python process:', err);

        // Update quotation with FAILED status
        if (quotationId) {
          await Quotation.findByIdAndUpdate(quotationId, {
            'scannedLayout.status': 'FAILED'
          });
        }

        reject(new Error(`Failed to start scanner: ${err.message}`));
      });
    });

    // Read the generated result JSON
    const baseFilename = path.basename(pdfFilename, '.pdf');
    const resultFilename = `${baseFilename}_result.json`;
    const resultFilePath = path.join(scanResultsDir, resultFilename);

    console.log('📖 Reading result file:', resultFilePath);

    // Wait a bit for file system to sync
    await new Promise(resolve => setTimeout(resolve, 500));

    const resultData = await fs.readFile(resultFilePath, 'utf8');
    const scanResult = JSON.parse(resultData);

    const itemsFound = scanResult.pages?.[0]?.analysis?.data?.summary?.total_items || 0;
    console.log('✅ Scan result loaded successfully');
    console.log('📊 Total items found:', itemsFound);

    // Update quotation with COMPLETED status and result info
    if (quotationId) {
      await Quotation.findByIdAndUpdate(quotationId, {
        'scannedLayout.resultFile': resultFilename,
        'scannedLayout.itemsFound': itemsFound,
        'scannedLayout.status': 'COMPLETED'
      });
      console.log('📝 Updated quotation with COMPLETED scan status');
    }

    // Optional: Clean up PDF after scanning (comment out if you want to keep files)
    // await fs.unlink(pdfFilePath);
    // console.log('🗑️  Temporary PDF deleted');

    res.json({
      success: true,
      message: 'Layout scanned successfully',
      data: scanResult,
      metadata: {
        filename: pdfFilename,
        resultFile: resultFilename,
        itemsFound: itemsFound,
        quotationId: quotationId,
        timestamp: new Date().toISOString(),
        mode: 'AI_SCAN'
      }
    });

  } catch (err) {
    console.error('❌ Error in scanLayoutPDF:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to scan layout PDF',
      error: err.message
    });
  }
};

// 🔍 Get Latest Scanned Layout for Quotation
exports.getQuotationScanResult = async (req, res) => {
  const fs = require('fs').promises;

  try {
    const { id } = req.params; // quotation ID
    const organizationId = req.user.organizationId || req.user.organization;

    const quotation = await Quotation.findOne({
      _id: id,
      organizationId
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    if (!quotation.scannedLayout || quotation.scannedLayout.status !== 'COMPLETED') {
      return res.status(404).json({
        success: false,
        message: 'No completed scan found for this quotation'
      });
    }

    // Read the scan result file
    const projectRoot = path.join(__dirname, '../..');
    const scanResultsDir = path.join(projectRoot, 'AI/inventory_scanner/scan_results');
    const resultFilePath = path.join(scanResultsDir, quotation.scannedLayout.resultFile);

    const resultData = await fs.readFile(resultFilePath, 'utf8');
    const scanResult = JSON.parse(resultData);

    res.json({
      success: true,
      data: scanResult,
      metadata: {
        filename: quotation.scannedLayout.filename,
        resultFile: quotation.scannedLayout.resultFile,
        scanDate: quotation.scannedLayout.scanDate,
        itemsFound: quotation.scannedLayout.itemsFound
      }
    });

  } catch (err) {
    console.error('❌ Error fetching scan result:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scan result',
      error: err.message
    });
  }
};

// 🤖 AI-Powered Import from Layout
exports.importWithAI = async (req, res) => {

  const Product = require('../models/vlite/Product');
  const RawMaterial = require('../models/vlite/RawMaterial');
  const {
    analyzeQuotationRequirements,
    fetchProductsFromCategory,
    fetchMaterialsFromCategory,
    selectBestProduct
  } = require('../services/aiQuotationService');

  try {
    console.log('🚀 AI Import Started');

    const { id } = req.params;
    const { resultFile: manualResultFile } = req.body;
    const organizationId = req.user.organizationId || req.user.organization;

    // Fetch quotation
    const quotation = await Quotation.findOne({ _id: id, organizationId });
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    // Determine result file
    let resultFilename = quotation.scannedLayout?.resultFile;

    // If no scan in DB, use manual file from request (e.g. fresh scan on new quotation)
    if ((!quotation.scannedLayout || quotation.scannedLayout.status !== 'COMPLETED') && manualResultFile) {
      console.log('🔄 Linking manual scan result to quotation:', manualResultFile);
      resultFilename = manualResultFile;

      // Update quotation with this scan info
      quotation.scannedLayout = {
        status: 'COMPLETED',
        resultFile: resultFilename,
        itemsFound: 0, // Will be updated later
        scanDate: new Date()
      };
      await quotation.save();
    }

    // Verify we have a file to read
    if (!resultFilename && (!quotation.scannedLayout || quotation.scannedLayout.status !== 'COMPLETED')) {
      return res.status(404).json({
        success: false,
        message: 'No completed scan found. Please scan a PDF first.'
      });
    }

    // Get user description
    const userDescription = quotation.fileDescription || '';
    if (!userDescription.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide description with product/material instructions'
      });
    }

    console.log('📝 User Description:', userDescription);

    // Read scan results
    const projectRoot = path.join(__dirname, '../..');
    const scanResultsDir = path.join(projectRoot, 'AI/inventory_scanner/scan_results');
    const resultFilePath = path.join(scanResultsDir, resultFilename);

    if (!fs.existsSync(resultFilePath)) {
      console.error(`❌ Scan result file missing: ${resultFilePath}`);
      return res.status(404).json({
        success: false,
        message: 'Scan result file not found. Please try scanning the layout again.'
      });
    }

    const resultData = await fs.promises.readFile(resultFilePath, 'utf8');
    let scanResult;
    try {
      scanResult = JSON.parse(resultData);
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Invalid scan result data' });
    }

    const scannedItems = scanResult.pages?.[0]?.analysis?.data?.items || [];

    console.log('📦 Scanned Items:', scannedItems.length);

    // Fetch available categories
    const productCategories = await Product.distinct('category', { organizationId });
    const materialCategories = await RawMaterial.distinct('category');

    console.log('🏷️  Product Categories:', productCategories.length);
    console.log('🏷️  Material Categories:', materialCategories.length);

    // AI Analysis
    const aiAnalysis = await analyzeQuotationRequirements(
      userDescription,
      scannedItems,
      productCategories,
      materialCategories
    );

    if (!aiAnalysis.success) {
      throw new Error('AI analysis failed: ' + aiAnalysis.error);
    }

    console.log('✅ AI Analysis Complete:', aiAnalysis.mappings.length, 'mappings');

    // Build quotation items with component breakdown
    const quotationItems = [];

    for (const mapping of aiAnalysis.mappings) {
      console.log(`\n📌 Processing: ${mapping.scannedItem.name}`);

      // ✨ NEW: Check if AI provided component breakdown
      if (mapping.components && Array.isArray(mapping.components) && mapping.components.length > 0) {
        console.log(`   🔧 Component breakdown found: ${mapping.components.length} components`);

        // Build sub-items array from components
        const subItems = [];
        let totalItemCost = 0;

        for (const component of mapping.components) {
          console.log(`\n   📦 Component: ${component.name}`);
          console.log(`      Type: ${component.type}`);
          console.log(`      Dimensions: ${component.dimensions || 'N/A'}`);
          console.log(`      Material: ${component.materialSpec || 'N/A'}`);

          let componentPrice = 0;

          // Fetch product or material based on component type
          if (component.type === 'product' && component.productCategory) {
            const products = await fetchProductsFromCategory(component.productCategory, Product);
            console.log(`      Products available: ${products.length}`);

            if (products.length > 0) {
              const selectedProduct = await selectBestProduct(
                { name: component.name, ...mapping.scannedItem },
                products,
                userDescription
              );

              componentPrice = selectedProduct ? selectedProduct.price : 0;
              console.log(`      Selected product: ${selectedProduct?.name} @ ₹${componentPrice}`);
            }
          } else if (component.type === 'material' && component.materialCategory) {
            const materials = await fetchMaterialsFromCategory(component.materialCategory, RawMaterial);
            console.log(`      Materials available: ${materials.length}`);

            if (materials.length > 0) {
              const bestMaterial = materials[0]; // Take first (sorted by cost)
              componentPrice = bestMaterial.price || 0;
              console.log(`      Selected material: ${bestMaterial.name} @ ₹${componentPrice}/${bestMaterial.unit}`);
            }
          }

          // Calculate total cost for this component
          const componentQuantity = component.quantity || 1;
          const componentAmount = componentPrice * componentQuantity;
          totalItemCost += componentAmount;

          // Create sub-item with all fields
          subItems.push({
            description: component.name,
            dimensions: component.dimensions || '',              // ✓ From scanner
            material: component.materialSpec || '',              // ✓ From user description
            quantity: componentQuantity,
            unitPrice: componentPrice,
            amount: componentAmount,
            isText: false
          });

          console.log(`      ✅ Sub-item: ${componentQuantity} × ₹${componentPrice} = ₹${componentAmount}`);
        }

        // Create quotation item with sub-items
        const quantity = mapping.scannedItem.count;
        const unitPrice = totalItemCost;
        const totalAmount = unitPrice * quantity;

        quotationItems.push({
          layoutDescription: mapping.scannedItem.area || mapping.productCategory,
          dimensions: mapping.scannedItem.dimensions || '',     // Overall dimensions
          description: mapping.scannedItem.name,                // Simple name
          specifications: {
            subItems: subItems                                  // ✓ Detailed component breakdown
          },
          quantity: quantity,
          unitPrice: unitPrice,
          amount: totalAmount,
          taxPerUnit: 18,
          details: mapping.reasoning || mapping.specifications || ''
        });

        console.log(`   ✅ Item created with ${subItems.length} sub-items: ${quantity} × ₹${unitPrice} = ₹${totalAmount}`);

      } else {
        // ⚠️ FALLBACK: Old logic if AI didn't provide components (backward compatibility)
        console.log(`   ⚠️ No component breakdown found. Using legacy logic.`);

        // Fetch products from matched category
        const products = await fetchProductsFromCategory(mapping.productCategory, Product);
        console.log(`   Products found: ${products.length}`);

        // Select best product
        const selectedProduct = await selectBestProduct(
          mapping.scannedItem,
          products,
          userDescription
        );

        // Fetch materials based on AI recommendations
        let allMaterials = [];
        let totalMaterialCost = 0;

        if (mapping.materials && Array.isArray(mapping.materials)) {
          for (const matReq of mapping.materials) {
            const categoryMats = await fetchMaterialsFromCategory(matReq.category, RawMaterial);

            if (categoryMats.length > 0) {
              const bestMat = categoryMats[0];
              const materialCost = (bestMat.price || 0) * (matReq.estimatedQty || 1);
              totalMaterialCost += materialCost;

              allMaterials.push({
                ...bestMat,
                estimatedQty: matReq.estimatedQty,
                displayUnit: matReq.unit
              });
            }
          }
        } else if (mapping.materialCategories) {
          for (const matCategory of mapping.materialCategories) {
            const mats = await fetchMaterialsFromCategory(matCategory, RawMaterial);
            if (mats.length > 0) {
              allMaterials.push(mats[0]);
              totalMaterialCost += (mats[0].price || 0);
            }
          }
        }

        console.log(`   Materials selected: ${allMaterials.length}`);

        // Build description with product and materials display
        let itemDescription = mapping.scannedItem.name;

        // Prepare selected products array
        const selectedProducts = [];
        if (selectedProduct) {
          selectedProducts.push({
            _id: selectedProduct._id,
            name: selectedProduct.name,
            price: selectedProduct.price,
            category: selectedProduct.category
          });
          itemDescription += `\n\n📦 Product Used:\n• ${selectedProduct.name} (₹${selectedProduct.price.toLocaleString('en-IN')})`;
        }

        // Prepare selected materials array with direct prices
        const selectedMaterials = [];
        if (allMaterials.length > 0) {
          itemDescription += `\n\n🔧 Materials Used:`;
          allMaterials.forEach(mat => {
            const materialPrice = (mat.price || 0) * (mat.estimatedQty || 1);

            selectedMaterials.push({
              _id: mat._id,
              name: mat.name,
              category: mat.category,
              price: materialPrice,
              unit: mat.unit
            });

            const qtyStr = mat.estimatedQty ? `${mat.estimatedQty} ${mat.displayUnit || 'units'}` : '1 unit';
            const priceStr = mat.price > 0 ? `₹${mat.price}/${mat.unit}` : 'Price TBD';
            itemDescription += `\n• ${mat.name} (${qtyStr} @ ${priceStr})`;
          });
        }

        if (mapping.specifications) {
          itemDescription += `\n\n📋 Specifications: ${mapping.specifications}`;
        }

        // Calculate pricing
        const quantity = mapping.scannedItem.count;
        const productPrice = selectedProduct ? selectedProduct.price : 0;
        const unitPrice = productPrice + totalMaterialCost;
        const amount = unitPrice * quantity;

        // Create quotation item with flat structure (old way)
        quotationItems.push({
          layoutDescription: mapping.scannedItem.area || mapping.productCategory,
          description: itemDescription,
          selectedProducts: selectedProducts,
          selectedMaterials: selectedMaterials,
          specifications: mapping.specifications || '',
          quantity: quantity,
          unitPrice: unitPrice,
          amount: amount,
          taxPerUnit: 18,
          details: mapping.reasoning || ''
        });

        console.log(`   ✅ Item created (legacy): ${quantity} × ₹${unitPrice} = ₹${amount}`);
      }
    }

    console.log(`\n🎉 Total items generated: ${quotationItems.length}`);

    res.json({
      success: true,
      message: `Successfully imported ${quotationItems.length} items using AI`,
      items: quotationItems,
      metadata: {
        aiAnalysis: aiAnalysis.mappings.length,
        userDescription: userDescription,
        scanFile: quotation.scannedLayout.resultFile
      }
    });

  } catch (error) {
    console.error('❌ AI Import Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import with AI',
      error: error.message
    });
  }
};


