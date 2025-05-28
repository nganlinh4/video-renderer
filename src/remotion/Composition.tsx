import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Audio, useVideoConfig } from 'remotion';
import SubtitledVideoContent from '../components/SubtitledVideo';
import { LyricEntry, VideoMetadata } from '../types';

interface Props {
  audioUrl: string;
  lyrics: LyricEntry[];
  durationInSeconds: number;
  metadata?: VideoMetadata; // Make metadata optional again to match what might come from the server
  narrationUrl?: string;
  isVideoFile?: boolean;
}

// Default metadata to use if none is provided
const DEFAULT_METADATA: VideoMetadata = {
  videoType: 'Subtitled Video',
  subtitleLineThreshold: 41,
  resolution: '2K',
  frameRate: 60,
  originalAudioVolume: 100,
  narrationVolume: 100
};

const SubtitledVideoWrapper: React.FC<Props> = ({
  audioUrl,
  lyrics,
  durationInSeconds,
  metadata = DEFAULT_METADATA,
  narrationUrl,
  isVideoFile = false
}) => {
  return (
    <SubtitledVideoContent
      audioUrl={audioUrl}
      lyrics={lyrics}
      durationInSeconds={durationInSeconds}
      metadata={metadata}
      narrationUrl={narrationUrl}
      isVideoFile={isVideoFile}
    />
  );
};

export default SubtitledVideoWrapper;
