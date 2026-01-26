const mongoose = require("mongoose");

const schoolViolenceCaseSchema = new mongoose.Schema({
  studentId: {
    type: String, // Changed from ObjectId to String to support device IDs or student IDs
    required: false,
  },
  location: {
    lat: Number,
    lng: Number,
    address: String,
  },
  transcript: {
    type: String,
    required: true,
  },
  audioUrl: String, // Path to saved audio file
  detectedAt: {
    type: Date,
    default: Date.now,
  },
  analysisResult: {
    category: {
      type: String,
      enum: [
        "Physical Violence",
        "Verbal Abuse",
        "Bullying",
        "Prank",
        "Normal",
        "Intimidation",
        "Conflict",
        "Emergency",
        "Cyber Bullying",
        "Hierarchical Violence",
        "Threat/Coercion",
        "Extortion",
        "Sexual Harassment",
        "Uncertain",
        // Korean Mappings
        "금품 갈취",
        "신체 폭력",
        "언어 폭력",
        "협박 및 강요",
        "일상 대화",
        "따돌림", // Bullying
        "장난", // Prank
        "위협", // Intimidation
        "사이버 괴롭힘", // Cyber Bullying
        "성희롱", // Sexual Harassment
        "서열 폭력", // Hierarchical Violence
        "기타", // Uncertain
        "분석실패" // Analysis Failed
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ["Critical", "Warning", "Caution", "Normal", "Uncertain"], // Critical -> Police
      required: true,
    },
    confidence: Number,
    reasoning: String,
    primaryEmotion: String, // Added for frontend display
    keywords: [String],
    audioFeatures: {
      pitch: Number,
      volume: Number,
      speed: Number,
      emotion: String,
      backgroundNoise: String,
      speakerCount: Number,
      intensity: String,
      max_rms: Number,
      mean_rms: Number,
      zcr: Number,
      centroid: Number
    },
  },
  status: {
    type: String,
    enum: ["Reported", "Police Dispatched", "Resolved", "False Alarm"],
    default: "Reported",
  },
  policeReportedAt: Date,
  policeResponse: String,
  biometrics: {
    heartRate: Number,
    stressLevel: Number, // 0-100
    movementIntensity: Number, // 0-10
  },
  // Feedback Loop for MLOps
  feedback: {
    isCorrect: { type: Boolean, default: null }, // null: unreviewed, true: correct, false: incorrect
    correctedCategory: String, // If incorrect, what was it?
    correctedSeverity: String,
    comment: String,
    reviewedAt: Date,
  },
  trainingData: {
    isExported: { type: Boolean, default: false }, // Has been exported to training set
    exportedAt: Date,
  },
});

module.exports = mongoose.model("SchoolViolenceCase", schoolViolenceCaseSchema);
