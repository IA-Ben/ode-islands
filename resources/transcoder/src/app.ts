import ffmpeg from 'fluent-ffmpeg';
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';

const inputDir = './in';
const outputDir = './out';

interface QualityProfile {
  name: string;
  width: number;
  height: number;
  videoBitrate: string;
  audioBitrate: string;
  maxrate: string;
  bufsize: string;
}

interface VideoConfig {
  '-profile:v': string;
  '-level': string;
  '-x264-params': string;
  '-b:v': string;
  '-maxrate': string;
  '-bufsize': string;
  '-hls_time': string;
  '-hls_playlist_type': string;
  '-hls_flags': string;
  '-hls_list_size': string;
  '-ac': string;
  '-ar': string;
  '-b:a': string;
  '-hls_segment_filename': string;
}

// Define quality profiles for adaptive streaming
const qualityProfiles: QualityProfile[] = [
  {
    name: '240p',
    width: 426,
    height: 240,
    videoBitrate: '400k',
    audioBitrate: '64k',
    maxrate: '400k',
    bufsize: '800k'
  },
  {
    name: '480p',
    width: 854,
    height: 480,
    videoBitrate: '1000k',
    audioBitrate: '96k',
    maxrate: '1000k',
    bufsize: '2000k'
  },
  {
    name: '720p',
    width: 1280,
    height: 720,
    videoBitrate: '2500k',
    audioBitrate: '128k',
    maxrate: '2500k',
    bufsize: '5000k'
  },
  {
    name: '1080p',
    width: 1920,
    height: 1080,
    videoBitrate: '5000k',
    audioBitrate: '128k',
    maxrate: '5000k',
    bufsize: '10000k'
  }
];

const createVideoConfig = (segmentOutputDir: string, profile: QualityProfile): VideoConfig => ({
  '-profile:v': 'high',
  '-level': '4.0',
  '-x264-params': 'nal-hrd=cbr:force-cfr=1',
  '-b:v': profile.videoBitrate,
  '-maxrate': profile.maxrate,
  '-bufsize': profile.bufsize,
  '-hls_time': '6',
  '-hls_playlist_type': 'vod',
  '-hls_flags': 'independent_segments',
  '-hls_list_size': '0',
  '-ac': '2',
  '-ar': '48000',
  '-b:a': profile.audioBitrate,
  '-hls_segment_filename': `${segmentOutputDir}/segment_%v_%03d.ts`,
});

// Generate individual quality stream
const generateQualityStream = (
  inputFile: string,
  videoOutputDir: string,
  profile: QualityProfile,
  variantIndex: number
): Promise<boolean> => {
  try {
    return new Promise((resolve, reject) => {
      const qualityDir = path.join(videoOutputDir, profile.name);
      const config = Object.entries(
        createVideoConfig(qualityDir, profile),
      ).flat() as string[];
      
      ffmpeg(inputFile)
        .addOption('-preset', 'fast')
        .videoCodec('libx264')
        .audioCodec('aac')
        .size(`${profile.width}x${profile.height}`)
        .videoBitrate(profile.videoBitrate.replace('k', ''))
        .audioBitrate(profile.audioBitrate.replace('k', ''))
        .outputOptions(config)
        .output(`${qualityDir}/playlist.m3u8`)
        .on('end', () => {
          console.log(`- ${profile.name} stream generated`);
          resolve(true);
        })
        .on('error', (err: any) => {
          console.error(`❌ Error processing ${profile.name}:`, err.message);
          reject(err);
        })
        .run();
    });
  } catch (err: any) {
    console.error(`Error creating ${profile.name} stream:`, err);
    return Promise.resolve(false);
  }
};

// Generate master playlist for adaptive streaming
const generateMasterPlaylist = async (
  videoOutputDir: string,
  originalDimensions: { width: number; height: number }
): Promise<void> => {
  const fs = await import('fs/promises');
  
  // Filter profiles that fit within original dimensions
  const applicableProfiles = qualityProfiles.filter(
    profile => profile.width <= originalDimensions.width && profile.height <= originalDimensions.height
  );
  
  let masterContent = '#EXTM3U\n#EXT-X-VERSION:6\n\n';
  
  for (const profile of applicableProfiles) {
    const bandwidth = parseInt(profile.videoBitrate.replace('k', '')) * 1000 + 
                     parseInt(profile.audioBitrate.replace('k', '')) * 1000;
    
    masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${profile.width}x${profile.height}\n`;
    masterContent += `${profile.name}/playlist.m3u8\n\n`;
  }
  
  await fs.writeFile(path.join(videoOutputDir, 'master.m3u8'), masterContent);
  console.log('- Master playlist generated');
};

// Generate adaptive streaming with multiple qualities
const generateAdaptiveVideo = async (
  inputFile: string,
  videoOutputDir: string,
  originalDimensions: { width: number; height: number },
): Promise<boolean> => {
  try {
    // Filter profiles that fit within original dimensions
    const applicableProfiles = qualityProfiles.filter(
      profile => profile.width <= originalDimensions.width && profile.height <= originalDimensions.height
    );
    
    console.log(`- Generating ${applicableProfiles.length} quality streams`);
    
    // Create directories for each quality
    for (const profile of applicableProfiles) {
      await ensureDirectoryExists(path.join(videoOutputDir, profile.name));
    }
    
    // Generate all quality streams in parallel
    const streamPromises = applicableProfiles.map((profile, index) => 
      generateQualityStream(inputFile, videoOutputDir, profile, index)
    );
    
    const results = await Promise.all(streamPromises);
    
    if (results.some(result => !result)) {
      throw new Error('One or more quality streams failed to generate');
    }
    
    // Generate master playlist
    await generateMasterPlaylist(videoOutputDir, originalDimensions);
    
    return true;
  } catch (err: any) {
    console.error('Error creating adaptive video:', err);
    return false;
  }
};

const generateImage = (
  inputFile: string,
  imageOutputDir: string,
): Promise<boolean> => {
  try {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputFile)
        .frames(1)
        .seekInput(0)
        .output(`${imageOutputDir}/poster.jpg`)
        .outputOptions('-qscale:v 2');
      command
        .on('end', () => {
          console.log('- Poster frame generated');
          resolve(true);
        })
        .on('error', (err: any) => {
          console.error('❌ Error generating poster:', err.message);
          reject(err);
        })
        .run();
    });
  } catch (err) {
    console.error('Error creating image', err);
    return Promise.resolve(false);
  }
};

const getVideoDimensions = (filePath: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      const videoStream = metadata.streams.find((stream: any) => stream.codec_type === 'video');
      if (!videoStream || !videoStream.width || !videoStream.height) {
        reject(new Error('Could not get video dimensions'));
        return;
      }
      
      resolve({
        width: videoStream.width,
        height: videoStream.height
      });
    });
  });
};

const ensureDirectoryExists = async (dirPath: string): Promise<void> => {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (err) {
    console.error(`Error creating directory ${dirPath}:`, err);
    throw err;
  }
};

const isVideoFile = (filename: string): boolean => {
  const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv'];
  const ext = path.extname(filename).toLowerCase();
  return videoExtensions.includes(ext);
};

const processVideo = async (videoFile: string): Promise<void> => {
  const inputPath = path.join(inputDir, videoFile);
  const baseName = path.parse(videoFile).name;
  const videoOutputDir = path.join(outputDir, baseName);
  
  console.log(`\n🎬 Processing: ${videoFile}`);
  
  try {
    // Ensure output directory exists
    await ensureDirectoryExists(videoOutputDir);
    
    // Get video dimensions
    const dimensions = await getVideoDimensions(inputPath);
    console.log(`- Dimensions: ${dimensions.width}x${dimensions.height}`);
    
    // Generate adaptive HLS video with multiple qualities
    const videoStart = Date.now();
    const videoSuccess = await generateAdaptiveVideo(inputPath, videoOutputDir, dimensions);
    const videoTime = ((Date.now() - videoStart) / 1000).toFixed(1);
    
    if (!videoSuccess) {
      throw new Error('Failed to generate HLS video');
    }
    console.log(`- Video processing completed in ${videoTime}s`);
    
    // Generate poster image
    const imageStart = Date.now();
    const imageSuccess = await generateImage(inputPath, videoOutputDir);
    const imageTime = ((Date.now() - imageStart) / 1000).toFixed(1);
    
    if (!imageSuccess) {
      throw new Error('Failed to generate poster image');
    }
    console.log(`- Image processing completed in ${imageTime}s`);
    
    console.log(`✅ Successfully processed: ${videoFile}`);
    
  } catch (err) {
    console.error(`❌ Failed to process ${videoFile}:`, err);
  }
};

const start = async (): Promise<void> => {
  try {
    console.log('🚀 Starting video transcoding process...\n');
    
    // Ensure output directory exists
    await ensureDirectoryExists(outputDir);
    
    // Read input directory
    const files = await readdir(inputDir);
    const videoFiles = files.filter(isVideoFile);
    
    if (videoFiles.length === 0) {
      console.log('No video files found in the input directory.');
      return;
    }
    
    console.log(`Found ${videoFiles.length} video file(s) to process:`);
    videoFiles.forEach(file => console.log(`- ${file}`));
    
    // Process each video file sequentially
    for (const videoFile of videoFiles) {
      await processVideo(videoFile);
    }
    
    console.log('\n🎉 All videos processed successfully!');
    
  } catch (err) {
    console.error('❌ Error in main process:', err);
    process.exit(1);
  }
};

// Run the main function
start().catch(err => {
  console.error('❌ Unhandled error:', err);
  process.exit(1);
});
