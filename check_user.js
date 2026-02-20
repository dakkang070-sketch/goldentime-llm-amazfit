const mongoose = require('mongoose');
const User = require('./backend/models/User');

const checkUser = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/goldentime');
    console.log('Connected to MongoDB');

    const emails = ['1@1.com', 'testshortpw2@example.com'];
    
    for (const email of emails) {
      const user = await User.findOne({ email });
      if (user) {
        console.log(`User found: ${email}`);
        console.log(`- isEmergencyAppUser: ${user.isEmergencyAppUser}`);
        console.log(`- status: ${user.status}`);
        console.log(`- _id: ${user._id}`);
      } else {
        console.log(`User NOT found: ${email}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkUser();
