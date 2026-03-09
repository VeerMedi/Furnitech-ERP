const Quotation = require('../models/vlite/Quotation');
const Customer = require('../models/vlite/Customer');
const Organization = require('../models/shared/Organization');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Get all quotations with filters
exports.getQuotations = async (req, res) => {
  try {
    const { status, search, startDate, endDate } = req.query;
    const organizationId = req.user.organizationId || req.user.organization;
    
    let query = { organizationId };
    
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

    const quotations = await Quotation.find(query)
      .populate('customer', 'name email phone address')
      .populate('preparedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json(quotations);
  } catch (err) {
    console.error('Error fetching quotations:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get quotation by ID
exports.getQuotationById = async (req, res) => {
  try {
    const organizationId = req.user.organizationId || req.user.organization;
    const quotation = await Quotation.findOne({ 
      _id: req.params.id, 
      organizationId 
    })
      .populate('customer', 'name email phone address gst')
      .populate('preparedBy', 'firstName lastName email')
      .populate('inquiry', 'inquiryNumber');
    
    if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
    res.json(quotation);
  } catch (err) {
    console.error('Error fetching quotation:', err);
    res.status(500).json({ message: err.message });
  }
};

// Create quotation
exports.createQuotation = async (req, res) => {
  try {
    const organizationId = req.user.organizationId || req.user.organization;
    const userId = req.user._id || req.user.id;
    
    // Calculate totals from items
    const items = req.body.items || [];
    let subtotal = 0;
    let totalDiscount = 0;
    let taxAmount = 0;
    
    items.forEach((item, index) => {
      const lineSubtotal = item.quantity * item.unitPrice;
      
      // Apply item discount if any
      let itemDiscount = 0;
      if (item.discount) {
        if (item.discount.type === 'PERCENTAGE') {
          itemDiscount = (lineSubtotal * item.discount.value) / 100;
        } else {
          itemDiscount = item.discount.value || 0;
        }
      }
      
      const discountedAmount = lineSubtotal - itemDiscount;
      const itemTax = (discountedAmount * (item.taxRate || 18)) / 100;
      const lineTotal = discountedAmount + itemTax;
      
      // Update item with calculated values
      items[index].lineTotal = lineTotal;
      items[index].itemNumber = index + 1;
      
      subtotal += lineSubtotal;
      totalDiscount += itemDiscount;
      taxAmount += itemTax;
    });
    
    // Apply overall discount if provided
    if (req.body.discountType && req.body.discountValue) {
      if (req.body.discountType === 'percentage') {
        totalDiscount += (subtotal * req.body.discountValue) / 100;
      } else {
        totalDiscount += req.body.discountValue;
      }
    }
    
    const totalAmount = subtotal - totalDiscount + taxAmount;
    
    // Calculate payment terms
    const advancePercentage = req.body.paymentTerms?.advancePercentage || 50;
    const advanceAmount = (totalAmount * advancePercentage) / 100;
    const balanceAmount = totalAmount - advanceAmount;
    
    // Generate quotation number
    const year = new Date().getFullYear().toString().slice(-2);
    const count = await Quotation.countDocuments({ organizationId }) + 1;
    const quotationNumber = `QUO${year}${count.toString().padStart(5, '0')}`;
    
    const quotationData = {
      organizationId,
      quotationNumber,
      customer: req.body.customer,
      validFrom: req.body.validFrom || new Date(),
      validUntil: req.body.validUntil,
      items,
      subtotal,
      totalDiscount,
      taxAmount,
      totalAmount,
      paymentTerms: {
        advancePercentage,
        advanceAmount,
        balanceAmount,
        ...(req.body.paymentTerms || {})
      },
      deliveryTerms: req.body.deliveryTerms || {},
      termsAndConditions: req.body.termsAndConditions || [],
      approvalStatus: req.body.approvalStatus || 'DRAFT',
      preparedBy: userId
    };
    
    const quotation = new Quotation(quotationData);
    await quotation.save();
    
    const populated = await Quotation.findById(quotation._id)
      .populate('customer', 'name email')
      .populate('preparedBy', 'firstName lastName');
    
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
    
    // If items updated, recalculate totals
    if (req.body.items) {
      const items = req.body.items;
      let subtotal = 0;
      let totalDiscount = 0;
      let taxAmount = 0;
      
      items.forEach((item, index) => {
        const lineSubtotal = item.quantity * item.unitPrice;
        let itemDiscount = 0;
        
        if (item.discount) {
          if (item.discount.type === 'PERCENTAGE') {
            itemDiscount = (lineSubtotal * item.discount.value) / 100;
          } else {
            itemDiscount = item.discount.value || 0;
          }
        }
        
        const discountedAmount = lineSubtotal - itemDiscount;
        const itemTax = (discountedAmount * (item.taxRate || 18)) / 100;
        const lineTotal = discountedAmount + itemTax;
        
        items[index].lineTotal = lineTotal;
        items[index].itemNumber = index + 1;
        
        subtotal += lineSubtotal;
        totalDiscount += itemDiscount;
        taxAmount += itemTax;
      });
      
      const totalAmount = subtotal - totalDiscount + taxAmount;
      
      req.body.subtotal = subtotal;
      req.body.totalDiscount = totalDiscount;
      req.body.taxAmount = taxAmount;
      req.body.totalAmount = totalAmount;
      
      // Update payment terms if needed
      if (req.body.paymentTerms?.advancePercentage) {
        const advanceAmount = (totalAmount * req.body.paymentTerms.advancePercentage) / 100;
        req.body.paymentTerms.advanceAmount = advanceAmount;
        req.body.paymentTerms.balanceAmount = totalAmount - advanceAmount;
      }
    }

    const quotation = await Quotation.findOneAndUpdate(
      { _id: req.params.id, organizationId },
      req.body,
      { new: true, runValidators: true }
    )
      .populate('customer', 'name email')
      .populate('preparedBy', 'firstName lastName');
      
    if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
    
    res.json(quotation);
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

// Generate PDF
exports.generatePDF = async (req, res) => {
  try {
    const organizationId = req.user.organizationId || req.user.organization;
    const quotation = await Quotation.findOne({ 
      _id: req.params.id, 
      organizationId 
    })
      .populate('customer')
      .populate('preparedBy', 'firstName lastName');
    
    if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
    
    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=quotation-${quotation.quotationNumber}.pdf`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Header
    doc.fontSize(20).text('QUOTATION', { align: 'center' });
    doc.moveDown();
    
    // Company & Customer Info
    doc.fontSize(10);
    doc.text(`Quotation No: ${quotation.quotationNumber}`, { align: 'right' });
    doc.text(`Date: ${quotation.validFrom.toLocaleDateString()}`, { align: 'right' });
    doc.text(`Valid Until: ${quotation.validUntil.toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();
    
    doc.text('Bill To:', { underline: true });
    doc.text(quotation.customer.name);
    doc.text(quotation.customer.address || '');
    doc.text(quotation.customer.email || '');
    doc.text(quotation.customer.phone || '');
    doc.moveDown();
    
    // Items Table
    doc.text('Items:', { underline: true });
    doc.moveDown(0.5);
    
    // Table headers
    const tableTop = doc.y;
    doc.text('No.', 50, tableTop);
    doc.text('Description', 80, tableTop);
    doc.text('Qty', 300, tableTop);
    doc.text('Rate', 350, tableTop);
    doc.text('Amount', 450, tableTop);
    
    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown();
    
    // Table rows
    quotation.items.forEach((item, index) => {
      const y = doc.y;
      doc.text(index + 1, 50, y);
      doc.text(item.description, 80, y, { width: 200 });
      doc.text(`${item.quantity} ${item.uom || ''}`, 300, y);
      doc.text(`₹${item.unitPrice.toLocaleString()}`, 350, y);
      doc.text(`₹${item.lineTotal.toLocaleString()}`, 450, y);
      doc.moveDown();
    });
    
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    
    // Totals
    const totalsX = 400;
    doc.text(`Subtotal:`, totalsX, doc.y);
    doc.text(`₹${quotation.subtotal.toLocaleString()}`, 480, doc.y, { align: 'right' });
    doc.moveDown(0.5);
    
    doc.text(`Discount:`, totalsX, doc.y);
    doc.text(`₹${quotation.totalDiscount.toLocaleString()}`, 480, doc.y, { align: 'right' });
    doc.moveDown(0.5);
    
    doc.text(`Tax (GST):`, totalsX, doc.y);
    doc.text(`₹${quotation.taxAmount.toLocaleString()}`, 480, doc.y, { align: 'right' });
    doc.moveDown(0.5);
    
    doc.fontSize(12).text(`Total:`, totalsX, doc.y);
    doc.text(`₹${quotation.totalAmount.toLocaleString()}`, 480, doc.y, { align: 'right' });
    doc.fontSize(10);
    doc.moveDown(2);
    
    // Terms
    if (quotation.termsAndConditions && quotation.termsAndConditions.length > 0) {
      doc.text('Terms & Conditions:', { underline: true });
      quotation.termsAndConditions.forEach((term, index) => {
        doc.text(`${index + 1}. ${term}`);
      });
    }
    
    doc.end();
  } catch (err) {
    console.error('Error generating PDF:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: err.message });
    }
  }
};

// Send quotation via email
exports.sendQuotation = async (req, res) => {
  try {
    const organizationId = req.user.organizationId || req.user.organization;
    const quotation = await Quotation.findOne({ 
      _id: req.params.id, 
      organizationId 
    }).populate('customer');
    
    if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
    
    // Stub for email sending
    console.log(`Sending quotation ${quotation.quotationNumber} to ${quotation.customer.email}`);
    
    // Update status if it was draft
    if (quotation.approvalStatus === 'DRAFT') {
      quotation.approvalStatus = 'PENDING_APPROVAL';
      await quotation.save();
    }
    
    res.json({ message: 'Quotation sent successfully', quotation });
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
    const { comments } = req.body;
    
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
    
    const populated = await Quotation.findById(quotation._id)
      .populate('customer', 'name email')
      .populate('preparedBy', 'firstName lastName');
    
    console.log(`Quotation ${quotation.quotationNumber} approved by user ${userId}`);
    
    res.json(populated);
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
      .populate('customer', 'name email')
      .populate('preparedBy', 'firstName lastName');
    
    console.log(`Quotation ${quotation.quotationNumber} rejected by user ${userId}`);
    
    res.json(populated);
  } catch (err) {
    console.error('Error rejecting quotation:', err);
    res.status(400).json({ message: err.message });
  }
};
