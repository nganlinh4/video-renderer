import { LyricEntry } from '../types';
import { analyzeAudio } from '../utils/audioAnalyzer';

const SERVER_URL = 'http://localhost:3003';

export interface RenderProgress {
  progress: number;
  durationInFrames: number;
  renderedFrames: number;
  status: 'rendering' | 'success' | 'error';
  error?: string;
}

export interface RenderOptions {
  backgroundImageUrl?: string;
  narrationUrl?: string;
  metadata?: {
    title: string;
    description: string;
    videoType: 'Subtitled Video';
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
    return 'subtitled-video';
  }

  private defaultMetadata = {
    title: 'Untitled Video',
    description: 'No description',
    videoType: 'Subtitled Video' as const,
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

  // Verification function to check that correct files are being used
  private verifyRenderAssets(
    videoType: string,
    audioUrl: string,
    additionalAudioUrls: Record<string, string | undefined>,
    backgroundImagesMapUrls: { [key: string]: string },
    specificBackgroundUrl?: string
  ): void {
    console.log(`\n=== Verifying assets for ${videoType} render ===`);

    // Verify audio files
    console.log('✓ Using main audio track:', audioUrl);

    // Check for narration audio
    if (additionalAudioUrls.narrationUrl) {
      console.log('✓ Using narration audio track:', additionalAudioUrls.narrationUrl);
    } else {
      console.log('ℹ️ No narration audio provided');
    }

    // Verify background image
    if (specificBackgroundUrl) {
      console.log('✓ Using background image:', specificBackgroundUrl);
    } else {
      console.log('ℹ️ No background image provided. Using solid color background.');
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
      const audioKeysToProcess = ['narrationUrl'];

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

      // Process image uploads
      const imagePromises = [
        options.backgroundImageUrl && options.backgroundImageUrl.startsWith('blob:')
          ? this.uploadFile(
              await fetch(options.backgroundImageUrl)
                .then(r => r.blob())
                .then(b => new File([b], 'background.jpg')),
              'image'
            )
          : Promise.resolve(undefined)
      ];

      // No need for backgroundImagesMap in subtitled videos
      const backgroundImagesMapUrls: { [key: string]: string } = {};

      // Wait for all uploads to complete
      const [audioUrl, ...imageUrls] = await Promise.all([
        Promise.all(audioPromises),
        Promise.all(imagePromises)
      ]).then(([audioResults, imageResults]) => [
        audioResults[0], // Main audio URL
        ...imageResults // Image URLs
      ]);

      const [backgroundUrl] = imageUrls;

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

      // No audio analysis needed for subtitled videos

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
          backgroundImageUrl: backgroundUrl,
          metadata,
          narrationUrl: additionalAudioUrls.narrationUrl
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
