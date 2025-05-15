import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import * as kit from "./kit/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

/**
 * Blog Post Generator
 * Reads posts.json file and generates:
 * 1. Individual HTML pages for each post using Kit templates
 * 2. An index.html with links to all posts
 */
async function generateBlog() {
	try {
		// Create an output directory if it doesn't exist (or clean it if it exists)
		const buildDir = path.join(rootDir, "build");
		if (await fs.pathExists(buildDir)) {
			console.log("Cleaning build directory...");
			await fs.emptyDir(buildDir);
		} else {
			await fs.ensureDir(buildDir);
		}

		// Clean up any existing temp directory
		const tempDir = path.join(rootDir, "temp");
		if (await fs.pathExists(tempDir)) {
			await fs.remove(tempDir);
		}

		// Ensure templates directory exists
		const templatesDir = path.join(rootDir, "templates");
		if (!(await fs.pathExists(templatesDir))) {
			console.error("Templates directory not found. Please create a templates directory with post.kit and index.kit templates.");
			return;
		}

		// Check if posts.json exists
		const postsJsonPath = path.join(rootDir, "posts.json");
		if (!(await fs.pathExists(postsJsonPath))) {
			console.log("posts.json not found. Run 'npm run fetch' to generate posts from emails.");
			return;
		}

		// Read and parse posts.json
		const postsData = await fs.readFile(postsJsonPath, "utf8");
		let posts = JSON.parse(postsData);

		if (posts.length === 0) {
			console.log("No posts found in posts.json");
			return;
		}

		// Process each post
		const processedPosts = posts.map(post => {
			return {
				...post,
				date: new Date(post.date)
			};
		});

		// Sort posts by date (newest first)
		processedPosts.sort((a, b) => b.date - a.date);

		// Generate individual post pages using the template
		await generatePostPages(processedPosts);

		// Generate index.html
		await generateIndexPage(processedPosts);

		console.log("Blog generation complete!");
	} catch (error) {
		console.error("Error generating blog:", error);
	} finally {
		// Final cleanup of temp directory
		const tempDir = path.join(rootDir, "temp");
		if (await fs.pathExists(tempDir)) {
			await fs.remove(tempDir);
		}
	}
}

/**
 * Generates individual post pages using a template
 */
async function generatePostPages(posts) {
	const tempDir = path.join(rootDir, "temp", "posts");
	await fs.ensureDir(tempDir);

	try {
		for (const post of posts) {
			try {
				// Format the content with paragraph tags for proper HTML display
				const paragraphs = post.content.split("\n\n");
				const htmlContent = paragraphs
					.map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`)
					.join("\n");

				// Create a simple template file with variables
				const tempKitFile = path.join(tempDir, `${post.slug}_template.kit`);

				// Set the variables directly in the template
				const kitContent = `<!--$postTitle ${post.title}-->
<!--$postContent ${htmlContent}-->
<!-- @import ../../templates/post.kit -->`;

				await fs.writeFile(tempKitFile, kitContent, "utf8");

				// Create output directory for the post
				const outputDir = path.join(rootDir, "build", post.slug);
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
	} finally {
		// Clean up temp directory
		await fs.remove(tempDir);
	}
}

/**
 * Generates the index.html file with links to all posts
 */
async function generateIndexPage(posts) {
	const tempDir = path.join(rootDir, "temp", "index");
	await fs.ensureDir(tempDir);

	try {
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
		content += `<!-- @import ../../templates/index.kit -->`;

		// Write the temporary file
		await fs.writeFile(tempIndexKit, content, "utf8");

		// Compile the index
		const outputPath = path.join(rootDir, "build", "index.html");
		const result = await kit.compile(tempIndexKit, outputPath);

		if (result.successful) {
			console.log("Generated index.html");
		} else {
			console.error(`Error generating index.html: ${result.resultMessage}`);
		}
	} finally {
		// Clean up temp directory
		await fs.remove(tempDir);
	}
}

// If this file is run directly, run the generator
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	generateBlog().catch((err) => {
		console.error("Fatal error:", err);
		process.exit(1);
	});
}

// Export for use as a module
export { generateBlog };