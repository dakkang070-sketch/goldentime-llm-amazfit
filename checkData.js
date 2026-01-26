const mongoose = require('mongoose');
const SchoolViolenceCase = require('./backend/models/SchoolViolenceCase');
require('dotenv').config({ path: './backend/.env' });

async function check() {
  try {
    console.log('Connecting to DB...', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goldentime');
    
    const count = await SchoolViolenceCase.countDocuments();
    console.log(`Total cases: ${count}`);
    
    if (count > 0) {
      const cases = await SchoolViolenceCase.find().limit(2);
      console.log('Sample cases:', JSON.stringify(cases, null, 2));
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
