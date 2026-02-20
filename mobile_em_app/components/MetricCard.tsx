import React from 'react';
import { MetricConfig } from '../types';
import { Circle } from 'lucide-react';

export type MetricStatus = 'normal' | 'warning' | 'danger';

interface MetricCardProps {
  config: MetricConfig;
  value: string | number;
  status: MetricStatus;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ config, value, status, className = '' }) => {
  const Icon = config.icon;

  // Status-based Styles
  const getStatusStyles = () => {
    switch (status) {
      case 'danger':
        return {
          card: 'border-red-300 bg-red-50/90 shadow-red-100', // Darker border
          icon: 'text-red-500',
          text: 'text-red-700',
          bar: 'bg-red-500',
        };
      case 'warning':
        return {
          card: 'border-orange-300 bg-orange-50/90', // Darker border
          icon: 'text-orange-500',
          text: 'text-orange-700',
          bar: 'bg-orange-500',
        };
      case 'normal':
      default:
        return {
          card: 'border-slate-300 bg-white/80 hover:bg-white', // Visible border
          icon: 'text-slate-400',
          text: 'text-slate-800',
          bar: config.color,
        };
    }
  };

  const styles = getStatusStyles();
  
  // Check for long values (like Blood Pressure "120/80") to adjust font size
  const isLongValue = String(value).length > 5;

  return (
    <div className={`p-3 rounded-2xl transition-all duration-300 relative overflow-hidden group shadow-sm hover:shadow-md border backdrop-blur-md flex flex-col justify-between ${styles.card} ${className}`}>
      {/* Background Pulse for Danger */}
      {status === 'danger' && (
        <div className="absolute inset-0 bg-red-500/5 animate-pulse z-0"></div>
      )}

      {/* Header: Icon & Status - Changed items-start to items-center for better alignment */}
      <div className="flex justify-between items-center mb-2 relative z-10 w-full">
        <div className={`p-1.5 rounded-xl bg-white/50 ${status === 'normal' ? '' : 'bg-white/80'}`}>
           <Icon size={18} className={status === 'normal' ? '' : styles.icon} style={status === 'normal' ? { color: config.color } : {}} />
        </div>
        
        {/* Status Traffic Light Indicator */}
        <div className="flex items-center">
             <Circle 
                size={10} 
                fill="currentColor"
                className={`
                    ${status === 'danger' ? 'text-red-500 animate-pulse' : ''}
                    ${status === 'warning' ? 'text-orange-500' : ''}
                    ${status === 'normal' ? 'text-emerald-500' : ''}
                `}
             />
        </div>
      </div>

      {/* Content: Label & Value */}
      <div className="relative z-10 w-full flex-1 flex flex-col justify-end mt-1">
        <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5 truncate font-normal">{config.label}</p>
        <div className="flex items-baseline gap-1">
          <h3 className={`leading-none tracking-tight font-normal ${styles.text} ${isLongValue ? 'text-lg font-medium' : 'text-2xl'}`}>
            {value}
          </h3>
          <span className="text-[10px] text-slate-400 font-normal">{config.unit}</span>
        </div>
      </div>
      
      {/* Footer: Progress Bar */}
      <div className="mt-3 h-1.5 w-full bg-slate-100/50 rounded-full overflow-hidden shrink-0">
        <div 
            className="h-full rounded-full transition-all duration-1000 ease-out relative"
            style={{ 
                width: status === 'danger' ? '100%' : status === 'warning' ? '85%' : '60%', 
                backgroundColor: status === 'normal' ? config.color : undefined 
            }}
        >
            <div className={`absolute inset-0 ${status !== 'normal' ? styles.bar : ''}`} />
        </div>
      </div>
    </div>
  );
};