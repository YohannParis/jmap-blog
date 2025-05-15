#!/usr/bin/env node
import dotenv from "dotenv";
import { createMarkdownFile } from './tomarkdown.js';

/**
 * Expands a URI template with the given parameters.
 *
 * [rfc6570](https://datatracker.ietf.org/doc/html/rfc6570)
 */
export function expandURITemplate(template,	params) {
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

dotenv.config();
if (!process.env.JMAP_TOKEN) {
  console.log("Please set your JMAP_TOKEN");
  process.exit(1);
}

// Get Session
const hostname = process.env.JMAP_HOSTNAME || "api.fastmail.com";
const authUrl = `https://${hostname}/.well-known/jmap`;
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.JMAP_TOKEN}`,
};
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
	console.error("No mailbox found with that name.");
	process.exit(1);
}

const mailbox_id = mailbox_response_data["methodResponses"][0][1]["ids"][0];

if (!mailbox_id) {
	console.error("Could not get an inbox.");
	process.exit(1);
}

// Get the emails
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
					filter: { inMailbox: mailbox_id },
					sort: [{ property: "receivedAt", isAscending: false }]
				},
				"a",
			],
			[
				"Email/get",
				{
					accountId: account_id,
					properties: ["id", "subject", "receivedAt", "htmlBody"],
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
for (const email of emails) {
	const title = email.subject;
	const date = email.receivedAt;

	const params = {
		accountId: account_id,
		blobId: email.htmlBody[0].blobId,
		type: email.htmlBody[0].type,
		name: email.htmlBody[0].name || 'body'
	};

	const url = expandURITemplate(download_url, params);
	const response = await fetch(url, {
		method: "GET",
		headers,
	});
	const body = await response.text();

	console.log(date, title);

	// Create a markdown file from the email data
	const filePath = await createMarkdownFile(title, date, body);
	console.log(`Created markdown file: ${filePath}`);
}
