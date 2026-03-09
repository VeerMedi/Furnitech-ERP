const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const subSchema = new mongoose.Schema({ organizationId: mongoose.Schema.Types.ObjectId, freeTokens: Object }, { strict: false });
const Subscription = mongoose.model('Subscription', subSchema);
const orgSchema = new mongoose.Schema({ email: String });
const Organization = mongoose.model('Organization', orgSchema);

const check = async () => {
    try {
        if (!process.env.MONGODB_URI) require('dotenv').config();
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vlite_furnitures');

        const email = 'admin@vlite.com';
        const org = await Organization.findOne({ email });

        if (!org) { console.log('Org not found'); process.exit(1); }

        const sub = await Subscription.findOne({ organizationId: org._id });
        console.log('Current DB State for admin@vlite.com subscription:');
        console.log(JSON.stringify(sub, null, 2));

        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
};

check();
