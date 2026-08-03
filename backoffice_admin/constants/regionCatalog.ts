import {
  MEMBER_REGION_CATALOG,
  getMemberDistrictOptions,
  getMemberAreaOptions,
} from '../../welfare_ama_app/src/constants/memberRegionCatalog';

export interface RegionDistrictOption {
  name: string;
  areas: string[];
}

export interface RegionCityOption {
  name: string;
  districts: RegionDistrictOption[];
}

/**
 * 관리자 사이트 관리구역 선택에 사용하는 전국 행정구역 카탈로그입니다.
 * 생성 기준 버전: 20260701
 */
export const REGION_CATALOG: RegionCityOption[] = MEMBER_REGION_CATALOG;

/**
 * 현재 선택된 시/도에 맞는 시/군/구 목록을 반환합니다.
 */
export const getDistrictOptions = (city: string) => getMemberDistrictOptions(city);

/**
 * 현재 선택된 시/도/시군구에 맞는 읍/면/동 목록을 반환합니다.
 */
export const getAreaOptions = (city: string, district: string) => getMemberAreaOptions(city, district);
