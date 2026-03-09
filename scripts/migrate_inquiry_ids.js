const path = require('path');
// Add backend node_modules to search path
module.paths.push(path.join(__dirname, '../backend/node_modules'));

const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const Inquiry = require('../backend/models/vlite/Inquiry');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB...'))
    .catch(err => console.error('Could not connect to MongoDB...', err));

async function migrateInquiries() {
    try {
        const inquiries = await Inquiry.find({
            $or: [
                { customerId: { $exists: false } },
                { customerId: '' },
                { customerId: null },
                { customerId: { $regex: /^GUEST-/ } } // Also update old long GUEST IDs
            ]
        });

        console.log(`Found ${inquiries.length} inquiries to migrate.`);

        for (const inquiry of inquiries) {
            const randomId = Math.floor(100000 + Math.random() * 900000);
            const newId = `C-${randomId}`;

            inquiry.customerId = newId;
            await inquiry.save();
            console.log(`Updated inquiry ${inquiry._id} with Customer ID: ${newId}`);
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateInquiries();
