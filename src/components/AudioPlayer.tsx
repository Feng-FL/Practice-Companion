import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Upload, FileAudio, Repeat } from 'lucide-react';

export default function AudioPlayer({ 
  audioFile, 
  onLoadFile 
}: { 
  audioFile: File | null;
  onLoadFile: (file: File) => void;
}) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioFile) {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      setIsPlaying(false);
      setProgress(0);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
    }
  }, [audioFile]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadFile(file);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-8 border-b border-[#1A1A1A] bg-[#1A1A1A] text-[#F9F7F2] flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[10px] uppercase tracking-[0.2em] opacity-60 font-bold block">
          Audio Reference
        </h2>
        <label className="cursor-pointer border border-[#F9F7F2]/30 hover:bg-[#F9F7F2] hover:text-[#1A1A1A] text-[#F9F7F2] px-3 py-1 text-[10px] uppercase tracking-widest font-semibold transition-colors flex items-center gap-2">
          <Upload className="w-3 h-3" />
          Load File
          <input 
            type="file" 
            accept="audio/*" 
            className="hidden" 
            onChange={handleFileUpload}
          />
        </label>
      </div>

      {audioUrl ? (
        <div className="flex flex-col gap-4">
          <div className="mb-2">
             <div className="text-lg font-serif mb-1 truncate">Current Track Workspace</div>
          </div>
          <audio 
            ref={audioRef}
            src={audioUrl}
            loop={isLooping}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => !isLooping && setIsPlaying(false)}
          />
          
          <div className="flex flex-col gap-3 relative">
            <input 
              type="range" 
              min="0" 
              max={duration || 100} 
              value={progress}
              onChange={handleSeek}
              className="w-full h-1 bg-[#333] appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#F9F7F2]"
            />
            <div className="flex justify-between text-[10px] font-mono opacity-80 mt-1">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-4">
            <button 
              onClick={() => setIsLooping(!isLooping)}
              className={`transition-colors ${isLooping ? 'text-[#C1351D] opacity-100' : 'opacity-40 hover:opacity-100'}`}
              title={isLooping ? "Disable Repeat" : "Enable Repeat"}
            >
              <Repeat className="w-4 h-4" />
            </button>
            <button 
              onClick={() => { if(audioRef.current) audioRef.current.currentTime -= 5; }}
              className="opacity-60 hover:opacity-100 transition-opacity"
              title="-5 seconds"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button 
              onClick={togglePlay}
              className="w-10 h-10 rounded-full border border-[#F9F7F2] flex items-center justify-center text-[#F9F7F2] hover:bg-[#F9F7F2] hover:text-[#1A1A1A] transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button 
              onClick={() => { if(audioRef.current) audioRef.current.currentTime += 5; }}
              className="opacity-60 hover:opacity-100 transition-opacity"
              title="+5 seconds"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="min-h-[120px] border border-dashed border-[#333] flex flex-col items-center justify-center text-[#F9F7F2]/50">
          <FileAudio className="w-6 h-6 mb-2 opacity-50" />
          <p className="text-[10px] uppercase tracking-widest font-mono">No Audio Selected</p>
        </div>
      )}
    </div>
  );
}
