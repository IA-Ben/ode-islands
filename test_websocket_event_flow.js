#!/usr/bin/env node

/**
 * Test WebSocket Event Flow for EventAudienceInterface
 * This script tests the critical WebSocket synchronization fixes
 */

const WebSocket = require('ws');

// Test configuration
const WS_URL = 'ws://localhost:5000/ws';
const TEST_EVENT_ID = 'test-event-123';
const TEST_USER_ID = 'test-user-456';

console.log('Testing WebSocket Event Flow...\n');

// Track test results
const results = {
  connected: false,
  joinEventSent: false,
  sessionStartReceived: false,
  heartbeatReceived: false,
  heartbeatRequestSent: false,
  timecodeValid: false
};

// Create WebSocket connection
const ws = new WebSocket(WS_URL);

// Set timeout for test
const testTimeout = setTimeout(() => {
  console.error('❌ Test timeout after 15 seconds');
  printResults();
  process.exit(1);
}, 15000);

ws.on('open', () => {
  console.log('✓ WebSocket connected successfully');
  results.connected = true;
  
  // Send join_event message
  const joinMessage = {
    type: 'join_event',
    payload: { eventId: TEST_EVENT_ID, userId: TEST_USER_ID },
    timestamp: Date.now()
  };
  
  console.log('→ Sending join_event message:', JSON.stringify(joinMessage, null, 2));
  ws.send(JSON.stringify(joinMessage));
  results.joinEventSent = true;
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('← Received message:', message.type, message.payload ? Object.keys(message.payload) : '(no payload)');
    
    switch (message.type) {
      case 'connected':
        console.log('  ✓ Connection acknowledged by server');
        break;
        
      case 'session_start':
        console.log('  ✓ Session started for event:', message.payload.eventId);
        console.log('    - Session ID:', message.payload.sessionId);
        console.log('    - Current timecode:', message.payload.currentTimecode);
        results.sessionStartReceived = true;
        
        // Send heartbeat request after session starts
        setTimeout(() => {
          const heartbeatRequest = {
            type: 'heartbeat_request',
            payload: { eventId: TEST_EVENT_ID },
            timestamp: Date.now()
          };
          console.log('→ Sending heartbeat_request');
          ws.send(JSON.stringify(heartbeatRequest));
          results.heartbeatRequestSent = true;
        }, 1000);
        break;
        
      case 'heartbeat':
        console.log('  ✓ Heartbeat received');
        console.log('    - Server timecode:', message.payload.serverTimecode);
        console.log('    - Server time:', message.payload.serverTime);
        console.log('    - Message timestamp:', message.timestamp);
        
        results.heartbeatReceived = true;
        
        // Validate timecode is a number
        if (typeof message.payload.serverTimecode === 'number' && 
            typeof message.payload.serverTime === 'number') {
          results.timecodeValid = true;
          console.log('  ✓ Timecode format valid');
        }
        
        // Test complete after receiving heartbeat
        setTimeout(() => {
          console.log('\n🎉 Test completed successfully!');
          printResults();
          ws.close();
          clearTimeout(testTimeout);
        }, 3000);
        break;
        
      case 'error':
        console.error('  ❌ Server error:', message.payload);
        break;
        
      default:
        console.log('  ℹ️  Other message type:', message.type);
    }
  } catch (error) {
    console.error('❌ Failed to parse message:', error.message);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  printResults();
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log('📪 WebSocket closed:', code, reason.toString());
  printResults();
  process.exit(0);
});

function printResults() {
  console.log('\n📊 Test Results:');
  console.log('================');
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const status = passed ? 'PASS' : 'FAIL';
    console.log(`${icon} ${test}: ${status}`);
  });
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`\n📈 Summary: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎯 All WebSocket event flow fixes are working correctly!');
  } else {
    console.log('⚠️  Some tests failed - check the implementation');
  }
}