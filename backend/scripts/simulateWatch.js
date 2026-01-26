const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_URL = "http://localhost:5000/api/school-violence/report";
const API_AUDIO_URL = "http://localhost:5000/api/school-violence/report-audio";

// Load dataset
const datasetPath = path.join(
  __dirname,
  "../data/school_violence_dataset.json",
);
const scenarios = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));

console.log(`📚 Loaded ${scenarios.length} scenarios from dataset.`);

// Generate mock audio base64 (1 second of silence)
const generateMockAudio = () => {
  return "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
};

// Select a random scenario
function getRandomScenario() {
  return scenarios[Math.floor(Math.random() * scenarios.length)];
}

async function runSimulation() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let count = 1; // Default count
  let mode = "text"; // Default mode

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--count" && args[i + 1]) {
      count = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--audio") {
      mode = "audio";
    } else if (!isNaN(parseInt(args[i]))) {
      count = parseInt(args[i], 10);
    }
  }

  console.log(`🚀 Starting simulation: ${count} cases (Mode: ${mode})...`);

  for (let i = 0; i < count; i++) {
    const scenario = getRandomScenario();
    const isAudio = mode === "audio";

    const transcript = scenario.text || scenario.transcript;

    // Simulate biometrics
    const biometrics = {
      heartRate: 60 + Math.floor(Math.random() * 60),
      stressLevel: Math.floor(Math.random() * 100),
      movementIntensity: Math.floor(Math.random() * 10),
    };

    // If scenario implies violence/stress, boost biometrics
    if (
      scenario.category !== "Normal" &&
      scenario.category !== "Prank" &&
      scenario.category !== "Emergency"
    ) {
      biometrics.heartRate += 40;
      biometrics.stressLevel = 80 + Math.floor(Math.random() * 20);
    }

    const payload = {
      location: {
        lat: 37.5665 + (Math.random() - 0.5) * 0.01,
        lng: 126.978 + (Math.random() - 0.5) * 0.01,
        address: "Seoul, Korea",
      },
      studentId: "STU-" + Math.floor(Math.random() * 10000),
      biometrics,
    };

    try {
      let response;
      if (isAudio) {
        console.log(
          `🎤 Reporting AUDIO case: "${transcript.substring(0, 30)}..."`,
        );
        response = await axios.post(API_AUDIO_URL, {
          ...payload,
          audioBase64: generateMockAudio(),
          hintText: transcript, // Pass transcript as hint for Mock STT
        });
      } else {
        console.log(
          `📝 Reporting TEXT case: "${transcript.substring(0, 30)}..."`,
        );
        response = await axios.post(API_URL, {
          ...payload,
          transcript: transcript,
        });
      }

      console.log(
        `✅ Case reported! ID: ${response.data.data._id} | Analysis: ${response.data.data.analysisResult.category} (${response.data.data.analysisResult.severity})`,
      );
    } catch (error) {
      console.error(
        "❌ Report failed:",
        error.response ? error.response.data : error.message,
      );
    }

    // Small delay between cases
    if (i < count - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

runSimulation();
