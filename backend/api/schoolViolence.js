const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const schoolViolenceService = require("../services/schoolViolenceDetectionService");
const sttService = require("../services/mockSttService");
const logger = require("../utils/logger");
const SchoolViolenceCase = require("../models/SchoolViolenceCase");

// Report an incident with Audio (Watch -> STT -> Analysis)
router.post("/report-audio", async (req, res) => {
  try {
    const { audioBase64, location, studentId, biometrics, hintText } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: "Audio data is required" });
    }

    // Save Audio File
    const uploadsDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const fileName = `audio_${Date.now()}.webm`;
    const filePath = path.join(uploadsDir, fileName);
    const buffer = Buffer.from(audioBase64, "base64");
    
    await fs.promises.writeFile(filePath, buffer);
    const audioUrl = `/uploads/${fileName}`;

    // 1. Transcribe Audio
    const sttResult = await sttService.transcribe(audioBase64, hintText);
    
    let transcript = "";
    let preComputedAnalysis = null;
    let audioFeatures = null;

    if (typeof sttResult === 'object' && sttResult.text) {
        transcript = sttResult.text;
        preComputedAnalysis = sttResult.analysis;
        audioFeatures = sttResult.audio_features;
    } else {
        transcript = sttResult;
    }

    // 2. Analyze Situation
    const result = await schoolViolenceService.analyzeSituation({
      transcript,
      location,
      studentId,
      audioUrl: audioUrl,
      biometrics,
      preComputedAnalysis, // Pass it to avoid double analysis
      audioFeatures // Pass extracted audio features
    });

    res.json({ success: true, data: result, transcript });
  } catch (error) {
    logger.error("Error in audio report:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Report an incident (Direct Text)
router.post("/report", async (req, res) => {
  try {
    const { transcript, location, studentId, audioUrl, biometrics } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: "Transcript is required" });
    }

    const result = await schoolViolenceService.analyzeSituation({
      transcript,
      location,
      studentId,
      audioUrl,
      biometrics,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error("Error in school violence report:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const modelTrainingService = require("../services/modelTrainingService");

// Delete all cases (for testing)
router.delete("/cases", async (req, res) => {
  try {
    await SchoolViolenceCase.deleteMany({});
    res.json({ success: true, message: "All school violence cases deleted" });
  } catch (error) {
    logger.error("Error deleting cases:", error);
    res.status(500).json({ error: "Failed to delete cases" });
  }
});

// Get recent cases (for Dashboard)
router.get("/cases", async (req, res) => {
  try {
    const cases = await schoolViolenceService.getRecentCases();
    res.json({ success: true, data: cases });
  } catch (error) {
    logger.error("Error fetching school violence cases:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- MLOps Endpoints ---

// Submit Feedback (Human-in-the-loop)
router.post("/cases/:id/feedback", async (req, res) => {
  try {
    const { isCorrect, correctedCategory, correctedSeverity, comment } =
      req.body;
    const result = await modelTrainingService.submitFeedback(req.params.id, {
      isCorrect,
      correctedCategory,
      correctedSeverity,
      comment,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error("Error submitting feedback:", error);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

// Trigger Data Export (Prepare for Fine-tuning)
router.post("/training/export", async (req, res) => {
  try {
    const result = await modelTrainingService.generateTrainingDataset();
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error("Error exporting training data:", error);
    res.status(500).json({ error: "Export failed" });
  }
});

module.exports = router;
