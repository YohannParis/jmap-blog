/**
 * Entry point for the blog generator
 * This file simply imports and runs the build-site.js module.
 */
import { generateBlog } from "./utils/build-site.js";

// Run the generator
generateBlog().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
