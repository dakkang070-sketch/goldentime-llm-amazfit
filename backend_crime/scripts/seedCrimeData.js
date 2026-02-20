require('dotenv').config({ path: '../.env' }); // Adjust path if needed, or rely on defaults
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const SchoolViolenceCase = require('../models/SchoolViolenceCase');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/goldentime';
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};

const seedData = async () => {
  await connectDB();

  try {
    // Read JSON file
    const dataPath = path.join(__dirname, '../data/crime_dataset.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const cases = JSON.parse(rawData);

    // Clear existing data
    await SchoolViolenceCase.deleteMany({});
    console.log('Cleared existing SchoolViolenceCase data');

    // Prepare data for insertion
    const docs = cases.map((c, index) => {
      // Simulate random location around Seoul
      const lat = 37.5 + (Math.random() - 0.5) * 0.1;
      const lng = 127.0 + (Math.random() - 0.5) * 0.1;
      
      // Simulate analysis result
      const analysisResult = {
        category: c.category,
        severity: c.severity,
        confidence: Math.floor(Math.random() * 20) + 80, // 80-99%
        reasoning: c.description,
        keywords: c.transcript.split(' ').slice(0, 5) // Simple keyword extraction
      };

      // Determine status
      let status = 'Reported';
      let policeResponse = null;
      if (c.severity === 'Critical') {
        status = 'Police Dispatched';
        policeResponse = 'Police unit dispatched. ETA 5 mins.';
      } else if (c.severity === 'Normal') {
        status = 'Resolved';
      }

      return {
        transcript: c.transcript,
        location: {
          lat,
          lng,
          address: 'Seoul, Korea (Simulated Address)'
        },
        detectedAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24), // Within last 24 hours
        analysisResult,
        status,
        policeResponse
      };
    });

    // Insert data
    await SchoolViolenceCase.insertMany(docs);
    console.log(`Successfully seeded ${docs.length} school violence cases.`);

  } catch (error) {
    console.error('Seeding Error:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedData();
