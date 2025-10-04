import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const telemetry = await req.json();
    
    // Log to console for now (can be sent to monitoring service later)
    console.log('[VIDEO TELEMETRY]', {
      timestamp: new Date(telemetry.timestamp).toISOString(),
      type: telemetry.type,
      message: telemetry.message,
      url: telemetry.url,
      level: telemetry.level,
      userAgent: telemetry.userAgent,
      codecCapability: telemetry.codecCapability,
      screenResolution: telemetry.screenResolution,
      connection: telemetry.connection
    });
    
    // TODO: Send to monitoring service (e.g., DataDog, Sentry, CloudWatch)
    // await sendToMonitoring(telemetry);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing video telemetry:', error);
    return NextResponse.json({ error: 'Failed to process telemetry' }, { status: 500 });
  }
}
