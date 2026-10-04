import React from 'react';
import { LocationBreadcrumb } from '../types';
import { Clock, Navigation, Trash2, ArrowUpRight, Crosshair } from 'lucide-react';

interface LocationHistoryListProps {
  breadcrumbs: LocationBreadcrumb[];
  onClearHistory: () => void;
}

export const LocationHistoryList: React.FC<LocationHistoryListProps> = ({
  breadcrumbs,
  onClearHistory
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            Last Known Shared Locations
          </h3>
          <p className="text-xs text-slate-400">Breadcrumb timeline &amp; telemetry log</p>
        </div>

        {breadcrumbs.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-slate-500 hover:text-rose-400 text-xs flex items-center gap-1 transition cursor-pointer"
            title="Clear breadcrumb log"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {breadcrumbs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-1">
            <Crosshair className="w-5 h-5 text-slate-600 mx-auto" />
            <p>No location points recorded yet.</p>
            <p className="text-[11px] text-slate-600">Points appear automatically as GPS updates are streamed.</p>
          </div>
        ) : (
          breadcrumbs.slice().reverse().map((crumb, idx) => (
            <div
              key={crumb.id || idx}
              className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs hover:border-slate-700 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono font-bold text-[11px]">
                  #{breadcrumbs.length - idx}
                </div>
                <div>
                  <div className="font-mono text-slate-200 font-medium">
                    {crumb.lat.toFixed(5)}, {crumb.lng.toFixed(5)}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2">
                    <span>±{Math.round(crumb.accuracy)}m</span>
                    {crumb.speed !== null && crumb.speed !== undefined && crumb.speed > 0 && (
                      <span>• {Math.round(crumb.speed * 3.6)} km/h</span>
                    )}
                    <span>• {new Date(crumb.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              <a
                href={`https://www.google.com/maps?q=${crumb.lat},${crumb.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="Open in Google Maps"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
