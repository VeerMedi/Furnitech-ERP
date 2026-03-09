const mongoose = require('mongoose');
const Customer = require('../models/vlite/Customer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const customers = await Customer.find().sort({ createdAt: -1 }).limit(5);
  console.log('Total:', await Customer.countDocuments());
  customers.forEach(c => console.log({ _id: c._id, org: c.organizationId, code: c.customerCode, name: c.companyName, createdAt: c.createdAt }));
  process.exit();
})();
