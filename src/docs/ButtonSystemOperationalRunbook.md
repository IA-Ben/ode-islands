# Button System Operational Runbook

## Overview

This runbook provides comprehensive operational guidance for managing the unified button system in production, including monitoring, troubleshooting, and incident response procedures.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Monitoring and Alerting](#monitoring-and-alerting)
3. [Feature Flag Management](#feature-flag-management)
4. [Incident Response](#incident-response)
5. [Rollback Procedures](#rollback-procedures)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Maintenance Procedures](#maintenance-procedures)
8. [Performance Optimization](#performance-optimization)

## System Architecture

### Core Components

1. **CardButton Component** (`src/components/CardButton.tsx`)
   - Main unified button implementation
   - Integrates feature flags and monitoring
   - Falls back to legacy components when needed

2. **Feature Flag Service** (`src/lib/buttonFeatureFlags.ts`)
   - Controls rollout percentage and user cohorts
   - Manages emergency disable mechanisms
   - Provides system health monitoring

3. **Monitoring Service** (`src/lib/buttonMonitoring.ts`)
   - Collects performance metrics and error data
   - Provides real-time system health insights
   - Exports metrics for external monitoring systems

4. **Rollback Service** (`src/lib/buttonRollbackPlan.ts`)
   - Automated rollback triggers and execution
   - Data preservation during rollbacks
   - Validation of rollback success

5. **Health Check Service** (`src/lib/buttonHealthChecks.ts`)
   - Comprehensive system health validation
   - Smoke tests for critical functionality
   - Performance threshold monitoring

6. **Legacy Fallback Components** (`src/components/legacy/LegacyButtonFallback.tsx`)
   - Backward compatibility implementations
   - Maintains original button behavior during rollbacks

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_UNIFIED_BUTTONS` | `true` | Master switch for unified button system |
| `ENABLE_BUTTON_MONITORING` | `true` | Enable performance and error monitoring |
| `BUTTON_ROLLOUT_PERCENTAGE` | `100` | Percentage of users to receive unified buttons |
| `BUTTON_ROLLOUT_STRATEGY` | `percentage` | Rollout strategy: `percentage`, `user-cohort`, `environment` |
| `ENABLE_EMERGENCY_BUTTON_DISABLE` | `true` | Enable emergency disable functionality |
| `BUTTON_MAX_RENDER_TIME` | `100` | Maximum acceptable render time (ms) |
| `BUTTON_MAX_ACTION_TIME` | `1000` | Maximum acceptable action execution time (ms) |
| `BUTTON_ERROR_RATE_THRESHOLD` | `0.05` | Error rate threshold for auto-rollback |
| `BUTTON_FALLBACK_TO_LEGACY` | `true` | Enable fallback to legacy components |
| `BUTTON_PRESERVE_LEGACY_ACTIONS` | `true` | Preserve legacy action formats |

## Monitoring and Alerting

### Key Metrics to Monitor

#### Performance Metrics
- **Average Render Time**: Should be < 100ms
- **Average Action Execution Time**: Should be < 1000ms
- **Success Rate**: Should be > 95%
- **Memory Usage**: Monitor for memory leaks

#### Error Metrics
- **Error Rate**: Should be < 5%
- **Validation Failures**: Monitor button configuration errors
- **Action Routing Failures**: Monitor navigation errors
- **Feature Flag Errors**: Monitor flag evaluation failures

#### System Health Metrics
- **Health Score**: Overall system health (0-100)
- **Active Operations**: Real-time button interactions
- **Emergency Disable Status**: Monitor for emergency state

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Error Rate | > 5% | > 15% | Auto-rollback at critical |
| Render Time | > 100ms | > 200ms | Performance investigation |
| Action Time | > 1000ms | > 2000ms | Performance investigation |
| Success Rate | < 95% | < 85% | Auto-rollback at critical |
| Health Score | < 80 | < 50 | Manual investigation |
| Memory Usage | > 75% | > 90% | Auto-rollback at critical |

### Monitoring Dashboard

Access the real-time monitoring dashboard at:
- **Development**: `/admin/button-health`
- **Production**: Contact DevOps for access

## Feature Flag Management

### Rollout Strategies

#### 1. Percentage Rollout
```bash
# Gradual rollout - start with 10%
export BUTTON_ROLLOUT_PERCENTAGE=10

# Monitor for 24 hours, then increase
export BUTTON_ROLLOUT_PERCENTAGE=25
export BUTTON_ROLLOUT_PERCENTAGE=50
export BUTTON_ROLLOUT_PERCENTAGE=100
```

#### 2. User Cohort Rollout
```bash
export BUTTON_ROLLOUT_STRATEGY=user-cohort
export BUTTON_USER_WHITELIST="admin-user-1,admin-user-2,test-user-1"
```

#### 3. Environment-based Rollout
```bash
export BUTTON_ROLLOUT_STRATEGY=environment
# Development: Always enabled
# Production: Controlled by percentage
```

### Emergency Disable

#### Immediate Disable
```bash
# Emergency disable via environment variable
export ENABLE_UNIFIED_BUTTONS=false

# Or via runtime command (if dashboard access available)
# Navigate to admin dashboard and click "Emergency Rollback"
```

#### Programmatic Disable
```javascript
// Via browser console in emergency
window.dispatchEvent(new CustomEvent('button-emergency-disable'));
```

## Incident Response

### Severity Levels

#### P0 - Critical (Emergency Rollback Required)
- Error rate > 15%
- System completely non-functional
- Memory usage > 90%
- Security vulnerability

**Response Time**: Immediate (< 5 minutes)
**Action**: Execute emergency rollback immediately

#### P1 - High (Urgent Investigation)
- Error rate 5-15%
- Performance degradation > 2x normal
- Health score < 50

**Response Time**: < 30 minutes
**Action**: Investigate and consider gradual rollback

#### P2 - Medium (Monitor Closely)
- Error rate 2-5%
- Performance degradation 1.5-2x normal
- Health score 50-80

**Response Time**: < 2 hours
**Action**: Monitor and optimize

### Incident Response Steps

1. **Identify and Assess**
   - Check monitoring dashboard
   - Determine severity level
   - Gather initial data

2. **Immediate Response**
   - For P0: Execute emergency rollback
   - For P1: Consider gradual rollback
   - For P2: Continue monitoring

3. **Investigate**
   - Check error logs and metrics
   - Identify root cause
   - Document findings

4. **Resolve**
   - Apply fixes
   - Test thoroughly
   - Monitor recovery

5. **Post-Incident**
   - Write incident report
   - Update runbooks
   - Implement preventive measures

## Rollback Procedures

### Emergency Rollback (< 5 minutes)

```bash
# 1. Immediate disable
export ENABLE_UNIFIED_BUTTONS=false

# 2. Force legacy fallback
export BUTTON_FALLBACK_TO_LEGACY=true
export BUTTON_ROLLOUT_PERCENTAGE=0

# 3. Restart application (if needed)
npm run restart

# 4. Verify rollback success
curl /api/health-check
```

### Gradual Rollback (< 30 minutes)

```bash
# 1. Reduce exposure
export BUTTON_ROLLOUT_PERCENTAGE=10

# 2. Monitor for 10 minutes
# Check dashboard for improvement

# 3. If issues persist, continue rollback
export BUTTON_ROLLOUT_PERCENTAGE=0
export ENABLE_UNIFIED_BUTTONS=false
```

### Rollback Validation

After rollback, verify:
- [ ] Error rates return to normal (< 2%)
- [ ] Performance metrics improve
- [ ] Health score > 90
- [ ] User sessions remain active
- [ ] No data loss occurred

## Troubleshooting Guide

### Common Issues

#### 1. High Error Rate

**Symptoms**: Error rate > 5%, failed button interactions

**Investigation**:
```bash
# Check error logs
grep "Button.*error" /var/log/application.log

# Check monitoring dashboard
# Look for specific error patterns
```

**Solutions**:
- Check for invalid button configurations
- Verify action routing URLs are accessible
- Check for JavaScript errors in browser console
- Consider reducing rollout percentage

#### 2. Slow Performance

**Symptoms**: Render time > 100ms, action time > 1000ms

**Investigation**:
```bash
# Check performance metrics
# Monitor memory usage
# Check for large DOM trees
```

**Solutions**:
- Optimize button rendering logic
- Check for memory leaks
- Reduce animation complexity
- Consider caching optimizations

#### 3. Feature Flag Issues

**Symptoms**: Inconsistent button behavior, users not getting expected experience

**Investigation**:
```bash
# Check feature flag configuration
env | grep BUTTON_

# Check user cohort assignment
# Verify rollout percentage calculation
```

**Solutions**:
- Verify environment variables
- Check user ID hashing logic
- Validate cohort assignment rules

#### 4. Validation Failures

**Symptoms**: Buttons not rendering, configuration errors

**Investigation**:
```bash
# Check button configuration validation
# Look for required field errors
# Verify action/link format
```

**Solutions**:
- Fix button configuration data
- Update button schemas
- Migrate legacy formats

### Debugging Commands

```bash
# Check system health
curl /api/button-health

# Export metrics
curl /api/button-metrics?format=json

# Check feature flags
curl /api/feature-flags

# Force health check
curl -X POST /api/run-health-check
```

## Maintenance Procedures

### Daily Tasks
- [ ] Check monitoring dashboard
- [ ] Review error rates and health score
- [ ] Verify no emergency disable states
- [ ] Check performance metrics trends

### Weekly Tasks
- [ ] Review rollout percentage and strategy
- [ ] Analyze usage patterns and popular actions
- [ ] Clean up old metrics data
- [ ] Update user cohort assignments (if needed)

### Monthly Tasks
- [ ] Review and update alert thresholds
- [ ] Performance optimization review
- [ ] Security review of button configurations
- [ ] Update operational documentation

### Quarterly Tasks
- [ ] Full system health assessment
- [ ] Load testing and capacity planning
- [ ] Disaster recovery testing
- [ ] Training updates for support team

## Performance Optimization

### Performance Targets

| Metric | Target | Acceptable | Action Required |
|--------|--------|------------|-----------------|
| Render Time | < 50ms | < 100ms | > 100ms |
| Action Time | < 500ms | < 1000ms | > 1000ms |
| Success Rate | > 99% | > 95% | < 95% |
| Memory Usage | < 50% | < 75% | > 75% |

### Optimization Strategies

1. **Rendering Optimization**
   - Minimize re-renders with React.memo
   - Use CSS transforms for animations
   - Lazy load button icons
   - Optimize style calculations

2. **Action Optimization**
   - Cache routing calculations
   - Minimize validation overhead
   - Optimize navigation logic
   - Use efficient error handling

3. **Memory Optimization**
   - Clean up event listeners
   - Limit metric buffer sizes
   - Implement proper cleanup in useEffect
   - Monitor for memory leaks

4. **Network Optimization**
   - Bundle button assets efficiently
   - Use CDN for static resources
   - Implement proper caching headers
   - Minimize payload sizes

## Security Considerations

### Security Checklist
- [ ] Validate all button action URLs
- [ ] Sanitize user input in button configurations
- [ ] Implement CSRF protection for admin actions
- [ ] Use HTTPS for all external button links
- [ ] Validate iframe sources for security
- [ ] Implement rate limiting for button interactions
- [ ] Monitor for suspicious button usage patterns

### Security Incident Response
1. Immediately disable affected functionality
2. Investigate security impact
3. Apply security patches
4. Conduct security review
5. Update security documentation

## Contact Information

### On-Call Escalation
- **Primary**: Frontend Team Lead
- **Secondary**: DevOps Engineer
- **Escalation**: Engineering Manager

### Expert Contacts
- **Feature Flags**: DevOps Team
- **Monitoring**: SRE Team
- **Frontend Issues**: Frontend Team
- **Backend Issues**: Backend Team

### Emergency Contacts
- **P0 Incidents**: Page on-call engineer immediately
- **P1 Incidents**: Slack #engineering-alerts
- **P2 Incidents**: Create JIRA ticket

---

**Document Version**: 1.0  
**Last Updated**: September 2025  
**Next Review**: December 2025  
**Owner**: Frontend Team