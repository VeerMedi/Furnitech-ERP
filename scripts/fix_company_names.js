const path = require('path');
// Add backend node_modules to search path
module.paths.push(path.join(__dirname, '../backend/node_modules'));

const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const Customer = require('../backend/models/vlite/Customer');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB...'))
    .catch(err => console.error('Could not connect to MongoDB...', err));

async function fixCompanyNames() {
    try {
        // Find customers where companyName exists and is not empty
        const customers = await Customer.find({
            companyName: { $exists: true, $ne: '' }
        });

        console.log(`Found ${customers.length} customers with company names.`);

        let updatedCount = 0;
        for (const customer of customers) {
            const fullName = `${customer.firstName} ${customer.lastName}`.trim();
            const companyName = customer.companyName.trim();

            const isIndividual = !customer.type || customer.type === 'INDIVIDUAL';
            const isNameMatch = companyName.toLowerCase() === fullName.toLowerCase();

            if (isNameMatch && isIndividual) {
                console.log(`Fixing customer ${customer._id}: Company '${companyName}' matches Name '${fullName}'. Clearing company name.`);
                customer.companyName = '';
                await customer.save();
                updatedCount++;
            }
        }

        console.log(`Cleanup completed. Updated ${updatedCount} customers.`);
        process.exit(0);
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
}

fixCompanyNames();
