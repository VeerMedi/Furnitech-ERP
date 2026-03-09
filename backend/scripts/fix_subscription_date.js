const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const subSchema = new mongoose.Schema({ organizationId: mongoose.Schema.Types.ObjectId, endDate: Date });
const Subscription = mongoose.model('Subscription', subSchema);
const orgSchema = new mongoose.Schema({ email: String });
const Organization = mongoose.model('Organization', orgSchema);

const fixDate = async () => {
    try {
        if (!process.env.MONGODB_URI) require('dotenv').config();
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vlite_furnitures');

        const email = 'admin@vlite.com';
        const org = await Organization.findOne({ email });

        if (!org) { console.log('Org not found'); process.exit(1); }

        // Target Date: Jan 29, 2026
        // Note: Months are 0-indexed in JS Date? No, '2026-01-29' string works best.
        // Or new Date(2026, 0, 29) -> Jan 29, 2026.
        const targetDate = new Date('2026-01-29T23:59:59');

        await Subscription.findOneAndUpdate(
            { organizationId: org._id },
            { $set: { endDate: targetDate, status: 'expired' } }
        );

        console.log(`✅ Subscription updated for ${email}`);
        console.log(`   New End Date: ${targetDate.toDateString()}`);

        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
};

fixDate();
