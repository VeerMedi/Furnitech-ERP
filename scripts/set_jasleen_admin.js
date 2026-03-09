const path = require('path');
module.paths.push(path.join(__dirname, '../backend/node_modules'));

const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const User = require('../backend/models/shared/User');

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB...'))
    .catch(err => console.error('Could not connect to MongoDB...', err));

async function setJasleenAsAdmin() {
    try {
        const jasleenId = '693d3e2f328bb389735ddcb4'; // From logs

        const user = await User.findById(jasleenId);

        if (!user) {
            console.log('❌ User not found!');
            process.exit(1);
        }

        console.log('\n📝 Current user details:');
        console.log('   Name:', user.firstName, user.lastName);
        console.log('   Email:', user.email);
        console.log('   Current userRole:', user.userRole);

        // Set as Admin
        user.userRole = 'Admin';
        await user.save();

        console.log('\n✅ Updated user to Admin!');
        console.log('   New userRole:', user.userRole);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

setJasleenAsAdmin();
