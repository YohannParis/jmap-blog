import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const postsJsonPath = path.join(rootDir, "posts.json");
const buildDir = path.join(rootDir, "build");

/**
 * Generates an RSS feed from the posts data
 * @param {Array} posts - Array of post objects
 * @param {string} siteUrl - The base URL of the site
 * @param {string} siteTitle - The title of the site
 * @returns {string} - The RSS XML content
 */
export function generateRSSContent(posts, siteUrl, siteTitle) {
	// Ensure URL ends with a slash
	if (!siteUrl.endsWith("/")) {
		siteUrl += "/";
	}

	// Create RSS header
	let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <atom:link href="${escapeXml(siteUrl)}rss.xml" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
`;

	// Add each post as an item
	for (const post of posts) {
		const postDate = new Date(post.date);
		const pubDate = postDate.toUTCString();
		const postUrl = `${siteUrl}${post.slug}/`;

		rss += `    <item>
      <title>${escapeXml(post.title)}</title>
      <description>${escapeXml(post.content)}</description>
      <pubDate>${pubDate}</pubDate>
      <link>${escapeXml(postUrl)}</link>
      <guid isPermaLink="true">${escapeXml(postUrl)}</guid>
    </item>
`;
	}

	// Close the RSS feed
	rss += `  </channel>
</rss>`;

	return rss;
}

/**
 * Escapes XML special characters
 * @param {string} text - The text to escape
 * @returns {string} - Escaped text
 */
function escapeXml(text) {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/**
 * Reads posts.json and generates an RSS feed
 */
export async function generateRSSFeed() {
	dotenv.config();

	try {
		// Ensure build directory exists
		await fs.ensureDir(buildDir);

		// Check if posts.json exists
		if (!(await fs.pathExists(postsJsonPath))) {
			console.log("posts.json not found. Run 'npm run fetch' to generate posts from emails.");
			return;
		}

		// Read and parse posts.json
		const postsData = await fs.readFile(postsJsonPath, "utf8");
		const posts = JSON.parse(postsData);

		if (posts.length === 0) {
			console.log("No posts found in posts.json");
			return;
		}

		// Process posts with proper date objects
		const processedPosts = posts.map((post) => ({
			...post,
			date: new Date(post.date),
		}));

		// Sort posts by date (newest first)
		processedPosts.sort((a, b) => b.date - a.date);

		// Generate RSS content
		const rssContent = generateRSSContent(processedPosts, process.env.SITE_URL, process.env.SITE_TITLE);

		// Write RSS feed to build directory
		const rssOutputPath = path.join(buildDir, "rss.xml");
		await fs.writeFile(rssOutputPath, rssContent, "utf8");
		console.log(`RSS feed written to ${rssOutputPath}`);

		return {
			totalPosts: processedPosts.length,
			rssPath: rssOutputPath,
		};
	} catch (error) {
		console.error("Error generating RSS feed:", error);
	}
}

// If this file is run directly, execute the generateRSSFeed function
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	generateRSSFeed().catch((err) => {
		console.error("Fatal error:", err);
		process.exit(1);
	});
}
