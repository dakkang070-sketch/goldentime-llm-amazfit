const logger = require("../utils/logger");
const axios = require("axios");

// MOCK_TRANSCRIPTS removed to prevent accidental usage
const MOCK_TRANSCRIPTS = [];

class MockSttService {
  async transcribe(audioBase64, hintText = null) {
    logger.info(
      `[SttService] Processing audio data (length: ${audioBase64 ? audioBase64.length : 0})`,
    );

    // 1. Try Real STT (Whisper via Python Inference Server)
    if (audioBase64) {
      try {
        const response = await axios.post("http://localhost:5001/transcribe", {
          audioBase64,
        });

        if (response.data && response.data.text) {
          logger.info(`[RealSTT] Transcribed: "${response.data.text}"`);
          // Return the full response which includes analysis if available
          return {
            text: response.data.text,
            analysis: response.data.analysis,
            audio_features: response.data.audio_features
          };
        }
      } catch (error) {
        logger.warn(
          `[RealSTT] Failed to transcribe via Python server, falling back to Mock: ${error.message}`,
        );
      }
    }

    // 2. Mock Fallback (Removed random offensive texts)
    logger.warn("[SttService] Inference server unreachable. Returning fallback message.");
    return {
      text: "(음성 인식 서버 연결 실패 - 실제 분석을 위해서는 Inference Server를 실행해주세요)",
      analysis: null,
      audio_features: null
    };
  }
}

module.exports = new MockSttService();
