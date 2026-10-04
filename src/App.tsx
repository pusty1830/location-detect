import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  ensureUserSession, 
  getEffectiveUserId,
  handleFirestoreError, 
  OperationType 
} from './services/firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  deleteDoc, 
  query, 
  where,
  getDocs
} from 'firebase/firestore';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { 
  LocationSession, 
  LocationBreadcrumb, 
  EmergencyContact, 
  CountryInfo 
} from './types';
import { QuotaBanner } from './components/QuotaBanner';
import { ConsentBanner } from './components/ConsentBanner';
import { PhoneValidator } from './components/PhoneValidator';
import { LiveTrackerControls } from './components/LiveTrackerControls';
import { MapViewer } from './components/MapViewer';
import { EmergencySOSModal } from './components/EmergencySOSModal';
import { AISafetyAdvisor } from './components/AISafetyAdvisor';
import { LocationHistoryList } from './components/LocationHistoryList';
import { 
  Radio, 
  AlertTriangle, 
  LogIn, 
  LogOut, 
  Users,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ExternalLink
} from 'lucide-react';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDPA-c-WjePPPfebNcsbYZDwhdDyZKL7Uw';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeSession, setActiveSession] = useState<LocationSession | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<LocationBreadcrumb[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [countryEmergencyNum, setCountryEmergencyNum] = useState('911');
  const [sessionList, setSessionList] = useState<LocationSession[]>([]);
  const [autoStartTracking, setAutoStartTracking] = useState(false);

  // Loading & error feedback states
  const [isLocating, setIsLocating] = useState(false);
  const [locatingStatusMessage, setLocatingStatusMessage] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [generatedShareLink, setGeneratedShareLink] = useState<string | null>(null);

  // Incoming consent request state (when opening link as sharer)
  const [incomingConsentSession, setIncomingConsentSession] = useState<LocationSession | null>(null);
  const [isRespondingToConsent, setIsRespondingToConsent] = useState(false);

  // 1. Initialize Firebase Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setAuthReady(true);
      } else {
        try {
          const guest = await ensureUserSession();
          if ('email' in guest) {
            setCurrentUser(guest as User);
          }
          setAuthReady(true);
        } catch (err) {
          console.warn('Auth session initialized in device mode:', err);
          setAuthReady(true);
        }
      }
    });
    return () => unsub();
  }, []);

  // 2. Check URL query parameters for incoming session sharing or invitation
  useEffect(() => {
    if (!authReady) return;

    const params = new URLSearchParams(window.location.search);
    const paramSessionId = params.get('session');
    const isSharerRole = params.get('role') === 'sharer';

    if (paramSessionId) {
      loadSessionFromUrl(paramSessionId, isSharerRole);
    }
  }, [authReady]);

  const loadSessionFromUrl = async (sessionId: string, isSharerRole: boolean) => {
    try {
      const docSnap = await getDoc(doc(db, 'location_sessions', sessionId));
      if (docSnap.exists()) {
        const sessionData = docSnap.data() as LocationSession;
        if (isSharerRole && sessionData.status === 'pending_consent') {
          setIncomingConsentSession(sessionData);
        }
        setActiveSession(sessionData);
      }
    } catch (err) {
      console.warn('Failed to load session from URL:', err);
    }
  };

  // 3. Listen to user's saved emergency contacts
  useEffect(() => {
    if (!currentUser || !authReady) return;

    const contactsColPath = `users/${currentUser.uid}/emergency_contacts`;
    const unsub = onSnapshot(
      collection(db, 'users', currentUser.uid, 'emergency_contacts'),
      (snapshot) => {
        const contacts: EmergencyContact[] = [];
        snapshot.forEach((docSnap) => {
          contacts.push(docSnap.data() as EmergencyContact);
        });
        setEmergencyContacts(contacts);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, contactsColPath);
      }
    );

    return () => unsub();
  }, [currentUser, authReady]);

  // 4. Listen to user's active created sessions (restricted to authenticated user's own created sessions)
  useEffect(() => {
    if (!currentUser || !authReady) {
      setSessionList([]);
      return;
    }

    const q = query(
      collection(db, 'location_sessions'),
      where('creatorId', '==', currentUser.uid)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: LocationSession[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as LocationSession);
        });
        setSessionList(list);
      },
      (error) => {
        console.debug('Session list subscription note:', error.message);
      }
    );

    return () => unsub();
  }, [currentUser, authReady]);

  // 5. Real-time listener for current active session
  useEffect(() => {
    if (!activeSession?.sessionId) return;

    const sessionDocRef = doc(db, 'location_sessions', activeSession.sessionId);
    const unsub = onSnapshot(
      sessionDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const updated = docSnap.data() as LocationSession;
          setActiveSession(updated);

          // Add to local breadcrumbs if coordinates moved
          if (typeof updated.currentLat === 'number' && typeof updated.currentLng === 'number' && updated.status === 'sharing_active') {
            setBreadcrumbs((prev) => {
              const last = prev[prev.length - 1];
              if (!last || last.lat !== updated.currentLat || last.lng !== updated.currentLng) {
                return [
                  ...prev,
                  {
                    id: String(Date.now()),
                    lat: updated.currentLat!,
                    lng: updated.currentLng!,
                    accuracy: updated.accuracy || 10,
                    speed: updated.speed,
                    timestamp: updated.updatedAt || new Date().toISOString()
                  }
                ].slice(-30);
              }
              return prev;
            });
          }

          if (updated.isEmergency) {
            setIsSosModalOpen(true);
          }
        }
      },
      (error) => {
        console.warn('Session sync note:', error.message);
      }
    );

    return () => unsub();
  }, [activeSession?.sessionId]);

  // Helper to persist session to Firestore cleanly without undefined fields
  const persistSession = async (sessionData: LocationSession) => {
    const sanitizedData = Object.fromEntries(
      Object.entries(sessionData).filter(([_, v]) => v !== undefined)
    );

    try {
      await setDoc(doc(db, 'location_sessions', sessionData.sessionId), sanitizedData, { merge: true });
    } catch (err) {
      console.warn('Firestore session sync notice:', err);
    }
  };

  // ACTION 1: TRACK / REQUEST REMOTE MOBILE NUMBER
  // Checks if that phone number has an existing session in user's list, or generates a consent invite
  const handleFindRemoteLocation = async (phoneNumber: string, country: CountryInfo) => {
    console.log('[BeaconPath] Setting up authorized tracking request for:', phoneNumber);
    setLocationError(null);
    setGeneratedShareLink(null);
    setCountryEmergencyNum(country.emergencyNumber);

    try {
      // 1. Check if user already has an active session for this phone number
      const existing = sessionList.find(s => s.targetPhoneNumber === phoneNumber);
      if (existing) {
        setActiveSession(existing);
        if (existing.status === 'pending_consent') {
          const shareUrl = `${window.location.origin}?session=${existing.sessionId}&role=sharer`;
          setGeneratedShareLink(shareUrl);
        }
        console.log('[BeaconPath] Loaded existing tracked session for:', phoneNumber);
        return existing.sessionId;
      }

      // 2. Otherwise create a new dedicated authorization session for this target phone
      const effectiveUid = currentUser?.uid || getEffectiveUserId();
      const sessionId = `loc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const newSession: LocationSession = {
        sessionId,
        creatorId: effectiveUid,
        targetPhoneNumber: phoneNumber,
        targetCountry: country.code,
        deviceName: 'Remote Device',
        status: 'pending_consent',
        consentGranted: false,
        createdAt: now,
        updatedAt: now,
        isEmergency: false
      };

      await persistSession(newSession);
      setActiveSession(newSession);

      const shareUrl = `${window.location.origin}?session=${sessionId}&role=sharer`;
      setGeneratedShareLink(shareUrl);
      console.log('[BeaconPath] Created pending request. Share link:', shareUrl);
      return sessionId;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLocationError(`Could not initialize location session: ${msg}`);
    }
  };

  // ACTION 2: SHARE MY OWN DEVICE LOCATION
  // Broadcasts the current device's GPS to Firestore
  const handleShareOwnLocation = async () => {
    setIsLocating(true);
    setLocatingStatusMessage('Requesting GPS permission from this device...');
    setLocationError(null);

    if (!navigator.geolocation) {
      setIsLocating(false);
      setLocatingStatusMessage(null);
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    const effectiveUid = currentUser?.uid || getEffectiveUserId();
    const sessionId = activeSession?.sessionId || `loc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const saveOwnCoords = async (posCoords: GeolocationCoordinates) => {
      console.log('[BeaconPath] Acquired genuine GPS on this device:', posCoords.latitude, posCoords.longitude);

      const newSession: LocationSession = {
        sessionId,
        creatorId: effectiveUid,
        targetPhoneNumber: 'My Device (Direct GPS)',
        targetCountry: 'LOCAL',
        deviceName: navigator.userAgent.includes('Mobile') ? 'Mobile Smartphone' : 'Desktop / Laptop',
        status: 'sharing_active',
        consentGranted: true,
        currentLat: posCoords.latitude,
        currentLng: posCoords.longitude,
        accuracy: posCoords.accuracy,
        speed: posCoords.speed ?? null,
        heading: posCoords.heading ?? null,
        altitude: posCoords.altitude ?? null,
        address: `${posCoords.latitude.toFixed(4)}, ${posCoords.longitude.toFixed(4)} (Live GPS)`,
        createdAt: activeSession?.createdAt || now,
        updatedAt: now,
        isEmergency: false
      };

      setActiveSession(newSession);
      setAutoStartTracking(true);
      setIsLocating(false);
      setLocatingStatusMessage(null);
      setLocationError(null);

      await persistSession(newSession);
    };

    // Request genuine GPS
    navigator.geolocation.getCurrentPosition(
      (position) => {
        saveOwnCoords(position.coords);
      },
      (err) => {
        console.warn('[BeaconPath] GPS prompt notice:', err.code, err.message);

        if (err.code === err.PERMISSION_DENIED) {
          setIsLocating(false);
          setLocatingStatusMessage(null);
          setLocationError('Location permission was denied. Tap the lock/tune icon in your browser address bar and set Location to "Allow".');
          return;
        }

        setLocatingStatusMessage('Checking Wi-Fi / cellular assisted fix...');

        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => {
            saveOwnCoords(fallbackPos.coords);
          },
          (fallbackErr) => {
            setIsLocating(false);
            setLocatingStatusMessage(null);
            setLocationError(`Location unavailable (${fallbackErr.message || 'GPS hardware fix not acquired'}). Check device settings.`);
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  };

  // ACTION 3: RESPOND TO INCOMING CONSENT (SHARER OPENS LINK ON THEIR PHONE)
  const handleAcceptIncomingConsent = async () => {
    if (!incomingConsentSession) return;
    setIsRespondingToConsent(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const now = new Date().toISOString();
        const updatePayload: Partial<LocationSession> = {
          currentLat: pos.coords.latitude,
          currentLng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed ?? null,
          heading: pos.coords.heading ?? null,
          altitude: pos.coords.altitude ?? null,
          address: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (Authorized Device)`,
          status: 'sharing_active',
          consentGranted: true,
          updatedAt: now
        };

        const sanitized = Object.fromEntries(
          Object.entries(updatePayload).filter(([_, v]) => v !== undefined)
        );

        try {
          await updateDoc(doc(db, 'location_sessions', incomingConsentSession.sessionId), sanitized);
          setActiveSession((prev) => prev ? { ...prev, ...updatePayload } : null);
          setAutoStartTracking(true);
          setIncomingConsentSession(null);
        } catch (err) {
          console.warn('Consent save error:', err);
        } finally {
          setIsRespondingToConsent(false);
        }
      },
      (err) => {
        setIsRespondingToConsent(false);
        alert(`Location permission error: ${err.message}. Please allow location access to share.`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  };

  const handleDeclineIncomingConsent = async () => {
    if (!incomingConsentSession) return;
    try {
      await updateDoc(doc(db, 'location_sessions', incomingConsentSession.sessionId), {
        status: 'sharing_stopped',
        updatedAt: new Date().toISOString()
      });
      setIncomingConsentSession(null);
    } catch {
      setIncomingConsentSession(null);
    }
  };

  // Update location coords in Firestore from continuous watcher
  const handleUpdateLocation = async (coords: {
    lat: number;
    lng: number;
    accuracy: number;
    speed?: number | null;
    heading?: number | null;
    altitude?: number | null;
    batteryLevel?: number | null;
  }) => {
    if (!activeSession) return;

    const now = new Date().toISOString();
    const updatePayload: Partial<LocationSession> = {
      currentLat: coords.lat,
      currentLng: coords.lng,
      accuracy: coords.accuracy,
      speed: coords.speed ?? null,
      heading: coords.heading ?? null,
      altitude: coords.altitude ?? null,
      batteryLevel: coords.batteryLevel ?? null,
      updatedAt: now,
      status: activeSession.isEmergency ? 'sos_active' : 'sharing_active'
    };

    const sanitizedPayload = Object.fromEntries(
      Object.entries(updatePayload).filter(([_, v]) => v !== undefined)
    );

    setActiveSession((prev) => prev ? { ...prev, ...updatePayload } : null);

    try {
      await updateDoc(doc(db, 'location_sessions', activeSession.sessionId), sanitizedPayload);
    } catch {
      // safe fallback
    }
  };

  // Grant device consent
  const handleGrantConsent = async () => {
    if (!activeSession) return;
    try {
      await updateDoc(doc(db, 'location_sessions', activeSession.sessionId), {
        consentGranted: true,
        status: 'sharing_active',
        updatedAt: new Date().toISOString()
      });
      setActiveSession((prev) => prev ? { ...prev, consentGranted: true, status: 'sharing_active' } : null);
    } catch {
      setActiveSession((prev) => prev ? { ...prev, consentGranted: true, status: 'sharing_active' } : null);
    }
  };

  // Start Sharing
  const handleStartSharing = async () => {
    if (!activeSession) return;
    const now = new Date().toISOString();
    try {
      await updateDoc(doc(db, 'location_sessions', activeSession.sessionId), {
        status: 'sharing_active',
        consentGranted: true,
        updatedAt: now
      });
      setActiveSession((prev) => prev ? { ...prev, status: 'sharing_active', consentGranted: true, updatedAt: now } : null);
    } catch {
      setActiveSession((prev) => prev ? { ...prev, status: 'sharing_active', consentGranted: true, updatedAt: now } : null);
    }
  };

  // Stop sharing & revoke session
  const handleStopSharing = async () => {
    if (!activeSession) return;
    const now = new Date().toISOString();
    try {
      await updateDoc(doc(db, 'location_sessions', activeSession.sessionId), {
        status: 'sharing_stopped',
        updatedAt: now
      });
      setActiveSession((prev) => prev ? { ...prev, status: 'sharing_stopped', updatedAt: now } : null);
    } catch {
      setActiveSession((prev) => prev ? { ...prev, status: 'sharing_stopped', updatedAt: now } : null);
    }
  };

  // Trigger Emergency SOS
  const handleTriggerSos = async (emergencyNote?: string) => {
    if (!activeSession) return;
    const now = new Date().toISOString();
    try {
      await updateDoc(doc(db, 'location_sessions', activeSession.sessionId), {
        isEmergency: true,
        status: 'sos_active',
        emergencyNote: emergencyNote || 'Distress signal triggered',
        updatedAt: now
      });
      setIsSosModalOpen(true);
    } catch {
      setIsSosModalOpen(true);
    }
  };

  // Cancel Emergency SOS
  const handleCancelSos = async () => {
    if (!activeSession) return;
    const now = new Date().toISOString();
    try {
      await updateDoc(doc(db, 'location_sessions', activeSession.sessionId), {
        isEmergency: false,
        status: 'sharing_active',
        updatedAt: now
      });
      setIsSosModalOpen(false);
    } catch {
      setIsSosModalOpen(false);
    }
  };

  // Add Emergency Contact
  const handleAddEmergencyContact = async (name: string, phone: string, relationship: string) => {
    const effectiveUid = currentUser?.uid || getEffectiveUserId();
    const contactId = `contact_${Date.now()}`;
    const newContact: EmergencyContact = {
      contactId,
      userId: effectiveUid,
      name,
      phone,
      relationship,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'users', effectiveUid, 'emergency_contacts', contactId), newContact);
    } catch {
      setEmergencyContacts((prev) => [...prev, newContact]);
    }
  };

  // Delete Emergency Contact
  const handleDeleteEmergencyContact = async (contactId: string) => {
    const effectiveUid = currentUser?.uid || getEffectiveUserId();
    try {
      await deleteDoc(doc(db, 'users', effectiveUid, 'emergency_contacts', contactId));
    } catch {
      setEmergencyContacts((prev) => prev.filter(c => c.contactId !== contactId));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Google Maps Quota Exhaustion Banner */}
      <QuotaBanner />

      {/* Incoming Sharer Consent Request Banner (When someone opens an invite link on their device) */}
      {incomingConsentSession && (
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 border-b border-emerald-500/40 p-4 sticky top-0 z-50 shadow-xl">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">
                  Location Sharing Request for {incomingConsentSession.targetPhoneNumber}
                </h3>
                <p className="text-xs text-emerald-200/90">
                  A contact requested to view your live GPS coordinates on BeaconPath. Tap authorize to share your device location.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleAcceptIncomingConsent}
                disabled={isRespondingToConsent}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow transition cursor-pointer"
              >
                {isRespondingToConsent ? 'Requesting GPS...' : 'Authorize & Share My GPS'}
              </button>
              <button
                onClick={handleDeclineIncomingConsent}
                className="px-3 py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-950/60">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  BeaconPath
                </h1>
                <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  AI Live Radar
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Authorized GPS location finder with device consent &amp; SOS safety
              </p>
            </div>
          </div>

          {/* Quick SOS & Auth Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSosModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950/60 transition cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>SOS Emergency</span>
            </button>

            {currentUser && !currentUser.isAnonymous ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <span className="text-xs text-slate-300 font-medium hidden md:inline truncate max-w-[120px]">
                  {currentUser.displayName || currentUser.email}
                </span>
                <button
                  onClick={() => signOut(auth)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={loginWithGoogle}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Sign In with Google</span>
                <span className="sm:hidden">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        {/* Transparency Constitution Banner */}
        <ConsentBanner />

        {/* Saved Sessions Switcher if multiple exist */}
        {sessionList.length > 1 && (
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              Your Active Tracks:
            </span>
            {sessionList.map((s) => (
              <button
                key={s.sessionId}
                onClick={() => setActiveSession(s)}
                className={`px-3 py-1 rounded-lg shrink-0 transition font-mono cursor-pointer ${
                  activeSession?.sessionId === s.sessionId
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {s.targetPhoneNumber} ({s.status.replace('_', ' ')})
              </button>
            ))}
          </div>
        )}

        {/* Dashboard 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Phone Setup & Controls */}
          <div className="lg:col-span-5 space-y-6">
            <PhoneValidator 
              onFindRemoteLocation={handleFindRemoteLocation}
              onShareOwnLocation={handleShareOwnLocation}
              isLocating={isLocating}
              locatingStatusMessage={locatingStatusMessage}
              errorMessage={locationError}
              onClearError={() => setLocationError(null)}
              generatedShareLink={generatedShareLink}
            />

            <LiveTrackerControls
              activeSession={activeSession}
              onUpdateLocation={handleUpdateLocation}
              onStopSharing={handleStopSharing}
              onStartSharing={handleStartSharing}
              onGrantConsent={handleGrantConsent}
              autoStartTracking={autoStartTracking}
            />

            <LocationHistoryList
              breadcrumbs={breadcrumbs}
              onClearHistory={() => setBreadcrumbs([])}
            />
          </div>

          {/* Right Column: Google Maps & AI Advisor */}
          <div className="lg:col-span-7 space-y-6">
            <MapViewer
              apiKey={MAPS_API_KEY}
              activeSession={activeSession}
              breadcrumbs={breadcrumbs}
              onTriggerSos={() => setIsSosModalOpen(true)}
            />

            <AISafetyAdvisor activeSession={activeSession} />
          </div>
        </div>
      </main>

      {/* Emergency SOS Modal */}
      <EmergencySOSModal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        activeSession={activeSession}
        onTriggerSos={handleTriggerSos}
        onCancelSos={handleCancelSos}
        emergencyContacts={emergencyContacts}
        onAddContact={handleAddEmergencyContact}
        onDeleteContact={handleDeleteEmergencyContact}
        countryEmergencyNumber={countryEmergencyNum}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>
            BeaconPath &copy; {new Date().getFullYear()} &bull; Authorized GPS Mobile Location Finder &bull; Built with React, Google Maps Platform &amp; Firebase
          </p>
          <p className="text-[11px] text-slate-600">
            Complies with browser Geolocation API permissions and explicit consent standards.
          </p>
        </div>
      </footer>
    </div>
  );
}
