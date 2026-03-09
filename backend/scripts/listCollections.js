require('dotenv').config();
const mongoose = require('mongoose');

const listAllCollections = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vlite';
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB\n');

        // Get database name
        const dbName = mongoose.connection.db.databaseName;
        console.log('📦 Database Name:', dbName);
        console.log('');

        // Get all collections with details
        const collections = await mongoose.connection.db.listCollections().toArray();

        console.log('📊 All Collections with Document Counts:\n');
        for (const collection of collections) {
            const count = await mongoose.connection.db.collection(collection.name).countDocuments({});
            console.log(`  ${collection.name.padEnd(30)} → ${count} documents`);
        }
        console.log('');

        // Sample documents from each collection
        console.log('📄 Sample Documents:\n');
        for (const collection of collections) {
            const sample = await mongoose.connection.db.collection(collection.name).findOne({});
            if (sample) {
                console.log(`\n${collection.name}:`);
                console.log('  Fields:', Object.keys(sample).join(', '));
                if (sample.tenantId !== undefined) {
                    console.log('  ✅ Has tenantId:', sample.tenantId);
                } else {
                    console.log('  ❌ No tenantId field');
                }
            }
        }

        await mongoose.connection.close();
        console.log('\n✅ Analysis completed');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

listAllCollections();
