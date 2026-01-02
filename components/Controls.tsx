import React from 'react';
import { PrizeConfig, AppState } from '../types';
import { Play, Square, Settings, Users, Sparkles } from 'lucide-react';

interface ControlsProps {
  appState: AppState;
  prizes: PrizeConfig[];
  selectedPrizeId: string;
  onSelectPrize: (id: string) => void;
  onToggleRun: () => void;
  onOpenSettings: () => void;
  participantCount: number;
}

export const Controls: React.FC<ControlsProps> = ({
  appState,
  prizes,
  selectedPrizeId,
  onSelectPrize,
  onToggleRun,
  onOpenSettings,
  participantCount
}) => {
  const currentPrize = prizes.find(p => p.id === selectedPrizeId);

  return (
    <div className="fixed bottom-0 left-0 right-0 p-6 z-20 flex flex-col gap-4 pointer-events-none">
      
      {/* Central Start/Stop Button */}
      <div className="flex justify-center items-end pointer-events-auto">
        <div className="flex items-center gap-6 bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
          
          <div className="flex flex-col gap-1 mr-4">
             <label className="text-xs text-gray-400 font-mono">当前奖项</label>
             <select 
                value={selectedPrizeId}
                onChange={(e) => onSelectPrize(e.target.value)}
                disabled={appState === 'RUNNING'}
                className="bg-transparent text-xl font-bold font-display text-yellow-400 focus:outline-none cursor-pointer hover:text-yellow-300"
             >
                {prizes.map(p => (
                  <option key={p.id} value={p.id} className="bg-gray-900 text-white">
                    {p.name} ({p.level}) - {p.count} 名
                  </option>
                ))}
             </select>
             <div className="text-xs text-gray-500">
               奖池: {participantCount} 人
             </div>
          </div>

          <button
            onClick={onToggleRun}
            className={`
              h-20 w-20 rounded-full flex items-center justify-center transition-all duration-200 shadow-[0_0_30px_rgba(0,0,0,0.5)]
              ${appState === 'RUNNING' 
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                : 'bg-emerald-500 hover:bg-emerald-400 text-white'
              }
            `}
          >
            {appState === 'RUNNING' ? (
              <Square size={32} fill="currentColor" />
            ) : (
              <Play size={36} fill="currentColor" className="ml-1" />
            )}
          </button>
          
          <div className="w-px h-12 bg-white/10 mx-2"></div>

          <button 
            onClick={onOpenSettings}
            className="p-3 rounded-xl hover:bg-white/10 text-gray-300 transition-colors"
            title="设置"
          >
            <Settings size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};