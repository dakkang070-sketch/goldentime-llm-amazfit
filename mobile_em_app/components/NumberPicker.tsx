import React, { useEffect, useRef, useState } from 'react';

type NumberPickerProps = {
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  title: string;
  placeholder?: string;
  triggerClassName: string;
};

export default function NumberPicker({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  title,
  placeholder = '선택',
  triggerClassName
}: NumberPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState<string>(value || '');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  const sanitizeDigits = (raw: string) => raw.replace(/[^\d]/g, '');

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const commit = () => {
    const parsed = parseInt(inputValue, 10);
    if (Number.isNaN(parsed)) {
      setInputValue(value || '');
      return;
    }
    const next = String(clamp(parsed));
    onChange(next);
    setInputValue(next);
    setIsOpen(false);
  };

  const bump = (direction: 'down' | 'up') => {
    const current = parseInt(value || inputValue || String(min), 10);
    const safe = Number.isNaN(current) ? min : current;
    const next = direction === 'down' ? safe - step : safe + step;
    const clamped = String(clamp(next));
    onChange(clamped);
    setInputValue(clamped);
  };

  const displayText = value ? `${value}${unit ? unit : ''}` : placeholder;

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${triggerClassName} text-left flex items-center justify-between cursor-pointer`}
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>{displayText}</span>
        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4 4 4-4" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-sm mx-2 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-medium text-slate-900">{title}</h3>
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

            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    bump('down');
                  }}
                  className="p-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-lg font-bold min-w-[50px] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={parseInt(value || inputValue || String(min), 10) <= min}
                  title="감소"
                >
                  &lt;
                </button>

                <div className="flex-1 text-center">
                  <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-300 rounded-lg min-w-[140px]">
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="numeric"
                      value={inputValue}
                      onChange={(e) => setInputValue(sanitizeDigits(e.target.value))}
                      onFocus={(e) => e.currentTarget.select()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commit();
                        }
                      }}
                      className="w-20 text-lg font-medium text-slate-900 text-center outline-none"
                      placeholder={String(min)}
                    />
                    {unit ? <span className="text-lg font-medium text-slate-700">{unit}</span> : null}
                  </div>
                  <div className="mt-2 text-xs text-slate-400">{min} ~ {max}</div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    bump('up');
                  }}
                  className="p-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-lg font-bold min-w-[50px] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={parseInt(value || inputValue || String(min), 10) >= max}
                  title="증가"
                >
                  &gt;
                </button>
              </div>
            </div>

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
                  commit();
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
}

