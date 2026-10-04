import React, { useState, useEffect, useRef } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  InfoWindow, 
  useMap 
} from '@vis.gl/react-google-maps';
import { LocationSession, LocationBreadcrumb } from '../types';
import { 
  Battery, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Crosshair, 
  MapPin, 
  Activity,
  Radio,
  Lock,
  Compass
} from 'lucide-react';

interface MapViewerProps {
  apiKey: string;
  activeSession: LocationSession | null;
  breadcrumbs: LocationBreadcrumb[];
  onTriggerSos: () => void;
}

// Camera controller helper
const MapController: React.FC<{ targetLat?: number; targetLng?: number }> = ({ targetLat, targetLng }) => {
  const map = useMap();
  const lastTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (map && targetLat !== undefined && targetLng !== undefined) {
      const key = `${targetLat.toFixed(5)},${targetLng.toFixed(5)}`;
      if (lastTargetRef.current !== key) {
        map.panTo({ lat: targetLat, lng: targetLng });
        if (!lastTargetRef.current) {
          map.setZoom(16);
        }
        lastTargetRef.current = key;
      }
    }
  }, [map, targetLat, targetLng]);

  return null;
};

export const MapViewer: React.FC<MapViewerProps> = ({ 
  apiKey, 
  activeSession, 
  breadcrumbs, 
  onTriggerSos 
}) => {
  const [selectedMarker, setSelectedMarker] = useState<LocationSession | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');

  const hasGenuineCoordinates = Boolean(
    activeSession &&
    typeof activeSession.currentLat === 'number' &&
    typeof activeSession.currentLng === 'number' &&
    activeSession.status === 'sharing_active'
  );

  const currentLat = hasGenuineCoordinates ? activeSession!.currentLat! : 20.5937; // Center of globe / general fallback center
  const currentLng = hasGenuineCoordinates ? activeSession!.currentLng! : 78.9629;
  const initialZoom = hasGenuineCoordinates ? 16 : 3;

  return (
    <div className="relative w-full h-[520px] md:h-[600px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex flex-col">
      {/* Top Map HUD Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${
              activeSession?.isEmergency 
                ? 'bg-rose-500 animate-ping' 
                : hasGenuineCoordinates
                ? 'bg-emerald-400 animate-pulse' 
                : activeSession?.status === 'pending_consent'
                ? 'bg-amber-400'
                : 'bg-slate-500'
            }`} />
            <span className="font-semibold text-slate-100">
              {activeSession?.isEmergency 
                ? 'CRITICAL SOS SIGNAL' 
                : hasGenuineCoordinates
                ? 'LIVE GPS RADAR' 
                : activeSession?.status === 'pending_consent'
                ? 'AWAITING CONSENT'
                : activeSession?.status === 'sharing_stopped'
                ? 'SHARING STOPPED'
                : 'RADAR READY'}
            </span>
            {hasGenuineCoordinates && activeSession?.accuracy && (
              <span className="text-[11px] font-mono text-slate-400 pl-1 border-l border-slate-700">
                ±{Math.round(activeSession.accuracy)}m
              </span>
            )}
          </div>
        </div>

        {/* Map Type & SOS Action Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1 rounded-xl shadow-lg flex items-center gap-1 text-xs">
            <button
              onClick={() => setMapType('roadmap')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                mapType === 'roadmap' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Default
            </button>
            <button
              onClick={() => setMapType('hybrid')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                mapType === 'hybrid' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Satellite
            </button>
          </div>

          {hasGenuineCoordinates && !activeSession?.isEmergency && (
            <button
              onClick={onTriggerSos}
              className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg shadow-rose-950/60 transition flex items-center gap-1.5 cursor-pointer animate-pulse"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>SOS</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Google Maps Canvas */}
      <div className="w-full flex-1 relative">
        <APIProvider apiKey={apiKey} language="en">
          <Map
            defaultCenter={{ lat: currentLat, lng: currentLng }}
            defaultZoom={initialZoom}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
            mapTypeId={mapType}
            disableDefaultUI={false}
            zoomControl={true}
            streetViewControl={false}
            fullscreenControl={false}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
          >
            {hasGenuineCoordinates && (
              <MapController 
                targetLat={activeSession!.currentLat} 
                targetLng={activeSession!.currentLng} 
              />
            )}

            {/* Breadcrumb Trail Markers (only for authorized coordinates) */}
            {hasGenuineCoordinates && breadcrumbs.map((crumb, idx) => (
              <AdvancedMarker
                key={crumb.id || idx}
                position={{ lat: crumb.lat, lng: crumb.lng }}
                title={`Waypoint ${idx + 1}`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-teal-400 border border-slate-900 shadow-sm opacity-60" />
              </AdvancedMarker>
            ))}

            {/* Main Active Location Marker (rendered ONLY when genuine coordinates exist) */}
            {hasGenuineCoordinates && (
              <AdvancedMarker
                position={{ lat: activeSession!.currentLat!, lng: activeSession!.currentLng! }}
                onClick={() => setSelectedMarker(activeSession)}
                title={activeSession?.targetPhoneNumber || 'Tracked Mobile Device'}
              >
                <div className="relative flex items-center justify-center cursor-pointer group">
                  {/* Outer Pulsing Radar Ring */}
                  <span className={`absolute inline-flex h-12 w-12 rounded-full opacity-60 ${
                    activeSession?.isEmergency 
                      ? 'bg-rose-500 animate-ping' 
                      : 'bg-emerald-500 animate-ping'
                  }`} />
                  
                  {/* Secondary Halo */}
                  <span className={`absolute inline-flex h-8 w-8 rounded-full opacity-40 ${
                    activeSession?.isEmergency ? 'bg-rose-400' : 'bg-emerald-400'
                  }`} />

                  {/* Center Solid Pin */}
                  <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-xl border-2 border-white transition-transform group-hover:scale-110 ${
                    activeSession?.isEmergency ? 'bg-rose-600' : 'bg-emerald-600'
                  }`}>
                    {activeSession?.isEmergency ? (
                      <AlertTriangle className="w-5 h-5 text-white animate-bounce" />
                    ) : (
                      <MapPin className="w-5 h-5 text-white" />
                    )}
                  </div>

                  {/* Mini device phone pill tag */}
                  <div className="absolute -bottom-6 bg-slate-950/90 text-slate-100 text-[10px] font-mono px-2 py-0.5 rounded-md border border-slate-700 whitespace-nowrap shadow-lg">
                    {activeSession?.targetPhoneNumber}
                  </div>
                </div>
              </AdvancedMarker>
            )}

            {/* Info Window */}
            {selectedMarker && hasGenuineCoordinates && (
              <InfoWindow
                position={{ lat: selectedMarker.currentLat!, lng: selectedMarker.currentLng! }}
                onCloseClick={() => setSelectedMarker(null)}
              >
                <div className="p-1 max-w-xs space-y-2 text-slate-900 font-sans">
                  <div className="flex items-center justify-between border-b pb-1.5 border-slate-200">
                    <span className="font-bold text-xs flex items-center gap-1 text-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      {selectedMarker.targetPhoneNumber}
                    </span>
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Live GPS
                    </span>
                  </div>

                  {selectedMarker.address && (
                    <p className="text-xs text-slate-700 font-medium leading-snug">
                      {selectedMarker.address}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Coordinates</span>
                      <span className="font-mono font-medium text-slate-800">
                        {selectedMarker.currentLat?.toFixed(4)}, {selectedMarker.currentLng?.toFixed(4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Accuracy</span>
                      <span className="font-mono font-medium text-slate-800">
                        ±{selectedMarker.accuracy ? Math.round(selectedMarker.accuracy) : 10}m
                      </span>
                    </div>
                  </div>

                  {selectedMarker.batteryLevel !== null && selectedMarker.batteryLevel !== undefined && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
                      <Battery className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Battery: {Math.round(selectedMarker.batteryLevel)}%</span>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 pt-0.5">
                    Updated: {new Date(selectedMarker.updatedAt).toLocaleTimeString()}
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>

        {/* Overlay Notice When No Coordinates Available (Transparent & Honest) */}
        {!hasGenuineCoordinates && (
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] flex items-center justify-center p-6 z-20 pointer-events-none">
            <div className="max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-2xl space-y-3 pointer-events-auto">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto flex items-center justify-center">
                <Compass className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-100">
                  {activeSession?.status === 'pending_consent' 
                    ? `Awaiting Consent for ${activeSession.targetPhoneNumber}`
                    : activeSession?.status === 'sharing_stopped'
                    ? `Sharing Stopped for ${activeSession.targetPhoneNumber}`
                    : 'No Live Location Broadcasting'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {activeSession?.status === 'pending_consent'
                    ? 'A location request has been created. The phone owner must open the secure invite link on their device and grant GPS permission to display their location here.'
                    : activeSession?.status === 'sharing_stopped'
                    ? 'The device owner has paused or ended location sharing. No new coordinates are being received.'
                    : 'To view a live location, enter a phone number to send a location request, or click "Share My Location" to broadcast this device\'s GPS.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Map Status Strip */}
      <div className="bg-slate-900/90 border-t border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-slate-200">
              {hasGenuineCoordinates 
                ? `${activeSession!.currentLat!.toFixed(5)}, ${activeSession!.currentLng!.toFixed(5)}` 
                : 'Waiting for authorized device coordinates...'}
            </span>
          </div>
          {hasGenuineCoordinates && activeSession?.speed !== null && activeSession?.speed !== undefined && activeSession.speed > 0 && (
            <div className="hidden sm:flex items-center gap-1 text-slate-400 border-l border-slate-700 pl-3">
              <Activity className="w-3.5 h-3.5 text-teal-400" />
              <span>Speed: {Math.round(activeSession.speed * 3.6)} km/h</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>
              {hasGenuineCoordinates && activeSession?.updatedAt 
                ? `Updated ${new Date(activeSession.updatedAt).toLocaleTimeString()}`
                : 'No sync'}
            </span>
          </div>
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Consent-Grounded
          </span>
        </div>
      </div>
    </div>
  );
};
