
import React from 'react';

export enum SystemStatus {
  OPERATIONAL = 'OPERATIONAL',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  PROCESSING = 'PROCESSING'
}

export interface StatusCardProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  value: string | number;
  subText: string;
  status: SystemStatus;
  trend?: string;
  details?: {
    description: string;
    metrics: { label: string; value: string }[];
    uptime: string;
    lastUpdate: string;
  };
}

export interface KPI {
  label: string;
  value: string;
  trend: string;
  isPositive: boolean;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  message: string;
  level: 'info' | 'warning' | 'critical';
}

export interface ChartData {
  time: string;
  value: number;
  category?: string;
}
