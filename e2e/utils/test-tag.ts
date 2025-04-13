/**
 * test-tag.ts
 * Utility for creating standardized test IDs for e2e tests
 *
 * Usage:
 * ```
 * import { createTestTag, setTestRunTimestamp } from '../utils/test-tag';
 *
 * // At the beginning of the test run (e.g., global-setup.ts)
 * setTestRunTimestamp();
 *
 * // In each test file
 * const testTag = createTestTag('auth', 'login');
 * // Use testTag for screenshots, artifacts, etc.
 * ```
 */

import fs from 'fs';
import path from 'path';

// File where the global timestamp is stored
const TIMESTAMP_FILE = path.join(process.cwd(), 'test-results', 'latest', 'test-run-timestamp.txt');

// Make sure the directory exists
const timestampDir = path.dirname(TIMESTAMP_FILE);
if (!fs.existsSync(timestampDir)) {
  fs.mkdirSync(timestampDir, { recursive: true });
}

/**
 * Generate a timestamp for this test run
 * Format: YYYYMMDD-HHMMSS (e.g., 20230501-143022)
 */
export function generateTimestamp(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

/**
 * Set the global timestamp for the current test run
 * This should be called once at the beginning of the test run (e.g., in global-setup.ts)
 * @returns The generated timestamp
 */
export function setTestRunTimestamp(): string {
  const timestamp = generateTimestamp();

  // Save to file so other tests can access it
  fs.writeFileSync(TIMESTAMP_FILE, timestamp);

  return timestamp;
}

/**
 * Get the current test run timestamp
 * If not set, generates a new one and saves it
 */
export function getTestRunTimestamp(): string {
  try {
    if (fs.existsSync(TIMESTAMP_FILE)) {
      return fs.readFileSync(TIMESTAMP_FILE, 'utf8').trim();
    }
  } catch (error) {
    console.warn('Error reading test run timestamp, generating a new one:', error);
  }

  // If no timestamp exists, create one
  return setTestRunTimestamp();
}

/**
 * Create a standardized test tag combining component type, test type, and the global timestamp
 *
 * @param componentType Type of component being tested (e.g., 'auth', 'recipe', 'profile')
 * @param testType Type of test being performed (e.g., 'login', 'create', 'delete')
 * @param customIdentifier Optional additional identifier for the test
 * @returns A formatted test tag string
 */
export function createTestTag(
  componentType: string,
  testType: string,
  customIdentifier?: string
): string {
  // Sanitize inputs to ensure they're safe for filenames
  const sanitize = (input: string): string => input.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();

  const sanitizedComponent = sanitize(componentType);
  const sanitizedTestType = sanitize(testType);
  const sanitizedCustomId = customIdentifier ? `-${sanitize(customIdentifier)}` : '';

  // Get the global timestamp for this test run
  const timestamp = getTestRunTimestamp();

  // Combine all parts into a standardized format
  return `${sanitizedComponent}.${sanitizedTestType}${sanitizedCustomId}_${timestamp}`;
}

/**
 * Create a filename with the test tag embedded
 * Useful for screenshots, videos, etc.
 *
 * @param baseFilename Base filename without extension
 * @param testTag Test tag from createTestTag
 * @param extension File extension (default: '.png')
 * @returns Formatted filename with test tag
 */
export function createTaggedFilename(
  baseFilename: string,
  testTag: string,
  extension: string = '.png'
): string {
  const sanitizedBase = baseFilename.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
  return `${sanitizedBase}-${testTag}${extension}`;
}

/**
 * Parse a test tag to extract its components
 * Useful for analyzing/filtering test results
 *
 * @param testTag A test tag created with createTestTag
 * @returns Object with parsed components
 */
export function parseTestTag(testTag: string): {
  componentType: string;
  testType: string;
  customIdentifier?: string;
  timestamp: string;
} {
  const parts = testTag.split('_');
  const timestamp = parts[1] || '';

  const testParts = parts[0].split('.');
  const componentType = testParts[0] || '';

  const testTypeAndCustom = testParts[1] || '';
  const customSplit = testTypeAndCustom.split('-');

  const testType = customSplit[0] || '';
  const customIdentifier = customSplit.length > 1 ? customSplit.slice(1).join('-') : undefined;

  return {
    componentType,
    testType,
    customIdentifier,
    timestamp
  };
}
