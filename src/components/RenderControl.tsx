import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Player } from '@remotion/player';
import { LyricEntry } from '../types';
import { LyricsVideoContent } from './LyricsVideo';
import VideoPreview from './VideoPreview';
import remotionService from '../services/remotionService';
import { useQueue } from '../contexts/QueueContext';
import { useLanguage } from '../contexts/LanguageContext';

// API URL for the server
const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const Container = styled.div`
  margin: 0;
`;

const Button = styled.button`
  background: linear-gradient(135deg, var(--accent-color) 0%, #a777e3 100%);
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }
`;

const ProgressContainer = styled.div`
  width: 100%;
  height: 20px;
  background-color: var(--hover-color);
  border-radius: 10px;
  margin: 10px 0;
  overflow: hidden;
  transition: background-color 0.3s;
`;

const ProgressBar = styled.div<{ width: number }>`
  width: ${props => props.width}%;
  height: 100%;
  background: linear-gradient(135deg, var(--accent-color) 0%, #a777e3 100%);
  transition: width 0.3s ease;
`;

const ProgressText = styled.div`
  text-align: center;
  margin: 5px 0;
  color: var(--text-color);
  transition: color 0.3s;
`;

const CompactHeader = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;

  h3 {
    margin: 0 0 5px 0;
    color: var(--heading-color);
  }
`;

const InfoText = styled.div`
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
`;

interface RenderControlProps {
  audioFile: File | null;
  lyrics: LyricEntry[] | null;
  durationInSeconds: number;
  metadata: {
    videoType: 'Subtitled Video';
    lyricsLineThreshold: number;
    metadataPosition: number;
    metadataWidth: number;
    resolution: '1080p' | '2K';
    frameRate: 30 | 60;
  };
  onRenderComplete: (videoPath: string) => void;
  narrationFile?: File | null;
}

export const RenderControl: React.FC<RenderControlProps> = ({
  audioFile,
  lyrics,
  durationInSeconds,
  metadata,
  onRenderComplete,
  narrationFile
}) => {
  const { t } = useLanguage();
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [renderedVideos, setRenderedVideos] = useState<{ type: string; url: string }[]>([]);
  const [status, setStatus] = useState<string>('');
  const [renderingCompleted, setRenderingCompleted] = useState(false);

  // Queue context
  const {
    queue,
    addToQueue,
    updateQueueItem,
    currentProcessingItem,
    setCurrentProcessingItem,
    isProcessing
  } = useQueue();

  const videoTypes = [
    'Subtitled Video'
  ] as const;

  // Check if we can add files to queue
  const canAddToQueue = audioFile &&
                     lyrics &&
                     Array.isArray(lyrics) &&
                     lyrics.length > 0 &&
                     durationInSeconds > 0 &&
                     !isRendering;

  // Function to add current version to queue
  const handleAddCurrentVersionToQueue = () => {
    if (!canAddToQueue || !audioFile) return;

    addToQueue({
      audioFile,
      lyrics: lyrics || [],
      durationInSeconds,
      backgroundFiles: {},
      metadata: {
        ...metadata,
        videoType: metadata.videoType,
        resolution: metadata.resolution,
        frameRate: metadata.frameRate
      },
      narrationFile,
      singleVersion: true
    });
  };

  // Function to add all versions to queue (now just adds the single subtitled video)
  const handleAddAllVersionsToQueue = async () => {
    if (!canAddToQueue || !audioFile) return;

    // For subtitled videos, there's only one type
    addToQueue({
      audioFile,
      lyrics: lyrics || [],
      durationInSeconds,
      backgroundFiles: {},
      metadata: {
        ...metadata,
        videoType: 'Subtitled Video',
        resolution: metadata.resolution,
        frameRate: metadata.frameRate
      },
      narrationFile,
      singleVersion: true
    });
  };

  // Process queue
  useEffect(() => {
    const processNextQueueItem = async () => {
      // If already processing or queue is empty, do nothing
      let currentItemId: string | null = null;
      if (isProcessing || queue.length === 0) return;

      // Find the first pending item
      const nextItem = queue.find(item => item.status === 'pending');
      if (!nextItem) return;

      // Set as currently processing
      currentItemId = nextItem.id;
      setCurrentProcessingItem(nextItem.id);
      updateQueueItem(nextItem.id, { status: 'processing', progress: 0 });

      try {
        const results: { [videoType: string]: string } = {};

        // Process either all video types or just the selected one based on queue item flags
        const typesToProcess = nextItem.singleVersion ? [nextItem.metadata.videoType] : videoTypes;

        for (const videoType of typesToProcess) {
          // Update for current video type
          updateQueueItem(nextItem.id, {
            progress: 0,
            currentVideoType: videoType
          });

          // Create configuration for narration audio if available
          const typeSpecificAudioConfig: { [key: string]: string } = {};
          if (nextItem.narrationFile) {
            typeSpecificAudioConfig.narrationUrl = URL.createObjectURL(nextItem.narrationFile);
          }

          // Get the background for subtitled video
          const currentBackgroundUrl = nextItem.backgroundFiles['Subtitled Video']
            ? URL.createObjectURL(nextItem.backgroundFiles['Subtitled Video']!)
            : undefined;

          // Render this video version
          const videoPath = await remotionService.renderVideo(
            nextItem.audioFile,
            nextItem.lyrics,
            nextItem.durationInSeconds,
            {
              backgroundImageUrl: currentBackgroundUrl,
              metadata: { ...nextItem.metadata, videoType },
              ...typeSpecificAudioConfig
            },
            (progress) => {
              // Only update if this is still the current processing item
              const currentItemId = nextItem.id; // Store the ID at render start
              // Compare against stored ID rather than currentProcessingItem
              if (nextItem.id === currentItemId) {
                if (progress.status === 'error') {
                  updateQueueItem(nextItem.id, {
                    error: `Error rendering ${videoType}: ${progress.error}`
                  });
                } else {
                  updateQueueItem(nextItem.id, {
                    progress: progress.progress
                  });
                }
              }
            }
          );

          // Add result for this video type
          results[videoType] = videoPath;

          // Clean up URLs
          Object.values(typeSpecificAudioConfig).forEach(url => URL.revokeObjectURL(url));
          if (currentBackgroundUrl) URL.revokeObjectURL(currentBackgroundUrl);
        }

        // Mark as complete with results
        updateQueueItem(nextItem.id, {
          status: 'complete',
          progress: 1,
          result: results
        });
      } catch (err) {
        // Mark as error
        updateQueueItem(nextItem.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'An unknown error occurred'
        });
      } finally {
        // Clear current processing item
        setCurrentProcessingItem(null);
        currentItemId = null;
      }
    };

    // Process next item if available
    processNextQueueItem();
  }, [queue, isProcessing, currentProcessingItem, videoTypes]);

  const handleRender = async () => {
    if (!audioFile || !(audioFile instanceof File)) {
      setError('Please upload a valid audio file');
      return;
    }

    if (!lyrics || !Array.isArray(lyrics) || lyrics.length === 0) {
      setError('Please upload valid lyrics');
      return;
    }

    setIsRendering(true);
    setProgress(0);
    setError(null);

    try {
      // Create URLs for additional audio files if they exist
      const additionalUrls: { [key: string]: string } = {};

      if (narrationFile) {
        additionalUrls.narrationUrl = URL.createObjectURL(narrationFile);
      }

      const videoPath = await remotionService.renderVideo(
        audioFile,
        lyrics,
        durationInSeconds,
        {
          metadata,
          ...additionalUrls
        },
        (progress) => {
          if (progress.status === 'error') {
            setError(progress.error || 'An error occurred during rendering');
            setIsRendering(false);
          } else {
            setProgress(progress.progress);
          }
        }
      );

      // Clean up URLs
      Object.values(additionalUrls).forEach(url => URL.revokeObjectURL(url));

      setIsRendering(false);
      onRenderComplete(videoPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsRendering(false);
    }
  };

  const handleRenderAllVersions = async () => {
    if (!audioFile || !(audioFile instanceof File)) {
      setError('Please upload a valid audio file');
      return;
    }

    if (!lyrics || !Array.isArray(lyrics) || lyrics.length === 0) {
      setError('Please upload valid lyrics');
      return;
    }

    setIsRendering(true);
    setProgress(0);
    setError(null);
    setRenderedVideos([]);

    try {
      // For subtitled videos, there's only one type
      const videoType = 'Subtitled Video';
      setCurrentVersion(videoType);

      // Create configuration for narration audio if available
      const typeSpecificAudioConfig: { [key: string]: string } = {};
      if (narrationFile) {
        typeSpecificAudioConfig.narrationUrl = URL.createObjectURL(narrationFile);
      }

      // Log which video type we're currently rendering
      console.log(`Preparing to render ${videoType} version`);

      // No background image support

      const videoPath = await remotionService.renderVideo(
        audioFile,
        lyrics,
        durationInSeconds,
        {
          metadata: { ...metadata, videoType },
          ...typeSpecificAudioConfig
        },
        (progress) => {
          if (progress.status === 'error') {
            setError(`Error rendering ${videoType}: ${progress.error}`);
          } else {
            setProgress(progress.progress);
          }
        }
      );

      // Clean up URLs
      Object.values(typeSpecificAudioConfig).forEach(url => URL.revokeObjectURL(url));

      // Add to rendered videos list
      setRenderedVideos(prev => [...prev, { type: videoType, url: videoPath }]);

      setIsRendering(false);
      setCurrentVersion(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsRendering(false);
      setCurrentVersion(null);
    }
  };

  const uploadFiles = async () => {
    setStatus('Uploading files...');
    setProgress(0);
    setRenderingCompleted(false);

    try {
      // Upload the main audio file
      if (!audioFile) throw new Error('No audio file provided');
      const audioFormData = new FormData();
      audioFormData.append('file', audioFile);
      const audioResponse = await fetch(`${apiUrl}/upload/audio`, {
        method: 'POST',
        body: audioFormData
      });

      if (!audioResponse.ok) throw new Error('Failed to upload audio file');
      const audioData = await audioResponse.json();
      setProgress(20);

      // Upload optional narration file
      let narrationData = null;
      if (narrationFile) {
        const narrationFormData = new FormData();
        narrationFormData.append('file', narrationFile);
        const narrationResponse = await fetch(`${apiUrl}/upload/audio`, {
          method: 'POST',
          body: narrationFormData
        });

        if (narrationResponse.ok) {
          narrationData = await narrationResponse.json();
        }
      }
      setProgress(40);

      setProgress(60);

      // Start rendering with all uploaded files
      setStatus('Starting rendering process...');

      const renderData = {
        audioFile: audioData.filename,
        lyrics,
        durationInSeconds,
        metadata,
        narrationUrl: narrationData ? `${apiUrl}/uploads/${narrationData.filename}` : undefined,
      };

      console.log('Rendering with data:', renderData);

      // Start the rendering process on the server
      const renderResponse = await fetch(`${apiUrl}/render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(renderData)
      });

      if (!renderResponse.ok) {
        throw new Error('Failed to start rendering process');
      }

      const { id } = await renderResponse.json();

      // Poll for render status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`${apiUrl}/render/status/${id}`);
          if (!statusResponse.ok) {
            throw new Error('Failed to get render status');
          }

          const statusData = await statusResponse.json();

          setStatus(statusData.status);
          setProgress(statusData.progress);

          if (statusData.status === 'completed') {
            clearInterval(pollInterval);
            setRenderingCompleted(true);
            onRenderComplete(`${apiUrl}/output/${statusData.outputFile}`);
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval);
            throw new Error(statusData.error || 'Rendering failed');
          }
        } catch (err) {
          clearInterval(pollInterval);
          setError(err instanceof Error ? err.message : 'An error occurred during rendering');
          setStatus('Failed');
        }
      }, 2000);

    } catch (error) {
      console.error('Error uploading files:', error);
      setError('Failed to upload files');
      setStatus('Failed');
    }
  };

  return (
    <Container>
      <CompactHeader>
        <h3>{t('renderVideo')}</h3>
        <InfoText>
          {t('videosRenderedNote')}
        </InfoText>
      </CompactHeader>

      <ButtonContainer>
        <Button
          onClick={handleAddCurrentVersionToQueue}
          disabled={!canAddToQueue}
          style={{ background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)', flex: 1 }}
        >
          {t('addToQueue')}
        </Button>

        <Button
          onClick={handleAddAllVersionsToQueue}
          disabled={!canAddToQueue}
          style={{ background: 'linear-gradient(135deg, #E91E63 0%, #C2185B 100%)', flex: 1 }}
        >
          {t('addAllVersions')}
        </Button>
      </ButtonContainer>

      {isRendering && (
        <>
          <ProgressContainer>
            <ProgressBar width={progress * 100} />
          </ProgressContainer>
          <ProgressText>
            {currentVersion ? `${currentVersion}: ` : ''}
            {(progress * 100).toFixed(2)}% {t('complete')}
          </ProgressText>
        </>
      )}

      {renderedVideos.length > 0 && (
        <VideoList>
          <h3>{t('renderedVideos')}</h3>
          {renderedVideos.map((video, index) => (
            <VideoItem key={index}>
              <VideoTypeLabel>{video.type}</VideoTypeLabel>
              <VideoPreview videoUrl={video.url} />
            </VideoItem>
          ))}
        </VideoList>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Container>
  );
};

// Updating styled components for theme
const ButtonContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const VideoList = styled.div`
  margin-top: 2rem;
  border-top: 1px solid var(--border-color);
  padding-top: 1rem;

  h3 {
    color: var(--text-color);
    transition: color 0.3s;
  }
`;

const VideoItem = styled.div`
  margin: 1rem 0;
  padding: 1rem;
  background-color: var(--hover-color);
  border-radius: 8px;
  transition: background-color 0.3s;
`;

const VideoTypeLabel = styled.div`
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-color);
  transition: color 0.3s;
`;

const ErrorMessage = styled.div`
  color: var(--error-color);
  margin-top: 1rem;
  transition: color 0.3s;
`;
