import dotenv from "dotenv";
import Imap from "imap";
import { simpleParser } from "mailparser";
import { Octokit } from "@octokit/rest";

// GitHub setup
const octokit = new Octokit({ auth: process.env.PAT_TOKEN });
const owner = process.env.GITHUB_REPO_OWNER;
const repo = process.env.GITHUB_REPO_NAME;

// Array to store all processed emails
const processedEmails = [];

// Counter to track email processing
let pendingEmails = 0;
let fetchEnded = false;

// Create a GitHub issue with the label 'blog-post'
const createIssue = async (title, body) => {
	try {
		const response = await octokit.rest.issues.create({
			owner,
			repo,
			title,
			body,
			labels: ["blog-post"],
		});

		console.log(`Created issue for ${title}: ${response.data.html_url}`);
	} catch (error) {
		console.error(`Failed to create issue for ${title}:`, error);
		process.exit(1);
	}
};

// Function to check if all processing is complete
function checkAllProcessed() {
	if (fetchEnded && pendingEmails === 0) {
		finishProcessing();
	}
}

// Function to finalize processing and write GitHub issues for all processed emails
async function finishProcessing() {
	for (const email of processedEmails) {
		await createIssue(email.subject, email.body);
	}
	console.log("Script execution complete");
	process.exit(0);
}

function endImap() {
	imap.end();
	console.log("IMAP connection ended");
}

function endImapSuccessfully() {
	endImap();
	fetchEnded = true;
	checkAllProcessed();
}

function endImapWithError(message) {
	console.error(message);
	endImap();
	process.exit(1);
}

function parseEmail(error, mail) {
	if (error) {
		console.error("Failed to parse email: " + error);
		return;
	}

	// Extract email data
	const emailData = {
		subject: mail.subject || "Untitled",
		body: mail.text || mail.html || "No content",
		from: mail.from?.text || "",
		date: mail.date?.toISOString() || new Date().toISOString(),
		messageId: mail.messageId || "",
	};

	// Store the email data in memory
	processedEmails.push(emailData);
	console.log(`Email "${emailData.subject}" processed successfully`);
}

function onMessage(message, _) {
	console.log("Message received");
	pendingEmails++;

	// Get the UID of the message
	let uid;
	message.once("attributes", (attrs) => {
		uid = attrs.uid;
	});

	// Parse the email
	message.on("body", (stream, _) => {
		let buffer = "";

		stream.on("data", (chunk) => {
			buffer += chunk.toString("utf8");
		});

		stream.once("end", () => {
			simpleParser(buffer, (err, mail) => {
				if (err) {
					console.error("Error parsing email:", err);
				} else {
					parseEmail(err, mail);
				}
				pendingEmails--;
				checkAllProcessed();
			});
		});
	});
}

function unreadEmails(err, results) {
	if (err) {
		endImapWithError("Failed to search emails: " + err);
		return;
	}

	if (!results || !results.length) {
		console.log("No new emails");
		endImapSuccessfully();
		return;
	}

	console.log(`Found ${results.length} unread email(s)`);

	// Fetch the emails
	const fetch = imap.fetch(results, { bodies: "" });

	// Add event listeners
	fetch.on("message", onMessage);
	fetch.once("error", (error) => endImapWithError("Fetch error: " + error));
	fetch.once("end", () => {
		console.log("All messages fetched");
		endImapSuccessfully();
	});
}

function onMailbox(err, _) {
	if (err) {
		endImapWithError("Failed to open mailbox: " + err);
		return;
	}

	console.log("Mailbox opened");

	// Search for unread emails
	imap.search(["UNSEEN"], unreadEmails);
}

function isReady() {
	console.log("IMAP is ready");
	imap.openBox("Archive/Poems", true, onMailbox);
}

dotenv.config();
const imap = new Imap({
	user: process.env.EMAIL_USER,
	password: process.env.EMAIL_PASSWORD,
	host: process.env.EMAIL_HOST,
	port: parseInt(process.env.EMAIL_PORT) || 993,
	tls: true,
	tlsOptions: { rejectUnauthorized: false },
	keepalive: false,
});

imap.once("ready", isReady);
imap.once("error", endImapWithError);
imap.connect();
