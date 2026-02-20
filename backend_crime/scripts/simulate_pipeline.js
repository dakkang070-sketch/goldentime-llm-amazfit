const mongoose = require("mongoose");
const SchoolViolenceCase = require("../models/SchoolViolenceCase");
const trainingService = require("../services/modelTrainingService");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

async function simulatePipeline() {
  console.log("🚀 Starting MLOps Pipeline Simulation...");

  try {
    // 1. Connect to DB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/goldentime",
    );
    console.log("✅ Connected to MongoDB");

    // 2. Find cases to "review"
    const cases = await SchoolViolenceCase.find({
      "feedback.reviewedAt": { $exists: false },
    }).limit(5);

    if (cases.length === 0) {
      console.log(
        "ℹ️ No unreviewed cases found. Generate some using simulateWatch.js first.",
      );
    } else {
      console.log(
        `🔍 Found ${cases.length} unreviewed cases. Simulating human feedback...`,
      );

      for (const c of cases) {
        // Simulate "Correct" feedback for all for simplicity
        await trainingService.submitFeedback(c._id, {
          isCorrect: true,
          comment: "Verified by simulation script",
        });
        process.stdout.write(".");
      }
      console.log("\n✅ Feedback submitted.");

      // 3. Export Data
      console.log("📦 Exporting data to JSONL...");
      const result = await trainingService.generateTrainingDataset();
      console.log(
        `✅ Export complete: ${result.count} cases written to ${result.path}`,
      );
    }

    // 4. Trigger Training (Mock)
    console.log("🧠 Triggering Fine-tuning Job...");
    const { execSync } = require("child_process");
    try {
      // Execute the training script
      const output = execSync("npm run train:violence", {
        encoding: "utf-8",
        stdio: "inherit",
      });
      console.log("✅ Training Job Completed Successfully.");
    } catch (e) {
      console.error("❌ Training Job Failed:", e.message);
    }
  } catch (error) {
    console.error("❌ Pipeline Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Done.");
  }
}

simulatePipeline();
