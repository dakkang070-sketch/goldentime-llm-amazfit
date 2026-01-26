const axios = require("axios");

async function testChineseFilter() {
  try {
    console.log("🚀 Testing Chinese Filter and AI Analysis...");
    const payload = {
      transcript: "야 이 새끼야 돈 내놔!",
      location: "테스트 위치",
      studentId: "테스트 학생",
      biometrics: { heartRate: 120, stressLevel: 80 }
    };

    const response = await axios.post("http://localhost:5000/api/school-violence/report", payload);
    
    console.log("✅ Response Status:", response.status);
    console.log("✅ Analysis Result:", JSON.stringify(response.data.data.analysisResult, null, 2));

    const reasoning = response.data.data.analysisResult.reasoning;
    const keywords = response.data.data.analysisResult.keywords;

    // Check for Chinese characters
    const chinesePattern = /[\u4e00-\u9fff]/;
    if (chinesePattern.test(reasoning)) {
      console.error("❌ FAILED: Chinese characters found in reasoning!");
    } else {
      console.log("✅ PASSED: No Chinese characters in reasoning.");
    }

    if (keywords.some(k => chinesePattern.test(k))) {
      console.error("❌ FAILED: Chinese characters found in keywords!");
    } else {
      console.log("✅ PASSED: No Chinese characters in keywords.");
    }

    // Check if it's Korean
    const koreanPattern = /[가-힣]/;
    if (koreanPattern.test(reasoning)) {
      console.log("✅ PASSED: Reasoning contains Korean.");
    } else {
      console.warn("⚠️ WARNING: Reasoning might not contain Korean.");
    }

  } catch (error) {
    console.error("❌ Error:", error.response ? error.response.data : error.message);
  }
}

testChineseFilter();
