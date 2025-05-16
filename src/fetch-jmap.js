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
	return title
		.toLowerCase()
		.replace(/[^\w\s-]/g, "") // Remove special characters
		.replace(/\s+/g, "-") // Replace spaces with hyphens
		.trim();
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
	if (!process.env.JMAP_TOKEN || !process.env.MAILBOX) {
		throw new Error("Please set your JMAP_TOKEN and/or MAILBOX");
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
	const mailbox_name = process.env.MAILBOX;
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

	console.log(`Processing ${emails.length} emails in the mailbox`);

	// Create a new array to store all posts
	const allPosts = [];

	// Process all emails
	for (const email of emails) {
		const title = email.subject;
		const slug = createSlug(title);
		const formattedDate = email.receivedAt.split("T")[0];

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

		console.log(formattedDate, title);

		// Format the body with proper Markdown line breaks
		const formattedBody = addLineBreaks(body);

		// Create a post object and add it to allPosts
		allPosts.push({
			title,
			date: formattedDate,
			content: formattedBody,
			slug,
		});
	}

	// Save all posts to posts.json
	await savePosts(allPosts);

	return {
		totalEmails: emails.length,
		totalPosts: allPosts.length,
	};
}

// If this file is run directly, execute the fetchEmails function
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	fetchEmails().catch((err) => {
		console.error("Fatal error:", err);
		process.exit(1);
	});
}
