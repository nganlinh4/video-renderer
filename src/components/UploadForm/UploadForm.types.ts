import { LyricEntry } from '../../types';

export interface AudioFiles {
  main: File | null; // Original video audio
  narration: File | null; // Narration audio
}

export interface VideoMetadata {
  videoType: 'Subtitled Video';
  subtitleLineThreshold: number; // Maximum characters per subtitle line
  resolution: '1080p' | '2K';
  frameRate: 30 | 60;
  originalAudioVolume: number; // Volume for original audio/video (0-100)
  narrationVolume: number; // Volume for narration audio (0-100)
}

export interface UploadFormProps {
  onFilesChange: (
    audioFiles: AudioFiles,
    lyrics: LyricEntry[] | null,
    metadata: VideoMetadata,
    lyricsFile: File | null
  ) => void;
  onVideoPathChange: (path: string) => void;
  initialValues?: {
    audioFiles: AudioFiles;
    lyrics: LyricEntry[] | null;
    metadata: VideoMetadata;
    lyricsFile: File | null;
  };
}