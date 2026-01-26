
const mongoose = require('mongoose');
require('dotenv').config();
const Controller = require('../backend/models/Controller');
const connectDB = require('../backend/config/database');

const listControllers = async () => {
  try {
    await connectDB();
    console.log('🔌 Database Connected');
    
    const controllers = await Controller.find({});
    console.log(`Found ${controllers.length} controllers:`);
    controllers.forEach(c => {
      console.log(`- [${c._id}] ${c.name} (${c.email}) / Role: ${c.role}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing controllers:', error);
    process.exit(1);
  }
};

listControllers();
