const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const checkUser = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/goldentime';
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const users = await User.find({});
    console.log(`Total users found: ${users.length}`);
    users.forEach(u => {
      console.log(`- ${u.email} (AppUser: ${u.isEmergencyAppUser}, Status: ${u.status})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkUser();
