#!/usr/bin/env node

/**
 * Complete workflow script
 * Handles email fetching, static site generation, and RSS feed creation
 */
import { fetchEmails } from "./src/fetch-jmap.js";
import { generateBlog } from "./src/build-site.js";
import { generateRSSFeed } from "./src/generate-rss.js";

async function runWorkflow() {
	console.log("Starting workflow...");

	try {
		// Step 1: Fetch new emails and update posts.json
		console.log("\nStep 1: Fetching new emails...");
		await fetchEmails();

		// Step 2: Build the static site
		console.log("\nStep 2: Building the static site...");
		await generateBlog();

		// Step 3: Generate RSS feed
		console.log("\nStep 3: Generating RSS feed...");
		await generateRSSFeed();

		console.log("\nWorkflow completed successfully!");
		console.log("The static site has been generated in the 'build' directory");
	} catch (error) {
		console.error("Workflow failed:", error);
		process.exit(1);
	}
}

// Run the workflow
runWorkflow();
