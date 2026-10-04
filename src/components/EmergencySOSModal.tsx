import React, { useState, useEffect } from 'react';
import { LocationSession, EmergencyContact } from '../types';
import { soundFx } from '../utils/sound';
import { 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  PhoneCall, 
  Copy, 
  Check, 
  ShieldCheck, 
  X, 
  UserPlus, 
  Trash2, 
  MapPin, 
  MessageSquare 
} from 'lucide-react';

interface EmergencySOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSession: LocationSession | null;
  onTriggerSos: (emergencyNote?: string) => Promise<void>;
  onCancelSos: () => Promise<void>;
  emergencyContacts: EmergencyContact[];
  onAddContact: (name: string, phone: string, relationship: string) => Promise<void>;
  onDeleteContact: (contactId: string) => Promise<void>;
  countryEmergencyNumber: string;
}

export const EmergencySOSModal: React.FC<EmergencySOSModalProps> = ({
  isOpen,
  onClose,
  activeSession,
  onTriggerSos,
  onCancelSos,
  emergencyContacts,
  onAddContact,
  onDeleteContact,
  countryEmergencyNumber
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [soundMuted, setSoundMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRel, setNewContactRel] = useState('Family');
  const [showAddContact, setShowAddContact] = useState(false);
  const [emergencyNote, setEmergencyNote] = useState('');

  const isEmergencyActive = Boolean(activeSession?.isEmergency);

  // Sound siren control
  useEffect(() => {
    if (isEmergencyActive && !soundMuted) {
      soundFx.startSosSiren();
    } else {
      soundFx.stopSosSiren();
    }
    return () => {
      soundFx.stopSosSiren();
    };
  }, [isEmergencyActive, soundMuted]);

  // Countdown timer for deliberate SOS trigger
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      onTriggerSos(emergencyNote);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onTriggerSos, emergencyNote]);

  const startSosCountdown = () => {
    setCountdown(3);
  };

  const abortCountdown = () => {
    setCountdown(null);
  };

  const copyDispatchText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const gmapsLink = activeSession?.currentLat && activeSession?.currentLng
    ? `https://www.google.com/maps?q=${activeSession.currentLat},${activeSession.currentLng}`
    : window.location.href;

  const dispatchMessage = `EMERGENCY SOS: Urgent assistance requested! Last known coordinates: ${activeSession?.currentLat?.toFixed(5) || 'Unknown'}, ${activeSession?.currentLng?.toFixed(5) || 'Unknown'} (Accuracy: +/- ${activeSession?.accuracy ? Math.round(activeSession.accuracy) : 15}m). Live tracking: ${gmapsLink}. Emergency Note: ${emergencyNote || 'Immediate support needed.'}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 max-w-xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`p-4 flex items-center justify-between text-white ${
          isEmergencyActive ? 'bg-rose-600 animate-pulse' : 'bg-slate-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {isEmergencyActive ? 'EMERGENCY SOS ACTIVE' : 'Emergency SOS System'}
              </h3>
              <p className="text-xs text-white/80">
                {isEmergencyActive ? 'High-priority distress beacon broadcasting' : 'Instant dispatch & contacts'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEmergencyActive && (
              <button
                onClick={() => setSoundMuted(!soundMuted)}
                className="p-2 rounded-lg bg-black/20 hover:bg-black/40 text-white transition cursor-pointer"
                title={soundMuted ? 'Unmute siren' : 'Mute siren'}
              >
                {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-black/20 hover:bg-black/40 text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-200">
          {/* Active Countdown Screen */}
          {countdown !== null && (
            <div className="text-center py-6 space-y-4">
              <div className="w-20 h-20 rounded-full bg-rose-600 text-white text-3xl font-extrabold flex items-center justify-center mx-auto animate-ping shadow-2xl">
                {countdown}
              </div>
              <h4 className="text-lg font-bold text-rose-400">Broadcasting SOS in {countdown}s...</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Distress beacon, live GPS coordinates, and sirens are initiating. Tap cancel to abort if accidental.
              </p>
              <button
                onClick={abortCountdown}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-sm transition cursor-pointer"
              >
                Cancel SOS
              </button>
            </div>
          )}

          {/* Emergency Active Banner */}
          {isEmergencyActive && (
            <div className="p-4 bg-rose-950/40 border border-rose-500/50 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs text-rose-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  Beacon Active on Google Maps
                </span>
                <span className="font-mono">
                  {activeSession?.currentLat?.toFixed(4)}, {activeSession?.currentLng?.toFixed(4)}
                </span>
              </div>

              {/* Quick Dial National Emergency */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`tel:${countryEmergencyNumber}`}
                  className="py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Call {countryEmergencyNumber}</span>
                </a>

                <button
                  onClick={onCancelSos}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
                >
                  Deactivate SOS
                </button>
              </div>

              {/* Dispatch text copy box */}
              <div className="space-y-1 pt-1">
                <span className="text-[11px] font-semibold text-slate-400">First Responder Dispatch Message:</span>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 select-all leading-relaxed">
                  {dispatchMessage}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => copyDispatchText(dispatchMessage)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied to clipboard' : 'Copy Message'}</span>
                  </button>
                  <a
                    href={`sms:?body=${encodeURIComponent(dispatchMessage)}`}
                    className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Send SMS</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Trigger Section if not active and not counting down */}
          {!isEmergencyActive && countdown === null && (
            <div className="space-y-3">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Optional Distress Note (e.g. Medical issue, vehicle breakdown, route lost):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lost in transit, phone battery at 8%..."
                  value={emergencyNote}
                  onChange={(e) => setEmergencyNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                onClick={startSosCountdown}
                className="w-full py-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-rose-950/60 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <AlertTriangle className="w-5 h-5 fill-white" />
                <span>ACTIVATE EMERGENCY SOS</span>
              </button>
            </div>
          )}

          {/* Emergency Contacts Manager */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-200">Trusted Emergency Contacts</h4>
                <p className="text-[11px] text-slate-400">Family members or guardians alerted during SOS</p>
              </div>
              <button
                onClick={() => setShowAddContact(!showAddContact)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{showAddContact ? 'Cancel' : 'Add Contact'}</span>
              </button>
            </div>

            {/* Add Contact Form */}
            {showAddContact && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Name"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200"
                  />
                  <input
                    type="tel"
                    placeholder="Phone (e.g. +1...)"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200"
                  />
                  <select
                    value={newContactRel}
                    onChange={(e) => setNewContactRel(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200"
                  >
                    <option value="Family">Family</option>
                    <option value="Partner">Partner</option>
                    <option value="Friend">Friend</option>
                    <option value="Doctor">Doctor</option>
                  </select>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={async () => {
                      if (!newContactName || !newContactPhone) return;
                      await onAddContact(newContactName, newContactPhone, newContactRel);
                      setNewContactName('');
                      setNewContactPhone('');
                      setShowAddContact(false);
                    }}
                    disabled={!newContactName || !newContactPhone}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Save Contact
                  </button>
                </div>
              </div>
            )}

            {/* Contacts List */}
            <div className="space-y-2">
              {emergencyContacts.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No emergency contacts saved yet. Add your trusted family numbers.
                </div>
              ) : (
                emergencyContacts.map((c) => (
                  <div
                    key={c.contactId}
                    className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-200 block">{c.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{c.phone} ({c.relationship})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${c.phone}`}
                        className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        title="Call contact"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`sms:${c.phone}?body=${encodeURIComponent(dispatchMessage)}`}
                        className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 hover:bg-teal-500/20"
                        title="Send SMS"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => onDeleteContact(c.contactId)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                        title="Delete contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
