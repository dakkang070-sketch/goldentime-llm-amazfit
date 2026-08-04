import React from 'react';
import { getAreaOptions, getDistrictOptions, REGION_CATALOG } from '../constants/regionCatalog';

interface RegionSelectValue {
  city: string;
  district: string;
  dong: string;
}

interface RegionSelectGroupProps {
  value: RegionSelectValue;
  onChange: (next: RegionSelectValue) => void;
  accentBorderClass: string;
  className?: string;
  allowAllOption?: boolean;
}

/**
 * 운영자 관리구역을 시/도 -> 시/군/구 -> 읍/면/동 단계로 선택하게 하는 공통 콤보 그룹입니다.
 */
export const RegionSelectGroup: React.FC<RegionSelectGroupProps> = ({
  value,
  onChange,
  accentBorderClass,
  className = '',
  allowAllOption = false,
}) => {
  const regionSelectClass = `mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[15px] text-black outline-none ${accentBorderClass}`;
  const disabledRegionSelectClass = `${regionSelectClass} disabled:bg-slate-100 disabled:text-slate-400`;
  const isCityAllSelected = allowAllOption && value.city === '전체';
  const isDistrictAllSelected = allowAllOption && value.district === '전체';
  const normalizedDistrictValue = isCityAllSelected ? '전체' : value.district;
  const normalizedDongValue = isCityAllSelected || isDistrictAllSelected ? '전체' : value.dong;
  const districtOptions =
    isCityAllSelected
      ? [{ name: '전체', areas: ['전체'] }]
      : getDistrictOptions(value.city);
  const areaOptions =
    isCityAllSelected || isDistrictAllSelected
      ? ['전체']
      : getAreaOptions(value.city, value.district);

  return (
    <div className={`grid grid-cols-1 gap-2 ${className}`}>
      <label className="block">
        <span className="text-[13px] text-black">시/도</span>
        <select
          value={value.city}
          onChange={(e) =>
            onChange({
              city: e.target.value,
              district: allowAllOption && e.target.value === '전체' ? '전체' : '',
              dong: allowAllOption && e.target.value === '전체' ? '전체' : '',
            })
          }
          className={regionSelectClass}
        >
          {allowAllOption && <option value="전체">전체</option>}
          <option value="">시/도 선택</option>
          {REGION_CATALOG.map((city) => (
            <option key={city.name} value={city.name}>
              {city.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-[13px] text-black">시/군/구</span>
        <select
          value={normalizedDistrictValue}
          onChange={(e) =>
            onChange({
              city: value.city,
              district: e.target.value,
              dong: allowAllOption && e.target.value === '전체' ? '전체' : '',
            })
          }
          disabled={!value.city || isCityAllSelected}
          className={disabledRegionSelectClass}
        >
          {allowAllOption && <option value="전체">전체</option>}
          <option value="">시/군/구 선택</option>
          {districtOptions.map((district) => (
            <option key={district.name} value={district.name}>
              {district.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-[13px] text-black">읍/면/동</span>
        <select
          value={normalizedDongValue}
          onChange={(e) =>
            onChange({
              city: value.city,
              district: value.district,
              dong: e.target.value,
            })
          }
          disabled={!value.district || isCityAllSelected || isDistrictAllSelected}
          className={disabledRegionSelectClass}
        >
          {allowAllOption && <option value="전체">전체</option>}
          <option value="">읍/면/동 선택</option>
          {areaOptions.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};
