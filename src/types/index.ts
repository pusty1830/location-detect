export type SessionStatus = 'pending_consent' | 'sharing_active' | 'sharing_stopped' | 'sos_active';

export interface LocationSession {
  sessionId: string;
  creatorId: string;
  targetPhoneNumber: string;
  targetCountry?: string;
  deviceName?: string;
  status: SessionStatus;
  consentGranted: boolean;
  currentLat?: number;
  currentLng?: number;
  accuracy?: number;
  speed?: number | null;
  heading?: number | null;
  altitude?: number | null;
  address?: string;
  batteryLevel?: number | null;
  isEmergency?: boolean;
  emergencyNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocationBreadcrumb {
  id: string;
  lat: number;
  lng: number;
  accuracy: number;
  speed?: number | null;
  timestamp: string;
  address?: string;
}

export interface EmergencyContact {
  contactId: string;
  userId: string;
  name: string;
  phone: string;
  relationship: string;
  createdAt: string;
}

export interface CountryInfo {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
  format: string;
  minDigits: number;
  maxDigits: number;
  emergencyNumber: string;
}

export interface GeolocationErrorState {
  code: number;
  message: string;
  type: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED';
  userRemedy: string;
}

export interface AISafetyReport {
  summary: string;
  safetyScore: number; // 0-100
  nearestServicesAdvice: string;
  emergencyChecklist: string[];
  batteryStrategy: string;
  timestamp: string;
  modelUsed?: string;
  isServiceUnavailable?: boolean;
  notice?: string;
}
