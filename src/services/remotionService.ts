import { LyricEntry } from '../types';
import { getAnalysisUrl, analyzeAudio } from '../utils/audioAnalyzer';

const SERVER_URL = 'http://localhost:3003';

export interface RenderProgress {
  progress: number;
  durationInFrames: number;
  renderedFrames: number;
  status: 'rendering' | 'success' | 'error';
  error?: string;
}

export interface RenderOptions {
  albumArtUrl?: string;
  backgroundImageUrl?: string;
  backgroundImagesMap?: { [key: string]: string }; // Add backgroundImagesMap property
  instrumentalUrl?: string;
  vocalUrl?: string;
  littleVocalUrl?: string;
  metadata?: {
    artist: string;
    songTitle: string;
    videoType: 'Lyrics Video' | 'Vocal Only' | 'Instrumental Only' | 'Little Vocal';
    resolution?: '1080p' | '2K';
    frameRate?: 30 | 60;
    lyricsLineThreshold?: number;
    metadataPosition?: number;
    metadataWidth?: number;
  };
}

export class RemotionService {
  // Map video types to composition IDs
  private getCompositionId(videoType: string): string {
    switch (videoType) {
      case 'Vocal Only':
        return 'vocal-only';
      case 'Instrumental Only':
        return 'instrumental-only';
      case 'Little Vocal':
        return 'little-vocal';
      case 'Lyrics Video':
      default:
        return 'lyrics-video';
    }
  }

  private defaultMetadata = {
    artist: 'Unknown Artist',
    songTitle: 'Unknown Song',
    videoType: 'Lyrics Video' as const,
    resolution: '2K' as const,
    frameRate: 60 as const,
    lyricsLineThreshold: 41,
    metadataPosition: -155,
    metadataWidth: 450
  };

  private async uploadFile(file: File, endpoint: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${SERVER_URL}/upload/${endpoint}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload ${endpoint}`);
    }

    const { url } = await response.json();
    return url;
  }

  // New verification function to check that correct files are being used
  private verifyRenderAssets(
    videoType: string,
    audioUrl: string,
    additionalAudioUrls: Record<string, string | undefined>,
    backgroundImagesMapUrls: { [key: string]: string },
    specificBackgroundUrl?: string
  ): void {
    console.log(`\n=== Verifying assets for ${videoType} render ===`);

    // Verify audio files based on video type
    switch (videoType) {
      case 'Vocal Only':
        if (!additionalAudioUrls.vocalUrl) {
          console.warn('⚠️ Warning: Vocal Only video without a vocal audio file. Using main audio as fallback.');
        } else {
          console.log('✓ Using vocal track for Vocal Only video:', additionalAudioUrls.vocalUrl);
        }
        break;

      case 'Instrumental Only':
        if (!additionalAudioUrls.instrumentalUrl) {
          console.warn('⚠️ Warning: Instrumental Only video without an instrumental audio file. Using main audio as fallback.');
        } else {
          console.log('✓ Using instrumental track for Instrumental Only video:', additionalAudioUrls.instrumentalUrl);
        }
        break;

      case 'Little Vocal':
        if (additionalAudioUrls.littleVocalUrl) {
          console.log('✓ Using pre-mixed little vocal track:', additionalAudioUrls.littleVocalUrl);
        } else if (additionalAudioUrls.instrumentalUrl && additionalAudioUrls.vocalUrl) {
          console.log('✓ Using instrumental and vocal tracks for Little Vocal mix:');
          console.log('  - Instrumental:', additionalAudioUrls.instrumentalUrl);
          console.log('  - Vocal:', additionalAudioUrls.vocalUrl);
        } else {
          console.warn('⚠️ Warning: Little Vocal video without proper audio files. Using main audio as fallback.');
        }
        break;

      default: // Lyrics Video
        console.log('✓ Using main audio track for Lyrics Video:', audioUrl);
        break;
    }

    // Verify background image
    const backgroundForThisType = backgroundImagesMapUrls[videoType];
    if (backgroundForThisType) {
      console.log('✓ Using specific background for this video type:', backgroundForThisType);
    } else if (specificBackgroundUrl) {
      console.log('✓ Using default background:', specificBackgroundUrl);
    } else {
      console.log('ℹ️ No background image provided for this video type. Using solid color background.');
    }

    console.log('=== Verification complete ===\n');
  }

  async renderVideo(
    audioFile: File,
    lyrics: LyricEntry[],
    durationInSeconds: number,
    options: RenderOptions = {},
    onProgress?: (progress: RenderProgress) => void
  ): Promise<string> {
    try {
      // Ensure metadata is present by merging with defaults
      const metadata = options.metadata || this.defaultMetadata;
      const compositionId = this.getCompositionId(metadata.videoType);

      // Upload all files first
      const audioPromises = [this.uploadFile(audioFile, 'audio')];
      const audioKeysToProcess = ['instrumentalUrl', 'vocalUrl', 'littleVocalUrl'];

      // Add additional upload promises for audio files if they exist
      const additionalAudioUrls: Record<string, string | undefined> = {};

      for (const key of audioKeysToProcess) {
        if (options[key as keyof RenderOptions] && (options[key as keyof RenderOptions] as string).startsWith('blob:')) {
          audioPromises.push(
            fetch(options[key as keyof RenderOptions] as string)
              .then(r => r.blob())
              .then(b => new File([b], `${key.replace('Url', '')}.mp3`))
              .then(file => this.uploadFile(file, 'audio'))
              .then(url => {
                additionalAudioUrls[key] = url;
                return url;
              })
          );
        }
      }

      // Process image uploads as before
      const imagePromises = [
        options.albumArtUrl && options.albumArtUrl.startsWith('blob:')
          ? this.uploadFile(
              await fetch(options.albumArtUrl)
                .then(r => r.blob())
                .then(b => new File([b], 'album.jpg')),
              'image'
            )
          : Promise.resolve(undefined),
        options.backgroundImageUrl && options.backgroundImageUrl.startsWith('blob:')
          ? this.uploadFile(
              await fetch(options.backgroundImageUrl)
                .then(r => r.blob())
                .then(b => new File([b], 'background.jpg')),
              'image'
            )
          : Promise.resolve(undefined)
      ];

      // Process backgroundImagesMap if provided
      const backgroundImagesMapUrls: { [key: string]: string } = {};
      if (options.backgroundImagesMap) {
        for (const [videoType, url] of Object.entries(options.backgroundImagesMap)) {
          if (url && url.startsWith('blob:')) {
            try {
              const uploadedUrl = await this.uploadFile(
                await fetch(url)
                  .then(r => r.blob())
                  .then(b => new File([b], `background_${videoType.replace(/\s+/g, '_')}.jpg`)),
                'image'
              );
              backgroundImagesMapUrls[videoType] = uploadedUrl;
            } catch (error) {
              console.error(`Failed to upload background image for ${videoType}:`, error);
            }
          }
        }
      }

      // Wait for all uploads to complete
      const [audioUrl, ...imageUrls] = await Promise.all([
        Promise.all(audioPromises),
        Promise.all(imagePromises)
      ]).then(([audioResults, imageResults]) => [
        audioResults[0], // Main audio URL
        ...imageResults // Image URLs
      ]);

      const [albumArtUrl, backgroundUrl] = imageUrls;

      // Ensure audioUrl is defined before using it
      if (!audioUrl) {
        throw new Error('Failed to upload main audio file');
      }

      // Run verification to make sure we're using the correct files for this video type
      this.verifyRenderAssets(
        metadata.videoType,
        audioUrl,
        additionalAudioUrls,
        backgroundImagesMapUrls,
        backgroundUrl
      );

      // Pre-analyze the correct audio file based on video type to ensure visualization works correctly
      const analysisUrl = getAnalysisUrl(
        metadata.videoType,
        audioUrl,
        additionalAudioUrls.vocalUrl,
        additionalAudioUrls.instrumentalUrl,
        additionalAudioUrls.littleVocalUrl
      );

      // Perform analysis before rendering to ensure data is cached
      console.log(`Pre-analyzing audio for ${metadata.videoType} using URL: ${analysisUrl}`);
      await analyzeAudio(analysisUrl);

      const frameRate = metadata.frameRate || this.defaultMetadata.frameRate;

      // Add a 2-second buffer to ensure audio doesn't get cut off at the end
      const audioDurationWithBuffer = durationInSeconds + 2;
      const totalFrames = Math.ceil(audioDurationWithBuffer * frameRate);

      onProgress?.({
        progress: 0,
        durationInFrames: totalFrames,
        renderedFrames: 0,
        status: 'rendering'
      });

      // Set up SSE connection for progress updates
      const response = await fetch(`${SERVER_URL}/render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          compositionId,
          audioFile: audioUrl.split('/').pop(),
          lyrics,
          durationInSeconds,
          albumArtUrl,
          backgroundImageUrl: backgroundUrl,
          backgroundImagesMap: Object.keys(backgroundImagesMapUrls).length > 0 ? backgroundImagesMapUrls : undefined,
          metadata,
          instrumentalUrl: additionalAudioUrls.instrumentalUrl,
          vocalUrl: additionalAudioUrls.vocalUrl,
          littleVocalUrl: additionalAudioUrls.littleVocalUrl
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(5));

              if (data.status === 'complete') {
                onProgress?.({
                  progress: 1,
                  durationInFrames: totalFrames,
                  renderedFrames: totalFrames,
                  status: 'success'
                });
                return data.videoUrl;
              } else {
                onProgress?.({
                  progress: data.progress,
                  durationInFrames: data.durationInFrames,
                  renderedFrames: data.renderedFrames,
                  status: 'rendering'
                });
              }
            } catch (e) {
              console.error('Error parsing progress data:', e);
            }
          }
        }
      }

      throw new Error('Render process ended without completion');
    } catch (error) {
      console.error('Error rendering video:', error);
      onProgress?.({
        progress: 0,
        durationInFrames: 0,
        renderedFrames: 0,
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  cleanup() {
    // Any cleanup needed
  }
}

export default new RemotionService();
