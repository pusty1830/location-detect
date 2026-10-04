import React, { useState } from 'react';
import { COUNTRIES, validatePhoneNumber, ValidationResult } from '../utils/countries';
import { CountryInfo } from '../types';
import { 
  Phone, 
  CheckCircle, 
  AlertCircle, 
  Share2, 
  Navigation, 
  Copy, 
  Check, 
  MessageSquare, 
  ChevronDown,
  Loader2,
  Lock,
  Compass,
  Radio
} from 'lucide-react';

interface PhoneValidatorProps {
  onFindRemoteLocation: (phoneNumber: string, country: CountryInfo) => Promise<string | void>;
  onShareOwnLocation: () => Promise<void>;
  isLocating: boolean;
  locatingStatusMessage?: string | null;
  errorMessage?: string | null;
  onClearError?: () => void;
  generatedShareLink?: string | null;
}

export const PhoneValidator: React.FC<PhoneValidatorProps> = ({ 
  onFindRemoteLocation, 
  onShareOwnLocation,
  isLocating,
  locatingStatusMessage,
  errorMessage,
  onClearError,
  generatedShareLink
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFinding, setIsFinding] = useState(false);

  const validation: ValidationResult = validatePhoneNumber(phoneNumber, selectedCountry);

  const filteredCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
    c.dialCode.includes(countrySearch) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const handleFindRemoteClick = async () => {
    setHasSubmitted(true);
    if (onClearError) onClearError();
    if (!validation.isValid) return;

    setIsFinding(true);
    try {
      await onFindRemoteLocation(validation.e164, selectedCountry);
    } finally {
      setIsFinding(false);
    }
  };

  const handleShareOwnClick = async () => {
    if (onClearError) onClearError();
    if (isLocating) return;
    await onShareOwnLocation();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Mobile Location Tracker</h2>
            <p className="text-xs text-slate-400">Consent-grounded GPS location sharing</p>
          </div>
        </div>
        <span className="text-[11px] font-mono bg-slate-800/80 text-emerald-400 font-semibold px-2.5 py-1 rounded-full border border-slate-700 flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Authorized GPS Only
        </span>
      </div>

      {/* Input Group */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>Target Mobile Number &amp; Country Code</span>
        </label>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Country Selector Dropdown */}
          <div className="relative sm:w-52">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-sm text-slate-200 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-lg leading-none">{selectedCountry.flag}</span>
                <span className="font-medium text-slate-200">{selectedCountry.code}</span>
                <span className="text-xs font-mono text-emerald-400">{selectedCountry.dialCode}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 z-30 mt-1 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 space-y-1">
                <input
                  type="text"
                  placeholder="Search country or code..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
                <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                  {filteredCountries.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setSelectedCountry(c);
                        setIsDropdownOpen(false);
                        setCountrySearch('');
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-left transition cursor-pointer ${
                        selectedCountry.code === c.code
                          ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{c.flag}</span>
                        <span className="truncate max-w-[130px]">{c.name}</span>
                      </div>
                      <span className="font-mono text-slate-400">{c.dialCode}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Number Input */}
          <div className="relative flex-1">
            <input
              type="tel"
              placeholder={`e.g. ${selectedCountry.format}`}
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                if (onClearError) onClearError();
              }}
              className={`w-full px-4 py-2.5 bg-slate-950 border rounded-xl text-sm font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none transition ${
                phoneNumber && !validation.isValid && hasSubmitted
                  ? 'border-rose-500/80 focus:ring-2 focus:ring-rose-500/30'
                  : phoneNumber && validation.isValid
                  ? 'border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/30'
                  : 'border-slate-800 focus:border-emerald-500'
              }`}
            />
            {phoneNumber && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {validation.isValid ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Validation Status Message */}
        {phoneNumber ? (
          <div className="text-xs pt-1 flex items-center justify-between">
            {validation.isValid ? (
              <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle className="w-3.5 h-3.5" />
                Valid: <span className="font-mono">{validation.e164}</span> ({validation.carrierHint})
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {validation.error}
              </span>
            )}
            <span className="text-[11px] text-slate-500">
              Emergency Services: <span className="text-rose-400 font-mono font-semibold">{selectedCountry.emergencyNumber}</span>
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">
            Enter a mobile number to track or request location, or click <strong className="text-emerald-400">&quot;Share My Own Location&quot;</strong> to broadcast this device.
          </p>
        )}
      </div>

      {/* Feedback & Error Alerts */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-950/50 border border-rose-500/40 rounded-xl text-xs text-rose-200 space-y-1.5 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <span className="font-semibold block text-rose-300">Notice</span>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {locatingStatusMessage && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 flex items-center gap-2.5 animate-in fade-in">
          <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
          <span>{locatingStatusMessage}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* BUTTON 1: TRACK / REQUEST REMOTE NUMBER */}
        <button
          type="button"
          id="track-location-btn"
          onClick={handleFindRemoteClick}
          disabled={isFinding || isLocating}
          className="flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-950/60 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
        >
          {isFinding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Checking Location...</span>
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4 fill-white text-white" />
              <span>Track Location</span>
            </>
          )}
        </button>

        {/* BUTTON 2: BROADCAST MY OWN DEVICE GPS */}
        <button
          type="button"
          onClick={handleShareOwnClick}
          disabled={isLocating || isFinding}
          className="flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs sm:text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
        >
          {isLocating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Broadcasting My GPS...</span>
            </>
          ) : (
            <>
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>Share My Own Location</span>
            </>
          )}
        </button>
      </div>

      {/* Generated Link Card */}
      {generatedShareLink && (
        <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              Location Request Link Generated
            </span>
            <span className="text-[11px] text-amber-400">Awaiting Device GPS Consent</span>
          </div>

          <p className="text-xs text-slate-300">
            Send this authorization link to the phone owner. When opened on their device, they must tap <strong>&quot;Allow Location Access&quot;</strong> to stream their coordinates to your map:
          </p>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={generatedShareLink}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-300 select-all"
            />
            <button
              onClick={() => copyToClipboard(generatedShareLink)}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <a
              href={`sms:${validation.e164}?body=${encodeURIComponent(`Please share your location with me on BeaconPath: ${generatedShareLink}`)}`}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition border border-slate-700"
            >
              <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
              <span>SMS</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
