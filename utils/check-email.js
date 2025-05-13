import Imap from "imap";
import { simpleParser } from "mailparser";
import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";

// Load environment variables from .env file if running locally
// This won't override existing environment variables from GitHub Actions
dotenv.config();

// IMAP configuration from GitHub secrets
const imap = new Imap({
	user: process.env.EMAIL_USER,
	password: process.env.EMAIL_PASSWORD,
	host: process.env.EMAIL_HOST,
	port: process.env.EMAIL_PORT,
	tls: true,
	tlsOptions: { rejectUnauthorized: false },
});

// GitHub setup
const octokit = new Octokit({ auth: process.env.PAT_TOKEN });
const owner = process.env.GITHUB_REPO_OWNER;
const repo = process.env.GITHUB_REPO_NAME;

function openMailbox(cb) {
	imap.openBox("Archive/Poems", false, cb);
}

imap.once("ready", function () {
	openMailbox(function (err, box) {
		if (err) throw err;

		// Search for unread emails
		imap.search(["UNSEEN"], function (err, results) {
			if (err) throw err;

			if (!results || !results.length) {
				console.log("No new emails");
				imap.end();
				return;
			}

			const fetch = imap.fetch(results, { bodies: "", markSeen: false });

			// Keep track of emails that were successfully processed
			const processedEmails = [];

			fetch.on("message", function (msg, seqno) {
				let uid;
				
				// Get the UID of the message
				msg.once('attributes', function(attrs) {
					uid = attrs.uid;
				});
				
				msg.on("body", function (stream) {
					simpleParser(stream, async (err, mail) => {
						if (err) {
							console.error(err);
							return;
						}

						const title = mail.subject || "Untitled";
						const body = mail.text || mail.html || "No content";

						try {
							// Create a new GitHub issue with label 'blog-post'
							const response = await octokit.rest.issues.create({
								owner,
								repo,
								title,
								body,
								labels: ["blog-post"],
							});

							console.log(`Created issue: ${response.data.html_url}`);
							
							// Add this email to the list of successfully processed emails
							if (uid) processedEmails.push(uid);
						} catch (error) {
							console.error("Failed to create issue:", error);
						}
					});
				});
			});

			fetch.once("end", function () {
				console.log("Done fetching emails");
				
				// Mark successfully processed emails as seen
				if (processedEmails.length > 0) {
					const uidBatch = processedEmails.join(',');
					imap.addFlags(uidBatch, '\\Seen', (err) => {
						if (err) {
							console.error('Error marking emails as read:', err);
						} else {
							console.log(`Marked ${processedEmails.length} emails as read`);
						}
						imap.end();
					});
				} else {
					imap.end();
				}
			});
		});
	});
});

imap.once("error", function (err) {
	console.error("IMAP error:", err);
});

imap.once("end", function () {
	console.log("IMAP connection ended");
});

imap.connect();
