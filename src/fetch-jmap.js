#!/usr/bin/env node
import dotenv from "dotenv";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

// Set up paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const postsJsonPath = path.join(__dirname, "..", "posts.json");

/**
 * Expands a URI template with the given parameters.
 *
 * [rfc6570](https://datatracker.ietf.org/doc/html/rfc6570)
 */
export function expandURITemplate(template, params) {
	let expanded = template;

	for (const [key, value] of Object.entries(params)) {
		const parameter = `{${key}}`;
		if (!expanded.includes(parameter)) {
			throw new Error(`Template "${template}" is missing parameter: ${key}`);
		}
		expanded = expanded.replaceAll(parameter, value);
	}

	return new URL(expanded);
}

/**
 * Adds two spaces at the end of each non-empty line for proper markdown line breaks
 * @param {string} text - The input text
 * @returns {string} - Text with line breaks properly formatted for markdown
 */
function addLineBreaks(text) {
	// Each line that isn't empty should end with two spaces
	return text
		.split("\n")
		.map((line) => (line.trim() === "" ? "" : line.replace(/\s*$/, "  ")))
		.join("\n");
}

/**
 * Creates a slug from the title
 * @param {string} title - The title
 * @returns {string} A sanitized slug
 */
function createSlug(title) {
	// Sanitize the title for use as a slug
	const sanitizedTitle = title
		.toLowerCase()
		.replace(/[^\w\s-]/g, "") // Remove special characters
		.replace(/\s+/g, "-") // Replace spaces with hyphens
		.trim();

	return sanitizedTitle;
}

/**
 * Loads the existing posts from posts.json, or returns an empty array if the file doesn't exist
 * @returns {Promise<Array>} Array of posts
 */
async function loadExistingPosts() {
	try {
		if (await fs.pathExists(postsJsonPath)) {
			const postsData = await fs.readFile(postsJsonPath, "utf8");
			return JSON.parse(postsData);
		}
	} catch (error) {
		console.error("Error reading posts.json:", error.message);
	}
	return [];
}

/**
 * Saves posts data to posts.json
 * @param {Array} posts - Array of post objects
 */
async function savePosts(posts) {
	try {
		await fs.writeFile(postsJsonPath, JSON.stringify(posts, null, 2), "utf8");
		console.log(`Saved posts.json with ${posts.length} posts`);
	} catch (error) {
		console.error("Error saving posts.json:", error.message);
	}
}

/**
 * Main function to fetch emails and update posts.json
 */
export async function fetchEmails() {
	dotenv.config();
	if (!process.env.JMAP_TOKEN) {
		throw new Error("Please set your JMAP_TOKEN");
	}

	// Get Session
	const hostname = process.env.JMAP_HOSTNAME || "api.fastmail.com";
	const authUrl = `https://${hostname}/.well-known/jmap`;
	const headers = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${process.env.JMAP_TOKEN}`,
	};

	console.log("Connecting to JMAP server...");
	const session_response = await fetch(authUrl, {
		method: "GET",
		headers,
	});
	const session = await session_response.json();
	const api_url = session.apiUrl;
	const download_url = session.downloadUrl;
	const account_id = session.primaryAccounts["urn:ietf:params:jmap:mail"];

	// Get the mailbox
	const mailbox_name = "Poems";
	console.log(`Looking for mailbox: ${mailbox_name}`);
	const mailbox_response = await fetch(api_url, {
		method: "POST",
		headers,
		body: JSON.stringify({
			using: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
			methodCalls: [
				[
					"Mailbox/query",
					{
						accountId: account_id,
						filter: { name: mailbox_name },
					},
					"a",
				],
			],
		}),
	});
	const mailbox_response_data = await mailbox_response.json();

	if (!mailbox_response_data["methodResponses"][0][1]["ids"] || !mailbox_response_data["methodResponses"][0][1]["ids"].length) {
		throw new Error(`No mailbox found with name: ${mailbox_name}`);
	}

	const mailbox_id = mailbox_response_data["methodResponses"][0][1]["ids"][0];

	if (!mailbox_id) {
		throw new Error("Could not get an inbox.");
	}

	// Get the emails
	console.log("Fetching emails...");
	const emails_response = await fetch(api_url, {
		method: "POST",
		headers,
		body: JSON.stringify({
			using: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
			methodCalls: [
				[
					"Email/query",
					{
						accountId: account_id,
						filter: {
							inMailbox: mailbox_id,
						},
						sort: [{ property: "receivedAt", isAscending: false }],
					},
					"a",
				],
				[
					"Email/get",
					{
						accountId: account_id,
						properties: ["id", "subject", "receivedAt", "htmlBody", "keywords"],
						"#ids": {
							resultOf: "a",
							name: "Email/query",
							path: "/ids/*",
						},
					},
					"b",
				],
			],
		}),
	});
	const emails_data = await emails_response.json();
	const emails = emails_data["methodResponses"][1][1]["list"];
	console.log(`Found ${emails.length} emails in the mailbox`);

	// Filter emails that don't have the $seen keyword
	const unseenEmails = emails.filter((email) => {
		// Check if the email has keywords and if $seen is NOT among them
		return !email.keywords || !email.keywords["$seen"];
	});

	console.log(`Processing ${unseenEmails.length} unseen emails`);

	// Load existing posts
	const existingPosts = await loadExistingPosts();

	// Process new emails
	for (const email of unseenEmails) {
		const email_id = email.id;
		const title = email.subject;
		const date = email.receivedAt;
		const formattedDate = date.split("T")[0];
		const slug = createSlug(title);

		const params = {
			accountId: account_id,
			blobId: email.htmlBody[0].blobId,
			type: email.htmlBody[0].type,
			name: email.htmlBody[0].name || "body",
		};

		const url = expandURITemplate(download_url, params);
		const body_response = await fetch(url, {
			method: "GET",
			headers,
		});
		const body = await body_response.text();

		console.log("\n———");
		console.log(date, title);

		// Format the body with proper markdown line breaks
		const formattedBody = addLineBreaks(body);

		// Create a post object
		const post = {
			title,
			date: formattedDate,
			content: formattedBody,
			slug,
		};

		// Check if post already exists (by slug), and update it if it does, otherwise add it
		const existingPostIndex = existingPosts.findIndex((p) => p.slug === slug);
		if (existingPostIndex >= 0) {
			existingPosts[existingPostIndex] = post;
			console.log(`Updated existing post: ${slug}`);
		} else {
			existingPosts.push(post);
			console.log(`Added new post: ${slug}`);
		}

		// Mark email as read
		const seen_response = await fetch(api_url, {
			method: "POST",
			headers,
			body: JSON.stringify({
				using: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
				methodCalls: [
					[
						"Email/set",
						{
							accountId: account_id,
							update: {
								[email_id]: {
									"keywords/$seen": true,
								},
							},
						},
						"c",
					],
				],
			}),
		});
		const seen_result = await seen_response.json();

		if (seen_result.methodResponses[0][0] === "Email/set") {
			console.log(`Marked email "${title}" as seen`);
		} else {
			console.error("Failed to mark email as seen:", seen_result);
		}
		console.log("———\n");
	}

	// Save updated posts
	await savePosts(existingPosts);

	return {
		totalEmails: emails.length,
		processedEmails: unseenEmails.length,
		totalPosts: existingPosts.length,
	};
}

// If this file is run directly, execute the fetchEmails function
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	fetchEmails().catch((err) => {
		console.error("Fatal error:", err);
		process.exit(1);
	});
}
