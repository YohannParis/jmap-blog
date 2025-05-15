import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Set up paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const postsDir = path.join(__dirname, '..', 'posts');

/**
 * Creates a filename from the title and date
 * @param {string} title - The title
 * @param {string} date - ISO formatted date
 * @returns {string} A sanitized filename
 */
function createFilename(title, date) {
  // Extract just the date part from ISO string
  const datePart = date.split('T')[0];

  // Sanitize the title for use as a filename
  const sanitizedTitle = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')  // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .trim();

  return `${datePart}-${sanitizedTitle}.md`;
}

/**
 * Adds two spaces at the end of each non-empty line for proper markdown line breaks
 * @param {string} text - The input text
 * @returns {string} - Text with line breaks properly formatted for markdown
 */
function addLineBreaks(text) {
  // Each line that isn't empty should end with two spaces
  return text.split('\n')
    .map(line => line.trim() === '' ? '' : line.replace(/\s*$/, '  '))
    .join('\n');
}

/**
 * Creates a markdown file with the given title, date, and body using letterbox markdown standard
 * @param {string} title - The title
 * @param {string} date - ISO formatted date 
 * @param {string} body - The content body
 * @returns {string} Path to the created file
 */
export async function createMarkdownFile(title, date, body) {
  // Ensure posts directory exists
  await fs.ensureDir(postsDir);

  // Format date for display (YYYY-MM-DD format for letterbox standard)
  const formattedDate = date.split('T')[0];
  
  // Format the body with proper markdown line breaks
  const formattedBody = addLineBreaks(body);

  // Create the letterbox markdown content
  const content = `---
title: ${title}
date: ${formattedDate}
---

${formattedBody}`;

  // Generate filename
  const filename = createFilename(title, date);
  const filePath = path.join(postsDir, filename);

  // Write the file
  await fs.writeFile(filePath, content);

  return filePath;
}