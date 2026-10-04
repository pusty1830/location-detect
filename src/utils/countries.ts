import { CountryInfo } from '../types';

export const COUNTRIES: CountryInfo[] = [
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸', format: '(555) 000-0000', minDigits: 10, maxDigits: 10, emergencyNumber: '911' },
  { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳', format: '98765 43210', minDigits: 10, maxDigits: 10, emergencyNumber: '112' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧', format: '7911 123456', minDigits: 10, maxDigits: 10, emergencyNumber: '999' },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦', format: '(555) 000-0000', minDigits: 10, maxDigits: 10, emergencyNumber: '911' },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺', format: '412 345 678', minDigits: 9, maxDigits: 9, emergencyNumber: '000' },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪', format: '151 23456789', minDigits: 10, maxDigits: 11, emergencyNumber: '112' },
  { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷', format: '6 12 34 56 78', minDigits: 9, maxDigits: 9, emergencyNumber: '112' },
  { name: 'Japan', code: 'JP', dialCode: '+81', flag: '🇯🇵', format: '90 1234 5678', minDigits: 10, maxDigits: 10, emergencyNumber: '110' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '🇦🇪', format: '50 123 4567', minDigits: 9, maxDigits: 9, emergencyNumber: '999' },
  { name: 'Singapore', code: 'SG', dialCode: '+65', flag: '🇸🇬', format: '9123 4567', minDigits: 8, maxDigits: 8, emergencyNumber: '995' },
  { name: 'Brazil', code: 'BR', dialCode: '+55', flag: '🇧🇷', format: '(11) 98765-4321', minDigits: 10, maxDigits: 11, emergencyNumber: '190' },
  { name: 'Mexico', code: 'MX', dialCode: '+52', flag: '🇲🇽', format: '55 1234 5678', minDigits: 10, maxDigits: 10, emergencyNumber: '911' },
  { name: 'Spain', code: 'ES', dialCode: '+34', flag: '🇪🇸', format: '612 345 678', minDigits: 9, maxDigits: 9, emergencyNumber: '112' },
  { name: 'Italy', code: 'IT', dialCode: '+39', flag: '🇮🇹', format: '320 123 4567', minDigits: 9, maxDigits: 10, emergencyNumber: '112' },
  { name: 'Netherlands', code: 'NL', dialCode: '+31', flag: '🇳🇱', format: '6 12345678', minDigits: 9, maxDigits: 9, emergencyNumber: '112' },
  { name: 'South Africa', code: 'ZA', dialCode: '+27', flag: '🇿🇦', format: '82 123 4567', minDigits: 9, maxDigits: 9, emergencyNumber: '10111' },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: '🇸🇦', format: '50 123 4567', minDigits: 9, maxDigits: 9, emergencyNumber: '999' },
  { name: 'New Zealand', code: 'NZ', dialCode: '+64', flag: '🇳🇿', format: '21 123 4567', minDigits: 8, maxDigits: 10, emergencyNumber: '111' },
  { name: 'Philippines', code: 'PH', dialCode: '+63', flag: '🇵🇭', format: '917 123 4567', minDigits: 10, maxDigits: 10, emergencyNumber: '911' },
  { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬', format: '803 123 4567', minDigits: 10, maxDigits: 10, emergencyNumber: '112' }
];

export interface ValidationResult {
  isValid: boolean;
  e164: string;
  formattedNational: string;
  error?: string;
  carrierHint?: string;
}

export function validatePhoneNumber(rawInput: string, country: CountryInfo): ValidationResult {
  const digits = rawInput.replace(/\D/g, '');

  if (!digits) {
    return {
      isValid: false,
      e164: '',
      formattedNational: '',
      error: 'Please enter a mobile phone number.'
    };
  }

  // Check if user accidentally typed the country dial code into the number input
  let cleanedDigits = digits;
  const dialDigits = country.dialCode.replace(/\D/g, '');
  if (cleanedDigits.startsWith(dialDigits) && cleanedDigits.length > country.maxDigits) {
    cleanedDigits = cleanedDigits.slice(dialDigits.length);
  }

  // Strip leading 0 if present (common in national dialing like UK 07xxx or India 09xxx)
  if (cleanedDigits.startsWith('0') && cleanedDigits.length > country.minDigits) {
    cleanedDigits = cleanedDigits.slice(1);
  }

  if (cleanedDigits.length < country.minDigits) {
    return {
      isValid: false,
      e164: `${country.dialCode}${cleanedDigits}`,
      formattedNational: cleanedDigits,
      error: `Number is too short for ${country.name} (minimum ${country.minDigits} digits).`
    };
  }

  if (cleanedDigits.length > country.maxDigits) {
    return {
      isValid: false,
      e164: `${country.dialCode}${cleanedDigits}`,
      formattedNational: cleanedDigits,
      error: `Number exceeds maximum length of ${country.maxDigits} digits for ${country.name}.`
    };
  }

  // Carrier / Network type detection heuristic
  let carrierHint = 'Mobile Cellular Subscriber';
  if (country.code === 'US' || country.code === 'CA') {
    carrierHint = 'North American Numbering Plan (Wireless/Cellular)';
  } else if (country.code === 'IN') {
    if (/^[6-9]/.test(cleanedDigits)) {
      carrierHint = 'GSM/LTE Mobile Network';
    } else {
      carrierHint = 'Fixed-Line / Wireline Network (May not support SMS tracking)';
    }
  } else if (country.code === 'GB') {
    if (cleanedDigits.startsWith('7')) {
      carrierHint = 'UK Mobile Digital Cellular (3G/4G/5G)';
    } else {
      carrierHint = 'Geographic Landline (SMS sharing link recommended via app)';
    }
  }

  // Basic national formatter
  let formattedNational = cleanedDigits;
  if (cleanedDigits.length === 10) {
    formattedNational = `${cleanedDigits.slice(0, 3)} ${cleanedDigits.slice(3, 6)} ${cleanedDigits.slice(6)}`;
  } else if (cleanedDigits.length === 9) {
    formattedNational = `${cleanedDigits.slice(0, 3)} ${cleanedDigits.slice(3, 6)} ${cleanedDigits.slice(6)}`;
  }

  return {
    isValid: true,
    e164: `${country.dialCode}${cleanedDigits}`,
    formattedNational,
    carrierHint
  };
}
