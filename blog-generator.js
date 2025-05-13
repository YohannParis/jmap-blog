import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import * as kit from "./utils/kit/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Blog Post Generator using Kit language
 * Reads .kit files from posts/ directory and generates:
 * 1. Individual HTML pages for each post using template
 * 2. An index.html with links to all posts
 */
async function generateBlog() {
  try {
    // Create an output directory if it doesn't exist (or clean it if it exists)
    if (await fs.pathExists("build")) {
      console.log("Cleaning build directory...");
      await fs.emptyDir("build");
    } else {
      await fs.ensureDir("build");
    }

    // Ensure templates directory exists
    const templatesDir = path.join(__dirname, "templates");
    if (!(await fs.pathExists(templatesDir))) {
      console.error(
        "Templates directory not found. Please create a templates directory with post.kit and index.kit templates.",
      );
      return;
    }

    // Get all .kit files from the posts directory
    const postsDir = path.join(__dirname, "posts");
    await fs.ensureDir(postsDir); // Ensure the posts directory exists

    const postFiles = await fs.readdir(postsDir);
    const kitFiles = postFiles.filter(
      (file) =>
        path.extname(file).toLowerCase() === ".kit" && !file.startsWith("_"),
    ); // Exclude partial templates

    if (kitFiles.length === 0) {
      console.log("No .kit post files found in posts/ directory");
      return;
    }

    // Process each post file
    const postMetadata = [];

    for (const kitFile of kitFiles) {
      const inputPath = path.join(postsDir, kitFile);
      const postSlug = path.basename(kitFile, ".kit");

      // Read the post content to extract the title
      const postContent = await fs.readFile(inputPath, "utf8");
      const titleMatch = postContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
      const title =
        titleMatch && titleMatch[1] ? titleMatch[1].trim() : postSlug;

      // Get the file's creation date for sorting
      const stats = await fs.stat(inputPath);
      const date = new Date(stats.birthtime);

      // Add to metadata
      postMetadata.push({
        title,
        slug: postSlug,
        date,
        file: kitFile,
      });
    }

    // Sort posts by date (newest first)
    postMetadata.sort((a, b) => b.date - a.date);

    // Generate individual post pages using the template
    await generatePostPages(postMetadata);

    // Generate index.html
    await generateIndexPage(postMetadata);

    console.log("Blog generation complete!");
  } catch (error) {
    console.error("Error generating blog:", error);
  }
}

/**
 * Generates individual post pages using a template
 */
async function generatePostPages(posts) {
  const tempDir = path.join(__dirname, "temp");
  await fs.ensureDir(tempDir);

  for (const post of posts) {
    // Create a temporary Kit file for the post with variables
    const tempPostKit = path.join(tempDir, `${post.slug}_temp.kit`);

    // Set variables for the template
    let content = `<!--$postTitle ${post.title}-->\n`;
    content += `<!--$postFile ${post.file}-->\n`;

    // Include the post template
    content += `<!-- @import ../templates/post.kit -->`;

    // Write the temporary file
    await fs.writeFile(tempPostKit, content, "utf8");

    // Create a directory for the post (for clean URLs)
    const postDir = path.join(__dirname, "build", post.slug);
    await fs.ensureDir(postDir);

    // Compile the post to index.html inside the post directory
    const outputPath = path.join(postDir, "index.html");
    const result = await kit.compile(tempPostKit, outputPath);

    if (result.successful) {
      console.log(`Generated post: ${post.slug}/`);
    } else {
      console.error(`Error generating ${post.slug}/: ${result.resultMessage}`);
    }
  }

  // Clean up temp directory
  await fs.remove(tempDir);
}

/**
 * Generates the index.html file with links to all posts
 */
async function generateIndexPage(posts) {
  const tempDir = path.join(__dirname, "temp");
  await fs.ensureDir(tempDir);

  // Create a temporary index Kit file
  const tempIndexKit = path.join(tempDir, "index_temp.kit");

  // Generate the post-list HTML
  let postListHtml = "";
  posts.forEach((post) => {
    postListHtml += `<h2><a href="${post.slug}/">${post.title}</a></h2>\n`;
  });

  // Create the content with a variable
  let content = `<!--$postList ${postListHtml}-->\n`;
  content += `<!-- @import ../templates/index.kit -->`;

  // Write the temporary file
  await fs.writeFile(tempIndexKit, content, "utf8");

  // Compile the index
  const outputPath = path.join(__dirname, "build", "index.html");
  const result = await kit.compile(tempIndexKit, outputPath);

  if (result.successful) {
    console.log("Generated index.html");
  } else {
    console.error(`Error generating index.html: ${result.resultMessage}`);
  }

  // Clean up temp directory
  await fs.remove(tempDir);
}

// Run the generator
generateBlog().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
