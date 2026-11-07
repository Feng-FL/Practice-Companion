import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Upload, FileAudio, Repeat } from 'lucide-react';
import IconButton from './ui/IconButton';

interface Props {
  audioUrl: string | null;
  audioFilename?: string;
  onLoadFile: (file: File) => void;
}

export default function AudioPlayer({ audioUrl, audioFilename, onLoadFile }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reset playback state when the URL changes.
  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
  }, [audioUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (audioRef.current && audioUrl) {
          if (audioRef.current.paused) {
            audioRef.current.play();
            setIsPlaying(true);
          } else {
            audioRef.current.pause();
            setIsPlaying(false);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audioUrl]);

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

  const displayName = audioFilename ? audioFilename.replace(/\.[^/.]+$/, '') : 'Current Track';

  return (
    <div className="flex min-h-[76px] flex-col justify-center overflow-hidden rounded-2xl border border-app-border bg-app-surface px-4 py-3 shadow-[var(--app-shadow)] sm:px-5">
      {!audioUrl ? (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text">
              Audio Tape
            </span>
            <span className="hidden h-4 w-px bg-app-border sm:block" />
            <span className="flex items-center gap-2 text-app-muted">
              <FileAudio className="h-4 w-4 text-app-accent" />
              <span className="text-[11px] uppercase tracking-[0.14em]">No Audio Tape</span>
            </span>
          </div>

          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-app-border bg-app-raised px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-app-text transition-colors duration-150 hover:border-app-accent hover:bg-app-accent-soft">
            <Upload className="h-3.5 w-3.5 text-app-accent" />
            Load File
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 lg:flex-row lg:gap-6">
          {/* Track + replace */}
          <div className="flex w-full min-w-0 items-center justify-between gap-3 lg:w-[220px] lg:shrink-0 lg:flex-col lg:items-start lg:gap-1">
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-app-muted">
                Audio Tape
              </span>
              <span className="block truncate text-base font-semibold text-app-text" title={displayName}>
                {displayName}
              </span>
            </div>

            <label className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-app-border bg-app-raised px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-app-text transition-colors duration-150 hover:border-app-accent hover:bg-app-accent-soft">
              <Upload className="h-3.5 w-3.5 text-app-accent" />
              Replace
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          <audio
            ref={audioRef}
            src={audioUrl}
            loop={isLooping}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => !isLooping && setIsPlaying(false)}
          />

          {/* Transport */}
          <div className="flex shrink-0 items-center justify-center gap-3 sm:gap-4">
            <IconButton
              label={isLooping ? 'Disable repeat' : 'Enable repeat'}
              onClick={() => setIsLooping(!isLooping)}
              tone={isLooping ? 'accent' : 'default'}
              className="h-9 w-9"
            >
              <Repeat className="h-[18px] w-[18px]" />
            </IconButton>
            <IconButton
              label="-5 seconds"
              onClick={() => {
                if (audioRef.current) audioRef.current.currentTime -= 5;
              }}
              className="h-9 w-9"
            >
              <SkipBack className="h-[18px] w-[18px]" />
            </IconButton>
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-app-accent text-app-on-accent transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="ml-0.5 h-5 w-5" />
              )}
            </button>
            <IconButton
              label="+5 seconds"
              onClick={() => {
                if (audioRef.current) audioRef.current.currentTime += 5;
              }}
              className="h-9 w-9"
            >
              <SkipForward className="h-[18px] w-[18px]" />
            </IconButton>
          </div>

          {/* Progress */}
          <div className="flex w-full flex-1 flex-col gap-1.5 lg:w-auto">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={progress}
              onChange={handleSeek}
              aria-label="Playback position"
              className="pc-range"
            />
            <div className="flex justify-between font-mono text-[10px] text-app-muted">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
