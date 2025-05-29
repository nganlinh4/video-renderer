export interface SubtitleEntry {
  start: number;
  end: number;
  text: string;
}

// Keep LyricEntry as alias for backward compatibility
export type LyricEntry = SubtitleEntry;

export type Resolution = '480p' | '720p' | '1080p' | '2K';
export type FrameRate = 30 | 60;

export interface VideoMetadata {
  videoType: 'Subtitled Video';
  resolution: Resolution; // Video resolution (1080p or 2K)
  frameRate: FrameRate; // Frame rate (30 or 60 fps)
  originalAudioVolume: number; // Volume for original audio/video (0-100)
  narrationVolume: number; // Volume for narration audio (0-100)
  subtitleCustomization?: SubtitleCustomization; // Subtitle styling options
}

// Subtitle customization interface
export interface SubtitleCustomization {
  // Text Styling
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  textColor: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';

  // Background & Border
  backgroundColor: string;
  backgroundOpacity: number;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  borderStyle: 'none' | 'solid' | 'dashed' | 'dotted';

  // Shadow & Effects
  textShadowEnabled: boolean;
  textShadowColor: string;
  textShadowBlur: number;
  textShadowOffsetX: number;
  textShadowOffsetY: number;
  glowEnabled: boolean;
  glowColor: string;
  glowIntensity: number;

  // Positioning
  position: 'bottom' | 'top' | 'center' | 'custom';
  customPositionX: number; // percentage
  customPositionY: number; // percentage
  marginBottom: number;
  marginTop: number;
  marginLeft: number;
  marginRight: number;
  maxWidth: number; // percentage

  // Animation & Timing
  fadeInDuration: number;
  fadeOutDuration: number;
  animationType: 'fade' | 'slide-up' | 'slide-down' | 'scale' | 'typewriter';
  animationEasing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';

  // Advanced
  wordWrap: boolean;
  maxLines: number;
  lineBreakBehavior: 'auto' | 'manual';
  rtlSupport: boolean;

  // Preset Styles
  preset: 'default' | 'modern' | 'classic' | 'neon' | 'minimal' | 'bold' | 'elegant' | 'custom';
}

export interface AudioFiles {
  main: File | null; // Original video audio
  narration?: File | null; // Narration audio track
}

export interface Props {
  audioUrl: string; // Original video audio
  narrationUrl?: string; // Narration audio
  lyrics: LyricEntry[]; // Subtitles
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
  backgroundImageUrl?: string;
}


