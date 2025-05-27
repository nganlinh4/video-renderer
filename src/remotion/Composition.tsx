import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Audio, useVideoConfig } from 'remotion';
import SubtitledVideoContent from '../components/SubtitledVideo';
import { LyricEntry, VideoMetadata } from '../types';

interface Props {
  audioUrl: string;
  lyrics: LyricEntry[];
  durationInSeconds: number;
  backgroundImageUrl?: string;
  metadata?: VideoMetadata; // Make metadata optional again to match what might come from the server
  narrationUrl?: string;
}

// Default metadata to use if none is provided
const DEFAULT_METADATA: VideoMetadata = {
  videoType: 'Subtitled Video',
  lyricsLineThreshold: 41, // Kept for compatibility
  metadataPosition: -155, // Kept for compatibility
  metadataWidth: 450, // Kept for compatibility
  resolution: '2K',
  frameRate: 60
};

const SubtitledVideoWrapper: React.FC<Props> = ({
  audioUrl,
  lyrics,
  durationInSeconds,
  backgroundImageUrl,
  metadata = DEFAULT_METADATA,
  narrationUrl
}) => {
  return (
    <SubtitledVideoContent
      audioUrl={audioUrl}
      lyrics={lyrics}
      durationInSeconds={durationInSeconds}
      backgroundImageUrl={backgroundImageUrl}
      metadata={metadata}
      narrationUrl={narrationUrl}
    />
  );
};

export default SubtitledVideoWrapper;
