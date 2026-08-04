/**
 * 최적 경로 계산 서비스
 * 응급 상황에서 최적 경로 및 ETA 계산
 */

const { calculateDistance } = require('./geoService');
const logger = require('../utils/logger');
const { setActiveRoute, getActiveRoute, deleteActiveRoute } = require('./routeCacheService');

class RouteService {
  
  /**
   * 인스턴스를 초기화합니다.
   */
  constructor() {
    this.trafficData = new Map(); // 실시간 교통 정보 캐시
    this.roadConditions = new Map(); // 도로 상황 정보
    this.activeRoutes = new Map(); // 활성 경로 추적 정보
  }

  /**
   * 경로 추적용 식별자를 생성합니다.
   */
  generateRouteId() {
    return `route-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * 출발지와 목적지 기준으로 거리, ETA, 경유지까지 포함한 경로 요약을 계산합니다.
   */
  async calculateOptimalRoute(options) {
    const {
      origin,
      destination, 
      priority = 'balanced', // 'fastest', 'shortest', 'balanced'
      avoidTraffic = true,
      emergencyMode = false
    } = options;

    try {
      // 직선 거리 계산
      const straightDistance = calculateDistance(origin, destination);
      
      // 실제 도로 거리 계산 (직선 거리 * 1.4 근사치)
      const roadDistance = Math.round(straightDistance * 1.4);
      
      // 기본 이동 시간 계산
      let baseDuration = this.calculateBaseDuration(roadDistance, emergencyMode);
      
      // 교통 상황 반영
      let adjustedDuration = baseDuration;
      if (avoidTraffic) {
        adjustedDuration = await this.applyTrafficConditions(baseDuration, origin, destination);
      }
      
      // 응급 상황 시간 단축 (사이렌, 신호 우선 등)
      if (emergencyMode) {
        adjustedDuration = Math.round(adjustedDuration * 0.7); // 30% 시간 단축
      }

      // 경유 포인트 계산
      const waypoints = this.calculateWaypoints(origin, destination, roadDistance);

      const routeId = this.generateRouteId();
      const routeSummary = {
        routeId,
        distance: roadDistance,
        duration: adjustedDuration,
        route: {
          origin,
          destination,
          waypoints
        },
        traffic: {
          level: this.getTrafficLevel(origin, destination),
          delayMinutes: adjustedDuration - baseDuration
        },
        emergencyOptimized: emergencyMode,
        calculatedAt: new Date()
      };

      this.activeRoutes.set(routeId, {
        routeId,
        origin,
        destination,
        originalDistance: roadDistance,
        emergencyOptimized: emergencyMode,
        calculatedAt: routeSummary.calculatedAt,
      });
      setActiveRoute(routeId, {
        routeId,
        origin,
        destination,
        originalDistance: roadDistance,
        emergencyOptimized: emergencyMode,
        calculatedAt: routeSummary.calculatedAt,
      }).catch((error) => {
        logger.warn('활성 경로 cache 저장 실패', { routeId, error: error.message });
      });

      return routeSummary;

    } catch (error) {
      logger.error('경로 계산 실패', error);
      
      // 기본 경로 반환 (실패 시 대안)
      return this.getBasicRoute(origin, destination);
    }
  }

  /**
   * 거리와 응급 주행 여부를 기준으로 기본 이동 시간을 추정합니다.
   */
  calculateBaseDuration(distance, emergencyMode = false) {
    // 도로 종류별 평균 속도 (km/h)
    const speeds = {
      highway: emergencyMode ? 90 : 70,     // 고속도로
      arterial: emergencyMode ? 60 : 40,    // 간선도로
      local: emergencyMode ? 40 : 25        // 일반도로
    };

    // 거리별 도로 비율 가정
    let duration = 0;
    
    if (distance > 20000) { // 20km 이상 - 고속도로 주로 이용
      duration += (distance * 0.7) / speeds.highway * 60; // 70% 고속도로
      duration += (distance * 0.3) / speeds.arterial * 60; // 30% 간선도로
    } else if (distance > 5000) { // 5-20km - 간선도로 주로 이용
      duration += (distance * 0.2) / speeds.highway * 60; // 20% 고속도로
      duration += (distance * 0.6) / speeds.arterial * 60; // 60% 간선도로
      duration += (distance * 0.2) / speeds.local * 60; // 20% 일반도로
    } else { // 5km 이하 - 일반도로/간선도로
      duration += (distance * 0.3) / speeds.arterial * 60; // 30% 간선도로
      duration += (distance * 0.7) / speeds.local * 60; // 70% 일반도로
    }

    return Math.round(duration);
  }

  /**
   * 시간대, 요일, 날씨를 반영해 기본 이동 시간을 보정합니다.
   */
  async applyTrafficConditions(baseDuration, origin, destination) {
    try {
      const timeOfDay = new Date().getHours();
      const dayOfWeek = new Date().getDay(); // 0: 일요일, 6: 토요일
      
      let trafficMultiplier = 1.0;

      // 외부 교통 API가 없으므로 시간대별 혼잡 패턴을 계수로 근사합니다.
      if (timeOfDay >= 7 && timeOfDay <= 9) { // 출근 시간
        trafficMultiplier = 1.5;
      } else if (timeOfDay >= 17 && timeOfDay <= 19) { // 퇴근 시간
        trafficMultiplier = 1.6;
      } else if (timeOfDay >= 12 && timeOfDay <= 14) { // 점심 시간
        trafficMultiplier = 1.2;
      } else if (timeOfDay >= 22 || timeOfDay <= 6) { // 심야/새벽
        trafficMultiplier = 0.8;
      }

      // 요일별 조정
      if (dayOfWeek === 0 || dayOfWeek === 6) { // 주말
        trafficMultiplier *= 0.9;
      }

      // 날씨/특수 상황 (추후 확장 가능)
      const weatherCondition = await this.getWeatherCondition();
      if (weatherCondition === 'rain' || weatherCondition === 'snow') {
        // 악천후는 평균 속도 저하를 반영해 동일 경로라도 ETA를 더 길게 잡습니다.
        trafficMultiplier *= 1.3;
      }

      return Math.round(baseDuration * trafficMultiplier);

    } catch (error) {
      logger.warn('교통 상황 적용 실패', error);
      return baseDuration;
    }
  }

  /**
   * 장거리 이동 시 중간 경유지 좌표를 단순 보간으로 생성합니다.
   */
  calculateWaypoints(origin, destination, totalDistance) {
    const waypoints = [];
    
    // 장거리인 경우만 경유점 생성
    if (totalDistance < 5000) return waypoints;

    const latDiff = destination.lat - origin.lat;
    const lngDiff = destination.lng - origin.lng;
    
    // 중간 지점 계산
    const waypointCount = Math.min(3, Math.floor(totalDistance / 10000)); // 10km당 1개
    
    for (let i = 1; i <= waypointCount; i++) {
      const ratio = i / (waypointCount + 1);
      waypoints.push({
        lat: origin.lat + (latDiff * ratio),
        lng: origin.lng + (lngDiff * ratio),
        name: `경유지 ${i}`
      });
    }

    return waypoints;
  }

  /**
   * 현재 시간 조건을 기준으로 교통 혼잡도 등급을 추정합니다.
   */
  getTrafficLevel(origin, destination) {
    const timeOfDay = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    // 기본적인 교통 혼잡도 예측
    if ((timeOfDay >= 7 && timeOfDay <= 9) || (timeOfDay >= 17 && timeOfDay <= 19)) {
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        return 'heavy'; // 평일 출퇴근 시간
      }
    }
    
    if (timeOfDay >= 22 || timeOfDay <= 6) {
      return 'light'; // 심야/새벽
    }
    
    return 'moderate'; // 보통
  }

  /**
   * 경로 계산 실패 시 사용할 단순 대체 경로를 반환합니다.
   */
  getBasicRoute(origin, destination) {
    const distance = Math.round(calculateDistance(origin, destination) * 1.4);
    const duration = Math.round(distance / 30 * 60); // 평균 30km/h 가정

    // 모든 고급 계산이 실패해도 지도/상태판이 멈추지 않게 최소 경로 구조는 항상 반환합니다.
    return {
      distance,
      duration,
      route: {
        origin,
        destination,
        waypoints: []
      },
      traffic: {
        level: 'unknown',
        delayMinutes: 0
      },
      emergencyOptimized: false,
      calculatedAt: new Date(),
      isBasicRoute: true
    };
  }

  /**
   * 실제 날씨 API 대신 mock 날씨 상태를 반환합니다.
   */
  async getWeatherCondition() {
    // 실제 서비스에서는 날씨 API 연동
    return 'clear'; // 'clear', 'rain', 'snow', 'fog'
  }

  /**
   * 현재 위치를 기준으로 남은 거리와 ETA를 다시 계산합니다.
   */
  async updateRoute(routeId, currentLocation) {
    try {
      // 현재 위치 기반으로 남은 경로 재계산
      let route = this.activeRoutes.get(routeId);
      if (!route) {
        route = await getActiveRoute(routeId);
        if (route) {
          this.activeRoutes.set(routeId, route);
        }
      }
      if (!route) return null;

      const remainingDistance = calculateDistance(currentLocation, route.destination);
      const remainingDuration = await this.calculateRemainingDuration(
        currentLocation, 
        route.destination,
        route.emergencyOptimized
      );

      const updatedRoute = {
        ...route,
        currentLocation,
        remainingDistance: Math.round(remainingDistance),
        remainingDuration,
        progress: Math.max(0, Math.min(100, 
          (1 - remainingDistance / route.originalDistance) * 100
        )),
        updatedAt: new Date()
      };
      this.activeRoutes.set(routeId, updatedRoute);
      setActiveRoute(routeId, updatedRoute).catch((error) => {
        logger.warn('활성 경로 cache 갱신 실패', { routeId, error: error.message });
      });

      if (updatedRoute.progress >= 100) {
        this.activeRoutes.delete(routeId);
        deleteActiveRoute(routeId).catch((error) => {
          logger.warn('완료 경로 cache 삭제 실패', { routeId, error: error.message });
        });
      }

      return updatedRoute;

    } catch (error) {
      logger.warn('경로 업데이트 실패', error);
      return null;
    }
  }

  /**
   * 현재 위치에서 목적지까지 남은 시간을 다시 추정합니다.
   */
  async calculateRemainingDuration(currentLocation, destination, emergencyMode) {
    const distance = calculateDistance(currentLocation, destination);
    const baseDuration = this.calculateBaseDuration(distance, emergencyMode);
    return await this.applyTrafficConditions(baseDuration, currentLocation, destination);
  }

  /**
   * 기본 경로 외에 비교 가능한 대체 경로 후보를 생성합니다.
   */
  async suggestAlternativeRoutes(origin, destination, primaryRoute) {
    const alternatives = [];

    try {
      // 1. 최단 경로
      const shortestRoute = await this.calculateOptimalRoute({
        origin,
        destination,
        priority: 'shortest',
        emergencyMode: false
      });

      // 2. 교통량 회피 경로
      const trafficAvoidRoute = await this.calculateOptimalRoute({
        origin,
        destination,
        priority: 'balanced',
        avoidTraffic: true,
        emergencyMode: true
      });

      alternatives.push(
        { type: 'shortest', ...shortestRoute },
        { type: 'traffic_avoid', ...trafficAvoidRoute }
      );

      // 주 경로와 완전히 같은 후보는 숨겨서 대체 경로 목록만 남깁니다.
      return alternatives.filter(route => 
        route.duration !== primaryRoute.duration || 
        route.distance !== primaryRoute.distance
      );

    } catch (error) {
      logger.warn('대체 경로 생성 실패', error);
      return [];
    }
  }
}

/**
 * 경로 계산 상태를 서버 전역에서 재사용하는 싱글톤 인스턴스입니다.
 */
const routeService = new RouteService();

/**
 * 경로 계산 관련 메서드를 함수형 API로 노출하는 모듈 export입니다.
 */
module.exports = {
  calculateOptimalRoute: (options) => routeService.calculateOptimalRoute(options),
  updateRoute: (routeId, currentLocation) => routeService.updateRoute(routeId, currentLocation),
  suggestAlternativeRoutes: (origin, destination, primaryRoute) => 
    routeService.suggestAlternativeRoutes(origin, destination, primaryRoute)
};
