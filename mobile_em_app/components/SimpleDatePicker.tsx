/**
 * 간단한 년/월/일 선택 달력
 * 년도 < > , 월 < > 로 직관적 선택
 */

import React, { useState, useEffect, useRef } from 'react';

interface SimpleDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  maxDate?: string;
  placeholder?: string;
}

const SimpleDatePicker: React.FC<SimpleDatePickerProps> = ({ 
  value, 
  onChange, 
  maxDate, 
  placeholder = "생년월일 선택" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [yearInput, setYearInput] = useState<string>(String(new Date().getFullYear()));
  const [monthInput, setMonthInput] = useState<string>(String(new Date().getMonth() + 1));
  const [dayInput, setDayInput] = useState<string>('1');
  const pickerRef = useRef<HTMLDivElement>(null);

  // 초기값 설정
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      const y = date.getFullYear();
      const m = date.getMonth() + 1;
      const d = date.getDate();
      setSelectedYear(y);
      setSelectedMonth(m);
      setSelectedDay(d);
      setYearInput(String(y));
      setMonthInput(String(m));
      setDayInput(String(d));
    }
  }, [value]);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // 날짜 선택
  const selectDate = () => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  // 해당 월의 마지막 날짜
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month, 0).getDate();
  };

  const currentYear = new Date().getFullYear();
  const minYear = 1900;
  const maxYear = currentYear;

  const sanitizeDigits = (raw: string) => raw.replace(/[^\d]/g, '');

  const clampYear = (year: number) => Math.min(maxYear, Math.max(minYear, year));
  const clampMonth = (month: number) => Math.min(12, Math.max(1, month));
  const clampDay = (year: number, month: number, day: number) => {
    const maxDay = getDaysInMonth(year, month);
    return Math.min(maxDay, Math.max(1, day));
  };

  const applyDateParts = (nextYear: number, nextMonth: number, nextDay: number) => {
    const y = clampYear(nextYear);
    const m = clampMonth(nextMonth);
    const d = clampDay(y, m, nextDay);
    setSelectedYear(y);
    setSelectedMonth(m);
    setSelectedDay(d);
    setYearInput(String(y));
    setMonthInput(String(m));
    setDayInput(String(d));
  };

  // 년도 변경
  const changeYear = (direction: 'prev' | 'next') => {
    if (direction === 'prev') applyDateParts(selectedYear - 1, selectedMonth, selectedDay);
    else applyDateParts(selectedYear + 1, selectedMonth, selectedDay);
  };

  // 월 변경
  const changeMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 1) applyDateParts(selectedYear - 1, 12, selectedDay);
      else applyDateParts(selectedYear, selectedMonth - 1, selectedDay);
      return;
    }

    if (selectedMonth === 12) applyDateParts(selectedYear + 1, 1, selectedDay);
    else applyDateParts(selectedYear, selectedMonth + 1, selectedDay);
  };

  // 일 변경
  const changeDay = (direction: 'prev' | 'next') => {
    const maxDay = getDaysInMonth(selectedYear, selectedMonth);
    if (direction === 'prev') {
      if (selectedDay === 1) {
        const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
        const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
        const prevMaxDay = getDaysInMonth(prevYear, prevMonth);
        applyDateParts(prevYear, prevMonth, prevMaxDay);
      } else {
        applyDateParts(selectedYear, selectedMonth, selectedDay - 1);
      }
      return;
    }

    if (selectedDay === maxDay) {
      const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
      const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
      applyDateParts(nextYear, nextMonth, 1);
      return;
    }

    applyDateParts(selectedYear, selectedMonth, selectedDay + 1);
  };

  const commitYearInput = () => {
    const parsed = parseInt(yearInput, 10);
    if (Number.isNaN(parsed)) {
      setYearInput(String(selectedYear));
      return;
    }
    applyDateParts(parsed, selectedMonth, selectedDay);
  };

  const commitMonthInput = () => {
    const parsed = parseInt(monthInput, 10);
    if (Number.isNaN(parsed)) {
      setMonthInput(String(selectedMonth));
      return;
    }
    applyDateParts(selectedYear, parsed, selectedDay);
  };

  const commitDayInput = () => {
    const parsed = parseInt(dayInput, 10);
    if (Number.isNaN(parsed)) {
      setDayInput(String(selectedDay));
      return;
    }
    applyDateParts(selectedYear, selectedMonth, parsed);
  };

  useEffect(() => {
    const maxDay = getDaysInMonth(selectedYear, selectedMonth);
    if (selectedDay > maxDay) {
      setSelectedDay(maxDay);
    }
  }, [selectedYear, selectedMonth, selectedDay]);

  // 표시용 날짜
  const formatDisplayDate = (): string => {
    if (value) {
      const date = new Date(value);
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    }
    return placeholder;
  };

  return (
    <div className="relative w-full" ref={pickerRef}>
      {/* 입력 필드 */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400 font-normal transition-all shadow-sm cursor-pointer flex items-center justify-between"
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>
          {formatDisplayDate()}
        </span>
        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      {/* 간단한 선택 팝업 */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-sm mx-2 max-h-[90vh] overflow-y-auto">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-medium text-slate-900">생년월일 선택</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 선택 영역 */}
            <div className="p-4 space-y-4">
              {/* 년도 선택 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">년도</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      changeYear('prev');
                    }}
                    className="p-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-lg font-bold min-w-[50px] disabled:opacity-50 disabled:cursor-not-allowed"
                    title="이전 년도"
                    disabled={selectedYear <= minYear}
                  >
                    &lt;
                  </button>
                  <div className="flex-1 text-center">
                    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-300 rounded-lg min-w-[140px]">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={yearInput}
                        onChange={(e) => setYearInput(sanitizeDigits(e.target.value))}
                        onFocus={(e) => e.currentTarget.select()}
                        onBlur={commitYearInput}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitYearInput();
                          }
                        }}
                        className="w-24 text-lg font-medium text-slate-900 text-center outline-none"
                        placeholder={String(selectedYear)}
                      />
                      <span className="text-lg font-medium text-slate-700">년</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      changeYear('next');
                    }}
                    className="p-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-lg font-bold min-w-[50px] disabled:opacity-50 disabled:cursor-not-allowed"
                    title="다음 년도"
                    disabled={selectedYear >= maxYear}
                  >
                    &gt;
                  </button>
                </div>
              </div>

              {/* 월 선택 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">월</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      changeMonth('prev');
                    }}
                    className="p-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-lg font-bold min-w-[50px]"
                    title="이전 달"
                  >
                    &lt;
                  </button>
                  <div className="flex-1 text-center">
                    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-300 rounded-lg min-w-[140px]">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={monthInput}
                        onChange={(e) => setMonthInput(sanitizeDigits(e.target.value))}
                        onFocus={(e) => e.currentTarget.select()}
                        onBlur={commitMonthInput}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitMonthInput();
                          }
                        }}
                        className="w-16 text-lg font-medium text-slate-900 text-center outline-none"
                        placeholder={String(selectedMonth)}
                      />
                      <span className="text-lg font-medium text-slate-700">월</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      changeMonth('next');
                    }}
                    className="p-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-lg font-bold min-w-[50px]"
                    title="다음 달"
                  >
                    &gt;
                  </button>
                </div>
              </div>

              {/* 일 선택 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">일</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      changeDay('prev');
                    }}
                    className="p-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-lg font-bold min-w-[50px]"
                    title="이전 날"
                  >
                    &lt;
                  </button>
                  <div className="flex-1 text-center">
                    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-300 rounded-lg min-w-[140px]">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={dayInput}
                        onChange={(e) => setDayInput(sanitizeDigits(e.target.value))}
                        onFocus={(e) => e.currentTarget.select()}
                        onBlur={commitDayInput}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitDayInput();
                          }
                        }}
                        className="w-16 text-lg font-medium text-slate-900 text-center outline-none"
                        placeholder={String(selectedDay)}
                      />
                      <span className="text-lg font-medium text-slate-700">일</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      changeDay('next');
                    }}
                    className="p-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-lg font-bold min-w-[50px]"
                    title="다음 날"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>

            {/* 푸터 */}
            <div className="flex gap-3 p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl text-base font-medium hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  selectDate();
                }}
                className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl text-base font-medium hover:bg-indigo-700 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleDatePicker;
