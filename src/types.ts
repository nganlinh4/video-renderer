export interface LyricEntry {
  start: number;
  end: number;
  text: string;
}

export type Resolution = '1080p' | '2K';
export type FrameRate = 30 | 60;

export interface VideoMetadata {
  artist: string;
  songTitle: string;
  videoType: 'Lyrics Video' | 'Vocal Only' | 'Instrumental Only' | 'Little Vocal';
  lyricsLineThreshold: number; // No longer optional
  metadataPosition: number; // No longer optional
  metadataWidth: number; // Width of the metadata container
  resolution: Resolution; // Video resolution (1080p or 2K)
  frameRate: FrameRate; // Frame rate (30 or 60 fps)
}

export interface AudioFiles {
  main: File | null;
  instrumental?: File | null;
  vocal?: File | null;
  littleVocal?: File | null; // Added new option for pre-mixed Little Vocal audio
}

export interface Props {
  audioUrl: string;
  lyrics: LyricEntry[];
  durationInSeconds: number;
  albumArtUrl?: string;
  backgroundImageUrl?: string;
  backgroundImagesMap?: {
    [key in VideoMetadata['videoType']]?: string;
  };
  metadata: VideoMetadata;
  instrumentalUrl?: string;
  vocalUrl?: string;
  littleVocalUrl?: string;
}

// Interface for components that can work with either a File or URL
export interface AudioProps {
  audioFile?: File;
  audioUrl?: string;
  lyrics: LyricEntry[];
  durationInSeconds: number;
  albumArtUrl?: string;
  backgroundImageUrl?: string;
}


