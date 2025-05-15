#!/usr/bin/env node

/**
 * Complete workflow script for poem-blog
 * Handles both email fetching and static site generation
 */
import { fetchEmails } from "./src/fetch-jmap.js";
import { generateBlog } from "./src/build-site.js";

async function runWorkflow() {
  console.log("🔍 Starting the poem-blog workflow...");
  
  try {
    // Step 1: Fetch new emails and update posts.json
    console.log("\n📧 Fetching new emails...");
    await fetchEmails();
    
    // Step 2: Build the static site
    console.log("\n🏗️ Building the static site...");
    await generateBlog();
    
    console.log("\n✨ Workflow completed successfully!");
    console.log("The static site has been generated in the 'build' directory");
  } catch (error) {
    console.error("❌ Workflow failed:", error);
    process.exit(1);
  }
}

// Run the workflow
runWorkflow();
