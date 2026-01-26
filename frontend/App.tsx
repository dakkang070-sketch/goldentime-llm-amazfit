import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  memo,
} from "react";
import {
  INITIAL_HOSPITALS,
  INITIAL_PATIENTS,
  INITIAL_AMBULANCES,
} from "./constants";
import {
  Patient,
  Hospital,
  PatientStatus,
  TriageResult,
  Ambulance,
  AmbulanceStatus,
} from "./types";
import { analyzePatientData } from "./services/geminiService";
import { apiService } from "./services/apiService";
import { socketService } from "./services/socketService";
import {
  transformEmergencyCaseToPatient,
  transformBiometricToVitals,
  transformHospitalToFrontend,
  transformParamedicToAmbulance,
} from "./utils/dataTransform";
import PatientCard from "./components/PatientCard";
import VitalsChart from "./components/VitalsChart";
import LiveMap from "./components/WorkingMap";
import ErrorBoundary from "./components/ErrorBoundary";
import CrimeDashboard from "./components/CrimeDashboard";
import {
  Search,
  Activity,
  Hospital as HospitalIcon,
  Users,
  BrainCircuit,
  Monitor,
  Siren,
  Loader2,
  Cpu,
  AlertTriangle,
  Zap,
  ChevronDown,
  ChevronUp,
  Droplets,
  ShieldAlert,
  CheckCircle2,
  Clock,
  BarChart,
  Server,
  Terminal,
  Wifi,
  LocateFixed,
  Wind,
  Gauge,
  Truck,
  Filter,
  UserCheck,
  Building2,
  RefreshCw,
  UserPlus,
  List,
  UserMinus,
  Volume2,
  VolumeX,
} from "lucide-react";
import MobileRecorder from "./components/MobileRecorder";
import CrimeList from "./components/CrimeList";

const Emblem119 = ({ color = "#ef4444", className = "w-6 h-6" }) => (
  <svg
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M50 5 L90 25 L90 55 C90 75 70 90 50 95 C30 90 10 75 10 55 L10 25 L50 5Z"
      fill="white"
      stroke={color}
      strokeWidth="6"
    />
    <path
      d="M50 15 L82 31 L82 55 C82 71 66 84 50 88 C34 84 18 71 18 55 L18 31 L50 15Z"
      fill={color}
    />
    <text
      x="50"
      y="65"
      fontFamily="Arial, sans-serif"
      fontSize="29"
      fill="white"
      textAnchor="middle"
      fontWeight="400"
    >
      119
    </text>
    <path
      d="M50 25 L55 35 L65 35 L57 42 L60 52 L50 45 L40 52 L43 42 L35 35 L45 35 Z"
      fill="white"
    />
  </svg>
);

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
          <p className="text-[11px] text-zinc-400 font-normal uppercase tracking-tighter truncate">
            {label}
          </p>
        </div>
        <div className="flex items-baseline gap-0.5 ml-2">
          <span className="text-[14px] font-normal text-white">
            {value ?? "--"}
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

// 하버사인 거리 계산 함수
const getHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const App: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [hospitals, setHospitals] = useState<Hospital[]>(INITIAL_HOSPITALS);
  const [ambulances, setAmbulances] = useState<Ambulance[]>(INITIAL_AMBULANCES);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    INITIAL_PATIENTS.length > 0 ? INITIAL_PATIENTS[0] : null,
  );
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const processingRef = useRef<Set<string>>(new Set());
  const assignedAmbulancesRef = useRef<Set<string>>(new Set());
  const [rematchingIds, setRematchingIds] = useState<Set<string>>(new Set());
  const [systemLogs, setSystemLogs] = useState<
    { id: string; text: string; time: string }[]
  >([]);
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "patients"
    | "hospitals"
    | "admin"
    | "crime"
    | "crime-list"
    | "mobile"
  >(window.location.pathname === "/mobile" ? "mobile" : "crime");
  const [selectedCrimeId, setSelectedCrimeId] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAiMatchingEnabled, setIsAiMatchingEnabled] = useState(true);
  const [expandedHospitalIds, setExpandedHospitalIds] = useState<Set<string>>(
    new Set(),
  );
  const [isVitalsExpanded, setIsVitalsExpanded] = useState(false);
  const [patientListTab, setPatientListTab] = useState<
    "waiting" | "transporting" | "completed"
  >("waiting");
  const [patientFilter, setPatientFilter] = useState<
    "all" | "critical" | "danger" | "transporting" | "transported"
  >("all");
  const [hospitalTab, setHospitalTab] = useState<
    "all" | "lv1" | "lv2" | "available"
  >("all");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAlertVoiceEnabled, setIsAlertVoiceEnabled] = useState(true);
  const isAlertVoiceEnabledRef = useRef(true);

  const handleDeleteAll = useCallback(async () => {
    if (!confirm("범죄 관제 회원을 모두 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며 모든 데이터가 영구적으로 삭제됩니다.")) return;
    
    try {
      const res = await fetch("/api/school-violence/cases", {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        alert("모든 회원이 삭제되었습니다.");
        window.location.reload();
      } else {
        alert("삭제 실패: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Delete failed", error);
      alert("서버 통신 오류가 발생했습니다.");
    }
  }, []);
  const spokenAlertsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    isAlertVoiceEnabledRef.current = isAlertVoiceEnabled;
    if (!isAlertVoiceEnabled && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [isAlertVoiceEnabled]);

  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(
    null,
  );

  // Initialize socket connection
  useEffect(() => {
    socketService.connect(apiService.getToken() || "");
    return () => {
      socketService.disconnect();
    };
  }, []);

  // 구급차 상태 통계 계산 (정확한 실시간 데이터 반영)
  const ambulanceStats = useMemo(() => {
    // 현재 이송/출동 중인 구급차 ID 세트 (환자 데이터 기준)
    const dispatchedAmbulanceIds = new Set(
      patients
        .filter(
          (p) =>
            p.status !== PatientStatus.TRANSPORTED && !!p.matchedAmbulanceId,
        )
        .map((p) => p.matchedAmbulanceId),
    );

    const total = ambulances.length;
    const dispatched = dispatchedAmbulanceIds.size;
    const busy = ambulances.filter(
      (a) => a.status === AmbulanceStatus.BUSY,
    ).length;
    const available = Math.max(0, total - dispatched - busy);

    return { total, dispatched, available, busy };
  }, [patients, ambulances]);

  // 10초마다 랜덤 환자 발생
  useEffect(() => {
    const names = [
      "김철수",
      "이영희",
      "박지민",
      "최동훈",
      "정수연",
      "강민호",
      "조예진",
      "윤상욱",
      "임지혜",
      "한성민",
    ];
    const symptoms = [
      "심한 흉통",
      "호흡 곤란",
      "의식 저하",
      "심한 두통",
      "복부 통증",
      "골절 의심",
      "고열",
      "어지러움",
    ];

    const generator = setInterval(() => {
      const seoulHubs = [
        { lat: 37.4979, lng: 127.0276, loc: "강남구 역삼동" },
        { lat: 37.5565, lng: 126.9239, loc: "마포구 서교동" },
        { lat: 37.5133, lng: 127.1001, loc: "송파구 잠실동" },
        { lat: 37.5216, lng: 126.9242, loc: "영등포구 여의도동" },
        { lat: 37.5759, lng: 126.9768, loc: "종로구 세종로" },
        { lat: 37.5446, lng: 127.0559, loc: "성동구 성수동" },
        { lat: 37.5345, lng: 126.9946, loc: "용산구 이태원동" },
        { lat: 37.5635, lng: 126.9842, loc: "중구 명동" },
        { lat: 37.5398, lng: 126.9459, loc: "마포구 도화동" },
        { lat: 37.4812, lng: 126.9527, loc: "관악구 봉천동" },
      ];

      const hub = seoulHubs[Math.floor(Math.random() * seoulHubs.length)];
      const jitter = 0.006;
      const name = names[Math.floor(Math.random() * names.length)];
      const age = Math.floor(Math.random() * 60) + 15;
      const symptom = symptoms[Math.floor(Math.random() * symptoms.length)];
      const hr = Math.floor(Math.random() * 60) + 100;
      const spo2 = Math.floor(Math.random() * 15) + 80;

      const rand = Math.random();
      let status;
      let statusText;

      if (rand > 0.85) {
        status = PatientStatus.CRITICAL;
        statusText = "응급(Critical)";
      } else if (rand > 0.7) {
        status = PatientStatus.DANGER;
        statusText = "위험(Danger)";
      } else if (rand > 0.55) {
        status = PatientStatus.WARNING;
        statusText = "경고(Warning)";
      } else if (rand > 0.4) {
        status = PatientStatus.CAUTION;
        statusText = "주의(Caution)";
      } else {
        status = PatientStatus.NORMAL;
        statusText = "정상(Normal)";
      }

      const aiAnalysis = `**🚨 응급상황 분석 결과**

📋 **주요 소견:**
• ${symptom} 증상 호소
• 심박수 ${hr}bpm (${hr > 120 ? "위험" : "주의"})
• 산소포화도 ${spo2}% (${spo2 < 90 ? "긴급" : "주의"})

🔍 **판단:**
• ${age}세 ${Math.random() > 0.5 ? "남성" : "여성"} ${symptom}으로 인한 ${statusText} 상황
• 즉각적인 의료 조치 및 전문 센터 이송 필요`;

      const newPatient: Patient = {
        id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name,
        age: age,
        birthDate: "1980-01-01",
        bloodType: ["A", "B", "O", "AB"][Math.floor(Math.random() * 4)],
        gender: Math.random() > 0.5 ? "M" : "F",
        status: status,
        location: hub.loc,
        lat: hub.lat + (Math.random() - 0.5) * jitter,
        lng: hub.lng + (Math.random() - 0.5) * jitter,
        imageUrl: `https://i.pravatar.cc/150?u=${Math.random()}`,
        vitals: {
          heartRate: hr,
          bloodPressure: "150/100",
          oxygenLevel: spo2,
          bodyTemp: 37.0 + Math.random() * 2.5,
          lastUpdated: new Date().toISOString(),
          history: [],
        },
        symptoms: [symptom],
        severityScore: Math.floor(Math.random() * 40) + 60,
        aiAnalysis: aiAnalysis,
      };

      setPatients((prev) => [newPatient, ...prev].slice(0, 100));
      addLog(
        `🚨 신규 응급 환자 발생: ${newPatient.name}님 (${newPatient.location})`,
      );

      if (
        newPatient.status === PatientStatus.CRITICAL ||
        newPatient.status === PatientStatus.DANGER
      ) {
        if (!spokenAlertsRef.current.has(newPatient.id)) {
          if (isAlertVoiceEnabledRef.current && "speechSynthesis" in window) {
            const message =
              newPatient.status === PatientStatus.CRITICAL
                ? "긴급환자발생. 응급 단계."
                : "긴급환자발생. 위험 단계.";
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = "ko-KR";
            window.speechSynthesis.speak(utterance);
            spokenAlertsRef.current.add(newPatient.id);
          }
        }
      }
    }, 10000);

    return () => clearInterval(generator);
  }, []);

  const ambulancesRef = useRef(ambulances);
  const patientsRef = useRef(patients);

  useEffect(() => {
    ambulancesRef.current = ambulances;
    patientsRef.current = patients;
  }, [ambulances, patients]);

  // 환자 이송 완료 처리
  const handlePatientArrival = useCallback((patientId: string) => {
    setPatients((prev) => {
      const patient = prev.find((p) => p.id === patientId);
      if (patient && patient.matchedAmbulanceId) {
        const ambId = patient.matchedAmbulanceId;
        assignedAmbulancesRef.current.delete(ambId);

        setAmbulances((prevAmbs) =>
          prevAmbs.map((amb) =>
            amb.id === ambId
              ? {
                  ...amb,
                  status: AmbulanceStatus.AVAILABLE,
                  activity: undefined,
                  patrolPath: undefined,
                  patrolIndex: undefined,
                  targetPatientId: undefined,
                  targetHospitalId: undefined,
                  boardingCountdown: undefined,
                }
              : amb,
          ),
        );
      }
      return prev.map((p) =>
        p.id === patientId ? { ...p, status: PatientStatus.TRANSPORTED } : p,
      );
    });
    addLog(`🏁 이송 완료: 환자가 병원에 안전하게 인계되었습니다.`);
  }, []);

  const handlePatientArrivalRef = useRef(handlePatientArrival);
  useEffect(() => {
    handlePatientArrivalRef.current = handlePatientArrival;
  }, [handlePatientArrival]);

  useEffect(() => {
    // 6-1. 패트롤 경로 부여
    const patrolTimer = setInterval(async () => {
      const currentAmbs = ambulancesRef.current;
      const idleAmbs = currentAmbs.filter(
        (a) => a.status === AmbulanceStatus.AVAILABLE && !a.patrolPath,
      );

      if (idleAmbs.length === 0) return;
      const targets = idleAmbs.sort(() => 0.5 - Math.random()).slice(0, 8);

      for (const amb of targets) {
        const targetLat = amb.lat + (Math.random() - 0.5) * 0.015;
        const targetLng = amb.lng + (Math.random() - 0.5) * 0.015;

        try {
          const url = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${amb.lng},${amb.lat};${targetLng},${targetLat}?overview=full&geometries=geojson&steps=true`;
          const res = await fetch(url);
          const data = await res.json();
          const points = data.routes?.[0]?.geometry?.coordinates?.map(
            (c: any) => ({ lat: c[1], lng: c[0] }),
          );

          if (points && points.length > 0) {
            setAmbulances((prev) =>
              prev.map((a) =>
                a.id === amb.id
                  ? {
                      ...a,
                      patrolPath: points,
                      patrolIndex: 0,
                      activity: "patrolling",
                    }
                  : a,
              ),
            );
          }
        } catch (e) {
          const fallback = [
            { lat: amb.lat, lng: amb.lng },
            { lat: targetLat, lng: targetLng },
          ];
          setAmbulances((prev) =>
            prev.map((a) =>
              a.id === amb.id
                ? {
                    ...a,
                    patrolPath: fallback,
                    patrolIndex: 0,
                    activity: "patrolling",
                  }
                : a,
            ),
          );
        }
      }
    }, 10000);

    // 6-2. 실제 이동 처리 (0.1초마다 초고정밀 이동)
    const moveTimer = setInterval(() => {
      setAmbulances((prev) =>
        prev.map((amb) => {
          const isMatched = patientsRef.current.some(
            (p) =>
              p.matchedAmbulanceId === amb.id &&
              p.status !== PatientStatus.TRANSPORTED,
          );

          if (amb.patrolPath && amb.patrolIndex !== undefined) {
            // 이송 조치(탑승) 시뮬레이션
            if (
              amb.activity === "boarding" &&
              amb.boardingCountdown !== undefined
            ) {
              if (amb.boardingCountdown > 0) {
                return {
                  ...amb,
                  boardingCountdown: amb.boardingCountdown - 0.1,
                };
              } else {
                return {
                  ...amb,
                  activity: "transporting_to_hospital",
                  boardingCountdown: undefined,
                };
              }
            }

            let currentIndex = amb.patrolIndex;
            let currentLat = amb.lat;
            let currentLng = amb.lng;
            let distanceToMove = 0.0025; // 0.1초당 2.5m (90km/h)

            while (
              distanceToMove > 0 &&
              currentIndex < amb.patrolPath.length - 1
            ) {
              const nextPoint = amb.patrolPath[currentIndex + 1];
              const distToNext = getHaversineDistance(
                currentLat,
                currentLng,
                nextPoint.lat,
                nextPoint.lng,
              );

              if (distanceToMove >= distToNext) {
                distanceToMove -= distToNext;
                currentLat = nextPoint.lat;
                currentLng = nextPoint.lng;
                currentIndex++;
              } else {
                const ratio = distanceToMove / (distToNext || 0.0001);
                currentLat = currentLat + (nextPoint.lat - currentLat) * ratio;
                currentLng = currentLng + (nextPoint.lng - currentLng) * ratio;
                distanceToMove = 0;
              }
            }

            if (currentIndex >= amb.patrolPath.length - 1) {
              if (
                amb.activity === "transporting_to_hospital" &&
                amb.targetPatientId
              ) {
                handlePatientArrivalRef.current(amb.targetPatientId);
              }
              return {
                ...amb,
                patrolPath: undefined,
                patrolIndex: undefined,
                activity: undefined,
                status: AmbulanceStatus.AVAILABLE,
              };
            }

            if (
              amb.activity === "heading_to_patient" &&
              amb.dispatchPathLen &&
              currentIndex >= amb.dispatchPathLen
            ) {
              return {
                ...amb,
                lat: currentLat,
                lng: currentLng,
                patrolIndex: currentIndex,
                activity: "boarding",
                boardingCountdown: 5,
              };
            }

            return {
              ...amb,
              lat: currentLat,
              lng: currentLng,
              patrolIndex: currentIndex,
            };
          }

          if (!isMatched) {
            return {
              ...amb,
              lat: amb.lat + (Math.random() - 0.5) * 0.000001,
              lng: amb.lng + (Math.random() - 0.5) * 0.000001,
            };
          }

          return amb;
        }),
      );
    }, 100);

    return () => {
      clearInterval(patrolTimer);
      clearInterval(moveTimer);
    };
  }, []);

  const addLog = (text: string) => {
    setSystemLogs((prev) =>
      [
        {
          id: Date.now().toString(),
          text,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 30),
    );
  };

  const matchHospitalForPatient = useCallback(
    async (patient: Patient) => {
      if (
        patient.matchedAmbulanceId ||
        patient.recommendedHospitalId ||
        processingRef.current.has(patient.id)
      )
        return;

      processingRef.current.add(patient.id);
      setProcessingIds((prev) => new Set(prev).add(patient.id));

      try {
        addLog(`🏥 AI 병원 매칭 시작: ${patient.name}`);

        const currentAmbs = ambulancesRef.current;
        const availableAmbs = currentAmbs.filter(
          (a) =>
            a.status === AmbulanceStatus.AVAILABLE &&
            !assignedAmbulancesRef.current.has(a.id),
        );

        if (availableAmbs.length === 0) {
          addLog(`⚠️ 가용 구급차가 없습니다. 재시도 중...`);
          throw new Error("No Available Ambulance");
        }

        const targetAmb = availableAmbs.reduce((prev, curr) => {
          const prevDist = getHaversineDistance(
            patient.lat,
            patient.lng,
            prev.lat,
            prev.lng,
          );
          const currDist = getHaversineDistance(
            patient.lat,
            patient.lng,
            curr.lat,
            curr.lng,
          );
          return prevDist < currDist ? prev : curr;
        });

        const assignedAmbId = targetAmb.id;
        assignedAmbulancesRef.current.add(assignedAmbId);

        const dist = getHaversineDistance(
          patient.lat,
          patient.lng,
          targetAmb.lat,
          targetAmb.lng,
        );
        addLog(
          `📍 최단거리(${dist.toFixed(2)}km) 구급차 배정: ${targetAmb.unitName}`,
        );

        const availableHospitals = hospitals.filter(
          (h) => h.isEROpen && h.erBeds.available > 0,
        );
        if (availableHospitals.length === 0)
          throw new Error("No Available Hospitals");

        const sortedHospitals = [...availableHospitals].sort((a, b) => {
          const distA = getHaversineDistance(
            patient.lat,
            patient.lng,
            a.lat,
            a.lng,
          );
          const distB = getHaversineDistance(
            patient.lat,
            patient.lng,
            b.lat,
            b.lng,
          );
          return distA - distB;
        });

        const bestHospital = sortedHospitals[0];
        const hospDist = getHaversineDistance(
          patient.lat,
          patient.lng,
          bestHospital.lat,
          bestHospital.lng,
        );

        let fullJourneyPath: { lat: number; lng: number }[] = [];
        let dispatchPathLen = 0;

        try {
          const url1 = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${targetAmb.lng},${targetAmb.lat};${patient.lng},${patient.lat}?overview=full&geometries=geojson&steps=true`;
          const res1 = await fetch(url1);
          const data1 = await res1.json();
          const p1 =
            data1.routes?.[0]?.geometry?.coordinates?.map((c: any) => ({
              lat: c[1],
              lng: c[0],
            })) || [];
          dispatchPathLen = p1.length;

          const url2 = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${patient.lng},${patient.lat};${bestHospital.lng},${bestHospital.lat}?overview=full&geometries=geojson&steps=true`;
          const res2 = await fetch(url2);
          const data2 = await res2.json();
          const p2 =
            data2.routes?.[0]?.geometry?.coordinates?.map((c: any) => ({
              lat: c[1],
              lng: c[0],
            })) || [];

          fullJourneyPath = [...p1, ...p2];
        } catch (e) {
          fullJourneyPath = [
            { lat: targetAmb.lat, lng: targetAmb.lng },
            { lat: patient.lat, lng: patient.lng },
            { lat: bestHospital.lat, lng: bestHospital.lng },
          ];
          dispatchPathLen = 2;
        }

        setAmbulances((prevAmbs) =>
          prevAmbs.map((amb) =>
            amb.id === assignedAmbId
              ? {
                  ...amb,
                  status: AmbulanceStatus.DISPATCHED,
                  patrolPath: fullJourneyPath,
                  patrolIndex: 0,
                  dispatchPathLen: dispatchPathLen,
                  activity: "heading_to_patient",
                  targetPatientId: patient.id,
                  targetHospitalId: bestHospital.id,
                }
              : amb,
          ),
        );

        const updatedPatientFields = {
          recommendedHospitalId: bestHospital.id,
          hospitalMatchReason: `최단거리(${hospDist.toFixed(1)}km) 및 병상 가용성 분석 결과`,
          matchedAmbulanceId: assignedAmbId,
          status:
            patient.status === PatientStatus.PENDING
              ? patient.severityScore && patient.severityScore >= 4
                ? PatientStatus.CRITICAL
                : PatientStatus.DANGER
              : patient.status,
        };

        setPatients((prev) =>
          prev.map((p) =>
            p.id === patient.id ? { ...p, ...updatedPatientFields } : p,
          ),
        );
        setSelectedPatient((prev) =>
          prev?.id === patient.id ? { ...prev, ...updatedPatientFields } : prev,
        );

        addLog(`✅ 매칭 완료: ${bestHospital.name} (${hospDist.toFixed(1)}km)`);
      } catch (error) {
        console.error("Match error:", error);
        addLog(
          `❌ 매칭 실패: ${error instanceof Error ? error.message : "시스템 재시도 중..."}`,
        );
      } finally {
        setTimeout(() => {
          processingRef.current.delete(patient.id);
          setProcessingIds((prev) => {
            const next = new Set(prev);
            next.delete(patient.id);
            return next;
          });
        }, 500);
      }
    },
    [hospitals],
  );

  useEffect(() => {
    if (selectedPatient && !selectedPatient.matchedAmbulanceId) {
      matchHospitalForPatient(selectedPatient);
    }
  }, [selectedPatient?.id, matchHospitalForPatient]);

  useEffect(() => {
    const autoMatchInterval = setInterval(() => {
      const unmatchedPatient = patients.find(
        (p) =>
          !p.matchedAmbulanceId &&
          p.status !== PatientStatus.TRANSPORTED &&
          !processingRef.current.has(p.id),
      );
      if (unmatchedPatient) {
        matchHospitalForPatient(unmatchedPatient);
      }
    }, 2000);
    return () => clearInterval(autoMatchInterval);
  }, [patients, matchHospitalForPatient]);

  const currentSelectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatient?.id) || selectedPatient,
    [patients, selectedPatient],
  );
  const currentAmbulance = useMemo(
    () =>
      ambulances.find(
        (a) => a.id === currentSelectedPatient?.matchedAmbulanceId,
      ),
    [ambulances, currentSelectedPatient],
  );
  const matchedHospital = useMemo(
    () =>
      hospitals.find(
        (h) => h.id === currentSelectedPatient?.recommendedHospitalId,
      ),
    [hospitals, currentSelectedPatient],
  );

  const renderPatients = () => {
    let filteredPatients = patients.filter(
      (p) => p.name.includes(searchTerm) || p.location.includes(searchTerm),
    );
    if (patientFilter === "critical")
      filteredPatients = filteredPatients.filter(
        (p) => p.status === PatientStatus.CRITICAL,
      );
    if (patientFilter === "danger")
      filteredPatients = filteredPatients.filter(
        (p) => p.status === PatientStatus.DANGER,
      );
    if (patientFilter === "transported")
      filteredPatients = filteredPatients.filter(
        (p) => p.status === PatientStatus.TRANSPORTED,
      );
    if (patientFilter === "transporting")
      filteredPatients = filteredPatients.filter(
        (p) => p.matchedAmbulanceId && p.status !== PatientStatus.TRANSPORTED,
      );

    const stats = {
      total: patients.length,
      critical: patients.filter((p) => p.status === PatientStatus.CRITICAL)
        .length,
      danger: patients.filter((p) => p.status === PatientStatus.DANGER).length,
      transported: patients.filter(
        (p) => p.status === PatientStatus.TRANSPORTED,
      ).length,
    };

    return (
      <div className="h-full flex flex-col gap-6 overflow-hidden animate-in fade-in duration-500 relative">
        {isReportModalOpen && renderReportModal()}
        <div className="grid grid-cols-4 gap-4 shrink-0">
          {[
            {
              label: "전체 케이스",
              value: stats.total,
              icon: Users,
              color: "text-blue-500",
              bg: "bg-blue-500/10",
            },
            {
              label: "응급 1단계",
              value: stats.critical,
              icon: ShieldAlert,
              color: "text-red-500",
              bg: "bg-red-500/10",
            },
            {
              label: "응급 2단계",
              value: stats.danger,
              icon: AlertTriangle,
              color: "text-orange-500",
              bg: "bg-orange-500/10",
            },
            {
              label: "이송 완료",
              value: stats.transported,
              icon: CheckCircle2,
              color: "text-green-500",
              bg: "bg-green-500/10",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className={`p-4 rounded-2xl border border-zinc-800 ${stat.bg} flex items-center gap-4`}
            >
              <div className={`p-2.5 rounded-xl bg-black/40 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 uppercase tracking-widest mb-0.5">
                  {stat.label}
                </p>
                <p className="text-2xl font-normal text-white">
                  {stat.value}
                  <span className="text-sm text-zinc-500 ml-1">건</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 bg-zinc-900/40 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="환자 이름 또는 지역 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/40 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`px-4 py-2 ${isFilterOpen ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-300"} hover:opacity-90 rounded-xl text-sm transition-all flex items-center gap-2`}
                >
                  <Filter className="w-4 h-4" /> 필터
                </button>
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm transition-colors flex items-center gap-2"
                >
                  <BarChart className="w-4 h-4" /> 리포트
                </button>
              </div>
            </div>
            {isFilterOpen && (
              <div className="flex items-center gap-2 p-1 animate-in slide-in-from-top-2 duration-300">
                {[
                  { id: "all", label: "전체" },
                  { id: "critical", label: "1단계(응급)" },
                  { id: "danger", label: "2단계(위험)" },
                  { id: "transporting", label: "이송 중" },
                  { id: "transported", label: "완료" },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => setPatientFilter(chip.id as any)}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all border ${patientFilter === chip.id ? "bg-red-600/20 border-red-500 text-red-500" : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-zinc-900 z-10">
                <tr className="text-[11px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
                  <th className="px-6 py-4 font-normal">환자 정보</th>
                  <th className="px-6 py-4 font-normal">응급 단계</th>
                  <th className="px-6 py-4 font-normal">현재 상태</th>
                  <th className="px-6 py-4 font-normal">위치</th>
                  <th className="px-6 py-4 font-normal">매칭 병원</th>
                  <th className="px-6 py-4 font-normal">담당 구급차</th>
                  <th className="px-6 py-4 font-normal">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-800">
                            <img
                              src={p.imageUrl}
                              alt=""
                              className="w-full h-full object-cover grayscale"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-normal text-white">
                              {p.name}
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              {p.age}세 • {p.gender}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] border ${
                            p.status === PatientStatus.CRITICAL
                              ? "bg-red-500/10 text-red-500 border-red-500/20"
                              : p.status === PatientStatus.DANGER
                                ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                                : p.status === PatientStatus.WARNING
                                  ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                  : p.status === PatientStatus.CAUTION
                                    ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                    : "bg-green-500/10 text-green-500 border-green-500/20"
                          }`}
                        >
                          {p.status === PatientStatus.CRITICAL
                            ? "1단계(응급)"
                            : p.status === PatientStatus.DANGER
                              ? "2단계(위험)"
                              : p.status === PatientStatus.WARNING
                                ? "3단계(경고)"
                                : p.status === PatientStatus.CAUTION
                                  ? "4단계(주의)"
                                  : "5단계(정상)"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${p.status === PatientStatus.TRANSPORTED ? "bg-green-500" : p.matchedAmbulanceId ? "bg-blue-500 animate-pulse" : "bg-zinc-600"}`}
                          />
                          <span className="text-xs text-zinc-300">
                            {p.status === PatientStatus.TRANSPORTED
                              ? "이송 완료"
                              : p.matchedAmbulanceId
                                ? "이송 중"
                                : "매칭 대기"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-zinc-400 truncate max-w-[150px]">
                          {p.location}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-zinc-300">
                          {hospitals.find(
                            (h) => h.id === p.recommendedHospitalId,
                          )?.name || "-"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-400">
                        {p.matchedAmbulanceId || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedPatient(p);
                            setActiveTab("dashboard");
                          }}
                          className="p-2 hover:bg-red-500/10 hover:text-red-500 text-zinc-500 rounded-lg transition-all"
                        >
                          <LocateFixed className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-20 text-center text-zinc-500 text-sm"
                    >
                      조건에 맞는 환자가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderReportModal = () => {
    const stats = {
      total: patients.length,
      successRate: 98.5,
      avgResponse: "4분 12초",
      criticalCount: patients.filter((p) => p.status === PatientStatus.CRITICAL)
        .length,
    };
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
            <div>
              <h2 className="text-2xl font-normal text-white">
                관제 성과 리포트
              </h2>
              <p className="text-sm text-zinc-500">
                실시간 데이터 기반 통합 분석 결과
              </p>
            </div>
            <button
              onClick={() => setIsReportModalOpen(false)}
              className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 transition-colors"
            >
              <Users className="w-6 h-6 rotate-45" />
            </button>
          </div>
          <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-3 text-blue-500 mb-4">
                  <Activity className="w-5 h-5" />
                  <span className="text-[11px] uppercase tracking-widest">
                    이송 성공률
                  </span>
                </div>
                <p className="text-4xl font-normal text-white">
                  {stats.successRate}%
                </p>
              </div>
              <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-3 text-green-500 mb-4">
                  <Clock className="w-5 h-5" />
                  <span className="text-[11px] uppercase tracking-widest">
                    평균 대응 시간
                  </span>
                </div>
                <p className="text-4xl font-normal text-white">
                  {stats.avgResponse}
                </p>
              </div>
              <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-3 text-red-500 mb-4">
                  <ShieldAlert className="w-5 h-5" />
                  <span className="text-[11px] uppercase tracking-widest">
                    중증 환자 대응
                  </span>
                </div>
                <p className="text-4xl font-normal text-white">
                  {stats.criticalCount}건
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
            <button
              onClick={() => setIsReportModalOpen(false)}
              className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm transition-all font-normal"
            >
              분석 완료 및 닫기
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderHospitalDetail = (hospital: Hospital) => {
    return (
      <div className="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden p-2">
        <div className="flex items-center justify-between shrink-0">
          <button
            onClick={() => setSelectedHospital(null)}
            className="group flex items-center gap-2 text-zinc-300 hover:text-white transition-colors"
          >
            <div className="p-1.5 rounded-lg bg-zinc-900 group-hover:bg-zinc-800 border border-zinc-800 shadow-lg">
              <ChevronDown className="w-4 h-4 rotate-90" />
            </div>
            <span className="text-xs uppercase tracking-widest font-bold">
              Back to List
            </span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden shadow-2xl">
            <div
              className={`absolute top-0 left-0 bottom-0 w-1.5 ${hospital.activeTraumaLevel === 1 ? "bg-red-600" : "bg-blue-600"} opacity-70`}
            />
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider ${hospital.activeTraumaLevel === 1 ? "bg-red-500/20 text-red-500 border border-red-500/30" : "bg-blue-500/20 text-blue-500 border border-blue-500/30"}`}
                >
                  LV.{hospital.activeTraumaLevel} TRAUMA CENTER
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider ${hospital.isEROpen ? "bg-green-500/20 text-green-500 border border-green-500/30" : "bg-red-500/20 text-red-500 border border-red-500/30"}`}
                >
                  {hospital.isEROpen ? "OPEN" : "CLOSED"}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {hospital.name}
              </h1>
              <div className="flex items-center gap-4 text-xs text-zinc-200 uppercase tracking-widest font-semibold mt-1">
                <div className="flex items-center gap-1.5">
                  <LocateFixed className="w-3.5 h-3.5 text-blue-400" />{" "}
                  {hospital.location}
                </div>
                <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-4">
                  <Droplets className="w-3.5 h-3.5 text-red-500" /> BLOOD:{" "}
                  {hospital.bloodSupply || "Normal"}
                </div>
                <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-4">
                  <Clock className="w-3.5 h-3.5 text-blue-500" /> DISTANCE:{" "}
                  {hospital.distance}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label: "ER BEDS",
                val: hospital.erBeds.available,
                total: hospital.erBeds.total,
                icon: Truck,
                color: "text-green-500",
                barColor: "bg-green-500",
              },
              {
                label: "ICU BEDS",
                val: hospital.icuBeds.available,
                total: hospital.icuBeds.total,
                icon: Activity,
                color: "text-purple-500",
                barColor: "bg-purple-500",
              },
              {
                label: "OPERATING",
                val: hospital.operatingRooms?.available || 0,
                total: hospital.operatingRooms?.total || 0,
                icon: ShieldAlert,
                color: "text-orange-500",
                barColor: "bg-orange-500",
              },
              {
                label: "SYSTEM STATUS",
                val: "NORMAL",
                isStatus: true,
                icon: Monitor,
                color: "text-blue-500",
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-black/40 border border-zinc-800/50 rounded-2xl p-4 flex flex-col justify-between h-28 shadow-xl hover:border-zinc-700 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-[0.2em]">
                    {stat.label}
                  </span>
                  <stat.icon
                    className={`w-4 h-4 ${stat.color} opacity-50 group-hover:opacity-100 transition-opacity`}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-3xl font-bold text-white">
                    {stat.val}{" "}
                    {!stat.isStatus && (
                      <span className="text-sm text-zinc-400 font-medium">
                        / {stat.total}
                      </span>
                    )}
                  </span>
                  {stat.isStatus && (
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">
                      Neural System Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderHospitals = () => {
    if (selectedHospital) return renderHospitalDetail(selectedHospital);
    let filteredHospitals = [...hospitals];
    if (hospitalTab === "lv1")
      filteredHospitals = hospitals.filter((h) => h.activeTraumaLevel === 1);
    if (hospitalTab === "lv2")
      filteredHospitals = hospitals.filter((h) => h.activeTraumaLevel >= 2);
    if (hospitalTab === "available")
      filteredHospitals = hospitals.filter((h) => h.erBeds.available > 5);

    return (
      <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-normal text-white flex items-center gap-3">
              <HospitalIcon className="w-6 h-6 text-blue-500" /> 의료센터 가용성
              현황
            </h2>
            <p className="text-xs text-zinc-200 ml-9">
              실시간 병상 가용 정보 및 외상센터 등급별 분류
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-zinc-900/60 p-1 rounded-2xl border border-zinc-800 w-fit shrink-0">
          {[
            { id: "all", label: "전체", count: hospitals.length },
            {
              id: "lv1",
              label: "중증외상 (Lv.1)",
              count: hospitals.filter((h) => h.activeTraumaLevel === 1).length,
            },
            {
              id: "lv2",
              label: "지역응급 (Lv.2+)",
              count: hospitals.filter((h) => h.activeTraumaLevel >= 2).length,
            },
            {
              id: "available",
              label: "병상 여유",
              count: hospitals.filter((h) => h.erBeds.available > 5).length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setHospitalTab(tab.id as any)}
              className={`px-6 py-2 rounded-xl text-sm transition-all flex items-center gap-2 ${hospitalTab === tab.id ? "bg-zinc-800 text-white shadow-lg border border-zinc-700" : "text-zinc-300 hover:text-white hover:bg-white/5"}`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md ${hospitalTab === tab.id ? "bg-blue-600 text-white" : "bg-zinc-700 text-white"}`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar pr-2 pb-6">
          {filteredHospitals.map((h) => (
            <div
              key={h.id}
              onClick={() => setSelectedHospital(h)}
              className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-5 hover:border-blue-500/50 hover:bg-blue-500/[0.02] transition-all group relative overflow-hidden flex flex-col cursor-pointer shadow-lg hover:shadow-blue-500/10"
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${h.activeTraumaLevel === 1 ? "bg-red-600" : "bg-blue-600"} opacity-30 group-hover:opacity-100 transition-opacity`}
              />
              <div className="flex justify-between items-start mb-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-normal text-white truncate group-hover:text-blue-400 transition-colors">
                    {h.name}
                  </h3>
                  <p className="text-xs text-zinc-200 truncate flex items-center gap-1.5">
                    <LocateFixed className="w-3 h-3" /> {h.location}
                  </p>
                </div>
                <div
                  className={`px-2.5 py-1 rounded-full text-[10px] font-normal border ${h.isEROpen ? "bg-green-500/5 text-green-400 border-green-500/20" : "bg-red-500/5 text-red-400 border-red-500/20"}`}
                >
                  {h.isEROpen ? "● 응급실 개방" : "○ 응급실 폐쇄"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-black/40 p-3 rounded-2xl border border-zinc-800/50 group-hover:border-zinc-700/50 transition-colors">
                  <div className="flex items-center justify-between mb-2 text-zinc-200">
                    <span className="text-[10px] uppercase tracking-widest">
                      일반 병상
                    </span>
                    <Truck className="w-3 h-3" />
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl text-white font-normal tabular-nums">
                      {h.erBeds.available}
                    </span>
                    <span className="text-xs text-white mb-1">
                      / {h.erBeds.total}
                    </span>
                  </div>
                </div>
                <div className="bg-black/40 p-3 rounded-2xl border border-zinc-800/50 group-hover:border-zinc-700/50 transition-colors">
                  <div className="flex items-center justify-between mb-2 text-zinc-200">
                    <span className="text-[10px] uppercase tracking-widest">
                      중환자 병상
                    </span>
                    <Activity className="w-3 h-3" />
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl text-purple-400 font-normal tabular-nums">
                      {h.icuBeds.available}
                    </span>
                    <span className="text-xs text-white mb-1">
                      / {h.icuBeds.total}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="h-full flex flex-col lg:flex-row gap-4 overflow-hidden">
      <div className="w-full lg:w-[13%] flex flex-col bg-zinc-950/40 rounded-2xl border border-zinc-900 overflow-hidden shadow-2xl shrink-0">
        <div className="p-1 border-b border-zinc-900 bg-zinc-900/10 shrink-0 flex flex-col">
          <div className="flex border-b border-zinc-900/50">
            {[
              {
                id: "waiting",
                label: "대기",
                count: patients.filter(
                  (p) =>
                    p.status !== PatientStatus.TRANSPORTED &&
                    !p.matchedAmbulanceId,
                ).length,
              },
              {
                id: "transporting",
                label: "이송중",
                count: patients.filter(
                  (p) =>
                    p.status !== PatientStatus.TRANSPORTED &&
                    !!p.matchedAmbulanceId,
                ).length,
              },
              {
                id: "completed",
                label: "완료",
                count: patients.filter(
                  (p) => p.status === PatientStatus.TRANSPORTED,
                ).length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPatientListTab(tab.id as any)}
                className={`flex-1 py-2 text-[12px] font-normal transition-all relative flex flex-col items-center gap-0.5 ${patientListTab === tab.id ? "text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] font-normal leading-none px-1 rounded-sm ${patientListTab === tab.id ? "text-red-500" : "text-zinc-600"}`}
                >
                  {tab.count}
                </span>
                {patientListTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]"></div>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between px-3 py-1.5">
            <h3 className="text-[11px] font-normal uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1.5">
              <Activity className="w-3 h-3" /> FEED
            </h3>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {patients.filter((p) => {
            if (patientListTab === "waiting")
              return (
                p.status !== PatientStatus.TRANSPORTED && !p.matchedAmbulanceId
              );
            if (patientListTab === "transporting")
              return (
                p.status !== PatientStatus.TRANSPORTED && !!p.matchedAmbulanceId
              );
            if (patientListTab === "completed")
              return p.status === PatientStatus.TRANSPORTED;
            return true;
          }).length > 0 ? (
            patients
              .filter((p) => {
                if (patientListTab === "waiting")
                  return (
                    p.status !== PatientStatus.TRANSPORTED &&
                    !p.matchedAmbulanceId
                  );
                if (patientListTab === "transporting")
                  return (
                    p.status !== PatientStatus.TRANSPORTED &&
                    !!p.matchedAmbulanceId
                  );
                if (patientListTab === "completed")
                  return p.status === PatientStatus.TRANSPORTED;
                return true;
              })
              .map((p) => (
                <PatientCard
                  key={p.id}
                  patient={p}
                  isSelected={currentSelectedPatient?.id === p.id}
                  isMatching={processingIds.has(p.id)}
                  onClick={setSelectedPatient}
                  ambulanceStatus={
                    ambulances.find((a) => a.id === p.matchedAmbulanceId)
                      ?.activity
                  }
                />
              ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center opacity-40">
              <CheckCircle2 className="w-4.5 h-4.5 text-zinc-700 mb-2" />
              <p className="text-[12px] font-normal text-zinc-300 uppercase tracking-widest">
                Empty
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl min-w-0 z-0">
        <button
          type="button"
          onClick={() => setIsAlertVoiceEnabled((prev) => !prev)}
          className={`absolute top-3 right-3 z-[999] pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-full border text-[12px] transition-all backdrop-blur shadow-lg ${
            isAlertVoiceEnabled
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200"
              : "bg-zinc-900/90 border-zinc-700 text-zinc-200"
          }`}
        >
          {isAlertVoiceEnabled ? (
            <Volume2 className="w-3.5 h-3.5" />
          ) : (
            <VolumeX className="w-3.5 h-3.5" />
          )}
          <span>음성 알림</span>
        </button>
        {currentSelectedPatient ? (
          <ErrorBoundary>
            <LiveMap
              patient={currentSelectedPatient}
              hospital={hospitals.find(
                (h) => h.id === currentSelectedPatient.recommendedHospitalId,
              )}
              ambulances={ambulances}
              patients={patients}
              onArrival={handlePatientArrival}
            />
          </ErrorBoundary>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#050505]">
            <Monitor className="w-14 h-14 text-zinc-700 opacity-30 animate-pulse" />
            <p className="mt-4 text-zinc-300 text-[14px] font-normal uppercase tracking-widest">
              Select Case
            </p>
          </div>
        )}
      </div>

      <div className="w-full lg:w-[17%] flex flex-col bg-zinc-950/40 rounded-2xl border border-zinc-900 shadow-2xl shrink-0 relative z-[30]">
        {currentSelectedPatient ? (
          <>
            <div className="p-2 space-y-2 flex-1 overflow-y-auto custom-scrollbar overflow-x-visible flex flex-col">
              <div className="bg-zinc-900/50 p-2.5 rounded-2xl border border-zinc-800/80 shadow-xl relative overflow-hidden shrink-0">
                <div className="flex gap-2.5 items-start relative z-10">
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-800 shrink-0 shadow-lg relative self-center">
                    <img
                      src={currentSelectedPatient.imageUrl}
                      alt={currentSelectedPatient.name}
                      className="w-full h-full object-cover grayscale-[0.2]"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h2 className="text-[17px] font-normal text-white tracking-tighter truncate leading-none">
                        {currentSelectedPatient.name}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] text-zinc-300 font-normal uppercase tracking-tight">
                        {currentSelectedPatient.age}세 •{" "}
                        {currentSelectedPatient.gender}
                      </p>
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-normal border uppercase tracking-wider ${
                          currentSelectedPatient.status ===
                          PatientStatus.CRITICAL
                            ? "bg-red-600/10 text-red-500 border-red-500/30"
                            : currentSelectedPatient.status ===
                                PatientStatus.DANGER
                              ? "bg-orange-500/10 text-orange-500 border-orange-900/40"
                              : currentSelectedPatient.status ===
                                  PatientStatus.WARNING
                                ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                                : currentSelectedPatient.status ===
                                    PatientStatus.CAUTION
                                  ? "bg-blue-500/10 text-blue-500 border-blue-900/40"
                                  : currentSelectedPatient.status ===
                                      PatientStatus.NORMAL
                                    ? "bg-green-500/10 text-green-500 border-green-900/40"
                                    : currentSelectedPatient.status ===
                                        PatientStatus.PENDING
                                      ? "bg-zinc-500/10 text-zinc-300 border-zinc-700/40"
                                      : "bg-zinc-500/10 text-zinc-500 border-zinc-900/40"
                        }`}
                      >
                        {currentSelectedPatient.status ===
                        PatientStatus.CRITICAL
                          ? "응급(Critical)"
                          : currentSelectedPatient.status ===
                              PatientStatus.DANGER
                            ? "위험(Danger)"
                            : currentSelectedPatient.status ===
                                PatientStatus.WARNING
                              ? "경고(Warning)"
                              : currentSelectedPatient.status ===
                                  PatientStatus.CAUTION
                                ? "주의(Caution)"
                                : currentSelectedPatient.status ===
                                    PatientStatus.NORMAL
                                  ? "정상(Normal)"
                                  : currentSelectedPatient.status ===
                                      PatientStatus.PENDING
                                    ? "매칭 대기"
                                    : "이송 완료"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-zinc-900/20 rounded-2xl border border-zinc-800/80 overflow-visible shrink-0 transition-all duration-300 ease-in-out">
                <div className="p-2 flex items-center justify-between">
                  <h3 className="text-[12px] font-normal text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-red-600" /> BIO STREAM
                  </h3>
                </div>
                <div className="px-2 pb-2 grid grid-cols-2 gap-2">
                  <div className="bg-black/40 p-1.5 rounded-xl border border-zinc-900">
                    <p className="text-[11px] text-zinc-300 font-normal uppercase text-center">
                      BPM
                    </p>
                    <p className="text-[17px] font-normal text-red-600 text-center tracking-tighter">
                      {currentSelectedPatient.vitals.heartRate}
                    </p>
                  </div>
                  <div className="bg-black/40 p-1.5 rounded-xl border border-zinc-900">
                    <p className="text-[11px] text-zinc-300 font-normal uppercase text-center">
                      SpO2
                    </p>
                    <p className="text-[17px] font-normal text-blue-600 text-center tracking-tighter">
                      {currentSelectedPatient.vitals.oxygenLevel}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-zinc-900/30 p-2 rounded-2xl border border-zinc-800/80 shrink-0 overflow-visible">
                <h3 className="text-[12px] font-normal text-zinc-300 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5 text-blue-500" /> TELEMETRY
                </h3>
                <div className="grid grid-cols-2 gap-1">
                  <BioMetricCard
                    label="BG"
                    value={Math.round(
                      currentSelectedPatient.vitals.bloodGlucose || 0,
                    )}
                    icon={Droplets}
                    color="text-yellow-500"
                    description="혈당 수치"
                  />
                  <BioMetricCard
                    label="HRV"
                    value={currentSelectedPatient.vitals.hrv}
                    unit="ms"
                    icon={Wind}
                    color="text-teal-500"
                    description="심박 변이도"
                  />
                  <BioMetricCard
                    label="RHR"
                    value={currentSelectedPatient.vitals.restingHR}
                    icon={Activity}
                    color="text-zinc-500"
                    description="안정 심박수"
                  />
                  <BioMetricCard
                    label="Stress"
                    value={Math.round(
                      currentSelectedPatient.vitals.stressLevel || 0,
                    )}
                    icon={Cpu}
                    color="text-purple-500"
                    description="스트레스"
                  />
                </div>
              </div>
              <div className="bg-zinc-900/30 p-2 rounded-2xl border border-zinc-800/80 flex-1 flex flex-col min-h-0 mb-1">
                <h3 className="text-[12px] font-normal text-zinc-300 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <BrainCircuit className="w-3.5 h-3.5 text-purple-600" />{" "}
                  AI분석 결과
                </h3>
                <div className="p-2 bg-black/40 rounded-xl border border-zinc-900 shadow-inner overflow-y-auto custom-scrollbar flex-1">
                  <div className="text-[12px] text-zinc-200 leading-relaxed font-normal whitespace-pre-line">
                    {currentSelectedPatient.aiAnalysis || "분석 대기 중..."}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-2 pt-0 shrink-0 bg-transparent border-t border-zinc-900/50">
              <div className="bg-zinc-900/30 p-2 rounded-2xl border border-zinc-800/80">
                <h3 className="text-[12px] font-normal text-zinc-300 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <HospitalIcon className="w-3.5 h-3.5 text-blue-400" />{" "}
                  매칭의료센터
                </h3>
                {matchedHospital ? (
                  <div className="p-2 bg-black/40 rounded-xl border border-zinc-900 shadow-xl space-y-2">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-start gap-2 pt-0.5">
                        <h4 className="text-[16px] font-normal text-white tracking-tight leading-none truncate flex-1">
                          {matchedHospital.name}
                        </h4>
                        {currentAmbulance && (
                          <div className="bg-red-600 px-3 py-1.5 rounded-full shadow-[0_4px_12px_rgba(239,68,68,0.4)] flex items-center shrink-0 border border-red-500/50 -mt-1">
                            <span className="text-[13px] font-normal text-white leading-none whitespace-nowrap tracking-tighter">
                              {currentAmbulance.unitName}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-[12px] text-zinc-400 font-normal uppercase truncate">
                        {matchedHospital.location}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-900 flex flex-col items-center">
                        <span className="text-[9px] text-zinc-500 uppercase font-normal tracking-widest">
                          ER BEDS
                        </span>
                        <span
                          className={`text-[13px] font-normal ${matchedHospital.erBeds.available > 0 ? "text-green-500" : "text-red-500"}`}
                        >
                          {matchedHospital.erBeds.available}/
                          {matchedHospital.erBeds.total}
                        </span>
                      </div>
                      <div className="bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-900 flex flex-col items-center">
                        <span className="text-[9px] text-zinc-500 uppercase font-normal tracking-widest">
                          DIST
                        </span>
                        <span className="text-[13px] font-normal text-zinc-200">
                          {matchedHospital.distance}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-black/20 rounded-xl border border-zinc-900 border-dashed flex flex-col items-center justify-center gap-1.5">
                    <Loader2 className="w-4 h-4 text-zinc-700 animate-spin" />
                    <p className="text-[11px] text-zinc-600 uppercase tracking-widest">
                      AI 분석 중...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-zinc-400 flex flex-col items-center justify-center h-full gap-5">
            <ShieldAlert className="w-10 h-10 opacity-30" />
            <p className="text-[12px] font-normal uppercase tracking-widest">
              Case Standby
            </p>
          </div>
        )}
      </div>
    </div>
  );

  if (activeTab === "mobile") {
    return <MobileRecorder onBack={() => setActiveTab("dashboard")} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#020202] text-slate-100 font-sans">
      <aside className="w-16 lg:w-20 border-r border-zinc-800 flex flex-col bg-zinc-950/80 backdrop-blur-xl z-50 shrink-0">
        <div className="flex flex-col items-center py-6 h-full">
          <div className="mb-10 shrink-0">
            <div
              className="w-11 h-11 lg:w-12 lg:h-12 bg-white rounded-xl flex items-center justify-center shadow-2xl p-2 border-2 border-red-600 cursor-pointer hover:rotate-12 transition-transform"
              onClick={() => setActiveTab("dashboard")}
            >
              <Emblem119 className="w-full h-full" />
            </div>
          </div>
          <nav className="space-y-5 flex-1 w-full px-2">
            {[
              { id: "dashboard", icon: Monitor, label: "관제" },
              { id: "patients", icon: Users, label: "목록" },
              { id: "hospitals", icon: HospitalIcon, label: "병원" },
              { type: "divider" },
              { id: "crime", icon: ShieldAlert, label: "범죄 관제" },
              { id: "crime-list", icon: List, label: "유저 목록" },
              { type: "divider" },
              { id: "delete-members", icon: UserMinus, label: "회원 삭제", action: handleDeleteAll, isDestructive: true },
            ].map((item, idx) =>
              item.type === "divider" ? (
                <div
                  key={`divider-${idx}`}
                  className="w-full h-px bg-zinc-800 my-2"
                />
              ) : (
                <button
                  key={item.id}
                  onClick={() => item.action ? item.action() : setActiveTab(item.id as any)}
                  title={item.label}
                  className={`w-full flex items-center justify-center p-3.5 rounded-xl transition-all ${
                    item.isDestructive 
                      ? "text-zinc-600 hover:bg-red-900/20 hover:text-red-500"
                      : activeTab === item.id 
                        ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]" 
                        : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                  }`}
                >
                  {/* @ts-ignore */}
                  <item.icon className="w-6.5 h-6.5 shrink-0" />
                </button>
              ),
            )}
          </nav>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-zinc-800 px-6 flex items-center justify-between bg-zinc-950/50 backdrop-blur-md z-40 shrink-0">
          <div className="flex items-center gap-9 min-w-0 flex-1 overflow-hidden">
            <h2 className="text-[14px] font-normal uppercase tracking-[0.4em] text-zinc-300 shrink-0">
              관제시스템 v1
            </h2>
            <div className="hidden lg:flex items-center gap-6 shrink-0 border-l border-zinc-800 pl-6 pr-6">
              <div className="flex flex-col">
                <span className="text-[9px] text-zinc-500 font-normal tracking-widest uppercase mb-0.5">
                  Control Center
                </span>
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[13px] font-normal text-zinc-200">
                    강남 제1관제센터
                  </span>
                  <span className="text-[10px] font-normal bg-zinc-800 text-zinc-400 px-1 rounded">
                    GN-01
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-zinc-500 font-normal tracking-widest uppercase mb-0.5">
                  Duty Operator
                </span>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-[13px] font-normal text-zinc-200">
                    박지성 사원
                  </span>
                  <span className="text-[10px] font-normal bg-zinc-800 text-zinc-400 px-1 rounded">
                    OP-77
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 overflow-hidden">
            {["dashboard", "patients", "hospitals"].includes(activeTab) && (
              <div className="hidden xl:flex items-center gap-6 border-l border-zinc-800 pl-6 shrink-0">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-white uppercase font-normal tracking-tighter mb-0.5">
                    전체차량
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-zinc-400 opacity-60" />
                    <span className="text-[16px] text-zinc-300 font-normal leading-none">
                      {ambulanceStats.total}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-white uppercase font-normal tracking-tighter mb-0.5">
                    이송중
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Siren className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                    <span className="text-[16px] text-red-500 font-normal leading-none">
                      {ambulanceStats.dispatched}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-white uppercase font-normal tracking-tighter mb-0.5">
                    대기차량
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-green-500 opacity-80" />
                    <span className="text-[16px] text-green-500 font-normal leading-none">
                      {ambulanceStats.available}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-white uppercase font-normal tracking-tighter mb-0.5">
                    불가/정비
                  </span>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-zinc-500 opacity-60" />
                    <span className="text-[16px] text-zinc-500 font-normal leading-none">
                      {ambulanceStats.busy}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-4 shrink-0 border-l border-zinc-800 pl-6">
              <div
                className={`flex px-3 py-1.5 rounded-lg border items-center gap-2.5 transition-all ${isAiMatchingEnabled ? "bg-purple-600/10 border-purple-500/20 shadow-[0_0_10px_rgba(147,51,234,0.1)]" : "bg-zinc-900/50 border-zinc-800"}`}
              >
                <Cpu
                  className={`w-5 h-5 ${isAiMatchingEnabled ? "text-purple-500 animate-pulse" : "text-zinc-600"}`}
                />
                <span
                  className={`text-[12px] font-normal uppercase ${isAiMatchingEnabled ? "text-purple-500" : "text-zinc-300"}`}
                >
                  Neural Active
                </span>
              </div>
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)] animate-pulse"></div>
            </div>
          </div>
        </header>
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "patients" && renderPatients()}
          {activeTab === "hospitals" && renderHospitals()}
          {activeTab === "crime" && <CrimeDashboard initialSelectedCaseId={selectedCrimeId} />}
          {activeTab === "crime-list" && (
            <CrimeList
              onSelectCase={(id) => {
                setSelectedCrimeId(id);
                setActiveTab("crime");
              }}
            />
          )}
        </div>
      </main>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 3px; }.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }.custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }.font-diag-common { font-family: 'Inter', 'Malgun Gothic', sans-serif; font-size: 1.0rem; }`}</style>
    </div>
  );
};

export default App;
