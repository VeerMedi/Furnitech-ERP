/**
 * Add Mock Data for Post Production Dashboard
 * Creates 2 sample orders with delivery tracking
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Order = require('../models/vlite/Order');
const Customer = require('../models/vlite/Customer');
const Organization = require('../models/shared/Organization');

const addPostProductionMockData = async () => {
    try {
        await connectDB();
        console.log('✅ Connected to database\n');

        // Get organization
        const organization = await Organization.findOne();
        if (!organization) {
            console.log('❌ No organization found. Run seed.js first.');
            process.exit(1);
        }

        // Check if customer exists, if not create one
        let customer = await Customer.findOne({ organizationId: organization._id });
        if (!customer) {
            console.log('Creating sample customer...');
            customer = await Customer.create({
                organizationId: organization._id,
                customerName: 'ABC Interiors Pvt Ltd',
                contactPerson: 'Rajesh Kumar',
                email: 'rajesh@abcinteriors.com',
                phone: '9876543210',
                address: {
                    street: '123 MG Road',
                    area: 'Commercial Area',
                    city: 'Bangalore',
                    state: 'Karnataka',
                    zipCode: '560001',
                },
                status: 'ACTIVE',
            });
            console.log('✅ Customer created\n');
        }

        // Mock Order 1: Ready for Dispatch
        console.log('Creating Mock Order 1: Ready for Dispatch...');
        const order1 = await Order.create({
            organizationId: organization._id,
            customer: customer._id,
            orderDate: new Date('2025-12-10'),
            items: [
                {
                    itemNumber: 1,
                    description: 'Executive Office Desk - Walnut Finish',
                    specifications: {
                        dimensions: '6ft x 3ft x 2.5ft',
                        material: 'Plywood with Walnut Laminate',
                        type: 'Custom Executive Desk',
                    },
                    quantity: 2,
                    unitPrice: 35000,
                    totalPrice: 70000,
                    productionStatus: 'COMPLETED',
                },
                {
                    itemNumber: 2,
                    description: 'Ergonomic Office Chair',
                    specifications: {
                        material: 'Fabric with Steel Base',
                        color: 'Black',
                    },
                    quantity: 4,
                    unitPrice: 12000,
                    totalPrice: 48000,
                    productionStatus: 'COMPLETED',
                },
            ],
            orderStatus: 'COMPLETED',
            productType: 'Wood',
            woodWorkflowStatus: {
                beamSaw: true,
                edgeBending: true,
                boringMachine: true,
                finish: true,
                packaging: true,
            },
            packagingStatus: 'COMPLETED',
            packagingCompletedDate: new Date('2025-12-15'),
            deliveryStatus: 'READY_FOR_DISPATCH',
            deliveryStatusLogs: [
                {
                    status: 'READY_FOR_DISPATCH',
                    timestamp: new Date('2025-12-15T10:00:00'),
                    location: 'Warehouse - Bangalore',
                    notes: 'Quality checked and packed. Ready for pickup.',
                },
            ],
            deliveryAddress: {
                street: '456 Industrial Area',
                area: 'Phase 1',
                city: 'Bangalore',
                state: 'Karnataka',
                zipCode: '560045',
            },
            expectedDeliveryDate: new Date('2025-12-18'),
            invoiceStatus: 'GENERATED',
            invoice: {
                invoiceNumber: 'INV202512150001',
                invoiceDate: new Date('2025-12-15'),
                invoiceUrl: '/invoices/INV202512150001.pdf', // Enable download
            },
            totalAmount: 118000,
            advanceReceived: 60000,
            balanceAmount: 58000,
            paymentStatus: 'PARTIAL',
            priority: 'HIGH',
            requiresInstallation: true,
            installationStatus: 'NOT_STARTED',
            productionNotes: 'All items completed and quality checked.',
        });
        console.log(`✅ Order ${order1.orderNumber} created - READY FOR DISPATCH\n`);

        // Mock Order 2: In Transit
        console.log('Creating Mock Order 2: In Transit...');
        const order2 = await Order.create({
            organizationId: organization._id,
            customer: customer._id,
            orderDate: new Date('2025-12-05'),
            items: [
                {
                    itemNumber: 1,
                    description: 'Modular Kitchen Cabinets Set',
                    specifications: {
                        dimensions: 'L-shaped, 12ft x 8ft',
                        material: 'Marine Plywood with Laminate',
                        finish: 'Glossy White',
                    },
                    quantity: 1,
                    unitPrice: 180000,
                    totalPrice: 180000,
                    productionStatus: 'COMPLETED',
                },
            ],
            orderStatus: 'DISPATCHED',
            productType: 'Wood',
            woodWorkflowStatus: {
                beamSaw: true,
                edgeBending: true,
                boringMachine: true,
                finish: true,
                packaging: true,
            },
            packagingStatus: 'COMPLETED',
            packagingCompletedDate: new Date('2025-12-12'),
            dispatchDate: new Date('2025-12-14T08:00:00'),
            courierDetails: {
                courierName: 'VRL Logistics',
                trackingNumber: 'VRL2025120012345',
                contactNumber: '1800-102-2020',
            },
            deliveryStatus: 'IN_TRANSIT',
            deliveryStatusLogs: [
                {
                    status: 'READY_FOR_DISPATCH',
                    timestamp: new Date('2025-12-12T16:00:00'),
                    location: 'Warehouse - Bangalore',
                    notes: 'Packed and ready',
                },
                {
                    status: 'IN_TRANSIT',
                    timestamp: new Date('2025-12-14T08:30:00'),
                    location: 'VRL Hub - Bangalore',
                    notes: 'Shipment loaded on truck. Estimated delivery: 16-Dec',
                },
                {
                    status: 'IN_TRANSIT',
                    timestamp: new Date('2025-12-15T14:00:00'),
                    location: 'VRL Hub - Hubli',
                    notes: 'In transit. Next stop: Customer location',
                },
            ],
            deliveryAddress: {
                street: 'Villa No. 23, Palm Grove',
                area: 'Whitefield',
                city: 'Bangalore',
                state: 'Karnataka',
                zipCode: '560066',
            },
            expectedDeliveryDate: new Date('2025-12-16'),
            invoiceStatus: 'SENT_TO_CUSTOMER',
            invoice: {
                invoiceNumber: 'INV202512120002',
                invoiceDate: new Date('2025-12-12'),
                invoiceUrl: '/invoices/INV202512120002.pdf', // Enable download
            },
            totalAmount: 180000,
            advanceReceived: 90000,
            balanceAmount: 90000,
            paymentStatus: 'PARTIAL',
            priority: 'MEDIUM',
            requiresInstallation: true,
            installationStatus: 'NOT_STARTED',
            installationDate: new Date('2025-12-17'),
            productionNotes: 'Premium kitchen set with soft-close hinges.',
            customerNotes: 'Customer prefers morning delivery between 9-11 AM',
        });
        console.log(`✅ Order ${order2.orderNumber} created - IN TRANSIT\n`);

        console.log('🎯 Mock Data Summary:');
        console.log(`   Order 1 (${order1.orderNumber}): READY FOR DISPATCH - ₹${order1.totalAmount}`);
        console.log(`   Order 2 (${order2.orderNumber}): IN TRANSIT - ₹${order2.totalAmount}`);
        console.log('\n✨ Post Production Dashboard is now ready for testing!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
};

addPostProductionMockData();
