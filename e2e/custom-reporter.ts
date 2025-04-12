import { FullConfig, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

/**
 * Custom reporter that collects and embeds all screenshots taken during a test
 */
class CustomReporter implements Reporter {
  private screenshotsDir: string;

  constructor() {
    this.screenshotsDir = path.join(process.cwd(), 'test-results', 'screenshots');
  }

  onBegin(config: FullConfig, suite: Suite) {
    console.log('Starting tests with custom screenshot reporter enabled');
  }

  async onTestEnd(test: TestCase, result: TestResult) {
    try {
      // Approach 1: Use test metadata files
      const testMetadata = await this.findTestMetadataForTest(test.title);
      let screenshots: string[] = [];

      if (testMetadata) {
        // If we have metadata, use it to find all screenshots for this test
        console.log(`Found metadata for test: ${test.title}`);
        screenshots = await this.findScreenshotsByTestId(testMetadata.testId);
      } else {
        // Fallback: use test name as search pattern
        const testNamePattern = test.title.split(' ').join('-').toLowerCase();
        screenshots = await this.findScreenshotsByPattern(testNamePattern);
      }

      // Attach found screenshots to the test result
      if (screenshots.length > 0) {
        console.log(`Found ${screenshots.length} screenshots for test: ${test.title}`);

        // Add all screenshots as attachments
        for (const screenshotPath of screenshots) {
          // Extract relevant information from the path
          const filename = path.basename(screenshotPath);

          // Try to get better metadata from the corresponding metadata file
          const metadataFile = screenshotPath.replace('.png', '.json');
          let description = filename;

          if (fs.existsSync(metadataFile)) {
            try {
              const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
              description = metadata.label || filename;
            } catch (error) {
              // Ignore metadata parsing errors
            }
          }

          // Add as attachment
          result.attachments.push({
            name: `Screenshot: ${description}`,
            contentType: 'image/png',
            path: screenshotPath,
          });
        }
      } else {
        console.log(`No screenshots found for test: ${test.title}`);
      }
    } catch (error) {
      console.error('Error in custom reporter:', error);
    }
  }

  /**
   * Find test metadata by test title
   */
  private async findTestMetadataForTest(testTitle: string): Promise<any> {
    // Create search patterns based on test title
    const testNamePattern = testTitle.split(' ').join('-').toLowerCase();
    const metadataFiles = await glob(path.join(this.screenshotsDir, '**', `*${testNamePattern}*-metadata.json`));

    if (metadataFiles.length > 0) {
      try {
        // Use the first matching metadata file
        const metadata = JSON.parse(fs.readFileSync(metadataFiles[0], 'utf8'));
        return metadata;
      } catch (error) {
        console.error('Error parsing metadata file:', error);
      }
    }

    return null;
  }

  /**
   * Find screenshots by test ID from the metadata
   */
  private async findScreenshotsByTestId(testId: string): Promise<string[]> {
    // First find all the metadata files for this test ID
    const metadataFiles = await glob(path.join(this.screenshotsDir, '**', '*.json'));
    const screenshots: string[] = [];

    // Go through the metadata files and extract screenshot paths
    for (const metadataFile of metadataFiles) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));

        // Check if this metadata belongs to our test
        if (metadata.testId === testId && metadata.screenshotPath) {
          // Convert to absolute path if it's relative
          let screenshotPath = metadata.screenshotPath;
          if (!path.isAbsolute(screenshotPath)) {
            screenshotPath = path.join(process.cwd(), screenshotPath);
          }

          // Add if the file exists
          if (fs.existsSync(screenshotPath)) {
            screenshots.push(screenshotPath);
          }
        }
      } catch (error) {
        // Ignore metadata parsing errors
      }
    }

    // Sort screenshots by their creation time
    return this.sortScreenshotsByTimestamp(screenshots);
  }

  /**
   * Find screenshots by name pattern
   */
  private async findScreenshotsByPattern(pattern: string): Promise<string[]> {
    // Try different patterns to catch screenshots
    // First, check for exact match on test name
    let screenshots = await glob(path.join(this.screenshotsDir, '**', `*${pattern}*.png`));

    if (screenshots.length === 0) {
      // If no screenshots found by exact test name, try to extract key words from the test name
      // Split the test name into words and try each as a pattern
      const words = pattern.split('-').filter(word => word.length > 3);

      for (const word of words) {
        const wordScreenshots = await glob(path.join(this.screenshotsDir, '**', `*${word}*.png`));
        screenshots = [...screenshots, ...wordScreenshots];

        // If we found some screenshots, stop searching
        if (screenshots.length > 0) {
          break;
        }
      }
    }

    // If still no screenshots found, check common categories
    if (screenshots.length === 0) {
      const commonCategories = ['e2e', 'auth', 'recipe', 'complete-journey'];

      for (const category of commonCategories) {
        const categoryScreenshots = await glob(path.join(this.screenshotsDir, category, '*.png'));
        screenshots = [...screenshots, ...categoryScreenshots];

        // If we found some screenshots with this category, stop searching
        if (screenshots.length > 0) {
          break;
        }
      }
    }

    // Just return all screenshots if nothing else works
    if (screenshots.length === 0) {
      console.log(`No screenshots found for pattern ${pattern}, fetching all screenshots as fallback`);
      screenshots = await glob(path.join(this.screenshotsDir, '**', '*.png'));
      // Limit to most recent 20 screenshots to avoid overwhelming the report
      screenshots = screenshots.slice(0, 20);
    }

    // Remove duplicates
    screenshots = [...new Set(screenshots)];

    // Sort them by timestamp
    return this.sortScreenshotsByTimestamp(screenshots);
  }

  /**
   * Sort screenshots by their timestamps in filenames
   */
  private sortScreenshotsByTimestamp(screenshots: string[]): string[] {
    return screenshots.sort((a, b) => {
      // Extract timestamp from filename if it exists
      const timestampA = a.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
      const timestampB = b.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);

      if (timestampA && timestampB) {
        return timestampA[0].localeCompare(timestampB[0]);
      }

      // Fallback to simple filename comparison
      return a.localeCompare(b);
    });
  }
}

export default CustomReporter;
