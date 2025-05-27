import React from 'react';
import { Composition } from 'remotion';
import SubtitledVideoWrapper from './Composition';
import { Props, VideoMetadata, LyricEntry } from '../types';

// Sample data for preview mode
const sampleLyrics: LyricEntry[] = [
  { start: 0, end: 2, text: "Welcome to" },
  { start: 2, end: 4, text: "Subtitled Video Maker" },
  { start: 4, end: 6, text: "Preview Mode" }
];

const defaultMetadata: VideoMetadata = {
  videoType: 'Subtitled Video',
  lyricsLineThreshold: 41, // Kept for compatibility
  metadataPosition: -155, // Kept for compatibility
  metadataWidth: 450, // Kept for compatibility
  resolution: '2K',
  frameRate: 60,
  originalAudioVolume: 100,
  narrationVolume: 100
};

// Create a type-safe wrapper component
const VideoComponentWrapper: React.FC<Record<string, unknown>> = (props) => {
  // Ensure all required props are present with defaults
  const safeProps: Props = {
    audioUrl: (props.audioUrl as string) || '',
    lyrics: (props.lyrics as LyricEntry[]) || sampleLyrics,
    durationInSeconds: (props.durationInSeconds as number) || 6,
    metadata: (props.metadata as VideoMetadata) || defaultMetadata,
    backgroundImageUrl: props.backgroundImageUrl as string | undefined,
    narrationUrl: props.narrationUrl as string | undefined,
    isVideoFile: (props.isVideoFile as boolean) || false
  };

  return <SubtitledVideoWrapper {...safeProps} />;
};

export const RemotionRoot: React.FC = () => {
  // Create compositions for both 1080p and 2K resolutions, and both 30fps and 60fps
  // The server will select the appropriate one based on the metadata
  const commonProps = {
    component: VideoComponentWrapper,
    fps: 60, // Default, will be overridden by server
    width: 1920, // Default, will be overridden by server
    height: 1080, // Default, will be overridden by server
    durationInFrames: 180
  };

  return (
    <>
      <Composition
        id="subtitled-video"
        {...commonProps}
        defaultProps={{
          audioUrl: '',
          lyrics: sampleLyrics,
          durationInSeconds: 6,
          metadata: { ...defaultMetadata, videoType: 'Subtitled Video' }
        }}
      />
    </>
  );
};