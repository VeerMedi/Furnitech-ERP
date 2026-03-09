const mongoose = require('mongoose');
const Quotation = require('../models/vlite/Quotation');
const Inquiry = require('../models/vlite/Inquiry');
const { authenticate } = require('../middleware/auth');
const express = require('express');
const router = express.Router();

router.get('/check-quotation/:quotationNumber', authenticate, async (req, res) => {
    try {
        const { quotationNumber } = req.params;
        console.log(`Checking quotation: ${quotationNumber}`);

        const quotation = await Quotation.findOne({ quotationNumber });

        if (!quotation) {
            return res.status(404).json({ message: 'Quotation not found' });
        }

        const inquiry = quotation.inquiry ? await Inquiry.findById(quotation.inquiry) : null;

        res.json({
            quotationNumber: quotation.quotationNumber,
            hasInquiryLink: !!quotation.inquiry,
            inquiryId: quotation.inquiry,
            hasCustomerLink: !!quotation.customer,
            customerId: quotation.customer,
            inquiryDetails: inquiry ? {
                id: inquiry._id,
                isOnboarded: inquiry.isOnboarded,
                leadStatus: inquiry.leadStatus,
                customerName: inquiry.meta?.customerName
            } : 'No Linked Inquiry Found'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
