import React, { useState, useEffect, memo, useMemo, useRef, useCallback } from "react";
import {
  ShieldAlert,
  Siren,
  MapPin,
  Volume2,
  CheckCircle2,
  Clock,
  User,
  Users,
  Loader2,
  Activity,
  Heart,
  BrainCircuit,
  Shield,
  Gauge,
  Cpu,
  Droplets,
  Waves,
  XCircle,
  Watch,
  Mic,
  Play,
  Pause,
  Thermometer,
  Moon,
  Move,
  ActivitySquare,
} from "lucide-react";
import CrimeMap from "./CrimeMap";
import VitalsChart from "./VitalsChart";
import ErrorBoundary from "./ErrorBoundary";
import { apiService } from "../services/apiService";
import { socketService } from "../services/socketService";

const AudioPlayer = ({ url, initialDuration = 0 }: { url: string; initialDuration?: number }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Reset state when URL changes
  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setDuration(initialDuration || 0);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.load();
    }
  }, [url, initialDuration]);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error("Audio playback error:", error);
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const current = e.currentTarget.currentTime;
    const dur = e.currentTarget.duration;
    setCurrentTime(current);
    
    if (Number.isFinite(dur) && dur > 0) {
      setDuration(dur);
      setProgress((current / dur) * 100);
    } else if (initialDuration > 0) {
      // Fallback to initialDuration if metadata duration is invalid
      // This happens with WebM files from MediaRecorder
      setDuration(initialDuration);
      setProgress((current / initialDuration) * 100);
    } else {
      // Handle cases where duration is Infinity and no initialDuration
      // We can't calculate progress percentage accurately without duration
      setDuration(0); 
      setProgress(0);
    }
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const dur = e.currentTarget.duration;
    if (Number.isFinite(dur) && dur > 0) {
      setDuration(dur);
    } else if (initialDuration > 0) {
      setDuration(initialDuration);
    } else {
      // If duration is Infinity, we might need to fetch the file blob to get duration
      // or just accept it's a stream-like file.
      // For now, setting to 0 to avoid Infinity display
      setDuration(0);
    }
  };

  const formatTime = (time: number) => {
    if (!time || !Number.isFinite(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mt-3 bg-zinc-950/80 rounded-xl border border-zinc-800/50 p-2 flex items-center gap-3 relative overflow-hidden group">
      {/* Background Visualizer Effect */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none gap-0.5">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={`w-1 bg-white rounded-full transition-all duration-300 ${isPlaying ? "animate-pulse" : "h-1"}`}
            style={{
              height: isPlaying ? `${Math.random() * 100}%` : "4px",
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>

      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onError={(e) => console.error("Audio loading error:", e.currentTarget.error, url)}
        className="hidden"
      />
      <button
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center hover:bg-indigo-500 hover:text-white text-indigo-400 transition-all shrink-0 z-10"
      >
        {isPlaying ? (
          <Pause className="w-3.5 h-3.5 fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col justify-center gap-1.5 z-10 min-w-0">
        <div className="flex justify-between items-end">
          <span className="text-[10px] text-zinc-400 font-mono tracking-wider flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${isPlaying ? "bg-red-500 animate-pulse" : "bg-zinc-600"}`}
            ></div>
            음성 증거물
          </span>
          <span className="text-[10px] text-zinc-500 font-mono tracking-tight">
            {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : "--:--"}
          </span>
        </div>
        <div
          className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden cursor-pointer"
          onClick={(e) => {
            if (!audioRef.current || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percent = x / rect.width;
            if (Number.isFinite(duration)) {
               audioRef.current.currentTime = percent * duration;
            }
          }}
        >
          <div
            className="h-full bg-indigo-500 rounded-full relative transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Interface for School Violence Case
interface SchoolViolenceCase {
  _id: string;
  id?: string; // For frontend compatibility
  studentId?: string;
  name?: string; // Optional as it might not be in DB yet
  age?: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  transcript: string;
  analysisResult: {
    category: string;
    severity: "Critical" | "Normal" | "Caution" | "Warning" | "Uncertain";
    confidence: number;
    reasoning: string;
    primaryEmotion?: string;
    keywords: string[];
    audioFeatures?: {
      pitch: string;
      volume: string;
      speed: string;
      emotion: string;
      backgroundNoise?: string;
      speakerCount?: number;
      duration?: number; // Added duration from backend
    };
  };
  detectedAt: string;
  status: string;
  policeResponse?: string;
  audioUrl?: string;
  biometrics?: {
    heartRate: number;
    stressLevel: number; // 0-100
    movementIntensity: number; // 0-10
    bloodPressure?: string;
    spo2?: number;
    sleep?: string;
    bodyTemp?: number;
    glucose?: number;
    hrv?: number;
    ecg?: string;
    gyro?: string;
  };
  matchedAgency?: {
    name: string;
    unitName: string;
    distance: string;
    unitsAvailable: number;
    unitsTotal: number;
  };
}

const BioMetricCard = memo(
  ({
    label,
    value,
    unit,
    icon: Icon,
    color = "text-zinc-400",
    description,
  }: {
    label: string;
    value: string | number | undefined;
    unit?: string;
    icon: any;
    color?: string;
    description: string;
  }) => (
    <div className="relative group w-full">
      <div className="absolute bottom-[calc(100%+8px)] right-0 w-36 p-2 bg-zinc-900/98 border border-zinc-700 text-white rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-[100] backdrop-blur-xl">
        <p className="text-[10px] leading-relaxed font-normal text-zinc-200">
          <span className="block font-normal mb-1 text-white uppercase tracking-widest text-[9px] border-b border-zinc-700 pb-1">
            {label} Info
          </span>
          {description}
        </p>
        <div className="absolute top-full right-4 border-4 border-transparent border-t-zinc-700"></div>
      </div>

      <div className="bg-black/40 h-11 px-3 rounded-xl border border-zinc-900/50 flex items-center justify-between group-hover:border-zinc-700 transition-colors cursor-help relative z-10 w-full">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Icon className={`w-3.5 h-3.5 ${color} opacity-80 shrink-0`} />
          <p className="text-[12px] text-zinc-400 font-light uppercase tracking-tighter truncate">
            {label}
          </p>
        </div>
        <div className="flex items-baseline gap-0.5 ml-2 shrink-0">
          <span className="text-[12px] font-light text-zinc-200">
            {typeof value === "number" && !Number.isFinite(value)
              ? "--"
              : value ?? "--"}
          </span>
          {unit && (
            <span className="text-[10px] text-zinc-500 font-normal uppercase">
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  ),
);

// CrimeCaseCard matching PatientCard structure
const CrimeCaseCard = memo(
  ({
    data,
    onClick,
    isSelected,
  }: {
    data: SchoolViolenceCase;
    onClick: (c: SchoolViolenceCase) => void;
    isSelected: boolean;
  }) => {
    const formatAddress = (addr?: string) => {
      if (!addr) return "주소 정보 없음";
      return addr;
    };

    const category = data.analysisResult?.category || "";
    const severity = data.analysisResult?.severity || "Normal";
    
    // Determine severity based on both backend value and AI category (Same as CrimeMap)
    const criticalCategories = ["금품 갈취", "신체 폭력", "협박 및 강요", "Extortion", "Violence", "Threat"];
    const cautionCategories = ["언어 폭력", "Verbal Abuse"];
    
    const isCritical = severity === "Critical" || criticalCategories.some(cat => category.includes(cat));
    const isCaution = ["Caution", "Warning", "Uncertain"].includes(severity) || cautionCategories.some(cat => category.includes(cat));

    const displaySeverity = isCritical ? "Critical" : isCaution ? "Caution" : "Normal";

    const isResolved = ["Resolved", "False Alarm"].includes(data.status);

    return (
      <div
        onClick={() => onClick(data)}
        className={`p-2 rounded-xl border transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col gap-1.5 will-change-transform ${
          isSelected
            ? "bg-zinc-900 border-zinc-700 shadow-xl scale-[1.01] z-10"
            : "bg-zinc-900/40 border-zinc-900 hover:border-zinc-800"
        }`}
        style={{ minHeight: "100px" }}
      >
        <div className="flex items-start gap-2.5">
          <div className="relative w-9 h-9 shrink-0">
            <div className="w-full h-full rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900">
              <img
                src={`https://i.pravatar.cc/150?u=${data.id || data._id}`}
                alt={data.name}
                className="w-full h-full object-cover grayscale-[0.2]"
                loading="lazy"
              />
            </div>
            {isCritical && (
              <div className={`absolute inset-0 bg-red-900/20 flex items-center justify-center rounded-lg`}>
                <Siren className={`w-5 h-5 text-red-500 animate-pulse`} />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center -mb-0.5">
              <h3 className="font-normal text-white text-[14px] tracking-tighter truncate">
                {data.name}
              </h3>
              <span
                className={`text-[14px] font-mono font-normal w-12 text-right ${data.biometrics?.heartRate && data.biometrics.heartRate > 100 ? "text-red-500/90" : "text-zinc-400"}`}
              >
                {Math.round(data.biometrics?.heartRate || 0) || "--"}
              </span>
            </div>

            <div className="flex flex-col gap-0">
              <div className="flex items-center gap-1.5 text-zinc-300">
                <span className="text-[13px] font-normal whitespace-nowrap">
                  {data.age}세
                </span>
                <div className="flex items-center gap-1 text-blue-500/70">
                  <Activity className="w-3 h-3" />
                  <span className="text-[13px] font-normal">
                    {data.biometrics?.stressLevel || 0}%
                  </span>
                </div>
                {data.audioUrl && (
                  <div className="flex items-center gap-1 text-purple-500/70 ml-2">
                    <Watch className="w-3 h-3" />
                    <span className="text-[10px] font-normal uppercase">
                      Watch Rec
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-zinc-400 pl-0.5 -mt-0.5">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="text-[12px] font-normal truncate tracking-tighter">
            {formatAddress(data.location?.address)}
          </span>
        </div>

        <div className="mt-auto h-7 flex flex-col justify-end">
          {isResolved ? (
            <div className="bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-[12px] font-normal text-green-500 uppercase tracking-wider">
              상황 종결
            </span>
          </div>
          <span className="text-[10px] text-green-600/70 font-mono">
            완료
          </span>
            </div>
          ) : displaySeverity === "Caution" ||
            displaySeverity === "Critical" ? (
            <div className="flex items-center justify-between bg-zinc-950/40 px-2 py-1 rounded-lg border border-zinc-800/50">
              <span
                className={`text-[12px] font-normal uppercase tracking-widest ${
                  displaySeverity === "Caution"
                    ? "text-yellow-400"
                    : "text-red-500"
                }`}
              >
                {displaySeverity === "Caution"
                    ? "주의 요망"
                    : "긴급 상황"}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                분석 완료
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-zinc-950/40 px-2 py-1 rounded-lg border border-zinc-800/50 border-dashed">
              <span className="text-[12px] text-zinc-500 font-normal uppercase tracking-widest">
                정상 상태
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                관찰 중
              </span>
            </div>
          )}
        </div>
        <style>{`
        @keyframes card-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
      </div>
    );
  },
);

const CrimeDashboard: React.FC<{ initialSelectedCaseId?: string }> = ({ initialSelectedCaseId }) => {
  const [cases, setCases] = useState<SchoolViolenceCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<SchoolViolenceCase | null>(
    null,
  );
  const selectedCaseIdRef = useRef<string | null>(null);
  const hasAppliedInitialSelectionRef = useRef(false);
  const [activeTab, setActiveTab] = useState<"active" | "resolved">("active");
  const [feedbackMode, setFeedbackMode] = useState<string | null>(null); // 'correct' | 'incorrect'
  const [correctionCategory, setCorrectionCategory] = useState("Normal");
  const [correctionReason, setCorrectionReason] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isVitalsExpanded, setIsVitalsExpanded] = useState(false);
  const [isAgencyExpanded, setIsAgencyExpanded] = useState(false);
  
  // Vitals Data for Chart
  const [vitalsData, setVitalsData] = useState<{ time: string; hr: number; stress: number }[]>([]);

  // Generate mock history data when case is selected
  useEffect(() => {
    if (selectedCase?.biometrics) {
      const baseHr = selectedCase.biometrics.heartRate || 80;
      const baseStress = selectedCase.biometrics.stressLevel || 20;
      
      const data = [];
      const now = new Date();
      for (let i = 19; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 2000); // 2 seconds interval
        const randomHr = Math.round(baseHr + (Math.random() * 10 - 5));
        const randomStress = Math.round(Math.min(100, Math.max(0, baseStress + (Math.random() * 10 - 5))));
        
        data.push({
          time: time.toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
          hr: randomHr,
          stress: randomStress
        });
      }
      setVitalsData(data);
    }
  }, [selectedCase?.id, selectedCase?._id]);

  useEffect(() => {
    selectedCaseIdRef.current =
      selectedCase?.id || selectedCase?._id || null;
  }, [selectedCase]);

  // Mock Police Stations
  const MOCK_POLICE_STATIONS = useMemo(() => [
    { id: "ps-1", name: "중부경찰서", lat: 37.5636, lng: 126.9896, available: 3 },
    { id: "ps-2", name: "종로경찰서", lat: 37.5755, lng: 126.9848, available: 5 },
    { id: "ps-3", name: "남대문경찰서", lat: 37.5548, lng: 126.9735, available: 2 },
    { id: "ps-4", name: "용산경찰서", lat: 37.5404, lng: 126.9658, available: 4 },
    { id: "ps-5", name: "강남경찰서", lat: 37.5173, lng: 127.0473, available: 6 },
    { id: "ps-6", name: "서초경찰서", lat: 37.4836, lng: 127.0327, available: 4 },
    { id: "ps-7", name: "송파경찰서", lat: 37.5110, lng: 127.0980, available: 5 },
    { id: "ps-8", name: "강동경찰서", lat: 37.5300, lng: 127.1238, available: 3 },
    { id: "ps-9", name: "광진경찰서", lat: 37.5386, lng: 127.0825, available: 4 },
    { id: "ps-10", name: "성동경찰서", lat: 37.5633, lng: 127.0366, available: 3 },
    { id: "ps-11", name: "동대문경찰서", lat: 37.5838, lng: 127.0507, available: 4 },
    { id: "ps-12", name: "마포경찰서", lat: 37.5638, lng: 126.9083, available: 5 },
    { id: "ps-13", name: "서대문경찰서", lat: 37.5759, lng: 126.9438, available: 4 },
    { id: "ps-14", name: "은평경찰서", lat: 37.6027, lng: 126.9299, available: 3 },
    { id: "ps-15", name: "노원경찰서", lat: 37.6540, lng: 127.0610, available: 5 },
    { id: "ps-16", name: "도봉경찰서", lat: 37.6687, lng: 127.0471, available: 3 },
    { id: "ps-17", name: "강북경찰서", lat: 37.6388, lng: 127.0276, available: 4 },
    { id: "ps-18", name: "관악경찰서", lat: 37.4764, lng: 126.9516, available: 5 },
    { id: "ps-19", name: "구로경찰서", lat: 37.4946, lng: 126.8878, available: 4 },
    { id: "ps-20", name: "영등포경찰서", lat: 37.5264, lng: 126.8963, available: 6 },
    { id: "ps-21", name: "동작경찰서", lat: 37.5120, lng: 126.9397, available: 4 },
  ], []);

  // Mock Precincts (지구대)
  const MOCK_PRECINCTS = useMemo(() => [
    { id: "pc-1", name: "을지로지구대", lat: 37.5662, lng: 126.9850 },
    { id: "pc-2", name: "명동지구대", lat: 37.5630, lng: 126.9820 },
    { id: "pc-3", name: "소공지구대", lat: 37.5638, lng: 126.9789 },
    { id: "pc-4", name: "광화문지구대", lat: 37.5713, lng: 126.9769 },
    { id: "pc-5", name: "강남지구대", lat: 37.4981, lng: 127.0276 },
    { id: "pc-6", name: "신사지구대", lat: 37.5219, lng: 127.0203 },
    { id: "pc-7", name: "잠실지구대", lat: 37.5101, lng: 127.0850 },
    { id: "pc-8", name: "천호지구대", lat: 37.5406, lng: 127.1245 },
    { id: "pc-9", name: "건대지구대", lat: 37.5402, lng: 127.0719 },
    { id: "pc-10", name: "왕십리지구대", lat: 37.5613, lng: 127.0377 },
    { id: "pc-11", name: "청량리지구대", lat: 37.5864, lng: 127.0474 },
    { id: "pc-12", name: "합정지구대", lat: 37.5490, lng: 126.9104 },
    { id: "pc-13", name: "신촌지구대", lat: 37.5562, lng: 126.9355 },
    { id: "pc-14", name: "연신내지구대", lat: 37.6190, lng: 126.9195 },
    { id: "pc-15", name: "상계지구대", lat: 37.6619, lng: 127.0648 },
    { id: "pc-16", name: "창동지구대", lat: 37.6535, lng: 127.0478 },
    { id: "pc-17", name: "수유지구대", lat: 37.6384, lng: 127.0255 },
    { id: "pc-18", name: "신림지구대", lat: 37.4844, lng: 126.9292 },
    { id: "pc-19", name: "구로지구대", lat: 37.4931, lng: 126.8827 },
    { id: "pc-20", name: "당산지구대", lat: 37.5349, lng: 126.9026 },
    { id: "pc-21", name: "노량진지구대", lat: 37.5123, lng: 126.9418 },
  ], []);

  const handleSelectCase = useCallback((c: SchoolViolenceCase | null) => {
    setSelectedCase(c);
  }, []);

  const handleFeedbackSubmit = async (isCorrect: boolean) => {
    if (!selectedCase) return;

    try {
      if (!selectedCase._id.startsWith("local-")) {
        await apiService.submitSchoolViolenceFeedback(selectedCase._id, {
          isCorrect,
          correctedCategory: isCorrect ? null : correctionCategory,
          correctedSeverity: isCorrect
            ? null
            : correctionCategory === "Normal" || correctionCategory === "Prank"
              ? "Normal"
              : "Critical",
          comment: isCorrect ? "Confirmed by operator" : correctionReason,
        });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Optimistic Update
      const updatedStatus = isCorrect
        ? selectedCase.status
        : correctionCategory === "Normal" || correctionCategory === "Prank"
          ? "False Alarm"
          : selectedCase.status;

      const updatedCase = { ...selectedCase, status: updatedStatus };

      setCases((prev) =>
        prev.map((c) => (c.id === selectedCase.id ? updatedCase : c)),
      );
      setSelectedCase(updatedCase);

      alert(
        "Feedback submitted successfully. This will help improve the AI model.",
      );
      setFeedbackMode(null);
      setCorrectionReason("");
    } catch (e) {
      console.error("Failed to submit feedback", e);
      alert("Failed to submit feedback.");
    }
  };

  const handleExportTrainingData = async () => {
    if (!confirm("Extract verified data for fine-tuning?")) return;
    try {
      setIsExporting(true);
      const res = await apiService.exportTrainingData();
      if (res.success) {
        const data = res.data as { count: number; path: string };
        alert(`Export Complete! ${data.count} cases saved to ${data.path}`);
      } else {
        alert("Export failed or no new data.");
      }
    } catch (e) {
      console.error("Export failed", e);
      alert("Export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  // Pseudo-random generator based on seed string
  const getDeterministicRandom = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    const x = Math.sin(hash) * 10000;
    return x - Math.floor(x);
  };

  useEffect(() => {
    // Fetch real cases from backend
    const fetchCases = async () => {
      try {
        console.log("[CrimeDashboard] Fetching cases...");
        const response = await apiService.getSchoolViolenceCases();
        if (response.success && response.data) {
          // The backend returns { success: true, data: cases }
          // And apiService.request wraps it in another { success: true, data: ... }
          // So we need to handle both cases
          let casesData: any[] = [];
          if (Array.isArray(response.data)) {
            casesData = response.data;
          } else if (response.data && typeof response.data === 'object') {
            const dataObj = response.data as any;
            if (Array.isArray(dataObj.data)) {
              casesData = dataObj.data;
            } else if (Array.isArray(dataObj.cases)) {
              casesData = dataObj.cases;
            }
          }

          console.log(`[CrimeDashboard] Fetched ${casesData.length} cases`);
          // Process and map data to match frontend interface
          const processedCases = casesData.map((c) => {
            // Ensure ID consistency
            const id = c._id || c.id;
            
            // Handle location (string vs object)
            let location = c.location;
            
            // Check if location is default/missing or just a string
            const isDefaultLocation = !location || 
              (typeof location === 'object' && location.lat === 37.5665 && location.lng === 126.978);
            
            if (typeof location === "string" || isDefaultLocation) {
              // Default to Seoul coordinates with deterministic randomness
              const latOffset = (getDeterministicRandom(id + 'lat') * 0.08) - 0.04;
              const lngOffset = (getDeterministicRandom(id + 'lng') * 0.08) - 0.04;
              
              location = {
                lat: 37.5665 + latOffset,
                lng: 126.978 + lngOffset,
                address: typeof location === "string" ? location : c.location?.address || "위치 정보 없음",
              };
            }

            // Parse studentId for name and age if missing
            let name = c.name;
            let age = c.age;
            if (!name && c.studentId && typeof c.studentId === "string") {
              const match = c.studentId.match(/(.*)\((\d+)세\)/);
              if (match) {
                name = match[1];
                age = parseInt(match[2]);
              }
            }

            return {
              ...c,
              _id: id,
              id: id,
              name: name || "미확인",
              age: age || 0,
              location: location || {
                lat: 37.5665,
                lng: 126.978,
                address: "위치 미확인",
              },
              // Ensure biometrics exists and has all fields (mock if missing)
              biometrics: {
                heartRate: c.biometrics?.heartRate || Math.floor(getDeterministicRandom(id + 'hr') * (110 - 60) + 60),
                stressLevel: c.biometrics?.stressLevel || Math.floor(getDeterministicRandom(id + 'stress') * 100),
                movementIntensity: c.biometrics?.movementIntensity || Math.floor(getDeterministicRandom(id + 'move') * 10),
                bloodPressure: c.biometrics?.bloodPressure || `${Math.floor(getDeterministicRandom(id + 'bp1') * (130 - 110) + 110)}/${Math.floor(getDeterministicRandom(id + 'bp2') * (85 - 70) + 70)}`,
                spo2: c.biometrics?.spo2 || Math.floor(getDeterministicRandom(id + 'spo2') * (100 - 95) + 95),
                sleep: c.biometrics?.sleep || `${Math.floor(getDeterministicRandom(id + 'sleep1') * (9 - 5) + 5)}h ${Math.floor(getDeterministicRandom(id + 'sleep2') * 60)}m`,
                bodyTemp: c.biometrics?.bodyTemp || parseFloat((36.1 + getDeterministicRandom(id + 'temp') * 1.4).toFixed(1)),
                glucose: c.biometrics?.glucose || Math.floor(getDeterministicRandom(id + 'gluc') * (110 - 80) + 80),
                hrv: c.biometrics?.hrv || Math.floor(getDeterministicRandom(id + 'hrv') * (80 - 40) + 40),
                ecg: c.biometrics?.ecg || "Normal",
                gyro: c.biometrics?.gyro || `X:${(getDeterministicRandom(id + 'gx')).toFixed(1)} Y:${(getDeterministicRandom(id + 'gy')).toFixed(1)} Z:${(getDeterministicRandom(id + 'gz')).toFixed(1)}`
              },
            } as SchoolViolenceCase;
          });

          // Sort by date descending
          const sortedCases = processedCases.sort(
            (a, b) =>
              new Date(b.detectedAt).getTime() -
              new Date(a.detectedAt).getTime(),
          );

          const resolveCaseById = (id: string) =>
            sortedCases.find((c) => c._id === id || c.id === id);

          let nextSelected: SchoolViolenceCase | null = null;
          // Remove automatic case selection on initial load
          // Only select if there was a previously selected case
          if (selectedCaseIdRef.current) {
            nextSelected = resolveCaseById(selectedCaseIdRef.current);
          }
          // Do not auto-select first case on initial load
          // This ensures clean map display on F5 refresh

          const nextSelectedId = nextSelected?.id || nextSelected?._id || null;
          // Always update selectedCase to ensure we have the latest data (e.g. biometrics)
          // But only if we found a valid selection
          if (nextSelected) {
            setSelectedCase(nextSelected);
          } else if (nextSelectedId !== selectedCaseIdRef.current) {
            // Fallback for deselect or switch to null
            setSelectedCase(nextSelected);
          }
          
          setCases(sortedCases);
        }
      } catch (error) {
        console.error("Failed to fetch crime cases:", error);
      }
    };

    fetchCases();
    setLoading(false);

    // Poll every 5 seconds
    const interval = setInterval(fetchCases, 5000);

    // Socket listener for real-time updates
    const socket = socketService.getSocket();
    if (socket) {
      socket.on("school_violence_case_created", (newCase) => {
        console.log("New case received via socket:", newCase);
        fetchCases(); // Refresh list
      });
      console.log("Socket listener attached in CrimeDashboard");
    } else {
      console.warn("Socket not available in CrimeDashboard");
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off("school_violence_case_created");
      }
    };
  }, []); // Removed cases dependency to avoid infinite loop if reference changes

  const filteredCases = cases.filter((c) => {
    if (activeTab === "active")
      // Show everything that is NOT resolved/finished
      return !["Resolved", "False Alarm", "Normal"].includes(c.status);
    return ["Resolved", "False Alarm", "Normal"].includes(c.status);
  });

  // Calculate stats for top cards
  const stats = useMemo(() => {
    return {
      total: cases.length,
      critical: cases.filter((c) => c.analysisResult.severity === "Critical")
        .length,
      caution: cases.filter((c) => c.analysisResult.severity === "Caution")
        .length,
      resolved: cases.filter((c) =>
        ["Resolved", "False Alarm"].includes(c.status),
      ).length,
    };
  }, [cases]);

  // Generate mock history for VitalsChart
  const vitalsHistory = useMemo(() => {
    if (!selectedCase) return [];
    const history = [];
    const now = new Date();
    const baseHR = selectedCase.biometrics?.heartRate || 80;

    for (let i = 20; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5000);
      history.push({
        time: time.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        hr: baseHR + (Math.random() * 10 - 5),
        spo2: 95 + (Math.random() * 5 - 2),
      });
    }
    return history;
  }, [selectedCase]);

  if (loading && cases.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-white border border-zinc-800 rounded-2xl">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-slate-400">Loading School Violence Data...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col gap-4 overflow-hidden p-4">
        <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
          {/* Left Panel: Case List */}
          <div className="w-full lg:w-[13%] flex flex-col bg-zinc-950/40 rounded-2xl border border-zinc-900 overflow-hidden shadow-2xl shrink-0">
            <div className="p-1 border-b border-zinc-900 bg-zinc-900/10 shrink-0 flex flex-col">
              <div className="flex border-b border-zinc-900/50">
                {[
                  {
                    id: "active",
                    label: "상황발생",
                    count: cases.filter((c) =>
                      !["Resolved", "False Alarm", "Normal"].includes(c.status)
                    ).length,
                  },
                  {
                    id: "resolved",
                    label: "종결",
                    count: cases.filter((c) =>
                      ["Resolved", "False Alarm"].includes(c.status),
                    ).length,
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-2 text-[12px] font-normal transition-all relative flex flex-col items-center gap-0.5 ${activeTab === tab.id ? "text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[11px] font-normal leading-none px-1 rounded-sm ${activeTab === tab.id ? "text-red-500" : "text-zinc-600"}`}
                    >
                      {tab.count}
                    </span>
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]"></div>
                    )}
                  </button>
                ))}
              </div>

            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {filteredCases.length > 0 ? (
                filteredCases.map((c) => (
                  <CrimeCaseCard
                    key={c.id || c._id}
                    data={c}
                    isSelected={selectedCase?.id === c.id}
                    onClick={setSelectedCase}
                  />
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-4 text-center opacity-40">
                  <CheckCircle2 className="w-4.5 h-4.5 text-zinc-700 mb-2" />
                  <p className="text-[12px] font-normal text-zinc-300 uppercase tracking-widest">
                    No Cases
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Center: Map */}
          <div className="flex-1 h-full flex flex-col relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl min-w-0 z-0">
            <CrimeMap
              cases={selectedCase ? [selectedCase] : cases} // Show only selected case if selected, otherwise all
              selectedCase={selectedCase}
              onSelectCase={setSelectedCase}
              policeStations={MOCK_POLICE_STATIONS}
              precincts={MOCK_PRECINCTS}
            />
          </div>

          {/* Right Panel: Detail Analysis */}
          <div className="w-full lg:w-[17%] flex flex-col bg-zinc-950/40 rounded-2xl border border-zinc-900 shadow-2xl shrink-0 relative z-[30]">
            {selectedCase ? (
              <>
                <div className="px-2 pt-2 pb-0 space-y-2 flex-1 overflow-y-auto custom-scrollbar overflow-x-visible flex flex-col">
                  {/* Header Card */}
                  <div className="bg-zinc-900/50 p-2.5 rounded-2xl border border-zinc-800/80 shadow-xl relative overflow-hidden shrink-0">
                    <div className="flex gap-2.5 items-start relative z-10">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-800 shrink-0 shadow-lg relative self-center">
                        <img
                          src={`https://i.pravatar.cc/150?u=${selectedCase.id || selectedCase._id}`}
                          alt={selectedCase.name}
                          className="w-full h-full object-cover grayscale-[0.2]"
                        />
                      </div>
                      <div className="flex-1 flex flex-col justify-center min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h2 className="text-[17px] font-normal text-white tracking-tighter truncate leading-none">
                            {selectedCase.name}
                          </h2>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-[12px] text-zinc-300 font-normal uppercase tracking-tight">
                            {selectedCase.age}세 •{" "}
                            {selectedCase.studentId || "Student"}
                          </p>
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-normal border uppercase tracking-wider ${
                              selectedCase.analysisResult.severity ===
                              "Critical"
                                ? "bg-red-600/10 text-red-500 border-red-500/30"
                                : ["Caution", "Warning"].includes(
                                      selectedCase.analysisResult.severity,
                                    )
                                  ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                                  : selectedCase.analysisResult.severity === "Uncertain"
                                  ? "bg-purple-500/10 text-purple-500 border-purple-500/30"
                                  : "bg-green-500/10 text-green-500 border-green-500/30"
                            }`}
                          >
                            {selectedCase.analysisResult.severity === "Critical"
                              ? "긴급"
                              : selectedCase.analysisResult.severity ===
                                    "Caution" ||
                                  selectedCase.analysisResult.severity ===
                                    "Warning"
                                ? "주의"
                                : selectedCase.analysisResult.severity === "Uncertain"
                                ? "불확실"
                                : "정상"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedCase.audioUrl && (
                      <AudioPlayer 
                        url={selectedCase.audioUrl} 
                        initialDuration={selectedCase.analysisResult.audioFeatures?.duration}
                      />
                    )}
                  </div>

                  {/* Vitals Chart */}
                  <div className="mb-2 shrink-0 h-32">
                     <VitalsChart data={vitalsData} />
                  </div>

                  {/* TELEMETRY Card */}
                  <div className="bg-zinc-900/30 p-2 rounded-2xl border border-zinc-800/80 flex-1 flex flex-col overflow-hidden">
                    <h3 className="text-[12px] font-normal text-zinc-300 uppercase tracking-widest mb-1.5 flex items-center gap-2 shrink-0">
                      <Gauge className="w-3.5 h-3.5 text-blue-500" /> TELEMETRY
                    </h3>
                    <div className="grid grid-cols-2 gap-1 overflow-y-auto custom-scrollbar pr-1">
                      <BioMetricCard
                        label="RHR"
                        value={Math.round(selectedCase.biometrics?.heartRate || 0) || "--"}
                        unit="bpm"
                        icon={Activity}
                        color="text-red-500"
                        description="Resting Heart Rate"
                      />
                      <BioMetricCard
                        label="BP"
                        value={selectedCase.biometrics?.bloodPressure || "--"}
                        unit="mmHg"
                        icon={ActivitySquare}
                        color="text-orange-500"
                        description="Blood Pressure"
                      />
                      <BioMetricCard
                        label="SpO2"
                        value={selectedCase.biometrics?.spo2 || "--"}
                        unit="%"
                        icon={Droplets}
                        color="text-blue-400"
                        description="SpO2 Saturation"
                      />
                      <BioMetricCard
                        label="SLEEP"
                        value={selectedCase.biometrics?.sleep || "--"}
                        icon={Moon}
                        color="text-indigo-400"
                        description="Sleep Duration"
                      />
                      <BioMetricCard
                        label="TEMP"
                        value={selectedCase.biometrics?.bodyTemp || "--"}
                        unit="°C"
                        icon={Thermometer}
                        color="text-rose-400"
                        description="Body Temperature"
                      />
                      <BioMetricCard
                        label="BG"
                        value={selectedCase.biometrics?.glucose || "--"}
                        unit="mg/dL"
                        icon={Droplets}
                        color="text-yellow-500"
                        description="Blood Glucose"
                      />
                      <BioMetricCard
                        label="STRESS"
                        value={selectedCase.biometrics?.stressLevel || "--"}
                        unit="%"
                        icon={Cpu}
                        color="text-purple-500"
                        description="Stress Level"
                      />
                      <BioMetricCard
                        label="HRV"
                        value={selectedCase.biometrics?.hrv || "--"}
                        unit="ms"
                        icon={Heart}
                        color="text-green-500"
                        description="HRV"
                      />
                      <BioMetricCard
                        label="ECG"
                        value={selectedCase.biometrics?.ecg || "Normal"}
                        icon={Activity}
                        color="text-emerald-400"
                        description="ECG Status"
                      />
                      <BioMetricCard
                        label="GYRO"
                        value={selectedCase.biometrics?.gyro || "--"}
                        icon={Move}
                        color="text-cyan-400"
                        description="Gyroscope Data"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-zinc-400 flex flex-col items-center justify-center h-full gap-5">
                <ShieldAlert className="w-10 h-10 opacity-30" />
                <p className="text-[12px] font-normal uppercase tracking-widest">
                  Select Case
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default CrimeDashboard;
