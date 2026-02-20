import React, { useState, useEffect, useRef } from 'react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  maxDate?: string;
  placeholder?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, maxDate, placeholder = "생년월일 선택" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);
  const dayRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  const minYear = 1900;
  
  // 년도 배열 생성
  const years = Array.from({ length: currentYear - minYear + 1 }, (_, i) => currentYear - i);
  
  // 월 배열 생성 (한글)
  const months = [
    { value: 1, label: '1월' },
    { value: 2, label: '2월' },
    { value: 3, label: '3월' },
    { value: 4, label: '4월' },
    { value: 5, label: '5월' },
    { value: 6, label: '6월' },
    { value: 7, label: '7월' },
    { value: 8, label: '8월' },
    { value: 9, label: '9월' },
    { value: 10, label: '10월' },
    { value: 11, label: '11월' },
    { value: 12, label: '12월' }
  ];

  // 선택한 년월의 마지막 일 계산
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month, 0).getDate();
  };

  // 일 배열 생성
  const getDays = (): number[] => {
    if (!selectedYear || !selectedMonth) return [];
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  // 초기값 설정
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedYear(date.getFullYear());
      setSelectedMonth(date.getMonth() + 1);
      setSelectedDay(date.getDate());
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

  // 선택된 날짜로 스크롤 이동
  useEffect(() => {
    if (isOpen) {
      // 년도 스크롤
      if (selectedYear && yearRef.current) {
        const yearIndex = years.indexOf(selectedYear);
        if (yearIndex !== -1) {
          yearRef.current.scrollTop = yearIndex * 48; // h-12 = 48px
        }
      }
      
      // 월 스크롤
      if (selectedMonth && monthRef.current) {
        const monthIndex = selectedMonth - 1;
        monthRef.current.scrollTop = monthIndex * 48;
      }
      
      // 일 스크롤
      if (selectedDay && dayRef.current) {
        const dayIndex = selectedDay - 1;
        dayRef.current.scrollTop = dayIndex * 48;
      }
    }
  }, [isOpen, selectedYear, selectedMonth, selectedDay]);

  // 날짜 변경 처리
  const handleDateChange = () => {
    if (selectedYear && selectedMonth && selectedDay) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
      onChange(dateStr);
      setIsOpen(false);
    }
  };

  // 표시용 날짜 포맷
  const formatDisplayDate = (): string => {
    if (selectedYear && selectedMonth && selectedDay) {
      return `${selectedYear}년 ${selectedMonth}월 ${selectedDay}일`;
    }
    return placeholder;
  };

  // 스크롤 처리
  const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: 'year' | 'month' | 'day') => {
    const element = e.currentTarget;
    const scrollTop = element.scrollTop;
    const itemHeight = 40; // 각 항목의 높이
    const selectedIndex = Math.round(scrollTop / itemHeight);
    
    if (type === 'year') {
      setSelectedYear(years[selectedIndex]);
    } else if (type === 'month') {
      setSelectedMonth(months[selectedIndex].value);
    } else if (type === 'day') {
      const days = getDays();
      setSelectedDay(days[selectedIndex]);
    }
  };

  return (
    <div className="relative w-full" ref={pickerRef}>
      {/* 입력 필드 */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400 font-normal transition-all shadow-sm cursor-pointer flex items-center justify-between"
      >
        <span className={selectedYear && selectedMonth && selectedDay ? 'text-slate-900' : 'text-slate-400'}>
          {formatDisplayDate()}
        </span>
        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      {/* 달력 팝업 */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-sm mx-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-medium text-slate-900">생년월일 선택</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* 날짜 선택 영역 */}
            <div className="p-6">
              <div className="flex gap-6">
                {/* 년도 선택 */}
                <div className="flex-1 min-w-28">
                  <div className="text-sm font-medium text-slate-600 mb-3 text-center">년도</div>
                  <div 
                    ref={yearRef}
                    className="h-48 overflow-y-auto scroll-smooth"
                    onScroll={(e) => handleScroll(e, 'year')}
                    style={{ scrollSnapType: 'y mandatory' }}
                  >
                    {years.map((year) => (
                      <div
                        key={year}
                        className={`h-12 flex items-center justify-center text-sm cursor-pointer transition-colors rounded-lg ${
                          selectedYear === year 
                            ? 'bg-indigo-100 text-indigo-600 font-medium' 
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                        style={{ scrollSnapAlign: 'center' }}
                        onClick={() => setSelectedYear(year)}
                      >
                        {year}년
                      </div>
                    ))}
                  </div>
                </div>

                {/* 월 선택 */}
                <div className="flex-1 min-w-24">
                  <div className="text-sm font-medium text-slate-600 mb-3 text-center">월</div>
                  <div 
                    ref={monthRef}
                    className="h-48 overflow-y-auto scroll-smooth"
                    onScroll={(e) => handleScroll(e, 'month')}
                    style={{ scrollSnapType: 'y mandatory' }}
                  >
                    {months.map((month) => (
                      <div
                        key={month.value}
                        className={`h-12 flex items-center justify-center text-sm cursor-pointer transition-colors rounded-lg ${
                          selectedMonth === month.value 
                            ? 'bg-indigo-100 text-indigo-600 font-medium' 
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                        style={{ scrollSnapAlign: 'center' }}
                        onClick={() => setSelectedMonth(month.value)}
                      >
                        {month.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 일 선택 */}
                <div className="flex-1 min-w-24">
                  <div className="text-sm font-medium text-slate-600 mb-3 text-center">일</div>
                  <div 
                    ref={dayRef}
                    className="h-48 overflow-y-auto scroll-smooth"
                    onScroll={(e) => handleScroll(e, 'day')}
                    style={{ scrollSnapType: 'y mandatory' }}
                  >
                    {getDays().map((day) => (
                      <div
                        key={day}
                        className={`h-12 flex items-center justify-center text-sm cursor-pointer transition-colors rounded-lg ${
                          selectedDay === day 
                            ? 'bg-indigo-100 text-indigo-600 font-medium' 
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                        style={{ scrollSnapAlign: 'center' }}
                        onClick={() => setSelectedDay(day)}
                      >
                        {day}일
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 푸터 */}
            <div className="flex gap-3 p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDateChange}
                disabled={!selectedYear || !selectedMonth || !selectedDay}
                className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
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

export default DatePicker;