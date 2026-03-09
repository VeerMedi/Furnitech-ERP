const mongoose = require('mongoose');
require('dotenv').config();
const Quotation = require('../models/vlite/Quotation');
const Order = require('../models/vlite/Order');
const Customer = require('../models/vlite/Customer');
const Task = require('../models/Task');
const productionWorkflowService = require('../services/productionWorkflowService');
const taskAssignmentService = require('../services/taskAssignmentService');

/**
 * Generate tasks for orders from approved quotations that don't have tasks yet
 */
async function generateTasksForApprovedQuotations() {
  try {
    console.log('🚀 Starting task generation for orders from approved quotations...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000
    });
    console.log('✅ Connected to MongoDB\n');

    // Find all orders that came from approved quotations
    const orders = await Order.find({
      quotation: { $exists: true, $ne: null }
    }).populate('quotation').populate('customer');

    console.log(`📋 Found ${orders.length} orders from quotations\n`);

    let processed = 0;
    let skipped = 0;
    let created = 0;
    let errors = 0;

    for (const order of orders) {
      try {
        console.log(`\n📦 Processing order: ${order.orderNumber}`);
        
        if (order.quotation) {
          console.log(`   From quotation: ${order.quotation.quotationNumber}`);
        }

        // Check if tasks already exist for this order
        const existingTasks = await Task.countDocuments({ order: order._id });
        if (existingTasks > 0) {
          console.log(`   ⏩ ${existingTasks} tasks already exist, skipping...`);
          skipped++;
          continue;
        }

        console.log(`   🔨 Creating workflow tasks...`);

        // Generate workflow tasks
        const workflowResult = await productionWorkflowService.generateWorkflowTasks(order, {
          includePreProduction: true,
          includePostProduction: true,
          priority: 'MEDIUM',
          autoAssign: true
        });

        console.log(`   ✅ Created ${workflowResult.tasksCreated} tasks`);

        // Auto-assign tasks
        console.log(`   👥 Assigning tasks...`);
        const assignmentResult = await taskAssignmentService.autoAssignOrderTasks(order._id, {
          assignedBy: order.createdBy
        });

        console.log(`   ✅ Success!`);
        console.log(`      Order: ${order.orderNumber}`);
        console.log(`      Tasks Created: ${workflowResult.tasksCreated}`);
        console.log(`      Tasks Assigned: ${assignmentResult.assigned}/${assignmentResult.total}`);
        
        created++;
        processed++;

      } catch (error) {
        console.error(`   ❌ Error processing ${order.orderNumber}:`, error.message);
        console.error(`      ${error.stack}`);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Orders Found:         ${orders.length}`);
    console.log(`✅ Tasks Created For:        ${created}`);
    console.log(`⏩ Skipped (already done):   ${skipped}`);
    console.log(`❌ Errors:                   ${errors}`);
    console.log('='.repeat(60) + '\n');

    if (created > 0) {
      console.log('🎉 Task automation setup complete!');
      console.log('   Check the Task Dashboard to see all generated tasks.\n');
    } else if (skipped === orders.length && orders.length > 0) {
      console.log('✅ All orders already have tasks assigned!\n');
    } else if (orders.length === 0) {
      console.log('ℹ️  No orders from quotations found.\n');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
generateTasksForApprovedQuotations();
