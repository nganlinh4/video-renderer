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
  const { fps, height: compositionHeight } = useVideoConfig();
  const currentTimeInSeconds = frame / fps;

  // Create a scaling function that uses actual composition dimensions
  const getResponsiveScaledValue = (value: number): number => {
    const baseHeight = 1080; // Reference height (1080p)
    const scale = compositionHeight / baseHeight;
    return Math.round(value * scale);
  };

  // Get consistent relative position as percentage (based on 1080p reference)
  const getConsistentRelativePosition = (pixelValue: number, dimension: 'width' | 'height'): string => {
    // Always calculate percentage based on 1080p reference dimensions
    const referenceDimension = dimension === 'width' ? 1920 : 1080;
    const percentage = (pixelValue / referenceDimension) * 100;
    return `${percentage.toFixed(2)}%`;
  };

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



  // Find the current active subtitle (only one at a time)
  const getCurrentSubtitle = (currentTime: number) => {
    // Find the subtitle that should be displayed at the current time
    const activeSubtitle = processedSubtitles?.find(subtitle =>
      currentTime >= subtitle.start - TRANSITION_DURATION &&
      currentTime <= subtitle.end + TRANSITION_DURATION
    );

    if (!activeSubtitle) return null;

    // Calculate opacity for fade in/out
    let opacity = 1;
    if (currentTime < activeSubtitle.start) {
      // Fade in
      opacity = (currentTime - (activeSubtitle.start - TRANSITION_DURATION)) / TRANSITION_DURATION;
    } else if (currentTime > activeSubtitle.end) {
      // Fade out
      opacity = 1 - (currentTime - activeSubtitle.end) / TRANSITION_DURATION;
    }

    return {
      ...activeSubtitle,
      opacity: Math.max(0, Math.min(1, opacity))
    };
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
              objectFit: 'contain', // Maintain aspect ratio, don't crop
              backgroundColor: '#000', // Fill letterbox areas with black
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
            bottom: getConsistentRelativePosition(80, 'height'), // Consistent relative positioning
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          {(() => {
            const currentSubtitle = getCurrentSubtitle(currentTimeInSeconds);

            if (!currentSubtitle || currentSubtitle.opacity <= 0) return null;

            return (
              <div
                style={{
                  opacity: currentSubtitle.opacity,
                  fontSize: getResponsiveScaledValue(28),
                  fontFamily: FONT_FAMILY,
                  fontWeight: 600,
                  color: 'white',
                  textShadow: `0 ${getResponsiveScaledValue(2)}px ${getResponsiveScaledValue(4)}px rgba(0,0,0,0.8)`,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  padding: `${getResponsiveScaledValue(8)}px ${getResponsiveScaledValue(16)}px`,
                  borderRadius: getResponsiveScaledValue(4),
                  textAlign: 'center',
                  maxWidth: '80%',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {currentSubtitle.text}
              </div>
            );
          })()}
        </div>

        {/* Audio tracks - only add separate audio if not using video (video already includes audio) */}
        {!showVideo && <Audio src={audioUrl} volume={(metadata.originalAudioVolume ?? 100) / 100} />}
        {narrationUrl && <Audio src={narrationUrl} volume={(metadata.narrationVolume ?? 100) / 100} />}
      </AbsoluteFill>
    </ThemeProvider>
  );
};

export default SubtitledVideoContent;
