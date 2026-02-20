const SchoolViolenceCase = require("../models/SchoolViolenceCase");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

class ModelTrainingService {
  constructor() {
    this.exportPath = path.join(
      __dirname,
      "../data/school_violence_training_data.jsonl",
    );
  }

  /**
   * Submit human feedback for a case
   */
  async submitFeedback(caseId, feedbackData) {
    try {
      const { isCorrect, correctedCategory, correctedSeverity, comment } =
        feedbackData;

      const caseItem = await SchoolViolenceCase.findById(caseId);
      if (!caseItem) throw new Error("Case not found");

      caseItem.feedback = {
        isCorrect,
        correctedCategory: isCorrect ? null : correctedCategory,
        correctedSeverity: isCorrect ? null : correctedSeverity,
        comment,
        reviewedAt: new Date(),
      };

      // If marked as False Alarm via feedback, update status too
      if (
        isCorrect === false &&
        (correctedCategory === "Prank" || correctedCategory === "Normal")
      ) {
        caseItem.status = "False Alarm";
      }

      await caseItem.save();
      logger.info(`[MLOps] Feedback saved for case ${caseId}`);
      return caseItem;
    } catch (error) {
      logger.error(`[MLOps] Error saving feedback: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export reviewed cases to JSONL format for LLM Fine-tuning
   * Target Format: Alpaca or ChatML style
   */
  async generateTrainingDataset() {
    try {
      // Find cases that have been reviewed but not yet exported
      const candidates = await SchoolViolenceCase.find({
        "feedback.reviewedAt": { $exists: true },
        "trainingData.isExported": { $ne: true },
      });

      if (candidates.length === 0) {
        return { count: 0, message: "No new reviewed cases to export." };
      }

      const jsonlLines = candidates.map((c) => {
        const finalCategory = c.feedback.isCorrect
          ? c.analysisResult.category
          : c.feedback.correctedCategory;
        const finalSeverity = c.feedback.isCorrect
          ? c.analysisResult.severity
          : c.feedback.correctedSeverity;

        // Construct the ideal prompt and completion
        // Using a standard instruction format
        const systemPrompt =
          "You are an expert in detecting school violence from audio transcripts and biometrics.";
        const userPrompt = `Analyze this situation:\nTranscript: "${c.transcript}"\nBiometrics: HR=${c.biometrics?.heartRate || "N/A"}, Stress=${c.biometrics?.stressLevel || "N/A"}`;

        const idealResponse = JSON.stringify({
          category: finalCategory,
          severity: finalSeverity,
          reasoning: c.feedback.comment || c.analysisResult.reasoning, // Use human comment if available as reasoning
        });

        return JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
            { role: "assistant", content: idealResponse },
          ],
        });
      });

      // Append to file
      fs.appendFileSync(this.exportPath, jsonlLines.join("\n") + "\n");

      // Mark as exported
      const ids = candidates.map((c) => c._id);
      await SchoolViolenceCase.updateMany(
        { _id: { $in: ids } },
        {
          $set: {
            "trainingData.isExported": true,
            "trainingData.exportedAt": new Date(),
          },
        },
      );

      logger.info(
        `[MLOps] Exported ${candidates.length} cases to ${this.exportPath}`,
      );
      return { count: candidates.length, path: this.exportPath };
    } catch (error) {
      logger.error(`[MLOps] Export failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new ModelTrainingService();
