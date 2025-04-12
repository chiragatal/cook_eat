# Testing Against Preview Deployment

This document describes how to run tests against the preview deployment.

## Testing Configuration

All tests are now configured to run against the preview deployment by default:

- **Preview URL**: [https://cook-eat-preview.vercel.app](https://cook-eat-preview.vercel.app)
- **Preview Database**: `postgres://neondb_owner:npg_kq7msfjdbL1i@ep-aged-bird-a1wn6ara-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`

## Running Tests

We've simplified the testing process to always use the preview deployment:

```bash
# Run all tests
npm run test:e2e

# Run tests with UI mode
npm run test:e2e:ui

# Run tests in specific browsers
npm run test:e2e:chrome
npm run test:e2e:firefox
npm run test:e2e:safari
npm run test:e2e:mobile
```

### Preview Authentication

If your Vercel preview deployment is password-protected, you'll need to provide authentication credentials:

1. Add your Vercel credentials to the `.env.test` file:
   ```
   VERCEL_EMAIL=your.email@example.com
   VERCEL_PASSWORD=your-vercel-password
   ```

2. Alternatively, you can perform manual authentication when prompted during the global setup.

## Test Results

All test results are now organized in date-stamped folders for easier tracking and review:

```
test-results/
├── 2023-05-14T13-45-22/  # Date and time of test run
│   ├── html-report/      # HTML test reports
│   ├── artifacts/        # Test artifacts folder
│   │   ├── screenshots/  # Screenshot artifacts
│   │   │   ├── debug/    # Debug screenshots
│   │   │   └── failures/ # Failure screenshots
│   │   ├── videos/       # Video recordings
│   │   └── traces/       # Trace files for debugging
│   └── summary.txt       # Test summary file
├── 2023-05-15T09-30-15/
└── latest/               # Symlink to the most recent test run
```

### Accessing Test Results

You can easily access the latest test results using:

```bash
# View the HTML report
npm run test:view-latest

# View the screenshots
npm run test:view-screenshots

# List all test result directories
npm run test:list-results
```

## Environment Variables

The following environment variables control the testing behavior:

| Variable | Description |
|----------|-------------|
| `TEST_RESULTS_DIR` | Set by `setup-test-results-dir.js` to indicate where test results should be stored |
| `PLAYWRIGHT_SCREENSHOTS` | Set to `on` to force screenshots for all test steps |
| `PLAYWRIGHT_VIDEO` | Set to `on` to record video for all tests |
| `PWDEBUG` | Set to `1` to enable Playwright debug mode |
| `VERCEL_EMAIL` | Your Vercel email (optional, for preview authentication) |
| `VERCEL_PASSWORD` | Your Vercel password (optional, for preview authentication) |

## Troubleshooting

If you're experiencing issues with screenshots or test artifacts:

1. Run the environment verification script:
   ```bash
   npm run test:verify-env
   ```

2. Run a debug test to check if screenshots are captured:
   ```bash
   npm run test:debug-run
   ```

3. Check that directories exist:
   ```bash
   ls -la test-results/latest/artifacts/screenshots
   ```

4. Review logs to see if there are any errors related to file permissions or directory creation.

### Vercel Login Issues

If you see the "Log in to Vercel" page during tests:

1. Add your Vercel credentials to `.env.test`:
   ```
   VERCEL_EMAIL=your.email@example.com
   VERCEL_PASSWORD=your-vercel-password
   ```

2. Check that the Vercel preview deployment is accessible (it should be configured as public in vercel.json)

## Error Handling

The test setup has been improved to handle database issues gracefully:

- Missing tables are now handled properly during database cleanup
- Any tables that don't exist in the schema are skipped without causing test failures
- The setup will continue even if database tables don't exist, allowing UI tests to run
- Error logs are clearer and provide more context

## Directory Structure Improvements

- Test results are now separated from artifacts to avoid conflicts
- HTML reports are kept in a separate directory from test artifacts
- Screenshots, videos and traces are stored in the artifacts directory with proper subdirectories
- The directory structure prevents the HTML reporter from clearing artifacts
- A single date-stamped directory is created for each test run to avoid multiple directories
- All test files now properly use the environment variable for test results directory

## Configuration Files

The preview deployment settings are configured in these files:

- `.env.test` - Contains the DATABASE_URL setting and other environment variables
- `scripts/setup-preview-db.js` - Contains the preview database connection string
- `scripts/setup-test-results-dir.js` - Sets up the directory structure and environment variable
- `scripts/verify-test-env.js` - Verifies the test environment is set up correctly
- `package.json` - Contains scripts for running tests
- `playwright.config.ts` - Uses the hard-coded preview URL
- `e2e/setup/test-database.ts` - Handles test database setup and cleanup with error handling
- `e2e/screenshot-test.spec.ts` - Simple test to verify screenshot functionality
- `e2e/global-setup.ts` - Handles authentication for preview testing

## Important Notes

- The preview database setup will **reset the database**, so be careful if there's data you want to preserve
- The preview database is separate from the production database to prevent test data from affecting production users
- Test results are preserved in date-stamped folders for historical comparison
- Screenshots and videos are now enabled by default in the test scripts
