import React, { useState, useEffect, memo, useMemo, useRef } from "react";
import {
  ShieldAlert,
  Siren,
  MapPin,
  Radio,
  Volume2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  LocateFixed,
  Clock,
  User,
  Users,
  Loader2,
  Activity,
  Heart,
  BrainCircuit,
  Zap,
  Building2,
  Shield,
  Search,
  Gauge,
  Wind,
  Cpu,
  Droplets,
  Monitor,
  ArrowRight,
  Waves,
  XCircle,
  ChevronDown,
  ChevronUp,
  Watch,
  Server,
  Mic,
  BarChart3,
  Play,
  Pause,
  Download,
  Database,
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
    <div className="relative group">
      <div className="absolute bottom-[calc(100%+8px)] right-0 w-36 p-2 bg-zinc-900/98 border border-zinc-700 text-white rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-[100] backdrop-blur-xl">
        <p className="text-[10px] leading-relaxed font-normal text-zinc-200">
          <span className="block font-normal mb-1 text-white uppercase tracking-widest text-[9px] border-b border-zinc-700 pb-1">
            {label} Info
          </span>
          {description}
        </p>
        <div className="absolute top-full right-4 border-4 border-transparent border-t-zinc-700"></div>
      </div>

      <div className="bg-black/40 py-1.5 px-2.5 rounded-xl border border-zinc-900/50 flex items-center justify-between group-hover:border-zinc-700 transition-colors cursor-help relative z-10">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`w-3.5 h-3.5 ${color} opacity-80 shrink-0`} />
          <p className="text-[12px] text-zinc-400 font-light uppercase tracking-tighter truncate">
            {label}
          </p>
        </div>
        <div className="flex items-baseline gap-0.5 ml-2">
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

  useEffect(() => {
    selectedCaseIdRef.current =
      selectedCase?.id || selectedCase?._id || null;
  }, [selectedCase]);

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
            // Handle location (string vs object)
            let location = c.location;
            if (typeof location === "string") {
              // Default to Seoul coordinates if location is just a string
              location = {
                lat: 37.5665 + (Math.random() * 0.05 - 0.025), // Add slight randomness for visibility
                lng: 126.978 + (Math.random() * 0.05 - 0.025),
                address: c.location,
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

            // Ensure ID consistency
            const id = c._id || c.id;

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
              // Ensure biometrics exists
              biometrics: c.biometrics || {
                heartRate: 0,
                stressLevel: 0,
                movementIntensity: 0,
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
          if (initialSelectedCaseId && !hasAppliedInitialSelectionRef.current) {
            nextSelected =
              resolveCaseById(initialSelectedCaseId) || sortedCases[0] || null;
            hasAppliedInitialSelectionRef.current = true;
          } else if (selectedCaseIdRef.current) {
            nextSelected = resolveCaseById(selectedCaseIdRef.current);
          }

          if (!nextSelected && sortedCases.length > 0) {
            nextSelected = sortedCases[0];
          }

          const nextSelectedId = nextSelected?.id || nextSelected?._id || null;
          if (nextSelectedId !== selectedCaseIdRef.current) {
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
              cases={cases}
              selectedCase={selectedCase}
              onSelectCase={setSelectedCase}
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

                  {/* Bio Stream Card removed and merged into Real-time Measurement */}

                  {/* TELEMETRY Card */}
                  <div className="bg-zinc-900/30 p-2 rounded-2xl border border-zinc-800/80 shrink-0 overflow-visible">
                    <h3 className="text-[12px] font-normal text-zinc-300 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <Gauge className="w-3.5 h-3.5 text-blue-500" /> 실시간
                      측정
                    </h3>
                    <div className="grid grid-cols-2 gap-1">
                      <BioMetricCard
                        label="BPM"
                        value={Math.round(selectedCase.biometrics?.heartRate || 0) || "--"}
                        icon={Activity}
                        color="text-red-500"
                        description="심박수"
                      />
                      <BioMetricCard
                        label="STRESS"
                        value={selectedCase.biometrics?.stressLevel || "--"}
                        unit="%"
                        icon={Cpu}
                        color="text-purple-500"
                        description="스트레스 지수"
                      />
                      <BioMetricCard
                        label="신뢰도"
                        value={Math.round(
                          selectedCase.analysisResult.confidence || 0,
                        )}
                        unit="%"
                        icon={CheckCircle2}
                        color="text-green-500"
                        description="AI Confidence Score"
                      />
                      <BioMetricCard
                        label="움직임"
                        value={selectedCase.biometrics?.movementIntensity || 0}
                        unit="/10"
                        icon={Wind}
                        color="text-teal-500"
                        description="Movement Intensity"
                      />
                      <BioMetricCard
                        label="오디오"
                        value="감지됨"
                        icon={Volume2}
                        color="text-zinc-500"
                        description="Audio Monitoring"
                      />
                      <BioMetricCard
                        label="위험도"
                        value={
                          selectedCase.analysisResult.severity === "Critical"
                            ? "높음"
                            : "낮음"
                        }
                        icon={AlertTriangle}
                        color="text-red-500"
                        description="Severity Level"
                      />
                    </div>
                  </div>

                  {/* AI Analysis Result */}
                  <div className="bg-zinc-900/30 px-2 pt-2 pb-0 rounded-2xl border border-zinc-800/80 flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[12px] font-normal text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                        <BrainCircuit className="w-3.5 h-3.5 text-purple-600" />{" "}
                        AI 정밀 분석 결과
                      </h3>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-full">
                        <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse" />
                        <span className="text-[9px] text-purple-400 font-normal">
                          모델 v2.1 (앙상블)
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar space-y-2 pr-1">
                      {/* Summary Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-zinc-950/50 p-2 rounded-xl border border-zinc-900 flex flex-col gap-1">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                            주요 유형
                          </span>
                          <span className="text-[13px] text-white font-normal truncate">
                            {selectedCase.analysisResult.category || "분석 중"}
                          </span>
                        </div>
                        <div className="bg-zinc-950/50 p-2 rounded-xl border border-zinc-900 flex flex-col gap-1">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider flex justify-between">
                            분석 신뢰도
                            <span className="text-purple-400">
                              {Math.round(
                                selectedCase.analysisResult.confidence || 0,
                              )}
                              %
                            </span>
                          </span>
                          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-purple-600 rounded-full"
                              style={{
                                width: `${selectedCase.analysisResult.confidence || 0}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Audio Features Grid */}
                      {selectedCase.analysisResult.audioFeatures && (
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            {
                              label: "감정 상태",
                              val: selectedCase.analysisResult.primaryEmotion || selectedCase.analysisResult.audioFeatures?.emotion || "분석 중",
                              icon: Heart,
                              color: "text-red-400",
                            },
                            {
                              label: "음성 피치",
                              val: selectedCase.analysisResult.audioFeatures
                                .pitch,
                              icon: Waves,
                              color: "text-blue-400",
                            },
                            {
                              label: "음량",
                              val: selectedCase.analysisResult.audioFeatures
                                .volume,
                              icon: Volume2,
                              color: "text-yellow-400",
                            },
                            {
                              label: "발화 속도",
                              val: selectedCase.analysisResult.audioFeatures
                                .speed,
                              icon: Activity,
                              color: "text-green-400",
                            },
                            {
                              label: "주변 소음",
                              val:
                                selectedCase.analysisResult.audioFeatures
                                  .backgroundNoise || "N/A",
                              icon: Mic,
                              color: "text-zinc-400",
                            },
                            {
                              label: "화자 수",
                              val: `${
                                selectedCase.analysisResult.audioFeatures
                                  .speakerCount || 1
                              }명`,
                              icon: Users,
                              color: "text-purple-400",
                            },
                          ].map((item, idx) => (
                            <div
                              key={idx}
                              className="bg-zinc-950/50 p-1.5 rounded-lg border border-zinc-900 flex flex-col items-center justify-center gap-0.5"
                            >
                              <item.icon
                                className={`w-3 h-3 ${item.color} opacity-80`}
                              />
                              <span className="text-[9px] text-zinc-500 uppercase tracking-tighter">
                                {item.label}
                              </span>
                              <span className="text-[10px] text-zinc-300 font-normal truncate w-full text-center tracking-tight">
                                {typeof item.val === "number" &&
                                !Number.isFinite(item.val)
                                  ? "--"
                                  : item.val}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reasoning Box */}
                      <div className="flex-1 p-3 bg-black/60 rounded-t-xl rounded-b-none border-x border-t border-zinc-900 shadow-inner flex flex-col min-h-0 overflow-hidden">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-900/80">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-zinc-500" />
                            <span className="text-[11px] text-zinc-400 uppercase tracking-widest font-normal">
                              AI 추론 및 상황 맥락
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              const content =
                                selectedCase.transcript ||
                                selectedCase.analysisResult.reasoning ||
                                "내용이 없습니다.";
                              const blob = new Blob([content], {
                                type: "text/plain",
                              });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `${selectedCase.name || "case"}_transcript_${new Date().toISOString().slice(0, 10)}.txt`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            }}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-700 transition-all group"
                            title="음성 대본 다운로드"
                          >
                            <Download className="w-3 h-3 text-zinc-400 group-hover:text-zinc-200" />
                            <span className="text-[10px] text-zinc-400 group-hover:text-zinc-200">
                              TXT 저장
                            </span>
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                          <div className="text-[13px] text-zinc-300 leading-relaxed font-normal tracking-tight">
                            {(() => {
                              let text: any =
                                selectedCase.analysisResult.reasoning ||
                                "분석 대기 중...";
                              
                              if (typeof text === 'object' && text !== null) {
                                if (text.situation || text.psychology || text.danger) {
                                  text = `[상황 분석]: ${text.situation || ''}\n[심리 분석]: ${text.psychology || ''}\n[위험 요소]: ${text.danger || ''}`;
                                } else {
                                  text = JSON.stringify(text, null, 2);
                                }
                              }
                              
                              text = String(text);

                              // Clean up initial text
                              const cleanText = text.replace(/^(List of \d+-\d+ keywords:|Reasoning:|Explanation:)\s*/i, "").trim();

                              // Check if it follows the structured format
                              if (cleanText.includes("[상황 분석]") || cleanText.includes("1. [상황 분석]")) {
                                const sections = [
                                  { title: "상황 분석", pattern: /(?:1\.\s*)?\[상황 분석\]:?\s*([^]*?)(?=(?:2\.\s*)?\[심리 분석\]|$)/ },
                                  { title: "심리 분석", pattern: /(?:2\.\s*)?\[심리 분석\]:?\s*([^]*?)(?=(?:3\.\s*)?\[위험 요소\]|$)/ },
                                  { title: "위험 요소", pattern: /(?:3\.\s*)?\[위험 요소\]:?\s*([^]*?)$/ }
                                ];

                                const results = sections.map(section => {
                                  const match = cleanText.match(section.pattern);
                                  return {
                                    title: section.title,
                                    content: match ? match[1].trim() : null
                                  };
                                }).filter(s => s.content);

                                if (results.length > 0) {
                                  return (
                                    <div className="space-y-4 pt-1">
                                      {results.map((section, idx) => (
                                        <div key={idx} className="flex flex-col gap-1.5">
                                          <div className="flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                                            <span className="text-[11px] text-indigo-400 font-bold uppercase tracking-wider">
                                              {section.title}
                                            </span>
                                          </div>
                                          <p className="text-[13px] text-zinc-300 leading-relaxed pl-3 border-l border-zinc-800">
                                            {section.content}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                              }

                              return <div className="whitespace-pre-line break-keep">{cleanText}</div>;
                            })()}
                          </div>
                        </div>

                        {selectedCase.analysisResult.keywords && (
                          <div className="mt-3 pt-2 border-t border-zinc-900/80 flex flex-wrap gap-1.5 shrink-0">
                            {selectedCase.analysisResult.keywords.map(
                              (k, i) => (
                                <span
                                  key={i}
                                  className="text-[11px] bg-purple-500/5 text-purple-300 border border-purple-500/20 px-2.5 py-1 rounded-md tracking-tight hover:bg-purple-500/10 transition-colors cursor-default"
                                >
                                  #{k}
                                </span>
                              ),
                            )}
                          </div>
                        )}
                      </div>
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
