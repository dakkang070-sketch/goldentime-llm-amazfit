
const mongoose = require('mongoose');
require('dotenv').config();
const SchoolViolenceCase = require('../backend/models/SchoolViolenceCase');
const connectDB = require('../backend/config/database');

const listCases = async () => {
  try {
    await connectDB();
    console.log('🔌 Database Connected');
    
    const cases = await SchoolViolenceCase.find({});
    console.log(`Found ${cases.length} cases.`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing cases:', error);
    process.exit(1);
  }
};

listCases();
