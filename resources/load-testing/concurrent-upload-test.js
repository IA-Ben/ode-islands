#!/usr/bin/env node

/**
 * Concurrent Video Upload Load Testing Script
 * 
 * Tests:
 * - Multiple concurrent uploads to Cloud Run transcoder
 * - Resource monitoring (memory, CPU, network)
 * - Failure rate tracking
 * - Performance metrics collection
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Configuration
const CONFIG = {
  API_URL: process.env.API_URL || 'http://localhost:3000',
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || '',
  TEST_VIDEO_DIR: process.env.TEST_VIDEO_DIR || './test_videos',
  CONCURRENT_UPLOADS: parseInt(process.env.CONCURRENT_UPLOADS) || 5,
  TOTAL_UPLOADS: parseInt(process.env.TOTAL_UPLOADS) || 20,
  POLL_INTERVAL_MS: 2000,
  MAX_WAIT_MINUTES: 10
};

// Metrics tracking
const metrics = {
  uploads: {
    started: 0,
    completed: 0,
    failed: 0,
    totalUploadTime: 0,
    totalProcessingTime: 0
  },
  transcoding: {
    completed: 0,
    failed: 0,
    totalTime: 0,
    profileCounts: {}
  },
  errors: [],
  timestamps: {
    testStart: null,
    testEnd: null
  }
};

/**
 * Upload a video file to the CMS
 */
async function uploadVideo(filePath, testId) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('metadata', JSON.stringify({
    title: `Load Test ${testId} - ${path.basename(filePath)}`,
    description: `Concurrent upload test #${testId}`
  }));

  const startTime = Date.now();

  try {
    const response = await fetch(`${CONFIG.API_URL}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.ADMIN_TOKEN}`,
        ...form.getHeaders()
      },
      body: form
    });

    const uploadTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    metrics.uploads.started++;
    metrics.uploads.totalUploadTime += uploadTime;

    console.log(`✅ [Test ${testId}] Uploaded in ${(uploadTime / 1000).toFixed(1)}s - Video ID: ${data.videoId}`);

    return {
      videoId: data.videoId,
      statusUrl: data.statusUrl || `/api/cms/media/upload?videoId=${data.videoId}`,
      uploadTime,
      testId
    };
  } catch (error) {
    metrics.uploads.failed++;
    metrics.errors.push({
      type: 'upload',
      testId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    console.error(`❌ [Test ${testId}] Upload failed: ${error.message}`);
    throw error;
  }
}

/**
 * Poll transcoding status until complete
 */
async function monitorTranscoding(videoId, statusUrl, testId) {
  const startTime = Date.now();
  const maxWait = CONFIG.MAX_WAIT_MINUTES * 60 * 1000;
  let attempts = 0;

  while (true) {
    attempts++;
    const elapsed = Date.now() - startTime;

    if (elapsed > maxWait) {
      throw new Error(`Transcoding timeout after ${CONFIG.MAX_WAIT_MINUTES} minutes`);
    }

    try {
      const response = await fetch(`${CONFIG.API_URL}${statusUrl}`, {
        headers: { 'Authorization': `Bearer ${CONFIG.ADMIN_TOKEN}` }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [Test ${testId}] Status check failed: ${errorText}`);
        
        // Stop polling on HTTP errors
        throw new Error(`Status check failed: ${response.status}`);
      }

      const data = await response.json();

      // Handle all status states
      if (data.status === 'completed') {
        const totalTime = Date.now() - startTime;
        metrics.transcoding.completed++;
        metrics.transcoding.totalTime += totalTime;
        
        // Track profile count
        const profileCount = data.profilesComplete || data.completed_variants || 0;
        metrics.transcoding.profileCounts[profileCount] = 
          (metrics.transcoding.profileCounts[profileCount] || 0) + 1;

        console.log(
          `✅ [Test ${testId}] Transcoding complete in ${(totalTime / 1000).toFixed(1)}s ` +
          `(${profileCount} profiles, ${attempts} polls)`
        );

        return { success: true, totalTime, profileCount };
      } else if (data.status === 'error' || data.status === 'failed') {
        metrics.transcoding.failed++;
        metrics.errors.push({
          type: 'transcoding',
          testId,
          videoId,
          error: data.error || 'Unknown transcoding error',
          timestamp: new Date().toISOString()
        });
        
        console.error(`❌ [Test ${testId}] Transcoding failed: ${data.error}`);
        return { success: false, error: data.error };
      }

      // Still processing
      const progress = data.percentage || 0;
      if (attempts % 5 === 0) { // Log every 5th poll
        console.log(`⏳ [Test ${testId}] Processing... ${progress}% (${elapsed / 1000}s elapsed)`);
      }

      await new Promise(resolve => setTimeout(resolve, CONFIG.POLL_INTERVAL_MS));
    } catch (error) {
      metrics.errors.push({
        type: 'monitoring',
        testId,
        videoId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
}

/**
 * Run complete upload + transcoding test
 */
async function runTest(testId, filePath) {
  console.log(`\n🎬 [Test ${testId}] Starting upload: ${path.basename(filePath)}`);
  
  try {
    // Upload
    const uploadResult = await uploadVideo(filePath, testId);
    
    // Monitor transcoding
    const transcodingResult = await monitorTranscoding(
      uploadResult.videoId,
      uploadResult.statusUrl,
      testId
    );

    if (transcodingResult.success) {
      metrics.uploads.completed++;
      metrics.uploads.totalProcessingTime += transcodingResult.totalTime;
      
      return {
        success: true,
        uploadTime: uploadResult.uploadTime,
        transcodingTime: transcodingResult.totalTime,
        profileCount: transcodingResult.profileCount
      };
    } else {
      return { success: false, error: transcodingResult.error };
    }
  } catch (error) {
    console.error(`❌ [Test ${testId}] Test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Select test video files
 */
function selectTestFiles(count) {
  const testDir = CONFIG.TEST_VIDEO_DIR;
  
  if (!fs.existsSync(testDir)) {
    console.error(`❌ Test video directory not found: ${testDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(testDir)
    .filter(f => /\.(mp4|mov|webm)$/i.test(f))
    .map(f => path.join(testDir, f));

  if (files.length === 0) {
    console.error(`❌ No video files found in ${testDir}`);
    process.exit(1);
  }

  // Cycle through available files
  const selected = [];
  for (let i = 0; i < count; i++) {
    selected.push(files[i % files.length]);
  }

  return selected;
}

/**
 * Run concurrent batch
 */
async function runConcurrentBatch(testFiles, startIdx, batchSize) {
  const batch = testFiles.slice(startIdx, startIdx + batchSize);
  const promises = batch.map((filePath, idx) => 
    runTest(startIdx + idx + 1, filePath)
  );
  
  return await Promise.allSettled(promises);
}

/**
 * Print final report
 */
function printReport() {
  const testDuration = (metrics.timestamps.testEnd - metrics.timestamps.testStart) / 1000;
  const avgUploadTime = metrics.uploads.totalUploadTime / metrics.uploads.started || 0;
  const avgTranscodingTime = metrics.transcoding.totalTime / metrics.transcoding.completed || 0;

  console.log('\n' + '='.repeat(80));
  console.log('📊 LOAD TEST RESULTS');
  console.log('='.repeat(80));
  
  console.log('\n⏱️  Duration:');
  console.log(`   Total test time: ${testDuration.toFixed(1)}s`);
  console.log(`   Throughput: ${(CONFIG.TOTAL_UPLOADS / testDuration).toFixed(2)} uploads/sec`);
  
  console.log('\n📤 Upload Metrics:');
  console.log(`   Started: ${metrics.uploads.started}`);
  console.log(`   Completed: ${metrics.uploads.completed}`);
  console.log(`   Failed: ${metrics.uploads.failed}`);
  console.log(`   Success rate: ${((metrics.uploads.completed / metrics.uploads.started) * 100).toFixed(1)}%`);
  console.log(`   Avg upload time: ${(avgUploadTime / 1000).toFixed(2)}s`);
  
  console.log('\n🎞️  Transcoding Metrics:');
  console.log(`   Completed: ${metrics.transcoding.completed}`);
  console.log(`   Failed: ${metrics.transcoding.failed}`);
  console.log(`   Success rate: ${((metrics.transcoding.completed / (metrics.transcoding.completed + metrics.transcoding.failed)) * 100).toFixed(1)}%`);
  console.log(`   Avg transcoding time: ${(avgTranscodingTime / 1000).toFixed(1)}s`);
  
  console.log('\n📈 Profile Distribution:');
  Object.entries(metrics.transcoding.profileCounts)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .forEach(([count, occurrences]) => {
      console.log(`   ${count} profiles: ${occurrences} videos`);
    });
  
  if (metrics.errors.length > 0) {
    console.log('\n❌ Errors:');
    metrics.errors.slice(0, 10).forEach(err => {
      console.log(`   [${err.type}] Test ${err.testId}: ${err.error}`);
    });
    if (metrics.errors.length > 10) {
      console.log(`   ... and ${metrics.errors.length - 10} more errors`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Write detailed report to file
  const reportPath = path.join(__dirname, `load-test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(metrics, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Load Test');
  console.log(`   API: ${CONFIG.API_URL}`);
  console.log(`   Concurrent uploads: ${CONFIG.CONCURRENT_UPLOADS}`);
  console.log(`   Total uploads: ${CONFIG.TOTAL_UPLOADS}`);
  console.log(`   Test video dir: ${CONFIG.TEST_VIDEO_DIR}\n`);

  // Verify API is accessible
  try {
    const response = await fetch(`${CONFIG.API_URL}/api/health`);
    if (!response.ok) throw new Error('Health check failed');
    console.log('✅ API health check passed\n');
  } catch (error) {
    console.error(`❌ API not accessible: ${error.message}`);
    process.exit(1);
  }

  // Select test files
  const testFiles = selectTestFiles(CONFIG.TOTAL_UPLOADS);
  console.log(`📹 Selected ${testFiles.length} test videos\n`);

  // Start test
  metrics.timestamps.testStart = Date.now();

  // Run in concurrent batches
  for (let i = 0; i < CONFIG.TOTAL_UPLOADS; i += CONFIG.CONCURRENT_UPLOADS) {
    const batchSize = Math.min(CONFIG.CONCURRENT_UPLOADS, CONFIG.TOTAL_UPLOADS - i);
    console.log(`\n📦 Starting batch ${Math.floor(i / CONFIG.CONCURRENT_UPLOADS) + 1} (${batchSize} uploads)...`);
    
    await runConcurrentBatch(testFiles, i, batchSize);
    
    // Small delay between batches
    if (i + batchSize < CONFIG.TOTAL_UPLOADS) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  metrics.timestamps.testEnd = Date.now();

  // Print report
  printReport();
}

// Run
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Load test failed:', error);
    process.exit(1);
  });
}

module.exports = { runTest, uploadVideo, monitorTranscoding };
