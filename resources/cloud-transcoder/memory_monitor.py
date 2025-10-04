#!/usr/bin/env python3
"""
Memory Monitoring Module for Cloud Run Video Transcoder

Features:
- Real-time memory usage tracking
- OOM prevention with early warning thresholds
- Automatic quality reduction under memory pressure
- Resource cleanup triggers
- Cloud Monitoring integration for metrics export
"""

import os
import psutil
import threading
import time
import logging
from typing import Dict, Callable, Optional
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class MemoryThresholds:
    """Memory usage thresholds for triggering actions"""
    warning_percent: float = 70.0  # Log warning
    critical_percent: float = 85.0  # Reduce quality/skip variants
    emergency_percent: float = 95.0  # Emergency cleanup
    
@dataclass
class MemoryMetrics:
    """Current memory metrics snapshot"""
    total_mb: float
    used_mb: float
    available_mb: float
    percent: float
    timestamp: datetime
    
    def to_dict(self) -> Dict:
        return {
            'total_mb': self.total_mb,
            'used_mb': self.used_mb,
            'available_mb': self.available_mb,
            'percent': self.percent,
            'timestamp': self.timestamp.isoformat()
        }

class MemoryMonitor:
    """Real-time memory monitoring with OOM prevention"""
    
    def __init__(self, thresholds: Optional[MemoryThresholds] = None):
        self.thresholds = thresholds or MemoryThresholds()
        self.is_monitoring = False
        self.monitor_thread: Optional[threading.Thread] = None
        self.callbacks: Dict[str, Callable] = {}
        self.last_metrics: Optional[MemoryMetrics] = None
        self.warning_triggered = False
        self.critical_triggered = False
        
    def get_current_metrics(self) -> MemoryMetrics:
        """Get current memory usage metrics"""
        memory = psutil.virtual_memory()
        
        return MemoryMetrics(
            total_mb=memory.total / (1024 * 1024),
            used_mb=memory.used / (1024 * 1024),
            available_mb=memory.available / (1024 * 1024),
            percent=memory.percent,
            timestamp=datetime.now()
        )
    
    def register_callback(self, level: str, callback: Callable):
        """Register callback for memory threshold events
        
        Args:
            level: 'warning', 'critical', or 'emergency'
            callback: Function to call when threshold is reached
        """
        self.callbacks[level] = callback
        
    def start_monitoring(self, interval_seconds: float = 5.0):
        """Start background memory monitoring
        
        Args:
            interval_seconds: How often to check memory (default 5s)
        """
        if self.is_monitoring:
            logger.warning("Memory monitoring already running")
            return
            
        self.is_monitoring = True
        self.monitor_thread = threading.Thread(
            target=self._monitor_loop,
            args=(interval_seconds,),
            daemon=True
        )
        self.monitor_thread.start()
        logger.info(f"Memory monitoring started (interval: {interval_seconds}s)")
        
    def stop_monitoring(self):
        """Stop background memory monitoring"""
        self.is_monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=10)
        logger.info("Memory monitoring stopped")
        
    def _monitor_loop(self, interval: float):
        """Background monitoring loop"""
        while self.is_monitoring:
            try:
                metrics = self.get_current_metrics()
                self.last_metrics = metrics
                
                # Check thresholds and trigger callbacks
                self._check_thresholds(metrics)
                
                # Export to Cloud Monitoring (if configured)
                self._export_metrics(metrics)
                
            except Exception as e:
                logger.error(f"Error in memory monitoring loop: {e}")
                
            time.sleep(interval)
    
    def _check_thresholds(self, metrics: MemoryMetrics):
        """Check memory thresholds and trigger appropriate actions"""
        
        # Emergency threshold (95%)
        if metrics.percent >= self.thresholds.emergency_percent:
            if 'emergency' in self.callbacks:
                logger.critical(
                    f"EMERGENCY: Memory at {metrics.percent:.1f}% "
                    f"({metrics.used_mb:.0f}MB / {metrics.total_mb:.0f}MB)"
                )
                self.callbacks['emergency'](metrics)
                
        # Critical threshold (85%)
        elif metrics.percent >= self.thresholds.critical_percent:
            if not self.critical_triggered:
                logger.error(
                    f"CRITICAL: Memory at {metrics.percent:.1f}% "
                    f"({metrics.used_mb:.0f}MB / {metrics.total_mb:.0f}MB)"
                )
                if 'critical' in self.callbacks:
                    self.callbacks['critical'](metrics)
                self.critical_triggered = True
                
        # Warning threshold (70%)
        elif metrics.percent >= self.thresholds.warning_percent:
            if not self.warning_triggered:
                logger.warning(
                    f"WARNING: Memory at {metrics.percent:.1f}% "
                    f"({metrics.used_mb:.0f}MB / {metrics.total_mb:.0f}MB)"
                )
                if 'warning' in self.callbacks:
                    self.callbacks['warning'](metrics)
                self.warning_triggered = True
                
        # Reset triggers when back to safe levels
        else:
            if self.critical_triggered or self.warning_triggered:
                logger.info(
                    f"Memory back to safe level: {metrics.percent:.1f}%"
                )
            self.warning_triggered = False
            self.critical_triggered = False
    
    def _export_metrics(self, metrics: MemoryMetrics):
        """Export metrics to Cloud Monitoring (if configured)"""
        # Only export in Cloud Run environment
        if not os.getenv('K_SERVICE'):
            return
            
        try:
            from google.cloud import monitoring_v3
            import google.auth
            
            # Initialize client (uses default credentials in Cloud Run)
            project_id = os.getenv('GOOGLE_CLOUD_PROJECT')
            if not project_id:
                return
                
            client = monitoring_v3.MetricServiceClient()
            project_name = f"projects/{project_id}"
            
            # Create time series for memory usage
            series = monitoring_v3.TimeSeries()
            series.metric.type = "custom.googleapis.com/transcoder/memory/usage_percent"
            series.resource.type = "cloud_run_revision"
            series.resource.labels["service_name"] = os.getenv('K_SERVICE', 'video-transcoder')
            series.resource.labels["revision_name"] = os.getenv('K_REVISION', 'unknown')
            series.resource.labels["location"] = os.getenv('REGION', 'us-central1')
            
            point = monitoring_v3.Point()
            point.value.double_value = metrics.percent
            point.interval.end_time.FromDatetime(metrics.timestamp)
            series.points = [point]
            
            # Write time series
            client.create_time_series(name=project_name, time_series=[series])
            
        except ImportError:
            # google-cloud-monitoring not installed
            pass
        except Exception as e:
            logger.debug(f"Failed to export metrics to Cloud Monitoring: {e}")
    
    def get_recommendation(self, metrics: MemoryMetrics) -> str:
        """Get recommendation based on current memory usage"""
        if metrics.percent >= self.thresholds.emergency_percent:
            return "EMERGENCY_CLEANUP"
        elif metrics.percent >= self.thresholds.critical_percent:
            return "REDUCE_QUALITY"
        elif metrics.percent >= self.thresholds.warning_percent:
            return "MONITOR_CLOSELY"
        else:
            return "NORMAL"

class TranscoderMemoryManager:
    """Memory-aware transcoding manager with OOM prevention"""
    
    def __init__(self):
        self.monitor = MemoryMonitor()
        self.quality_reduced = False
        self.emergency_mode = False
        
        # Register callbacks
        self.monitor.register_callback('warning', self._handle_warning)
        self.monitor.register_callback('critical', self._handle_critical)
        self.monitor.register_callback('emergency', self._handle_emergency)
        
    def start(self):
        """Start memory monitoring"""
        self.monitor.start_monitoring(interval_seconds=5.0)
        
    def stop(self):
        """Stop memory monitoring"""
        self.monitor.stop_monitoring()
        
    def _handle_warning(self, metrics: MemoryMetrics):
        """Handle warning threshold (70%)"""
        logger.warning(
            f"Memory warning - considering quality reduction. "
            f"Available: {metrics.available_mb:.0f}MB"
        )
        
    def _handle_critical(self, metrics: MemoryMetrics):
        """Handle critical threshold (85%)"""
        if not self.quality_reduced:
            logger.error("CRITICAL: Reducing quality profiles to prevent OOM")
            self.quality_reduced = True
            # This flag can be checked by transcode.py to skip lower-priority variants
            
    def _handle_emergency(self, metrics: MemoryMetrics):
        """Handle emergency threshold (95%)"""
        logger.critical("EMERGENCY: Triggering aggressive cleanup")
        self.emergency_mode = True
        
        # Force garbage collection
        import gc
        gc.collect()
        
        # Log process info for debugging
        process = psutil.Process()
        logger.critical(
            f"Process memory: RSS={process.memory_info().rss / (1024*1024):.0f}MB, "
            f"VMS={process.memory_info().vms / (1024*1024):.0f}MB"
        )
        
    def should_skip_variant(self, priority_group: str) -> bool:
        """Check if variant should be skipped due to memory pressure
        
        Args:
            priority_group: 'critical', 'standard', or 'premium'
            
        Returns:
            True if variant should be skipped
        """
        if self.emergency_mode:
            # Only process critical variants in emergency mode
            return priority_group != 'critical'
            
        if self.quality_reduced and priority_group == 'premium':
            # Skip premium variants when quality is reduced
            return True
            
        return False
    
    def get_status(self) -> Dict:
        """Get current memory manager status"""
        metrics = self.monitor.last_metrics
        if not metrics:
            return {'status': 'not_started'}
            
        return {
            'status': 'active',
            'memory_percent': metrics.percent,
            'memory_mb': metrics.used_mb,
            'available_mb': metrics.available_mb,
            'quality_reduced': self.quality_reduced,
            'emergency_mode': self.emergency_mode,
            'recommendation': self.monitor.get_recommendation(metrics)
        }

# Singleton instance for use in transcode.py
memory_manager = TranscoderMemoryManager()

if __name__ == '__main__':
    # Test the memory monitor
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    manager = TranscoderMemoryManager()
    manager.start()
    
    print("Memory monitoring active. Press Ctrl+C to stop...")
    try:
        while True:
            status = manager.get_status()
            print(f"Status: {status}")
            time.sleep(10)
    except KeyboardInterrupt:
        manager.stop()
        print("Monitoring stopped")
