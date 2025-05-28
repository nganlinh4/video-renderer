export interface SubtitleEntry {
  start: number;
  end: number;
  text: string;
}

// Keep LyricEntry as alias for backward compatibility
export type LyricEntry = SubtitleEntry;

export type Resolution = '1080p' | '2K';
export type FrameRate = 30 | 60;

export interface VideoMetadata {
  videoType: 'Subtitled Video';
  subtitleLineThreshold: number; // Maximum characters per subtitle line
  resolution: Resolution; // Video resolution (1080p or 2K)
  frameRate: FrameRate; // Frame rate (30 or 60 fps)
  originalAudioVolume: number; // Volume for original audio/video (0-100)
  narrationVolume: number; // Volume for narration audio (0-100)
}

export interface AudioFiles {
  main: File | null; // Original video audio
  narration?: File | null; // Narration audio track
}

export interface Props {
  audioUrl: string; // Original video audio
  narrationUrl?: string; // Narration audio
  lyrics: LyricEntry[]; // Subtitles
  durationInSeconds: number;
  backgroundImageUrl?: string; // Optional background image
  metadata: VideoMetadata;
  isVideoFile?: boolean; // Flag to indicate if the main file is a video
}

// Interface for components that can work with either a File or URL
export interface AudioProps {
  audioFile?: File; // Original video audio
  narrationFile?: File; // Narration audio
  audioUrl?: string;
  narrationUrl?: string;
  lyrics: LyricEntry[];
  durationInSeconds: number;
  backgroundImageUrl?: string;
}


