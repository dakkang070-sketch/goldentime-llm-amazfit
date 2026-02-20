import React, { useState, useRef } from "react";
import {
  Mic,
  StopCircle,
  Send,
  Play,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Heart,
  Activity,
  X,
} from "lucide-react";

const MobileRecorder = ({ onBack }: { onBack?: () => void }) => {
  const [name, setName] = useState("홍길동");
  const [age, setAge] = useState("17");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [mimeType, setMimeType] = useState<string>("");
  const [sentBiometrics, setSentBiometrics] = useState<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Random Korean Name Generator
  const generateRandomIdentity = () => {
    const lastNames = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "류", "전"];
    const firstNames = ["민준", "서준", "도윤", "예준", "시우", "하준", "주원", "지호", "지후", "준우", "서윤", "서연", "지우", "하은", "지아", "수아", "하윤", "민서", "채원", "지유"];
    
    const randomLast = lastNames[Math.floor(Math.random() * lastNames.length)];
    const randomFirst = firstNames[Math.floor(Math.random() * firstNames.length)];
    const randomAge = Math.floor(Math.random() * (19 - 13 + 1)) + 13; // 13-19세
    
    return {
      name: `${randomLast}${randomFirst}`,
      age: randomAge.toString()
    };
  };

  const startRecording = async () => {
    // Generate new identity for each recording session
    const newIdentity = generateRandomIdentity();
    setName(newIdentity.name);
    setAge(newIdentity.age);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine supported MIME type
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/wav",
      ];

      const supportedType =
        mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
      setMimeType(supportedType);

      const options = supportedType
            ? {
                mimeType: supportedType,
                audioBitsPerSecond: 128000, // Increased to 128kbps for better STT accuracy
              }
            : undefined;
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: supportedType || "audio/webm",
        });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Automatically submit the recording
        handleSubmit(blob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setResult(null);
      setSentBiometrics(null);

      // Auto stop after 3 minutes
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
          alert("최대 녹음 시간(3분)이 초과되어 녹음이 자동 종료됩니다.");
        }
      }, 180000); // 3 minutes
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("마이크 접근 권한이 필요합니다. 설정에서 권한을 허용해주세요.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop all tracks
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  const generateRandomBiometrics = () => {
    return {
      heartRate: Math.floor(Math.random() * (110 - 65 + 1)) + 65, // Normal range
      stressLevel: Math.floor(Math.random() * (70 - 20 + 1)) + 20, // Normal to moderate stress
      movementIntensity: parseFloat((Math.random() * 5).toFixed(1)), // Moderate movement
      timestamp: new Date().toISOString(),
    };
  };

  const handleSubmit = async (blobToSubmit?: Blob) => {
    const blob = blobToSubmit || audioBlob;
    if (!blob) return;

    // Check file size (Client-side check)
    const fileSizeMB = blob.size / (1024 * 1024);
    if (fileSizeMB > 10) {
      alert("파일 크기가 너무 큽니다 (10MB 제한). 짧게 녹음해주세요.");
      return;
    }

    setIsAnalyzing(true);

    try {
      // User Request: Use random biometrics only, do not map to audio
      const biometrics = generateRandomBiometrics();
      setSentBiometrics(biometrics);

      // Convert Blob to Base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(",")[1];

        try {
          // Use fetch directly to ensure we hit the correct endpoint
          const response = await fetch("/api/school-violence/report-audio", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              audioBase64: base64Audio,
              studentId: `${name}(${age}세)`,
              location: {
                lat: 37.5665,
                lng: 126.978,
                address: "모바일 신고 접수",
              },
              biometrics: biometrics,
            }),
          });

          const data = await response.json();

          if (response.ok) {
            setResult(data);
            alert("분석이 완료되었습니다. 관제 시스템에 등록되었습니다.");
          } else {
            console.error("Server error:", data);
            alert(`분석 실패: ${data.error || "서버 오류가 발생했습니다."}`);
          }
        } catch (error) {
          console.error("Analysis failed:", error);
          alert(
            "분석 요청 중 네트워크 오류가 발생했습니다. 연결을 확인해주세요."
          );
        } finally {
          setIsAnalyzing(false);
        }
      };
    } catch (error) {
      console.error("Error processing audio:", error);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-0 sm:p-8 font-sans">
      <div className="w-full max-w-[400px] bg-black text-white h-[100dvh] sm:h-[800px] sm:max-h-[90vh] sm:rounded-[3rem] sm:border-[8px] sm:border-zinc-800 shadow-2xl overflow-hidden relative flex flex-col">
        {/* Notch simulation for desktop */}
        <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-zinc-800 rounded-b-xl z-50"></div>

        <div className="flex-1 flex flex-col overflow-hidden w-full h-full relative">
          <header className="shrink-0 px-5 pt-4 pb-4 sm:pt-6 flex items-center justify-between border-b border-zinc-900 z-10 bg-black/80 backdrop-blur-md">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <ShieldAlert className="text-red-500 w-5 h-5" />
              골든타임 모바일 신고
            </h1>
            <div className="flex items-center gap-2">
              <div className="text-[10px] px-2 py-0.5 bg-zinc-900 rounded border border-zinc-800 text-zinc-400">
                테스트
              </div>
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </header>

          <main className="flex-1 flex flex-col gap-4 overflow-y-auto p-5 pb-8 scrollbar-hide">

            {/* Recording Section */}
            <section className="shrink-0 min-h-[220px] flex flex-col items-center justify-center bg-zinc-900/30 rounded-2xl border border-zinc-800 relative overflow-hidden p-6">
              {isRecording && (
                <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                  <div className="w-32 h-32 bg-red-500 rounded-full animate-ping"></div>
                </div>
              )}

              <div className="z-10 flex flex-col items-center gap-4 mb-2">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    isRecording
                      ? "bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] scale-110"
                      : "bg-zinc-800 text-red-500 border-2 border-zinc-700 hover:border-red-500"
                  }`}
                >
                  {isRecording ? (
                    <StopCircle className="w-10 h-10" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>
                <div className="text-center">
                  <p
                    className={`font-mono text-lg ${
                      isRecording ? "text-red-500 animate-pulse" : "text-zinc-500"
                    }`}
                  >
                    {isRecording ? "녹음 중..." : "녹음 준비"}
                  </p>
                </div>
              </div>

              {audioUrl && !isRecording && (
                <div className="w-full mt-4 bg-black/80 p-3 rounded-lg border border-zinc-800 flex flex-col gap-2 z-20">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span>형식: {mimeType.split(";")[0]} (Opus)</span>
                    <span>
                      크기: {((audioBlob?.size || 0) / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <audio src={audioUrl} controls className="w-full h-8" />
                </div>
              )}
            </section>

            {/* Status & Analysis Info */}
            {!isRecording && isAnalyzing && (
              <div className="shrink-0 w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 bg-red-600/20 text-red-500 border border-red-500/30 animate-pulse">
                <Loader2 className="w-6 h-6 animate-spin" />
                서버로 자동 전송 및 분석 중...
              </div>
            )}

            {!isRecording && !isAnalyzing && audioBlob && !result && (
              <div className="shrink-0 w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-zinc-900 text-zinc-400 border border-zinc-800">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                전송 완료 (분석 결과를 기다려주세요)
              </div>
            )}

            {/* Result Section */}
            {result && (
              <div className="shrink-0 mt-2 animate-in slide-in-from-bottom-4 duration-500 pb-4">
                <div
                  className={`p-5 rounded-2xl border ${
                    result.data?.analysisResult?.severity === "Critical"
                      ? "bg-red-950/30 border-red-500/50"
                      : result.data?.analysisResult?.severity === "Warning"
                      ? "bg-orange-950/30 border-orange-500/50"
                      : "bg-green-950/30 border-green-500/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">분석 결과</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        result.data?.analysisResult?.severity === "Critical"
                          ? "bg-red-500 text-white"
                          : result.data?.analysisResult?.severity === "Warning" || result.data?.analysisResult?.severity === "Caution"
                          ? "bg-orange-500 text-white"
                          : "bg-green-500 text-white"
                      }`}
                    >
                      {result.data?.analysisResult?.severity === "Critical" ? "긴급 🚨" : 
                       result.data?.analysisResult?.severity === "Warning" || result.data?.analysisResult?.severity === "Caution" ? "주의 ⚠️" : 
                       result.data?.analysisResult?.severity === "Normal" ? "정상 🟢" : "분석됨"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-black/40 p-3 rounded-lg">
                      <span className="text-xs text-zinc-500 block mb-1">
                        감지된 상황
                      </span>
                      <p className="font-medium text-white">
                        {result.data?.analysisResult?.category || "-"}
                      </p>
                    </div>

                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                      <h3 className="text-sm font-bold text-zinc-400 mb-2">
                        AI 상황 분석
                      </h3>
                      <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {(() => {
                          const reasoning = result.data?.analysisResult?.reasoning;
                          if (!reasoning) return "-";
                          if (typeof reasoning === 'object') {
                            if (reasoning.situation || reasoning.psychology) {
                              return `[상황 분석]: ${reasoning.situation || ''}\n[심리 분석]: ${reasoning.psychology || ''}\n[위험 요소]: ${reasoning.danger || ''}`;
                            }
                            return JSON.stringify(reasoning, null, 2);
                          }
                          return reasoning;
                        })()}
                      </div>
                    </div>

                    <div className="bg-black/40 p-3 rounded-lg">
                      <span className="text-xs text-zinc-500 block mb-1">
                        전송된 생체 데이터
                      </span>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1.5 text-red-400">
                          <Heart className="w-3.5 h-3.5" />
                          <span className="text-sm">
                            {sentBiometrics?.heartRate || 0} BPM
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-orange-400">
                          <Activity className="w-3.5 h-3.5" />
                          <span className="text-sm">
                            스트레스 {sentBiometrics?.stressLevel || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {result.transcript && (
                      <div className="bg-black/40 p-3 rounded-lg">
                        <span className="text-xs text-zinc-500 block mb-1">
                          음성 인식 결과 (STT)
                        </span>
                        <p className="text-xs text-zinc-400 italic">
                          "{result.transcript.replace(/<\|.*?\|>/g, '').replace(/\[keywords\]\s*:\s*.*$/gim, '').replace(/\[키워드\]\s*:\s*.*$/gim, '').trim()}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Spacer for bottom safe area */}
            <div className="h-8 shrink-0 sm:hidden"></div>
          </main>
        </div>

        {/* Home Indicator simulation */}
        <div className="hidden sm:block absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-800 rounded-full pointer-events-none z-50"></div>
      </div>
    </div>
  );
};

export default MobileRecorder;
