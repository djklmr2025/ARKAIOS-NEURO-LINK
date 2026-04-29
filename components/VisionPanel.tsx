import React from 'react';
import { Eye, X } from 'lucide-react';

interface VisionPanelProps {
  previewImage: string | null;
  onClear: () => void;
}

export const VisionPanel: React.FC<VisionPanelProps> = ({ previewImage, onClear }) => {
  if (!previewImage) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-cyber-blue/30 p-8 text-center">
        <Eye size={48} className="mb-4 opacity-50" />
        <p className="font-mono text-sm tracking-widest uppercase">Vision Matrix Offline</p>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-arkaios-800 border-b border-slate-700 p-2 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between mb-1 px-1">
        <h3 className="text-xs font-mono text-arkaios-glow uppercase tracking-widest">
          Visual Input Buffer
        </h3>
        <button 
            onClick={onClear}
            className="text-xs text-slate-400 hover:text-red-400 transition-colors"
            aria-label="Discard"
        >
            <X size={16} />
        </button>
      </div>
      <div className="relative rounded overflow-hidden border border-arkaios-accent/30 group">
        <img 
            src={previewImage} 
            alt="Screen Capture" 
            className="w-full h-48 object-cover object-center opacity-80 group-hover:opacity-100 transition-all" 
        />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 to-transparent"></div>
        {/* Scanning Effect Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-arkaios-glow/10 to-transparent h-[20%] w-full animate-scan pointer-events-none opacity-30"></div>
      </div>
    </div>
  );
};
