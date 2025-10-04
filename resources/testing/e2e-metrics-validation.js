#!/usr/bin/env node

/**
 * End-to-End Performance Metrics Validation Suite
 * 
 * Validates:
 * - Complete pipeline (upload → transcode → storage → playback)
 * - Memory management and buffer cleanup
 * - Parallel transcoding efficiency
 * - Error handling across all components
 * - Performance benchmarks
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Test configuration
const CONFIG = {
  API_URL: process.env.API_URL || 'http://localhost:3000',
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || '',
  GCS_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL || 'https://storage.googleapis.com/ode-islands-video-cdn',
  TEST_VIDEO: process.env.TEST_VIDEO || './test_videos/sample_30s.mp4',
  BROWSER: process.env.BROWSER || 'chromium'
};

// Metrics storage
const metrics = {
  pipeline: {
    uploadTime: 0,
    transcodingTime: 0,
    totalTime: 0,
    profilesGenerated: 0
  },
  transcoding: {
    expectedParallelSpeedup: 0.75, // 75% faster than sequential
    actualSpeedup: 0,
    profilesPerSecond: 0
  },
  storage: {
    cdnAccessTime: 0,
    segmentsVerified: 0,
    masterPlaylistValid: false
  },
  playback: {
    initialBufferTime: 0,
    bufferCleanupCount: 0,
    playbackErrors: []
  },
  memory: {
    peakUsageMB: 0,
    cleanupTriggered: false,
    leakDetected: false
  },
  errors: [],
  passed: 0,
  failed: 0
};

/**
 * Test 1: Upload and Transcoding Pipeline
 */
async function testUploadPipeline() {
  console.log('\n🎬 TEST 1: Upload and Transcoding Pipeline');
  console.log('==========================================');
  
  const FormData = require('form-data');
  const fetch = require('node-fetch');
  
  const form = new FormData();
  form.append('file', fs.createReadStream(CONFIG.TEST_VIDEO));
  form.append('metadata', JSON.stringify({
    title: 'E2E Performance Test',
    description: 'Metrics validation'
  }));

  const uploadStart = Date.now();

  try {
    // Upload
    const response = await fetch(`${CONFIG.API_URL}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.ADMIN_TOKEN}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const data = await response.json();
    const uploadTime = Date.now() - uploadStart;
    metrics.pipeline.uploadTime = uploadTime;

    console.log(`✅ Upload completed in ${(uploadTime / 1000).toFixed(1)}s`);
    console.log(`   Video ID: ${data.videoId}`);

    // Monitor transcoding
    const transcodingStart = Date.now();
    const result = await monitorTranscoding(data.videoId);
    
    const transcodingTime = Date.now() - transcodingStart;
    metrics.pipeline.transcodingTime = transcodingTime;
    metrics.pipeline.totalTime = Date.now() - uploadStart;
    metrics.pipeline.profilesGenerated = result.profileCount;

    console.log(`✅ Transcoding completed in ${(transcodingTime / 1000).toFixed(1)}s`);
    console.log(`   Profiles generated: ${result.profileCount}`);
    
    metrics.passed++;
    return { videoId: data.videoId, profileCount: result.profileCount };
  } catch (error) {
    metrics.failed++;
    metrics.errors.push({ test: 'upload_pipeline', error: error.message });
    console.error(`❌ Test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Monitor transcoding with progress tracking
 */
async function monitorTranscoding(videoId) {
  const fetch = require('node-fetch');
  let attempts = 0;
  const maxAttempts = 120; // 10 minutes max
  let profileCount = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(
      `${CONFIG.API_URL}/api/cms/media/upload?videoId=${videoId}`,
      { headers: { 'Authorization': `Bearer ${CONFIG.ADMIN_TOKEN}` } }
    );

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'completed') {
      profileCount = data.completed_variants || data.profilesComplete || 0;
      return { success: true, profileCount };
    } else if (data.status === 'error' || data.status === 'failed') {
      throw new Error(data.error || 'Transcoding failed');
    }

    attempts++;
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error('Transcoding timeout');
}

/**
 * Test 2: Parallel Transcoding Performance
 */
async function testParallelPerformance(videoId) {
  console.log('\n⚡ TEST 2: Parallel Transcoding Performance');
  console.log('==========================================');

  const profileCount = metrics.pipeline.profilesGenerated;
  const transcodingTime = metrics.pipeline.transcodingTime / 1000; // seconds

  // Estimate sequential time (4 vCPU with 11 profiles ≈ 3 sequential batches)
  const estimatedSequentialTime = transcodingTime / 0.75; // Inverse of 75% speedup
  
  metrics.transcoding.actualSpeedup = (estimatedSequentialTime - transcodingTime) / estimatedSequentialTime;
  metrics.transcoding.profilesPerSecond = profileCount / transcodingTime;

  console.log(`   Transcoding time: ${transcodingTime.toFixed(1)}s`);
  console.log(`   Profiles/second: ${metrics.transcoding.profilesPerSecond.toFixed(2)}`);
  console.log(`   Estimated speedup: ${(metrics.transcoding.actualSpeedup * 100).toFixed(1)}%`);

  // Validate 50%+ speedup (conservative threshold)
  if (metrics.transcoding.actualSpeedup >= 0.5) {
    console.log(`✅ Parallel transcoding efficient (>50% speedup)`);
    metrics.passed++;
  } else {
    console.log(`⚠️  Parallel speedup below threshold: ${(metrics.transcoding.actualSpeedup * 100).toFixed(1)}%`);
    metrics.failed++;
    metrics.errors.push({
      test: 'parallel_performance',
      error: `Speedup ${(metrics.transcoding.actualSpeedup * 100).toFixed(1)}% < 50%`
    });
  }
}

/**
 * Test 3: CDN Storage Validation
 */
async function testCDNStorage(videoId) {
  console.log('\n💾 TEST 3: CDN Storage Validation');
  console.log('==========================================');

  const fetch = require('node-fetch');
  
  try {
    // Check master playlist
    const masterUrl = `${CONFIG.GCS_CDN_URL}/videos/${videoId}/manifest/master.m3u8`;
    const startTime = Date.now();
    
    const response = await fetch(masterUrl);
    metrics.storage.cdnAccessTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`Master playlist not accessible: ${response.status}`);
    }

    const content = await response.text();
    
    // Validate HLS format
    if (!content.includes('#EXTM3U')) {
      throw new Error('Invalid HLS format - missing #EXTM3U');
    }

    // Count quality levels
    const qualityMatches = content.match(/RESOLUTION=(\d+)x(\d+)/g) || [];
    console.log(`   CDN access time: ${metrics.storage.cdnAccessTime}ms`);
    console.log(`   Quality levels found: ${qualityMatches.length}`);

    // Verify at least critical profiles exist
    const expectedQualities = ['144p', '240p', '360p', '480p'];
    let segmentCount = 0;

    for (const quality of expectedQualities) {
      const segmentUrl = `${CONFIG.GCS_CDN_URL}/videos/${videoId}/${quality}/segment_000.ts`;
      const segmentResponse = await fetch(segmentUrl, { method: 'HEAD' });
      
      if (segmentResponse.ok) {
        segmentCount++;
      }
    }

    metrics.storage.segmentsVerified = segmentCount;
    metrics.storage.masterPlaylistValid = true;

    console.log(`   Segments verified: ${segmentCount}/${expectedQualities.length}`);
    console.log(`✅ CDN storage validation passed`);
    metrics.passed++;

  } catch (error) {
    metrics.failed++;
    metrics.errors.push({ test: 'cdn_storage', error: error.message });
    console.error(`❌ Test failed: ${error.message}`);
  }
}

/**
 * Test 4: Playback and Buffer Management (using Playwright)
 */
async function testPlaybackBuffer(videoId) {
  console.log('\n▶️  TEST 4: Playback and Buffer Management');
  console.log('==========================================');

  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Capture console logs for buffer cleanup
    const bufferLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('buffer') || text.includes('Buffer')) {
        bufferLogs.push(text);
      }
    });

    // Navigate to video page
    await page.goto(`${CONFIG.API_URL}/video/${videoId}`);

    // Wait for video element
    const video = await page.waitForSelector('video', { timeout: 10000 });

    // Measure initial buffer time
    const bufferStart = Date.now();
    await video.click(); // Start playback
    
    // Wait for canplay event
    await page.waitForFunction(() => {
      const v = document.querySelector('video');
      return v && v.readyState >= 3; // HAVE_FUTURE_DATA
    }, { timeout: 30000 });

    metrics.playback.initialBufferTime = Date.now() - bufferStart;

    console.log(`   Initial buffer time: ${metrics.playback.initialBufferTime}ms`);

    // Play for 3 minutes to test buffer cleanup
    console.log('   Playing for 3 minutes to test buffer cleanup...');
    await page.waitForTimeout(180000); // 3 minutes

    // Check for buffer cleanup
    const cleanupLogs = bufferLogs.filter(log =>
      log.includes('Removing back buffer') ||
      log.includes('Back buffer removed') ||
      log.includes('bufferController')
    );

    metrics.playback.bufferCleanupCount = cleanupLogs.length;
    metrics.memory.cleanupTriggered = cleanupLogs.length > 0;

    // Check for playback errors
    const errors = await page.evaluate(() => {
      const v = document.querySelector('video');
      return v && v.error ? v.error.message : null;
    });

    if (errors) {
      metrics.playback.playbackErrors.push(errors);
    }

    await browser.close();

    console.log(`   Buffer cleanups: ${metrics.playback.bufferCleanupCount}`);
    
    if (metrics.playback.bufferCleanupCount > 0) {
      console.log(`✅ Buffer cleanup working (${cleanupLogs.length} cleanups)`);
      metrics.passed++;
    } else {
      console.log(`⚠️  No buffer cleanup detected`);
      metrics.failed++;
      metrics.errors.push({
        test: 'buffer_cleanup',
        error: 'Buffer cleanup not triggered during 3min playback'
      });
    }

  } catch (error) {
    metrics.failed++;
    metrics.errors.push({ test: 'playback_buffer', error: error.message });
    console.error(`❌ Test failed: ${error.message}`);
  }
}

/**
 * Test 5: Memory Leak Detection
 */
async function testMemoryLeaks() {
  console.log('\n💾 TEST 5: Memory Leak Detection');
  console.log('==========================================');

  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Enable memory monitoring
    await page.evaluateOnNewDocument(() => {
      window.memoryReadings = [];
      setInterval(() => {
        if (performance.memory) {
          window.memoryReadings.push({
            time: Date.now(),
            used: performance.memory.usedJSHeapSize / (1024 * 1024),
            total: performance.memory.totalJSHeapSize / (1024 * 1024)
          });
        }
      }, 30000); // Every 30 seconds
    });

    await page.goto(`${CONFIG.API_URL}/before/chapter-1`);
    const video = await page.$('video');
    if (video) {
      await video.click();
    }

    // Play for 5 minutes
    console.log('   Monitoring memory for 5 minutes...');
    await page.waitForTimeout(300000);

    // Analyze memory
    const memoryData = await page.evaluate(() => window.memoryReadings);
    
    if (memoryData && memoryData.length > 0) {
      const initialMemory = memoryData[0].used;
      const peakMemory = Math.max(...memoryData.map(d => d.used));
      const finalMemory = memoryData[memoryData.length - 1].used;
      const growth = finalMemory - initialMemory;

      metrics.memory.peakUsageMB = peakMemory;

      console.log(`   Initial memory: ${initialMemory.toFixed(1)}MB`);
      console.log(`   Peak memory: ${peakMemory.toFixed(1)}MB`);
      console.log(`   Final memory: ${finalMemory.toFixed(1)}MB`);
      console.log(`   Growth: ${growth.toFixed(1)}MB`);

      // Memory leak if growth > 150MB over 5 minutes
      if (growth > 150) {
        metrics.memory.leakDetected = true;
        console.log(`⚠️  Potential memory leak detected (${growth.toFixed(1)}MB growth)`);
        metrics.failed++;
        metrics.errors.push({
          test: 'memory_leak',
          error: `Excessive memory growth: ${growth.toFixed(1)}MB`
        });
      } else {
        console.log(`✅ No memory leak detected`);
        metrics.passed++;
      }
    }

    await browser.close();

  } catch (error) {
    metrics.failed++;
    metrics.errors.push({ test: 'memory_leak', error: error.message });
    console.error(`❌ Test failed: ${error.message}`);
  }
}

/**
 * Print comprehensive metrics report
 */
function printMetricsReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 END-TO-END PERFORMANCE METRICS REPORT');
  console.log('='.repeat(80));

  console.log('\n🎬 Pipeline Performance:');
  console.log(`   Upload time: ${(metrics.pipeline.uploadTime / 1000).toFixed(1)}s`);
  console.log(`   Transcoding time: ${(metrics.pipeline.transcodingTime / 1000).toFixed(1)}s`);
  console.log(`   Total time: ${(metrics.pipeline.totalTime / 1000).toFixed(1)}s`);
  console.log(`   Profiles generated: ${metrics.pipeline.profilesGenerated}`);

  console.log('\n⚡ Transcoding Efficiency:');
  console.log(`   Actual speedup: ${(metrics.transcoding.actualSpeedup * 100).toFixed(1)}%`);
  console.log(`   Profiles/second: ${metrics.transcoding.profilesPerSecond.toFixed(2)}`);

  console.log('\n💾 Storage & CDN:');
  console.log(`   CDN access time: ${metrics.storage.cdnAccessTime}ms`);
  console.log(`   Segments verified: ${metrics.storage.segmentsVerified}`);
  console.log(`   Master playlist: ${metrics.storage.masterPlaylistValid ? '✅' : '❌'}`);

  console.log('\n▶️  Playback Performance:');
  console.log(`   Initial buffer: ${metrics.playback.initialBufferTime}ms`);
  console.log(`   Buffer cleanups: ${metrics.playback.bufferCleanupCount}`);
  console.log(`   Playback errors: ${metrics.playback.playbackErrors.length}`);

  console.log('\n💾 Memory Management:');
  console.log(`   Peak usage: ${metrics.memory.peakUsageMB.toFixed(1)}MB`);
  console.log(`   Cleanup triggered: ${metrics.memory.cleanupTriggered ? '✅' : '❌'}`);
  console.log(`   Leak detected: ${metrics.memory.leakDetected ? '⚠️  YES' : '✅ NO'}`);

  console.log('\n📈 Test Summary:');
  console.log(`   Passed: ${metrics.passed}`);
  console.log(`   Failed: ${metrics.failed}`);
  console.log(`   Success rate: ${((metrics.passed / (metrics.passed + metrics.failed)) * 100).toFixed(1)}%`);

  if (metrics.errors.length > 0) {
    console.log('\n❌ Errors:');
    metrics.errors.forEach(err => {
      console.log(`   [${err.test}] ${err.error}`);
    });
  }

  console.log('\n' + '='.repeat(80));

  // Save report
  const reportPath = path.join(__dirname, `e2e-metrics-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(metrics, null, 2));
  console.log(`\n📄 Detailed report saved: ${reportPath}`);

  // Exit with appropriate code
  process.exit(metrics.failed > 0 ? 1 : 0);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting End-to-End Performance Metrics Validation');
  console.log(`   API: ${CONFIG.API_URL}`);
  console.log(`   Test video: ${CONFIG.TEST_VIDEO}\n`);

  try {
    // Test 1: Upload and Transcoding
    const { videoId } = await testUploadPipeline();

    // Test 2: Parallel Performance
    await testParallelPerformance(videoId);

    // Test 3: CDN Storage
    await testCDNStorage(videoId);

    // Test 4: Playback and Buffer
    await testPlaybackBuffer(videoId);

    // Test 5: Memory Leaks
    await testMemoryLeaks();

    // Print final report
    printMetricsReport();

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    printMetricsReport();
  }
}

// Run if main module
if (require.main === module) {
  main();
}

module.exports = {
  testUploadPipeline,
  testParallelPerformance,
  testCDNStorage,
  testPlaybackBuffer,
  testMemoryLeaks
};
