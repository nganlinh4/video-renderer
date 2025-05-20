import { LyricEntry } from '../../types';

export interface AudioFiles {
  main: File | null; // Original video audio
  narration: File | null; // Narration audio
}

export interface VideoMetadata {
  title: string;
  description: string;
  videoType: 'Subtitled Video';
  lyricsLineThreshold: number; // Kept for compatibility
  metadataPosition: number; // Kept for compatibility
  metadataWidth: number; // Kept for compatibility
  resolution: '1080p' | '2K';
  frameRate: 30 | 60;
}

export interface UploadFormProps {
  onFilesChange: (
    audioFiles: AudioFiles,
    lyrics: LyricEntry[] | null,
    background: File | null,
    metadata: VideoMetadata,
    lyricsFile: File | null
  ) => void;
  onVideoPathChange: (path: string) => void;
  initialValues?: {
    audioFiles: AudioFiles;
    lyrics: LyricEntry[] | null;
    backgroundFile: File | null;
    metadata: VideoMetadata;
    lyricsFile: File | null;
  };
}