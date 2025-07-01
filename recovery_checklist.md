# Ireland Pay Analytics Recovery & Maintenance Checklist

## Priority 1: Security & Authentication

- [ ] Verify JWT validation in run-analytics.py
  - [ ] Check environment variables are properly configured 
  - [ ] Test token verification with valid and invalid tokens
  - [ ] Ensure proper error handling for malformed tokens

- [ ] Test admin role restrictions
  - [ ] Verify non-admin users cannot trigger pipeline
  - [ ] Confirm admin users can access protected routes
  - [ ] Test permission inheritance across user types

- [ ] Review Supabase security rules
  - [ ] Audit RLS policies for all tables
  - [ ] Verify proper row-level security for sensitive data
  - [ ] Update any overly permissive policies

## Priority 2: Data Pipeline Stability

- [ ] Add error handling for Excel file format variations
  - [ ] Test with different Excel versions and formats
  - [ ] Handle missing or renamed columns gracefully
  - [ ] Add validation for required data fields

- [ ] Implement data validation checks
  - [ ] Add pre-processing validation of merchant data
  - [ ] Validate residual calculations before storage
  - [ ] Check for data consistency across related tables

- [ ] Add transaction support for database operations
  - [ ] Ensure atomic database updates
  - [ ] Implement rollback on partial failures
  - [ ] Record audit trails for data modifications

## Priority 3: Monitoring & Visibility

- [ ] Enhance logging throughout pipeline
  - [ ] Add structured logging with proper levels
  - [ ] Include contextual information in log messages
  - [ ] Configure log rotation and retention

- [ ] Create admin dashboard for pipeline status
  - [ ] Build pipeline runs visualization
  - [ ] Show success/failure metrics
  - [ ] Add filtering and search capabilities

- [ ] Set up alerts for pipeline failures
  - [ ] Configure email notifications for critical errors
  - [ ] Add Slack/Teams integration for alerts
  - [ ] Implement gradual notification escalation

## Priority 4: Automation

- [ ] Deploy GitHub Actions workflow
  - [ ] Configure necessary repository secrets
  - [ ] Test the workflow with manual trigger
  - [ ] Verify scheduled execution works correctly

- [ ] Test monthly automated run
  - [ ] Create a test run with sample data
  - [ ] Verify all pipeline stages execute correctly
  - [ ] Confirm data appears in dashboards

- [ ] Verify email notifications
  - [ ] Set up email service integration
  - [ ] Test notification templates
  - [ ] Confirm delivery to appropriate stakeholders

## Priority 5: Testing

- [ ] Create unit tests for pipeline components
  - [ ] Test Excel processing functions
  - [ ] Test calculation logic
  - [ ] Test database operations

- [ ] Implement E2E tests for complete flow
  - [ ] Test file upload through UI
  - [ ] Test API-triggered pipeline execution
  - [ ] Verify dashboard data refresh

- [ ] Add regression tests for fixed bugs
  - [ ] Test edge cases from previous issues
  - [ ] Verify fixes remain stable
  - [ ] Document test cases for future reference

## Monthly Maintenance Tasks

- [ ] Review pipeline execution logs
- [ ] Check for any failed runs or anomalies
- [ ] Verify data integrity across tables
- [ ] Run test suite to catch regressions
- [ ] Update documentation with any process changes

## Quarterly Review

- [ ] Audit security configuration
- [ ] Review and optimize pipeline performance
- [ ] Check for dependency updates
- [ ] Test disaster recovery procedures
- [ ] Review and update this checklist
