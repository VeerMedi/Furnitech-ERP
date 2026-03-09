const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Quotation = require('../models/vlite/Quotation');
const Inquiry = require('../models/vlite/Inquiry');
const Customer = require('../models/vlite/Customer');
const { authenticate } = require('../middleware/auth');

router.get('/fix-links', async (req, res) => {
    try {
        console.log('🔧 STARTING FIX-LINKS SCRIPT...');

        // 1. Find Quotations created today that might be missing links
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const quotations = await Quotation.find({
            createdAt: { $gte: startOfDay }
        });

        console.log(`Found ${quotations.length} quotations from today.`);

        const results = [];

        for (const quote of quotations) {
            let status = 'unchanged';
            let details = '';

            // Check 1: Missing Inquiry Link
            if (!quote.inquiry && quote.customerName) {
                console.log(`Checking Quote ${quote.quotationNumber} for missing inquiry link...`);

                // Find matching active inquiry
                // Regex for case-insensitive partial match
                const inquiry = await Inquiry.findOne({
                    $or: [
                        { 'meta.customerName': { $regex: new RegExp(quote.customerName, 'i') } },
                        { 'meta.email': quote.customerEmail }
                    ],
                    // Prefer open inquiries
                    isOnboarded: false
                }).sort({ createdAt: -1 });

                if (inquiry) {
                    console.log(`✅ MATCH FOUND: Inquiry ${inquiry.referenceId || inquiry._id}`);
                    quote.inquiry = inquiry._id;
                    await quote.save();
                    status = 'linked_inquiry';
                    details = `Linked to Inquiry ${inquiry._id}`;
                } else {
                    console.log('❌ No matching inquiry found.');
                }
            }

            // Check 2: Approved but NOT Onboarded (The User's specific issue)
            if (quote.approvalStatus === 'APPROVED' && quote.inquiry && !quote.customer) {
                console.log(`🚀 Triggering Auto-Onboard for ${quote.quotationNumber}...`);

                const inquiry = await Inquiry.findById(quote.inquiry);

                if (inquiry && !inquiry.isOnboarded) {
                    // Generate code
                    const customerCode = await Customer.generateCustomerCode(quote.organizationId);

                    // Create Name
                    const nameString = quote.customerName || inquiry.meta?.customerName || 'Unknown';
                    const nameParts = nameString.trim().split(' ');

                    const customerData = {
                        organizationId: quote.organizationId,
                        customerCode,
                        firstName: nameParts[0] || 'Unknown',
                        lastName: nameParts.slice(1).join(' ') || '',
                        companyName: nameString,
                        email: quote.customerEmail || inquiry.meta?.email || '',
                        phone: inquiry.meta?.contact || '',
                        address: {
                            street: inquiry.meta?.address || '',
                            city: '', state: '', zipCode: ''
                        },
                        source: 'Quotation Approval (Fix Script)',
                        customerType: 'End Customer',
                        status: 'Active',
                        registrationDate: new Date(),
                        fromInquiry: inquiry._id
                    };

                    const customer = new Customer(customerData);
                    await customer.save();

                    // Updates
                    inquiry.isOnboarded = true;
                    inquiry.onboardedAt = new Date();
                    inquiry.onboardedCustomer = customer._id;
                    inquiry.onboardedCustomerCode = customer.customerCode;
                    inquiry.leadStatus = 'CONVERTED';
                    await inquiry.save();

                    quote.customer = customer._id;
                    await quote.save();

                    status = 'fixed_and_onboarded';
                    details = `Created Customer ${customerCode} and converted Inquiry`;
                }
            }

            results.push({
                quote: quote.quotationNumber,
                status,
                details
            });
        }

        res.json({ success: true, results });

    } catch (error) {
        console.error('Fix Script Error:', error);
        res.json({ success: false, error: error.message });
    }
});

module.exports = router;
