import React, { useEffect, useState } from 'react';
import { LocationSession } from '../types';
import { useDeviceLocation, LocationCoords } from '../utils/useDeviceLocation';
import { 
  Play, 
  Square, 
  RefreshCw, 
  AlertOctagon, 
  Battery, 
  Radio, 
  Clock, 
  CheckCircle2 
} from 'lucide-react';

interface LiveTrackerControlsProps {
  activeSession: LocationSession | null;
  onUpdateLocation: (coords: LocationCoords) => Promise<void>;
  onStopSharing: () => Promise<void>;
  onStartSharing?: () => Promise<void>;
  onGrantConsent: () => Promise<void>;
  autoStartTracking?: boolean;
}

export const LiveTrackerControls: React.FC<LiveTrackerControlsProps> = ({
  activeSession,
  onUpdateLocation,
  onStopSharing,
  onStartSharing,
  onGrantConsent,
  autoStartTracking
}) => {
  const [timeAgo, setTimeAgo] = useState<string>('Never');

  const {
    isTracking,
    error: geoError,
    startTracking,
    stopTracking
  } = useDeviceLocation((coords) => {
    onUpdateLocation(coords);
  });

  // Calculate human-friendly timestamp
  useEffect(() => {
    const updateTime = () => {
      if (!activeSession?.updatedAt) {
        setTimeAgo('Not yet synced');
        return;
      }
      const diffMs = Date.now() - new Date(activeSession.updatedAt).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 5) setTimeAgo('Just now');
      else if (diffSec < 60) setTimeAgo(`${diffSec} seconds ago`);
      else if (diffSec < 3600) setTimeAgo(`${Math.floor(diffSec / 60)}m ago`);
      else setTimeAgo(new Date(activeSession.updatedAt).toLocaleTimeString());
    };

    updateTime();
    const interval = setInterval(updateTime, 4000);
    return () => clearInterval(interval);
  }, [activeSession?.updatedAt]);

  // Automatically start tracking if consent is already granted or autoStartTracking is enabled
  useEffect(() => {
    if (activeSession?.consentGranted && !isTracking && autoStartTracking) {
      startTracking();
    }
  }, [activeSession?.consentGranted, autoStartTracking, isTracking, startTracking]);

  const handleStartSharingClick = async () => {
    if (onStartSharing) {
      await onStartSharing();
    }
    startTracking();
  };

  const handleStopSharingClick = async () => {
    stopTracking();
    await onStopSharing();
  };

  const isSharingActive = activeSession?.status === 'sharing_active' || (isTracking && activeSession?.consentGranted);
  const hasCoordinates = typeof activeSession?.currentLat === 'number' && typeof activeSession?.currentLng === 'number';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header with Live Sharing Status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Radio className={`w-4 h-4 ${isSharingActive ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            Live GPS Broadcasting Hub
          </h3>
          <p className="text-xs text-slate-400">Manage device telemetry &amp; live stream</p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
            isSharingActive
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isSharingActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
            }`} />
            <span>{isSharingActive ? 'Sharing Active' : 'Sharing Inactive'}</span>
          </span>
        </div>
      </div>

      {/* Last Updated Timestamp & Device Pill */}
      {activeSession && (
        <div className="flex items-center justify-between text-xs bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-slate-300">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Last Updated: <strong className="text-slate-200 font-mono">{timeAgo}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <span>Device:</span>
            <span className="font-mono text-emerald-400">{activeSession.targetPhoneNumber}</span>
          </div>
        </div>
      )}

      {/* Geolocation Error Alert */}
      {geoError && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            <span>GPS Tracking Notice: {geoError.type.replace('_', ' ')}</span>
          </div>
          <p className="text-xs text-slate-300">{geoError.message}</p>
          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-rose-200 space-y-1">
            <span className="font-semibold text-[11px] block uppercase text-rose-400">Resolution:</span>
            <p>{geoError.userRemedy}</p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={startTracking}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry GPS</span>
            </button>
          </div>
        </div>
      )}

      {/* Live Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <div className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Latitude</span>
          <span className="text-xs font-mono font-semibold text-slate-200">
            {hasCoordinates ? activeSession!.currentLat!.toFixed(5) : '--'}
          </span>
        </div>

        <div className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Longitude</span>
          <span className="text-xs font-mono font-semibold text-slate-200">
            {hasCoordinates ? activeSession!.currentLng!.toFixed(5) : '--'}
          </span>
        </div>

        <div className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Accuracy</span>
          <span className="text-xs font-mono font-semibold text-emerald-400">
            {hasCoordinates && activeSession?.accuracy ? `±${Math.round(activeSession.accuracy)}m` : '--'}
          </span>
        </div>

        <div className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Battery</span>
          <span className="text-xs font-mono font-semibold text-teal-400 flex items-center gap-1">
            <Battery className="w-3.5 h-3.5" />
            {activeSession?.batteryLevel !== null && activeSession?.batteryLevel !== undefined ? `${activeSession.batteryLevel}%` : 'Normal'}
          </span>
        </div>
      </div>

      {/* Start Sharing & Stop Sharing Controls */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        {!isSharingActive ? (
          <button
            onClick={handleStartSharingClick}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition shadow-md shadow-emerald-950/40 cursor-pointer active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start Sharing My Location</span>
          </button>
        ) : (
          <button
            onClick={handleStopSharingClick}
            className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition shadow-md shadow-rose-950/40 cursor-pointer active:scale-[0.98]"
          >
            <Square className="w-4 h-4 fill-white" />
            <span>Stop Sharing</span>
          </button>
        )}
      </div>
    </div>
  );
};
