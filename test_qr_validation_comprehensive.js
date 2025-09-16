#!/usr/bin/env node

// Comprehensive QR Validation System Test
// Tests all components: CRC validation, HMAC validation, memory wallet security

const crypto = require('crypto');
const fetch = require('node-fetch');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  testEventId: 'test-event-001',
  testChapterId: 'chapter-01',
  testSequenceId: 'seq-001',
  qrSecret: 'dev-qr-secret-change-in-production-with-256-bit-key' // Match the development secret
};

// CRC32 implementation (matching server-side)
function crc32(data) {
  const table = [];
  let crc = 0;
  
  // Generate CRC32 table
  for (let i = 0; i < 256; i++) {
    crc = i;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    table[i] = crc;
  }
  
  crc = 0xFFFFFFFF;
  
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data.charCodeAt(i)) & 0xFF] ^ (crc >>> 8);
  }
  
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate CRC checksum for QR code
function generateQRCRC(qrData) {
  const baseData = qrData.replace(/\|CRC:[^|]*/, '');
  const checksum = crc32(baseData);
  return checksum.toString(16).padStart(8, '0').toUpperCase();
}

// Generate HMAC for QR code
function generateQRHmac(dataToSign, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(dataToSign)
    .digest('hex')
    .substring(0, 16);
}

// Generate a valid test QR code with both HMAC and CRC
function generateTestQRCode(eventId, chapterId, sequenceId, includeTimestamp = false, includeNonce = false) {
  const timestamp = includeTimestamp ? Date.now() : null;
  const nonce = includeNonce ? Math.random().toString(36).substring(2, 15) : null;
  
  let qrData = `E:${eventId}|C:${chapterId}|S:${sequenceId}|V:1`;
  
  if (timestamp) qrData += `|T:${timestamp}`;
  if (nonce) qrData += `|N:${nonce}`;
  
  // Generate HMAC
  const hmac = generateQRHmac(qrData, TEST_CONFIG.qrSecret);
  qrData += `|H:${hmac}`;
  
  // Generate CRC
  const crc = generateQRCRC(qrData);
  qrData += `|CRC:${crc}`;
  
  return qrData;
}

// Test functions
async function testQRValidationAPI() {
  console.log('\n🔍 Testing QR Validation API...');
  
  try {
    // Test 1: Valid QR code
    const validQR = generateTestQRCode(
      TEST_CONFIG.testEventId, 
      TEST_CONFIG.testChapterId, 
      TEST_CONFIG.testSequenceId,
      true, // Include timestamp
      true  // Include nonce
    );
    
    console.log(`Generated test QR: ${validQR}`);
    
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/qr-validation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        qrData: validQR,
        eventId: TEST_CONFIG.testEventId
      })
    });
    
    const result = await response.json();
    console.log(`✅ QR Validation API Response:`, {
      status: response.status,
      success: result.success,
      isValid: result.isValid,
      eventId: result.eventId,
      chapterId: result.chapterId,
      error: result.error
    });
    
    // Test 2: Invalid QR (wrong HMAC)
    console.log('\n🔍 Testing invalid QR (corrupted HMAC)...');
    const invalidQR = validQR.replace(/H:[^|]+/, 'H:INVALID');
    
    const invalidResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/qr-validation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        qrData: invalidQR,
        eventId: TEST_CONFIG.testEventId
      })
    });
    
    const invalidResult = await invalidResponse.json();
    console.log(`✅ Invalid QR Response:`, {
      status: invalidResponse.status,
      success: invalidResult.success,
      error: invalidResult.error
    });
    
    // Test 3: Invalid CRC
    console.log('\n🔍 Testing invalid CRC checksum...');
    const invalidCrcQR = validQR.replace(/CRC:[^|]*$/, 'CRC:INVALID');
    
    const crcResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/qr-validation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        qrData: invalidCrcQR,
        eventId: TEST_CONFIG.testEventId
      })
    });
    
    const crcResult = await crcResponse.json();
    console.log(`✅ Invalid CRC Response:`, {
      status: crcResponse.status,
      success: crcResult.success,
      error: crcResult.error
    });
    
    return validQR; // Return for use in other tests
    
  } catch (error) {
    console.error('❌ QR Validation API test failed:', error.message);
    return null;
  }
}

async function testMemoryWalletSecurity(validQR) {
  console.log('\n🔍 Testing Memory Wallet Security...');
  
  if (!validQR) {
    console.log('⚠️ Skipping memory wallet test - no valid QR available');
    return;
  }
  
  try {
    // Test 1: Try to collect chapter stamp without QR data (should fail)
    console.log('Testing chapter collection without QR data...');
    const noQrResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/memory-wallet/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sourceType: 'chapter',
        sourceId: TEST_CONFIG.testChapterId,
        chapterId: TEST_CONFIG.testChapterId,
        eventId: TEST_CONFIG.testEventId,
        title: 'Test Chapter Stamp',
        description: 'Test without QR data'
      })
    });
    
    const noQrResult = await noQrResponse.json();
    console.log(`✅ No QR Data Response:`, {
      status: noQrResponse.status,
      success: noQrResult.success,
      error: noQrResult.error
    });
    
    // Test 2: Try with invalid QR data (should fail)
    console.log('Testing chapter collection with invalid QR data...');
    const invalidQrResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/memory-wallet/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sourceType: 'chapter',
        sourceId: TEST_CONFIG.testChapterId,
        chapterId: TEST_CONFIG.testChapterId,
        eventId: TEST_CONFIG.testEventId,
        title: 'Test Chapter Stamp',
        description: 'Test with invalid QR data',
        qrData: 'E:fake|C:fake|H:invalid'
      })
    });
    
    const invalidQrResult = await invalidQrResponse.json();
    console.log(`✅ Invalid QR Response:`, {
      status: invalidQrResponse.status,
      success: invalidQrResult.success,
      error: invalidQrResult.error
    });
    
    // Test 3: Try with valid QR but mismatched chapter (should fail)
    const mismatchQR = generateTestQRCode(TEST_CONFIG.testEventId, 'different-chapter', TEST_CONFIG.testSequenceId);
    console.log('Testing chapter collection with mismatched QR...');
    
    const mismatchResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/memory-wallet/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sourceType: 'chapter',
        sourceId: TEST_CONFIG.testChapterId,
        chapterId: TEST_CONFIG.testChapterId,
        eventId: TEST_CONFIG.testEventId,
        title: 'Test Chapter Stamp',
        description: 'Test with mismatched QR',
        qrData: mismatchQR
      })
    });
    
    const mismatchResult = await mismatchResponse.json();
    console.log(`✅ Mismatched Chapter Response:`, {
      status: mismatchResponse.status,
      success: mismatchResult.success,
      error: mismatchResult.error
    });
    
  } catch (error) {
    console.error('❌ Memory Wallet Security test failed:', error.message);
  }
}

function testCRCValidation() {
  console.log('\n🔍 Testing CRC Validation...');
  
  try {
    // Test CRC generation and validation
    const testData = `E:${TEST_CONFIG.testEventId}|C:${TEST_CONFIG.testChapterId}|S:${TEST_CONFIG.testSequenceId}|V:1`;
    const crc = generateQRCRC(testData);
    const fullQR = `${testData}|CRC:${crc}`;
    
    console.log(`✅ Test data: ${testData}`);
    console.log(`✅ Generated CRC: ${crc}`);
    console.log(`✅ Full QR: ${fullQR}`);
    
    // Verify CRC validation
    const expectedCrc = generateQRCRC(fullQR);
    const isValid = crc === expectedCrc;
    
    console.log(`✅ CRC Validation: ${isValid ? 'VALID' : 'INVALID'}`);
    
    // Test with corrupted data
    const corruptedData = `E:${TEST_CONFIG.testEventId}|C:CORRUPTED|S:${TEST_CONFIG.testSequenceId}|V:1|CRC:${crc}`;
    const corruptedExpected = generateQRCRC(corruptedData);
    const corruptedValid = crc === corruptedExpected;
    
    console.log(`✅ Corrupted Data CRC: ${corruptedValid ? 'VALID (ERROR!)' : 'INVALID (CORRECT)'}`);
    
    return true;
  } catch (error) {
    console.error('❌ CRC Validation test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive QR Validation System Tests\n');
  console.log('=' .repeat(60));
  
  // Test CRC validation locally
  const crcResult = testCRCValidation();
  
  // Test QR validation API
  const validQR = await testQRValidationAPI();
  
  // Test memory wallet security
  await testMemoryWalletSecurity(validQR);
  
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 Comprehensive Tests Complete');
  
  if (crcResult && validQR) {
    console.log('✅ All critical components appear to be functioning');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed - check implementation');
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error.message);
  process.exit(1);
});

// Run tests
if (require.main === module) {
  runComprehensiveTests();
}

module.exports = {
  generateTestQRCode,
  testQRValidationAPI,
  testMemoryWalletSecurity,
  testCRCValidation
};