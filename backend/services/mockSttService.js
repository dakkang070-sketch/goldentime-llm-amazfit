const logger = require("../utils/logger");
const axios = require("axios");

const MOCK_TRANSCRIPTS = [
  "야 이 새끼야 돈 내놓으라고 했지? 뒤지고 싶냐?",
  "제발 그만해... 나한테 왜 그래...",
  "이번 달 상납금 안 가져왔어? 맞고 시작할래?",
  "아 진짜 짜증나게 하네. 빵 좀 사오라고.",
  "너 오늘 학교 끝나고 옥상으로 따라와.",
  "너네 부모님 뭐하시냐? ㅋㅋㅋ",
  "야 찐따야, 매점 가서 빵 하나만 사와라. 돈은 나중에 줄게.",
  // Non-violence cases for variety
  "야 오늘 점심 뭐 나오냐? 배고프다.",
  "선생님 저 이번 문제 잘 모르겠어요.",
  "축구 하러 갈 사람? 운동장으로 모여.",
  "이번 주말에 PC방 갈래?",
  "아 숙제 안 했는데 어떡하지...",
];

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

    // 2. Mock Fallback
    // Simulate processing delay
    await new Promise((resolve) =>
      setTimeout(resolve, 500 + Math.random() * 1000),
    );

    // If a hint text is provided (for simulation), return it.
    if (hintText) {
      logger.info(
        `[MockSTT] Using hint text: "${hintText.substring(0, 50)}..."`,
      );
      return hintText;
    }

    // In a real scenario, we would send audio to Whisper API or similar.
    // Here we just pick a random transcript.
    const transcript =
      MOCK_TRANSCRIPTS[Math.floor(Math.random() * MOCK_TRANSCRIPTS.length)];

    logger.info(`[MockSTT] Transcribed: "${transcript}"`);
    return transcript;
  }
}

module.exports = new MockSttService();
