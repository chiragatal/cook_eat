# Testing Against Preview Deployment

This document describes how to run tests against the preview deployment instead of the production environment.

## Preview Deployment Information

- **Preview URL**: [https://cook-eat-preview.vercel.app](https://cook-eat-preview.vercel.app)
- **Preview Database**: `postgres://neondb_owner:npg_kq7msfjdbL1i@ep-aged-bird-a1wn6ara-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`

## Quick Start

We've added npm scripts to make it easy to run tests against the preview deployment:

```bash
# Set up the preview database and run all tests
npm run test:preview:setup

# Run tests against the preview deployment without database setup
npm run test:preview

# Run tests with UI mode against preview
npm run test:preview:ui

# Run tests only in Chrome browser against preview
npm run test:preview:chrome

# View the latest test results in your browser
npm run test:preview:view-latest
```

## Manual Setup

If you need more control, you can run the commands separately:

### 1. Set up the preview database

This will reset the preview database and prepare it for testing:

```bash
npm run setup-preview-db
```

### 2. Run tests against the preview URL

```bash
TEST_BASE_URL=https://cook-eat-preview.vercel.app npm run test:e2e
```

## Test Results

All test results are now organized in date-stamped folders for easier tracking and review:

```
test-results/
├── 2023-05-14T13-45-22/  # Date and time of test run
│   ├── reports/          # HTML test reports
│   ├── screenshots/      # Screenshot artifacts
│   ├── videos/           # Video recordings
│   └── traces/           # Trace files for debugging
├── 2023-05-15T09-30-15/
└── latest/               # Symlink to the most recent test run
```

### Accessing Test Results

You can easily access the latest test results using:

```bash
npm run test:preview:view-latest
```

Or browse to any specific test run folder in the `test-results` directory to view the full test artifacts.

## Configuration Files

The preview deployment settings are configured in these files:

- `.env.test` - Contains the TEST_BASE_URL pointing to the preview deployment
- `scripts/setup-preview-db.js` - Contains the preview database connection string
- `package.json` - Contains scripts for running tests against preview
- `playwright.config.ts` - Configures the date-stamped output folders

## Important Notes

- The preview database setup will **reset the database**, so be careful if there's data you want to preserve
- Always use the preview environment for testing new features before they go to production
- The preview database is separate from the production database to prevent test data from affecting production users
- Test results are preserved in date-stamped folders for historical comparison
