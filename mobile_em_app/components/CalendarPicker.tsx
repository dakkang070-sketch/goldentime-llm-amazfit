/**
 * 개선된 달력 컴포넌트
 * 년/월/일을 직관적으로 선택할 수 있는 모바일 친화적 인터페이스
 */

import React, { useState, useEffect, useRef } from 'react';

interface CalendarPickerProps {
  value: string;
  onChange: (date: string) => void;
  maxDate?: string;
  placeholder?: string;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({ 
  value, 
  onChange, 
  maxDate, 
  placeholder = "생년월일 선택" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'day' | 'month' | 'year'>('day');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const pickerRef = useRef<HTMLDivElement>(null);

  // 초기값 설정
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDate(date);
      setViewDate(date);
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

  // 날짜 포맷팅
  const formatDate = (date: Date): string => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  // 달력 데이터 생성
  const getCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const today = new Date();
    const maxDateObj = maxDate ? new Date(maxDate) : null;

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
      const isDisabled = maxDateObj && date > maxDateObj;

      days.push({
        date,
        day: date.getDate(),
        isCurrentMonth,
        isToday,
        isSelected,
        isDisabled
      });
    }

    return days;
  };

  // 월 선택 핸들러
  const handleMonthSelect = (month: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(month);
    setViewDate(newDate);
    setCurrentView('day');
  };

  // 년도 선택 핸들러
  const handleYearSelect = (year: number) => {
    const newDate = new Date(viewDate);
    newDate.setFullYear(year);
    setViewDate(newDate);
    setCurrentView('month');
  };

  // 날짜 선택 핸들러
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const dateStr = date.toISOString().split('T')[0];
    onChange(dateStr);
    setIsOpen(false);
  };

  // 이전/다음 달 이동
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(viewDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setViewDate(newDate);
  };

  // 이전/다음 년도 이동
  const navigateYear = (direction: 'prev' | 'next') => {
    const newDate = new Date(viewDate);
    if (direction === 'prev') {
      newDate.setFullYear(newDate.getFullYear() - 1);
    } else {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    setViewDate(newDate);
  };

  // 월 이름
  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];

  // 요일 이름
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  // 년도 목록 생성
  const getYearList = () => {
    const currentYear = new Date().getFullYear();
    const minYear = 1900;
    const years = [];
    
    for (let year = currentYear; year >= minYear; year--) {
      years.push(year);
    }
    
    return years;
  };

  // 빠른 년도 이동 (10년 단위)
  const navigateYearFast = (direction: 'prev' | 'next') => {
    const newDate = new Date(viewDate);
    if (direction === 'prev') {
      newDate.setFullYear(newDate.getFullYear() - 10);
    } else {
      newDate.setFullYear(newDate.getFullYear() + 10);
    }
    setViewDate(newDate);
  };

  // 현재 년도로 이동
  const goToCurrentYear = () => {
    setViewDate(new Date());
    setCurrentView('month');
  };

  return (
    <div className="relative w-full" ref={pickerRef}>
      {/* 입력 필드 */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400 font-normal transition-all shadow-sm cursor-pointer flex items-center justify-between"
      >
        <span className={selectedDate ? 'text-slate-900' : 'text-slate-400'}>
          {selectedDate ? formatDate(selectedDate) : placeholder}
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

            {/* 빠른 네비게이션 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              {/* 빠른 년도 이동 */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => navigateYearFast('prev')}
                  className="px-3 py-1 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                  title="10년 전으로"
                >
                  &lt;&lt; 10년
                </button>
                <button 
                  onClick={() => navigateYear('prev')}
                  className="px-3 py-1 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                  title="작년"
                >
                  &lt; 1년
                </button>
              </div>
              
              {/* 현재 년도로 빠르게 */}
              <button 
                onClick={goToCurrentYear}
                className="px-4 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors font-medium"
                title="현재 년도로"
              >
                현재 년도
              </button>
              
              {/* 빠른 미래 년도 이동 */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => navigateYear('next')}
                  className="px-3 py-1 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                  title="내년"
                >
                  1년 &gt;
                </button>
                <button 
                  onClick={() => navigateYearFast('next')}
                  className="px-3 py-1 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                  title="10년 후로"
                >
                  10년 &gt;&gt;
                </button>
              </div>
            </div>

            {/* 네비게이션 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              {currentView === 'day' && (
                <>
                  <button 
                    onClick={() => navigateMonth('prev')}
                    className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors active:bg-slate-200"
                    title="이전 달"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => setCurrentView('month')}
                    className="text-lg font-medium text-slate-900 hover:bg-slate-100 px-3 py-1 rounded-lg transition-colors active:bg-slate-200"
                    title="월 선택"
                  >
                    {viewDate.getFullYear()}년 {monthNames[viewDate.getMonth()]}
                  </button>
                  <button 
                    onClick={() => navigateMonth('next')}
                    className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors active:bg-slate-200"
                    title="다음 달"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
              
              {currentView === 'month' && (
                <>
                  <button 
                    onClick={() => navigateYear('prev')}
                    className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors active:bg-slate-200"
                    title="이전 년도"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => setCurrentView('year')}
                    className="text-lg font-medium text-slate-900 hover:bg-slate-100 px-3 py-1 rounded-lg transition-colors active:bg-slate-200"
                    title="년도 선택"
                  >
                    {viewDate.getFullYear()}년
                  </button>
                  <button 
                    onClick={() => navigateYear('next')}
                    className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors active:bg-slate-200"
                    title="다음 년도"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
              
              {currentView === 'year' && (
                <>
                  <button 
                    onClick={() => {
                      const newDate = new Date(viewDate);
                      newDate.setFullYear(newDate.getFullYear() - 10);
                      setViewDate(newDate);
                    }}
                    className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors active:bg-slate-200"
                    title="이전 10년"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="text-lg font-medium text-slate-900">
                    {Math.floor(viewDate.getFullYear() / 10) * 10} - {Math.floor(viewDate.getFullYear() / 10) * 10 + 9}
                  </div>
                  <button 
                    onClick={() => {
                      const newDate = new Date(viewDate);
                      newDate.setFullYear(newDate.getFullYear() + 10);
                      setViewDate(newDate);
                    }}
                    className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors active:bg-slate-200"
                    title="다음 10년"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* 콘텐츠 */}
            <div className="p-4">
              {currentView === 'day' && (
                <div>
                  {/* 요일 헤더 */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map((day) => (
                      <div key={day} className="text-center text-sm font-medium text-slate-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* 날짜 그리드 - 더 크게 */}
                  <div className="grid grid-cols-7 gap-2">
                    {getCalendarDays().map((dayInfo, index) => (
                      <button
                        key={index}
                        onClick={() => !dayInfo.isDisabled && handleDateSelect(dayInfo.date)}
                        disabled={dayInfo.isDisabled}
                        className={`
                          w-12 h-12 rounded-xl text-base font-medium transition-all duration-200
                          ${dayInfo.isCurrentMonth ? 'text-slate-900' : 'text-slate-400'}
                          ${dayInfo.isToday ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''}
                          ${dayInfo.isSelected ? 'bg-indigo-600 text-white shadow-lg transform scale-105' : 
                            dayInfo.isCurrentMonth && !dayInfo.isDisabled ? 'hover:bg-slate-100 hover:shadow-md' : ''}
                          ${dayInfo.isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                        `}
                        title={`${dayInfo.date.getFullYear()}년 ${dayInfo.date.getMonth() + 1}월 ${dayInfo.date.getDate()}일`}
                      >
                        {dayInfo.day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {currentView === 'month' && (
                <div className="grid grid-cols-3 gap-3">
                  {monthNames.map((month, index) => (
                    <button
                      key={month}
                      onClick={() => handleMonthSelect(index)}
                      className={`
                        p-4 rounded-xl text-base font-medium transition-all duration-200
                        ${viewDate.getMonth() === index ? 'bg-indigo-600 text-white shadow-lg transform scale-105' : 
                          'text-slate-700 hover:bg-slate-100 hover:shadow-md hover:scale-105'}
                      `}
                      title={`${viewDate.getFullYear()}년 ${month}`}
                    >
                      {month}
                    </button>
                  ))}
                </div>
              )}
              
              {currentView === 'year' && (
                <div className="grid grid-cols-4 gap-3 max-h-80 overflow-y-auto">
                  {getYearList().map((year) => (
                    <button
                      key={year}
                      onClick={() => handleYearSelect(year)}
                      className={`
                        p-4 rounded-xl text-base font-medium transition-all duration-200
                        ${viewDate.getFullYear() === year ? 'bg-indigo-600 text-white shadow-lg transform scale-105' : 
                          'text-slate-700 hover:bg-slate-100 hover:shadow-md hover:scale-105'}
                      `}
                      title={`${year}년`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              )}
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
                onClick={() => {
                  if (selectedDate) {
                    handleDateSelect(selectedDate);
                  }
                }}
                disabled={!selectedDate}
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

export default CalendarPicker;