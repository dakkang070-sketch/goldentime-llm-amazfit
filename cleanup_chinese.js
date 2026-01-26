const mongoose = require("mongoose");
const SchoolViolenceCase = require("./backend/models/SchoolViolenceCase");
require("dotenv").config();

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/goldentime");
    console.log("Connected to MongoDB");

    // Find cases with Chinese characters in reasoning or keywords
    // Range: \u4e00-\u9fff
    const cases = await SchoolViolenceCase.find({});
    let deletedCount = 0;
    
    const chinesePattern = /[\u4e00-\u9fff]/;

    for (const c of cases) {
      let hasChinese = false;
      if (c.analysisResult?.reasoning && chinesePattern.test(c.analysisResult.reasoning)) {
        hasChinese = true;
      }
      if (c.analysisResult?.keywords) {
        for (const k of c.analysisResult.keywords) {
          if (chinesePattern.test(k)) {
            hasChinese = true;
            break;
          }
        }
      }

      if (hasChinese) {
        console.log(`Deleting case ${c._id} due to Chinese characters: ${c.analysisResult.reasoning}`);
        await SchoolViolenceCase.deleteOne({ _id: c._id });
        deletedCount++;
      }
    }

    console.log(`Deleted ${deletedCount} cases containing Chinese characters.`);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

cleanup();