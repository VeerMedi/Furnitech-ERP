require('dotenv').config();
const mongoose = require('mongoose');

const testAtlasConnection = async () => {
  console.log('\n🧪 Testing MongoDB Atlas Connection...\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ No MONGODB_URI found in .env file');
    process.exit(1);
  }

  // Show sanitized URI
  const sanitizedUri = uri.replace(/:([^:@]+)@/, ':****@');
  console.log('📍 Connection String:', sanitizedUri);
  console.log('\n📋 Testing Connection...\n');

  try {
    // Test connection
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
    });

    console.log('✅ Successfully connected to MongoDB Atlas!\n');
    console.log('📊 Connection Details:');
    console.log('   ├─ Host:', conn.connection.host);
    console.log('   ├─ Database:', conn.connection.name);
    console.log('   ├─ Port:', conn.connection.port);
    console.log('   └─ Ready State:', conn.connection.readyState === 1 ? 'Connected ✓' : 'Not Connected ✗');
    
    console.log('\n📚 Listing Collections...\n');
    const collections = await conn.connection.db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('   ℹ️  No collections found (database is empty)\n');
    } else {
      console.log(`   Found ${collections.length} collection(s):\n`);
      collections.forEach((col, idx) => {
        console.log(`   ${idx + 1}. ${col.name}`);
      });
      console.log();
    }

    // Get database stats
    console.log('📈 Database Statistics:');
    const stats = await conn.connection.db.stats();
    console.log('   ├─ Collections:', stats.collections);
    console.log('   ├─ Data Size:', (stats.dataSize / 1024 / 1024).toFixed(2), 'MB');
    console.log('   ├─ Storage Size:', (stats.storageSize / 1024 / 1024).toFixed(2), 'MB');
    console.log('   └─ Indexes:', stats.indexes);

    console.log('\n✅ Atlas connection test completed successfully!');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await mongoose.connection.close();
    console.log('🔌 Connection closed.\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Connection failed!\n');
    console.error('📋 Error Details:');
    console.error('   ├─ Message:', error.message);
    if (error.code) console.error('   ├─ Code:', error.code);
    if (error.name) console.error('   └─ Type:', error.name);
    
    console.error('\n🔍 Troubleshooting:\n');
    
    if (error.message?.includes('ENOTFOUND')) {
      console.error('   • DNS resolution failed');
      console.error('   • Check your internet connection');
      console.error('   • Verify the cluster URL is correct\n');
    } else if (error.message?.includes('authentication failed') || error.message?.includes('bad auth')) {
      console.error('   • Authentication failed');
      console.error('   • Check your username and password');
      console.error('   • Verify database user has correct permissions\n');
    } else if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
      console.error('   • Connection timed out');
      console.error('   • Check MongoDB Atlas IP whitelist (add 0.0.0.0/0 for testing)');
      console.error('   • Verify your network/firewall settings\n');
    } else if (error.message?.includes('Invalid connection string')) {
      console.error('   • Invalid connection string format');
      console.error('   • Make sure to add database name after .mongodb.net/');
      console.error('   • Example: .mongodb.net/your_database_name?retryWrites=true\n');
    } else {
      console.error('   • Unknown error occurred');
      console.error('   • Check your connection string format');
      console.error('   • Verify MongoDB Atlas cluster is running\n');
    }

    console.error('═══════════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
};

testAtlasConnection();
