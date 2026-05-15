# Goal Tracking Feature Design

## Overview

Add goal tracking functionality to allow users to set asset targets (e.g., "reach 1M CNY by year-end") and profit targets (e.g., "earn 5000 interest monthly"). Progress is tracked over time with historical snapshots enabling trend visualization.

## Data Model

### Goal Table

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key (cuid) |
| userId | String | User ID |
| type | GoalType | ASSET / PROFIT |
| name | String | Goal name |
| targetAmount | Decimal(15,2) | Target amount in CNY |
| period | Period? | MONTHLY / YEARLY (PROFIT only) |
| deadline | DateTime? | Deadline (ASSET or one-time PROFIT) |
| status | GoalStatus | ACTIVE / COMPLETED / ARCHIVED / FAILED |
| createdAt | DateTime | Creation timestamp |
| completedAt | DateTime? | Completion timestamp |

### GoalProgress Table

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key (cuid) |
| goalId | String | Foreign key to Goal |
| date | Date | Snapshot date |
| currentAmount | Decimal(15,2) | Cumulative progress (total assets for ASSET goals, period profit for PROFIT goals) |
| createdAt | DateTime | Creation timestamp |

### Enums

```typescript
enum GoalType {
  ASSET   // Asset accumulation goal
  PROFIT  // Profit/revenue goal
}

enum Period {
  MONTHLY // Reset every month
  YEARLY  // Reset every year
}

enum GoalStatus {
  ACTIVE     // In progress
  COMPLETED  // Goal achieved
  FAILED     // Period ended without achieving (PROFIT goal only)
  ARCHIVED   // Manually archived by user
}
```

## Core Logic

### Asset Goals

- `currentAmount` = sum of latest asset snapshots for all user accounts, converted to CNY
- Completion: when `currentAmount >= targetAmount` → mark COMPLETED

### Profit Goals

- `currentAmount` = sum of `realProfit` for all accounts in current period (month/year)
- Period reset logic:
  - If COMPLETED (target met) → keep COMPLETED status
  - If not completed by period end → mark FAILED
  - Auto-create new period record for the goal

### Cron Job: Monthly Reset (1st of each month, 00:01)

1. Find all ACTIVE profit goals with period = MONTHLY
2. Calculate previous month's cumulative profit vs targetAmount
3. Update goal status to COMPLETED or FAILED
4. Create new GoalProgress record with currentAmount = 0 for the new period

## Page Structure

### Dashboard `/`

- Goal progress cards (top 2 active goals, sorted by nearest deadline)
- Click card → navigate to `/goals/[id]`

### Goals List `/goals`

- Tabs: All / Active / Completed / Archived
- Goal card per item: name, progress bar, current/target, days remaining
- Create new goal button

### Goal Detail `/goals/[id]`

- Progress trend chart (using GoalProgress data)
- Current progress details
- Actions: Edit, Archive

### Create/Edit Goal `/goals/new` or `/goals/[id]/edit`

- Form: type toggle, name, target amount, deadline (ASSET) / period selection (PROFIT)

## API Endpoints (Server Actions)

- `createGoal(data)` - Create new goal
- `updateGoal(id, data)` - Update goal
- `archiveGoal(id)` - Archive goal
- `getGoalProgress(goalId)` - Get progress history
- `calculateCurrentProgress(goalId)` - Compute current amount for a goal

## Implementation Order

1. Add Prisma schema for Goal and GoalProgress
2. Create server actions for CRUD operations
3. Build Goals list page (`/goals`)
4. Build Create/Edit goal form
5. Build Goal detail page with progress chart
6. Add goals to dashboard
7. Implement monthly cron job for period reset
