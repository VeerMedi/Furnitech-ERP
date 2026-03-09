const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const subSchema = new mongoose.Schema({
    organizationId: mongoose.Schema.Types.ObjectId,
    plan: String,
    status: String,
    startDate: Date,
    endDate: Date,
    freeTokens: Object
});
const Subscription = mongoose.model('Subscription', subSchema);
const orgSchema = new mongoose.Schema({ email: String });
const Organization = mongoose.model('Organization', orgSchema);

const rechargePlan = async () => {
    try {
        if (!process.env.MONGODB_URI) require('dotenv').config();
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vlite_furnitures');

        const email = 'admin@vlite.com';
        const org = await Organization.findOne({ email });

        if (!org) { console.log('Org not found'); process.exit(1); }

        // Start Date: Today (30 Jan 2026)
        const startDate = new Date();
        // End Date: 30-02-2026 -> Wait, Feb has 28/29 days. JS will autocorrect Feb 30 to March 2 or 3.
        // User asked specifically for "30 - 2 - 26". JS Date(2026, 1, 30) -> Feb is index 1.
        // Let's create date object and see. 
        // If I strictly follow user request, it might roll over to March.
        // Assuming user means End of Feb or March 2nd. I'll pass the params.
        const endDate = new Date(2026, 1, 30, 23, 59, 59); // Year, Month(0-idx), Day

        console.log(`Calculated End Date for '30-2-2026': ${endDate.toDateString()}`);

        await Subscription.findOneAndUpdate(
            { organizationId: org._id },
            {
                $set: {
                    plan: 'Standard Plan',
                    status: 'active',
                    startDate: startDate,
                    endDate: endDate,
                    freeTokens: {
                        aiReports: { total: 1000, used: 0, remaining: 1000 },
                        aiDemandForecasting: { total: 1000, used: 0, remaining: 1000 },
                        aiCustomerInsights: { total: 1000, used: 0, remaining: 1000 }
                    }
                }
            }
        );

        console.log(`✅ Subscription Recharged for ${email}`);
        console.log(`   Plan: Standard Plan (Active)`);
        console.log(`   Tokens: 1000 each`);
        console.log(`   Expires: ${endDate.toDateString()}`);

        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

rechargePlan();
