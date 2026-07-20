# Disaster Recovery

## Targets
- RPO: 24 hours for database data; reduce to 1 hour before high-volume launch.
- RTO: 4 hours for a full application and database recovery.

## Backup and restore
Supabase-managed backups are the primary recovery mechanism. Confirm the project plan's backup retention before launch. During recovery: pause writes, create a restoration branch or project, restore the latest acceptable backup, validate auth and critical orders, then redirect application traffic.

## Provider outage
For Supabase, payment, email, LiveKit, or hosting outages: declare an incident, disable affected feature flags, preserve webhook payloads, communicate status, and resume queues only after the provider is healthy.

## Rollback
Deploy the previously known-good application deployment. Database migrations are forward-only; use a corrective migration rather than reversing production schema manually.

## Break-glass
Keep service-role and provider recovery credentials in the approved secret manager with two authorized platform owners. Every break-glass use requires an audit event and incident record.
