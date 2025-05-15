import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import * as kit from "./utils/kit/index.js";
import matter from "gray-matter";
import { marked } from "marked";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Blog Post Generator
 * Reads .md files from posts/ directory and generates:
 * 1. Individual HTML pages for each post using Kit templates
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
			console.error("Templates directory not found. Please create a templates directory with post.kit and index.kit templates.");
			return;
		}

		// Get all .md files from the posts directory
		const postsDir = path.join(__dirname, "posts");
		await fs.ensureDir(postsDir); // Ensure the posts directory exists

		const postFiles = await fs.readdir(postsDir);
		const markdownFiles = postFiles.filter((file) => path.extname(file).toLowerCase() === ".md");

		if (markdownFiles.length === 0) {
			console.log("No .md post files found in posts/ directory");
			return;
		}

		// Process each post file
		const postMetadata = [];

		for (const markdownFile of markdownFiles) {
			const inputPath = path.join(postsDir, markdownFile);
			const postSlug = path.basename(markdownFile, ".md");

			// Read the post content to extract frontmatter
			const postContent = await fs.readFile(inputPath, "utf8");
			const { data, content } = matter(postContent);

			// Extract title and date from frontmatter
			const title = data.title || postSlug;
			const date = data.date ? new Date(data.date) : new Date();

			// Add to metadata
			postMetadata.push({
				title,
				slug: postSlug,
				date,
				file: markdownFile,
				content,
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
		try {
			// Convert markdown to HTML
			const htmlContent = marked(post.content);

			// Create a simple template file with variables
			const tempKitFile = path.join(tempDir, `${post.slug}_template.kit`);

			// Set the variables directly in the template
			const kitContent = `<!--$postTitle ${post.title}-->
<!--$postContent ${htmlContent}-->
<!-- @import ../templates/post.kit -->`;

			await fs.writeFile(tempKitFile, kitContent, "utf8");

			// Create output directory for the post
			const outputDir = path.join(__dirname, "build", post.slug);
			await fs.ensureDir(outputDir);

			// Compile the post to index.html
			const outputPath = path.join(outputDir, "index.html");
			const result = await kit.compile(tempKitFile, outputPath);

			if (result.successful) {
				console.log(`Generated post: ${post.slug}/`);
			} else {
				console.error(`Error generating ${post.slug}/: ${result.resultMessage}`);
			}
		} catch (error) {
			console.error(`Error processing post ${post.slug}:`, error);
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
		const formattedDate = post.date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});

		postListHtml += `<div class="post-item">
      <h2><a href="${post.slug}/">${post.title}</a></h2>
    </div>\n`;
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
}

// Run the generator
generateBlog().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
