import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, Video, useVideoConfig } from 'remotion';
import { LyricEntry, VideoMetadata } from '../types';
import { ThemeProvider } from 'styled-components';

// Define Inter font directly without using @remotion/google-fonts
const FONT_FAMILY = "'Inter', sans-serif";

// Font styles
const fontStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
`;

// Constants for subtitle display
const TRANSITION_DURATION = 0.3;



// Utility function to get scaled values based on resolution
const getScaledValue = (value: number, metadata: VideoMetadata): number => {
  if (metadata.resolution === '2K') {
    return value * 1.33; // Scale up for 2K resolution
  }
  return value; // Default for 1080p
};

export interface Props {
  audioUrl: string; // Original video/audio file
  narrationUrl?: string; // Narration audio
  lyrics: LyricEntry[]; // Subtitles
  backgroundImageUrl?: string; // Optional background image
  metadata: VideoMetadata;
  isVideoFile?: boolean; // Flag to indicate if the main file is a video
}

export const SubtitledVideoContent: React.FC<Props> = ({
  audioUrl,
  narrationUrl,
  lyrics,
  backgroundImageUrl,
  metadata,
  isVideoFile = false
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTimeInSeconds = frame / fps;

  // Determine if we should show video or just audio with background
  const showVideo = isVideoFile;

  // Process subtitles based on line threshold
  const processedSubtitles = useMemo(() => {
    if (!lyrics) {
      return lyrics;
    }

    return lyrics.map(subtitle => {
      // Keep subtitles as they are - no need to split them
      return subtitle;
    });
  }, [lyrics]);



  // Calculate subtitle progress for fade in/out
  const getSubtitleProgress = (subtitle: LyricEntry, currentTime: number) => {
    if (currentTime < subtitle.start - TRANSITION_DURATION) {
      return 0;
    } else if (currentTime >= subtitle.start - TRANSITION_DURATION && currentTime <= subtitle.start) {
      return (currentTime - (subtitle.start - TRANSITION_DURATION)) / TRANSITION_DURATION;
    } else if (currentTime > subtitle.start && currentTime < subtitle.end) {
      return 1;
    } else if (currentTime >= subtitle.end && currentTime <= subtitle.end + TRANSITION_DURATION) {
      return 1 - (currentTime - subtitle.end) / TRANSITION_DURATION;
    }
    return 0;
  };

  return (
    <ThemeProvider theme={{
      resolution: metadata.resolution,
      frameRate: metadata.frameRate
    }}>
      <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
      <AbsoluteFill
        style={{
          backgroundColor: '#000',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Video background if uploaded file is a video */}
        {showVideo ? (
          <Video
            src={audioUrl}
            volume={(metadata.originalAudioVolume ?? 100) / 100}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          /* Background image if provided and no video */
          backgroundImageUrl && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.5)), url(${backgroundImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }} />
          )
        )}

        {/* Subtitle container */}
        <div
          style={{
            position: 'absolute',
            bottom: getScaledValue(80, metadata),
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          {processedSubtitles?.map((subtitle: LyricEntry, index: number) => {
            const progress = getSubtitleProgress(subtitle, currentTimeInSeconds);

            // Only render subtitles that are visible or transitioning
            if (progress <= 0) return null;

            return (
              <div
                key={index}
                style={{
                  opacity: progress,
                  fontSize: getScaledValue(28, metadata),
                  fontFamily: FONT_FAMILY,
                  fontWeight: 600,
                  color: 'white',
                  textShadow: `0 ${getScaledValue(2, metadata)}px ${getScaledValue(4, metadata)}px rgba(0,0,0,0.8)`,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  padding: `${getScaledValue(8, metadata)}px ${getScaledValue(16, metadata)}px`,
                  borderRadius: getScaledValue(4, metadata),
                  marginBottom: getScaledValue(8, metadata),
                  textAlign: 'center',
                  maxWidth: '80%',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {subtitle.text}
              </div>
            );
          })}
        </div>

        {/* Audio tracks - only add separate audio if not using video (video already includes audio) */}
        {!showVideo && <Audio src={audioUrl} volume={(metadata.originalAudioVolume ?? 100) / 100} />}
        {narrationUrl && <Audio src={narrationUrl} volume={(metadata.narrationVolume ?? 100) / 100} />}
      </AbsoluteFill>
    </ThemeProvider>
  );
};

export default SubtitledVideoContent;
