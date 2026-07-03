# Query Optimization Notes

## High-Value Indexes

- `schedule_runs_one_active_per_user_plan_idx`
  - Unique partial index enforcing one active schedule run per user-plan pair.
- `schedule_runs_active_lookup_idx`
  - Fast active schedule retrieval.
- `schedule_days_run_date_idx`
  - Fast schedule day lookup for today view.
- `schedule_items_day_priority_idx`
  - Stable ordered item retrieval inside schedule days.
- `plan_topics_schedule_input_idx`
  - Scheduler input retrieval by plan/status/deadline/progress.
- `study_logs_user_topic_completed_idx`
  - Progress and feedback aggregation by user/topic.

## Expected Expensive Queries

### Active Schedule Details

Loads schedule run, days, items, and topics. Keep this selective and avoid adding study logs into the same eager-loaded tree.

### Execution Status

Uses aggregate SQL instead of nested Sequelize loading. This avoids N+1 behavior and gives predictable payloads.

### Public Plan Discovery

Uses published public plan filters. If the public catalog grows, add trigram search or a dedicated materialized search view.

## EXPLAIN ANALYZE Checklist

Run before demo/deployment:

```sql
EXPLAIN ANALYZE
SELECT *
FROM schedule_runs
WHERE user_id = '<uuid>'
  AND plan_id = 1
  AND is_active = true;
```

```sql
EXPLAIN ANALYZE
SELECT *
FROM schedule_days
WHERE schedule_run_id = 1
ORDER BY date ASC;
```

```sql
EXPLAIN ANALYZE
SELECT topic_id, SUM(hours_studied)
FROM study_logs
WHERE user_id = '<uuid>'
GROUP BY topic_id;
```

## Deferred Scaling Work

- Denormalize adherence snapshots if `study_logs` becomes large.
- Add read replicas only after query pressure is measured.
- Materialize admin analytics if dashboard queries become frequent.
- Consider partitioning `study_logs` by time only after write volume justifies it.

