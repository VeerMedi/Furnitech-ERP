const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

const addHeadOfSalesRole = async () => {
  try {
    await connectDB();

    const Role = mongoose.model('Role', new mongoose.Schema({
      name: String,
      code: String,
      description: String,
      permissions: Array,
      level: Number,
      organizationId: mongoose.Schema.Types.ObjectId,
      isActive: Boolean,
    }));

    const organizationId = '6935417d57433de522df0bbe'; // Your org ID

    // Check if role already exists
    const existingRole = await Role.findOne({
      organizationId,
      code: 'HEAD_OF_SALES',
    });

    if (existingRole) {
      console.log('⚠️ Head of Sales (HOD) role already exists');
      process.exit(0);
    }

    // Create the new role
    const newRole = await Role.create({
      name: 'Head of Sales (HOD)',
      code: 'HEAD_OF_SALES',
      description: 'Head of Sales Department with full sales team oversight',
      permissions: [
        { module: 'CRM', subModule: 'INQUIRY', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'] },
        { module: 'CRM', subModule: 'LEAD', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'] },
        { module: 'CRM', subModule: 'QUOTATION', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'] },
        { module: 'CRM', subModule: 'ORDER', actions: ['CREATE', 'READ', 'UPDATE', 'APPROVE'] },
        { module: 'CRM', subModule: 'CUSTOMER', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] }
      ],
      level: 8,
      organizationId: new mongoose.Types.ObjectId(organizationId),
      isActive: true,
    });

    console.log('✅ Successfully added Head of Sales (HOD) role:', newRole.name);
    console.log('   Role ID:', newRole._id);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding role:', error);
    process.exit(1);
  }
};

addHeadOfSalesRole();
