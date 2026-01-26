const mongoose = require('mongoose');
require('dotenv').config();
const SchoolViolenceCase = require('../backend/models/SchoolViolenceCase');
const User = require('../backend/models/User');
const BiometricData = require('../backend/models/BiometricData');
const connectDB = require('../backend/config/database');

const clearAllData = async () => {
  try {
    await connectDB();
    console.log('🔌 Database Connected');
    
    // 1. Delete SchoolViolenceCase
    const caseResult = await SchoolViolenceCase.deleteMany({});
    console.log(`✅ Deleted ${caseResult.deletedCount} SchoolViolenceCase documents.`);
    
    // 2. Delete Users (Connected Member Data)
    const userResult = await User.deleteMany({});
    console.log(`✅ Deleted ${userResult.deletedCount} User documents.`);

    // 3. Delete BiometricData (Connected Sensor Data)
    const biometricResult = await BiometricData.deleteMany({});
    console.log(`✅ Deleted ${biometricResult.deletedCount} BiometricData documents.`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    process.exit(1);
  }
};

clearAllData();
