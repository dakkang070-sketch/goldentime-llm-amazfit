class ApiService {
  private baseUrl = "/api";
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token");
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const token = this.getToken();
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error("API request failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      };
    }
  }

  async login(credentials: { email: string; password: string }) {
    const response = await this.request<{ token: string }>(
      "/api/controllers/login",
      {
        method: "POST",
        body: JSON.stringify(credentials),
      },
    );

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async getEmergencyCases(params: { status?: string } = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== "all") {
      query.append("status", params.status);
    }
    return this.request(
      `/controllers/emergency-cases${query.toString() ? `?${query.toString()}` : ""}`,
    );
  }

  async getHospitals() {
    return this.request("/controllers/hospitals");
  }

  async getParamedics() {
    // 전체 응급구조사 조회 (available만이 아닌 전체)
    return this.request("/paramedics");
  }

  async getBiometricData(patientId: string) {
    return this.request(`/biometric/${patientId}`);
  }

  logout() {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
    }
  }

  // AI 환자 분석 요청
  async analyzePatient(patientId: string, patientData?: any) {
    return this.request(`/emergency/${patientId}/analyze`, {
      method: "POST",
      body: JSON.stringify(patientData || {}),
    });
  }

  // AI 병원 매칭 요청
  async matchHospital(patientId: string, patientData?: any) {
    return this.request(`/emergency/${patientId}/match-hospital`, {
      method: "POST",
      body: JSON.stringify(patientData || {}),
    });
  }

  // 지도용 실시간 병원 데이터 조회
  async getMapHospitals() {
    return this.request("/emergency/hospitals/map-data");
  }

  // 학교폭력/범죄 데이터 조회
  async getSchoolViolenceCases() {
    return this.request("/school-violence/cases");
  }

  async submitSchoolViolenceFeedback(caseId: string, feedback: any) {
    return this.request(`/school-violence/cases/${caseId}/feedback`, {
      method: "POST",
      body: JSON.stringify(feedback),
    });
  }

  async exportTrainingData() {
    return this.request("/school-violence/training/export", {
      method: "POST",
    });
  }

  // Audio Reporting
  async reportSchoolViolenceAudio(
    audioBase64: string,
    biometrics: any,
    location: any,
    hintText?: string,
  ) {
    return this.request("/school-violence/report-audio", {
      method: "POST",
      body: JSON.stringify({
        audioBase64,
        biometrics,
        location,
        hintText,
      }),
    });
  }

  // Text Reporting
  async reportSchoolViolence(
    transcript: string,
    biometrics: any,
    location: any,
    studentId?: string,
  ) {
    return this.request("/school-violence/report", {
      method: "POST",
      body: JSON.stringify({
        transcript,
        biometrics,
        location,
        studentId,
      }),
    });
  }
}

export const apiService = new ApiService();
