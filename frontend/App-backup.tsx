import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { INITIAL_HOSPITALS, INITIAL_PATIENTS, INITIAL_AMBULANCES } from './constants';
import { Patient, Hospital, PatientStatus, TriageResult, Ambulance, AmbulanceStatus } from './types';
import { analyzePatientData } from './services/geminiService';
import { apiService } from './services/apiService';
import { socketService } from './services/socketService';
import {
  transformEmergencyCaseToPatient,
  transformBiometricToVitals,
  transformHospitalToFrontend,
  transformParamedicToAmbulance,
} from './utils/dataTransform';
import PatientCard from './components/PatientCard';
import VitalsChart from './components/VitalsChart';
import LiveMap from './components/LiveMap';
import ErrorBoundary from './components/ErrorBoundary';
import { 
  Search, 
  Activity, 
  Hospital as HospitalIcon, 
  Users, 
  BrainCircuit,
  Monitor,
  Siren,
  Loader2,
  Cpu,
  AlertTriangle,
  Zap,
  ChevronDown,
  ChevronUp,
  Circle,
  Truck,
  Building2,
  MapPin,
  Phone,
  TrendingUp,
  TrendingDown,
  Minus,
  User,
  Clock,
  Navigation,
  BarChart3,
  Eye,
  EyeOff,
  Settings,
  Filter,
  SortAsc
} from 'lucide-react';

// ... rest of the original App.tsx content