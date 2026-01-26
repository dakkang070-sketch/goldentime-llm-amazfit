const mongoose = require("mongoose");
const SchoolViolenceCase = require("./backend/models/SchoolViolenceCase");
require("dotenv").config(); // Load from root .env by default

const axios = require("axios");

async function check() {
  try {
    // 1. Check API
    console.log("Checking API /cases...");
    try {
      const apiRes = await axios.get(
        "http://localhost:5000/api/school-violence/cases",
      );
      console.log(`API returned ${apiRes.data.data.length} cases.`);

      // Check Status Distribution
      const statusCounts = {};
      apiRes.data.data.forEach(c => {
        statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      });
      console.log("Status Distribution:", statusCounts);
      if (apiRes.data.data.length > 0) {
        const latest = apiRes.data.data[0];
        console.log(
          `API Latest: [${latest.detectedAt}] ${latest.analysisResult?.reasoning}`,
        );
      }
    } catch (e) {
      console.error("API check failed:", e.message);
    }

    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/goldentime",
    );
    console.log("Connected to MongoDB");

    const count = await SchoolViolenceCase.countDocuments();
    console.log(`Total cases: ${count}`);

    const recentCases = await SchoolViolenceCase.find()
      .sort({ detectedAt: -1 })
      .limit(5);
    console.log(`Top 5 recent cases:`);

    recentCases.forEach((c) => {
      console.log(
        `- [${c.detectedAt}] ${c.analysisResult?.category} (${c.analysisResult?.severity}) | Status: ${c.status}`,
      );
      console.log(`  Reasoning: ${c.analysisResult?.reasoning}`);
      console.log(
        `  Transcript: ${c.transcript.substring(0, 50)}${c.transcript.length > 50 ? "..." : ""}`,
      );
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
