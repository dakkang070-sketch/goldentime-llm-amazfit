/**
 * 최적 경로 계산 서비스
 * 응급 상황에서 최적 경로 및 ETA 계산
 */

const { calculateDistance } = require('./geoService');
const logger = require('../utils/logger');

class RouteService {
  
  constructor() {
    this.trafficData = new Map(); // 실시간 교통 정보 캐시
    this.roadConditions = new Map(); // 도로 상황 정보
  }

  /**
   * 최적 경로 계산
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

      return {
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

    } catch (error) {
      logger.error('경로 계산 실패', error);
      
      // 기본 경로 반환 (실패 시 대안)
      return this.getBasicRoute(origin, destination);
    }
  }

  /**
   * 기본 이동 시간 계산
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
   * 교통 상황 반영
   */
  async applyTrafficConditions(baseDuration, origin, destination) {
    try {
      const timeOfDay = new Date().getHours();
      const dayOfWeek = new Date().getDay(); // 0: 일요일, 6: 토요일
      
      let trafficMultiplier = 1.0;

      // 시간대별 교통량
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
        trafficMultiplier *= 1.3;
      }

      return Math.round(baseDuration * trafficMultiplier);

    } catch (error) {
      logger.warn('교통 상황 적용 실패', error);
      return baseDuration;
    }
  }

  /**
   * 경유 포인트 계산
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
   * 교통 혼잡도 조회
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
   * 기본 경로 반환 (실패 시 대안)
   */
  getBasicRoute(origin, destination) {
    const distance = Math.round(calculateDistance(origin, destination) * 1.4);
    const duration = Math.round(distance / 30 * 60); // 평균 30km/h 가정

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
   * 날씨 정보 조회 (Mock)
   */
  async getWeatherCondition() {
    // 실제 서비스에서는 날씨 API 연동
    return 'clear'; // 'clear', 'rain', 'snow', 'fog'
  }

  /**
   * 실시간 경로 업데이트
   */
  async updateRoute(routeId, currentLocation) {
    try {
      // 현재 위치 기반으로 남은 경로 재계산
      const route = this.activeRoutes.get(routeId);
      if (!route) return null;

      const remainingDistance = calculateDistance(currentLocation, route.destination);
      const remainingDuration = await this.calculateRemainingDuration(
        currentLocation, 
        route.destination,
        route.emergencyOptimized
      );

      return {
        ...route,
        currentLocation,
        remainingDistance: Math.round(remainingDistance),
        remainingDuration,
        progress: Math.max(0, Math.min(100, 
          (1 - remainingDistance / route.originalDistance) * 100
        )),
        updatedAt: new Date()
      };

    } catch (error) {
      logger.warn('경로 업데이트 실패', error);
      return null;
    }
  }

  /**
   * 남은 시간 계산
   */
  async calculateRemainingDuration(currentLocation, destination, emergencyMode) {
    const distance = calculateDistance(currentLocation, destination);
    const baseDuration = this.calculateBaseDuration(distance, emergencyMode);
    return await this.applyTrafficConditions(baseDuration, currentLocation, destination);
  }

  /**
   * 대체 경로 제안
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

// 싱글톤 인스턴스
const routeService = new RouteService();

module.exports = {
  calculateOptimalRoute: (options) => routeService.calculateOptimalRoute(options),
  updateRoute: (routeId, currentLocation) => routeService.updateRoute(routeId, currentLocation),
  suggestAlternativeRoutes: (origin, destination, primaryRoute) => 
    routeService.suggestAlternativeRoutes(origin, destination, primaryRoute)
};