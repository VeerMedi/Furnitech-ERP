require('dotenv').config();
const mongoose = require('mongoose');
const RawMaterial = require('../models/vlite/RawMaterial');
const Vendor = require('../models/vlite/Vendor');

const orgId = '6935417d57433de522df0bbe';

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    console.log('=== VENDOR DATA ===');
    const vendor = await Vendor.findOne({ 
      organizationId: orgId, 
      vendorName: 'Test Suppliers Pvt Ltd' 
    });

    if (vendor) {
      console.log('Vendor:', vendor.vendorName);
      console.log('Purchase History Count:', vendor.purchaseHistory.length);
      
      vendor.purchaseHistory.forEach((p, i) => {
        console.log(`\nPurchase ${i + 1}:`);
        console.log('  Item:', p.itemName);
        console.log('  Quantity:', p.quantity);
        console.log('  Price:', p.unitPrice);
        console.log('  Total:', p.totalAmount);
        console.log('  Date:', new Date(p.purchaseDate).toLocaleDateString());
      });
    } else {
      console.log('Vendor not found');
    }

    console.log('\n\n=== PRICE BOOK PANEL DATA ===');
    const panel = await RawMaterial.findOne({ 
      organizationId: orgId, 
      name: 'Panel',
      category: 'PANEL'
    });

    if (panel) {
      console.log('Material:', panel.name);
      console.log('Category:', panel.category);
      console.log('Brand:', panel.specifications?.brand);
      console.log('Price History Count:', panel.priceHistory.length);
      
      panel.priceHistory.forEach((p, i) => {
        console.log(`\nHistory Entry ${i + 1}:`);
        console.log('  Vendor:', p.vendor);
        console.log('  Price:', p.price);
        console.log('  Quantity:', p.quantity);
        console.log('  Date:', new Date(p.date).toLocaleDateString());
        console.log('  Notes:', p.notes);
      });
    } else {
      console.log('Panel material not found in Price Book');
    }

    console.log('\n\n=== ANALYSIS ===');
    if (vendor && panel) {
      const panelPurchases = vendor.purchaseHistory.filter(p => 
        p.itemName?.toLowerCase() === 'panel'
      );
      console.log('Vendor has', panelPurchases.length, 'Panel purchase(s)');
      console.log('Price Book has', panel.priceHistory.length, 'Panel price history entries');
      
      if (panel.priceHistory.length > panelPurchases.length) {
        console.log('\n⚠️  ISSUE FOUND: Price Book has MORE entries than Vendor purchases!');
        console.log('This means sync happened multiple times or there was existing data.');
      }
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

checkData();
