const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Quotation = require('../models/vlite/Quotation');
const Inquiry = require('../models/vlite/Inquiry');
const Customer = require('../models/vlite/Customer');

// Debug endpoint to check user data
router.get('/check-user', authenticate, (req, res) => {
    const user = req.user;

    res.json({
        success: true,
        debug: {
            userId: user._id || user.id,
            email: user.email,
            userRole: user.userRole,
            userRoleType: typeof user.userRole,
            organizationId: user.organizationId,
            fullUserObject: {
                _id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                userRole: user.userRole,
                role: user.role,
                dashboardPermissions: user.dashboardPermissions
            }
        }
    });
});

// Debug endpoint to check quotation-inquiry relationship
router.get('/check-quotation/:id', authenticate, async (req, res) => {
    try {
        const quotationId = req.params.id;
        const organizationId = req.user.organizationId || req.user.organization;

        const quotation = await Quotation.findOne({
            _id: quotationId,
            organizationId
        }).populate('inquiry').populate('customer');

        if (!quotation) {
            return res.status(404).json({
                success: false,
                message: 'Quotation not found'
            });
        }

        let inquiryDetails = null;
        if (quotation.inquiry) {
            const inquiry = await Inquiry.findById(quotation.inquiry);
            inquiryDetails = inquiry ? {
                _id: inquiry._id,
                customerName: inquiry.meta?.customerName,
                isOnboarded: inquiry.isOnboarded,
                onboardedAt: inquiry.onboardedAt,
                onboardedCustomer: inquiry.onboardedCustomer,
                onboardedCustomerCode: inquiry.onboardedCustomerCode,
                leadStatus: inquiry.leadStatus
            } : null;
        }

        res.json({
            success: true,
            debug: {
                quotation: {
                    _id: quotation._id,
                    quotationNumber: quotation.quotationNumber,
                    approvalStatus: quotation.approvalStatus,
                    inquiry: quotation.inquiry,
                    customer: quotation.customer,
                    customerName: quotation.customerName,
                    hasInquiryLink: !!quotation.inquiry,
                    hasCustomerLink: !!quotation.customer
                },
                inquiryDetails,
                shouldAutoOnboard: !!(quotation.inquiry && !quotation.customer),
                canOnboard: !!(inquiryDetails && !inquiryDetails.isOnboarded)
            }
        });
    } catch (error) {
        console.error('Debug check error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Debug endpoint to manually trigger onboarding for a quotation
router.post('/manual-onboard/:quotationId', authenticate, async (req, res) => {
    try {
        const { quotationId } = req.params;
        const organizationId = req.user.organizationId || req.user.organization;

        const quotation = await Quotation.findOne({
            _id: quotationId,
            organizationId
        });

        if (!quotation) {
            return res.status(404).json({ message: 'Quotation not found' });
        }

        if (!quotation.inquiry) {
            return res.status(400).json({
                message: 'No inquiry linked to this quotation',
                debug: { quotationInquiry: quotation.inquiry }
            });
        }

        const inquiry = await Inquiry.findById(quotation.inquiry);

        if (!inquiry) {
            return res.status(404).json({ message: 'Linked inquiry not found' });
        }

        if (inquiry.isOnboarded) {
            return res.status(400).json({
                message: 'Inquiry is already onboarded',
                debug: {
                    isOnboarded: inquiry.isOnboarded,
                    onboardedCustomerCode: inquiry.onboardedCustomerCode
                }
            });
        }

        // Generate customer code
        const customerCode = await Customer.generateCustomerCode(organizationId);

        // Extract names
        const nameString = quotation.customerName || inquiry.meta?.customerName || '';
        const nameParts = nameString.trim().split(' ');
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Create Customer
        const customerData = {
            organizationId,
            customerCode,
            firstName,
            lastName,
            companyName: nameString,
            email: quotation.customerEmail || inquiry.meta?.email || '',
            phone: inquiry.meta?.contact || '',
            address: {
                street: inquiry.meta?.address || '',
                city: '', state: '', zipCode: ''
            },
            source: 'Manual Onboarding (Debug)',
            customerType: 'End Customer',
            status: 'Active',
            registrationDate: new Date(),
            fromInquiry: inquiry._id
        };

        const customer = new Customer(customerData);
        await customer.save();

        // Update Inquiry
        inquiry.isOnboarded = true;
        inquiry.onboardedAt = new Date();
        inquiry.onboardedCustomer = customer._id;
        inquiry.onboardedCustomerCode = customer.customerCode;
        inquiry.leadStatus = 'CONVERTED';
        await inquiry.save();

        // Update Quotation with new customer
        quotation.customer = customer._id;
        await quotation.save();

        res.json({
            success: true,
            message: 'Manual onboarding successful',
            data: {
                customer: {
                    _id: customer._id,
                    customerCode: customer.customerCode,
                    companyName: customer.companyName
                },
                inquiry: {
                    _id: inquiry._id,
                    isOnboarded: inquiry.isOnboarded,
                    onboardedCustomerCode: inquiry.onboardedCustomerCode
                },
                quotation: {
                    _id: quotation._id,
                    quotationNumber: quotation.quotationNumber,
                    linkedCustomer: quotation.customer
                }
            }
        });
    } catch (error) {
        console.error('Manual onboarding error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
