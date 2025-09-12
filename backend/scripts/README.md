# MYLG Backend Scripts

Utility scripts for managing MYLG backend operations.

## Project Directory Migration

This script migrates project data from the full `Projects` table to a lightweight `ProjectDirectory` table for faster dashboard queries.

### Prerequisites

1. **AWS Credentials**: Ensure you have AWS credentials configured
2. **Tables**: Both `Projects` and `ProjectDirectory` tables must exist
3. **Node.js**: Node.js 18+ installed

### Setup

1. **Install dependencies**:
   ```bash
   cd backend/scripts
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your AWS credentials and table names
   ```

### Run Migration

```bash
npm run migrate:projects
```

### What it does

- Scans the `Projects` table in batches
- Extracts only essential fields for the directory:
  - `projectId`, `title`, `slug`, `color`, `status`
  - `team`, `thumbnails`, `dateCreated`, `finishline`, `lastModified`
- Inserts the "thin" version into `ProjectDirectory` table
- Provides detailed progress and error reporting

### Expected Output

```
🚀 Starting batch migration from Projects to ProjectDirectory
📍 Region: us-west-2
📊 Source Table: Projects
🎯 Target Table: ProjectDirectory
---
🔍 Scanning for items...
📦 Processing batch of 25 items...
✅ Migrated project: MB2 Tahoe
✅ Migrated project: Downtown Office
...
📊 Progress: 150 processed, 148 migrated, 2 errors
---
🎉 Migration completed!
⏱️  Duration: 45.23s
📊 Total processed: 150
✅ Successfully migrated: 148
❌ Errors: 2
🎯 Success rate: 98.7%
```

### Troubleshooting

- **Permission errors**: Check your AWS credentials and IAM permissions
- **Table not found**: Ensure both tables exist in the specified region
- **Timeout**: The script processes in small batches to avoid timeouts
- **Errors**: Failed items will be logged; you can re-run the script safely (it will overwrite existing entries)

### Safety

- The script is idempotent - you can run it multiple times safely
- It only reads from `Projects` and writes to `ProjectDirectory`
- No data is deleted or modified in the source table