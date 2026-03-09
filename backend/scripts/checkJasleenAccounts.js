require('dotenv').config();
const mongoose = require('mongoose');
const Organization = require('../models/shared/Organization');
const User = require('../models/vlite/User');

const checkJasleenAccounts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Check if jasleen is Organization Admin
        const orgWithJasleen = await Organization.findOne({
            'adminUser.email': 'jasleen@vlite.com'
        });

        // Check if jasleen exists as regular user
        const userJasleen = await User.findOne({
            email: 'jasleen@vlite.com'
        });

        console.log('📧 Email: jasleen@vlite.com\n');

        if (orgWithJasleen) {
            console.log('✅ ORGANIZATION ADMIN ACCOUNT EXISTS:');
            console.log('   Organization:', orgWithJasleen.name);
            console.log('   Admin Name:', orgWithJasleen.adminUser.firstName, orgWithJasleen.adminUser.lastName);
            console.log('   → Can login as Org Admin\n');
        } else {
            console.log('❌ NO Organization Admin account found\n');
        }

        if (userJasleen) {
            console.log('✅ REGULAR USER ACCOUNT EXISTS:');
            console.log('   Name:', userJasleen.firstName, userJasleen.lastName);
            console.log('   Role:', userJasleen.userRole);
            console.log('   User ID:', userJasleen._id);
            console.log('   → Can login as regular user\n');
        } else {
            console.log('❌ NO regular User account found\n');
        }

        console.log('\n📋 VERDICT:');
        if (orgWithJasleen && userJasleen) {
            console.log('✅ SAFE TO DELETE USER CARD');
            console.log('   Reason: jasleen@vlite.com can still login as Organization Admin');
            console.log('   After deletion: Login will work, but as ORG_ADMIN type');
        } else if (orgWithJasleen && !userJasleen) {
            console.log('ℹ️ NO USER CARD TO DELETE');
            console.log('   jasleen@vlite.com only exists as Org Admin');
        } else if (!orgWithJasleen && userJasleen) {
            console.log('⚠️ DANGEROUS TO DELETE!');
            console.log('   Reason: No Organization Admin account exists');
            console.log('   After deletion: CANNOT LOGIN AT ALL!');
        } else {
            console.log('❌ No accounts found for jasleen@vlite.com!');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

checkJasleenAccounts();
