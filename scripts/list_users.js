
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../backend/models/User');
const connectDB = require('../backend/config/database');

const listUsers = async () => {
  try {
    await connectDB();
    console.log('🔌 Database Connected');
    
    const users = await User.find({});
    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
      console.log(`- [${u._id}] ${u.name} (${u.email}) / Controller: ${u.assignedController || 'None'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing users:', error);
    process.exit(1);
  }
};

listUsers();
