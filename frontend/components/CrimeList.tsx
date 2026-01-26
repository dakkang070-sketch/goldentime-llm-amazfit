import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Clock,
  MapPin,
  AlertTriangle,
  RefreshCw,
  Trash2
} from "lucide-react";

interface CrimeCase {
  _id: string;
  studentId?: string;
  detectedAt: string;
  transcript?: string;
  audioUrl?: string;
  location: {
    address: string;
  };
  analysisResult: {
    category: string;
    severity: string;
    confidence: number;
    reasoning?: string;
    primaryEmotion?: string;
    keywords?: string[];
  };
  status: string;
}

const CrimeList = () => {
  const [cases, setCases] = useState<CrimeCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const fetchCases = async () => {
    setLoading(true);
    try {
      let url = "/api/school-violence/cases?";
      if (filterSeverity !== "all") url += `&severity=${filterSeverity}`;
      if (filterStatus !== "all") url += `&status=${filterStatus}`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setCases(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch cases", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [filterSeverity, filterStatus]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical": return "text-red-500 bg-red-500/10 border-red-500/20";
      case "Warning": return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      case "Caution": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      default: return "text-green-500 bg-green-500/10 border-green-500/20";
    }
  };

  const sanitizeTranscript = (value?: string) =>
    String(value || "")
      .replace(/<\|.*?\|>/g, "")
      .replace(/\[keywords\]\s*:\s*.*$/gim, "")
      .replace(/\[키워드\]\s*:\s*.*$/gim, "")
      .trim();

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("이 범죄 기록을 영구적으로 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/school-violence/cases/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setCases((prev) => prev.filter((c) => c._id !== id));
      } else {
        alert("삭제 실패: " + data.error);
      }
    } catch (error) {
      console.error("Failed to delete case", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020202] text-zinc-300 p-6">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-red-500" />
            유저 리스트
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            유저 리스트 상세 정보를 확인할 수 있습니다.
          </p>
        </div>
        <button 
          onClick={fetchCases}
          className="p-2 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors border border-zinc-800"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
          <span className="px-3 text-sm font-medium text-zinc-500">위험도</span>
          {["all", "Critical", "Warning", "Caution"].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                filterSeverity === sev 
                  ? "bg-zinc-800 text-white shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {sev === "all" ? "전체" : sev}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
          <span className="px-3 text-sm font-medium text-zinc-500">상태</span>
          {["all", "Reported", "Resolved"].map((stat) => (
            <button
              key={stat}
              onClick={() => setFilterStatus(stat)}
              className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                filterStatus === stat 
                  ? "bg-zinc-800 text-white shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {stat === "all" ? "전체" : stat}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {loading && cases.length === 0 ? (
           <div className="flex items-center justify-center h-64">
             <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
           </div>
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            <ShieldAlert className="w-12 h-12 mb-4 opacity-20" />
            <p>표시할 범죄 내역이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            {cases.map((item) => (
              <div 
                key={item._id}
                onClick={() =>
                  setSelectedCaseId((prev) => (prev === item._id ? null : item._id))
                }
                className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl border ${getSeverityColor(item.analysisResult.severity)}`}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded border ${getSeverityColor(item.analysisResult.severity)}`}>
                          {item.analysisResult.severity === "Critical"
                            ? "긴급"
                            : item.analysisResult.severity === "Caution" ||
                                item.analysisResult.severity === "Warning"
                              ? "주의"
                              : item.analysisResult.severity === "Uncertain"
                                ? "불확실"
                                : "정상"}
                        </span>
                        <h3 className="text-sm font-bold text-zinc-100">
                          {item.analysisResult.category}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 text-zinc-400 text-xs mt-1">
                         <div className="flex items-center gap-1">
                           <Clock className="w-3 h-3" />
                           <span>{new Date(item.detectedAt).toLocaleString()}</span>
                         </div>
                         <div className="flex items-center gap-1">
                           <MapPin className="w-3 h-3" />
                           <span>{item.location.address || "위치 정보 없음"}</span>
                         </div>
                      </div>
                      {item.studentId && (
                        <div className="mt-1 text-zinc-500 text-[10px]">
                          신고자: {item.studentId}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      item.status === 'Reported' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                      item.status === 'Resolved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                      {item.status}
                    </div>

                    <button
                      onClick={(e) => handleDelete(item._id, e)}
                      className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-red-500 transition-colors"
                      title="기록 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {selectedCaseId === item._id && (
                  <div className="mt-3 border-t border-zinc-800/60 pt-3 text-xs text-zinc-300 space-y-2">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <span className="text-zinc-500">감지 시간</span>
                      <span>{new Date(item.detectedAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <span className="text-zinc-500">위치</span>
                      <span>{item.location?.address || "위치 정보 없음"}</span>
                    </div>
                    {item.studentId && (
                      <div className="flex items-center gap-2 text-zinc-400">
                        <span className="text-zinc-500">신고자</span>
                        <span>{item.studentId}</span>
                      </div>
                    )}
                    {item.analysisResult?.primaryEmotion && (
                      <div className="flex items-center gap-2 text-zinc-400">
                        <span className="text-zinc-500">주요 감정</span>
                        <span>{item.analysisResult.primaryEmotion}</span>
                      </div>
                    )}
                    {item.analysisResult?.keywords && item.analysisResult.keywords.length > 0 && (
                      <div className="flex items-center gap-2 text-zinc-400">
                        <span className="text-zinc-500">키워드</span>
                        <span>{item.analysisResult.keywords.join(", ")}</span>
                      </div>
                    )}
                    {item.transcript && (
                      <div className="text-zinc-400">
                        <div className="text-zinc-500 mb-1">음성 인식 내용</div>
                        <div className="bg-black/40 p-2 rounded-md border border-zinc-800 whitespace-pre-wrap">
                          {sanitizeTranscript(item.transcript)}
                        </div>
                      </div>
                    )}
                    {item.analysisResult?.reasoning && (
                      <div className="text-zinc-400">
                        <div className="text-zinc-500 mb-1">AI 상황 분석</div>
                        <div className="bg-black/40 p-2 rounded-md border border-zinc-800 whitespace-pre-wrap">
                          {item.analysisResult.reasoning}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CrimeList;
