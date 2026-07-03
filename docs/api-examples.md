# API Examples

Base URL:

```text
http://localhost:8000/api/v1
```

## Register

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Student","email":"student@example.com","password":"StrongPass123!","role":"student"}'
```

## Create Plan

```bash
curl -X POST http://localhost:8000/api/v1/plans \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Database Systems","visibility":"private"}'
```

## Add Topic

```bash
curl -X POST http://localhost:8000/api/v1/plans/1/topics \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Indexes","difficulty":4,"estimatedHours":6,"deadline":"2026-06-10"}'
```

## Generate Schedule

```bash
curl -X POST http://localhost:8000/api/v1/plans/1/schedule-runs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"dailyCapacityHours":2,"forceRegenerate":true}'
```

## Submit Study Log

```bash
curl -X POST http://localhost:8000/api/v1/execution/schedule-items/1/logs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"hoursStudied":1.5,"difficultyFeedback":"hard","sessionEffectiveness":"medium","perceivedWorkload":"heavy"}'
```

## Inspect Recovery

```bash
curl "http://localhost:8000/api/v1/execution/recovery?planId=1" \
  -H "Authorization: Bearer <token>"
```

