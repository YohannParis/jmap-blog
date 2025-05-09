const Imap = require('imap');
const simpleParser = require('simple-mail-parser');
const { Octokit } = require('@octokit/rest');

// IMAP configuration from GitHub secrets
const imap = new Imap({
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASSWORD,
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

// GitHub setup
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const owner = process.env.GITHUB_REPO_OWNER;
const repo = process.env.GITHUB_REPO_NAME;

function openInbox(cb) {
  imap.openBox('INBOX', false, cb);
}

imap.once('ready', function() {
  openInbox(function(err, box) {
    if (err) throw err;
    
    // Search for unread emails
    imap.search(['UNSEEN'], function(err, results) {
      if (err) throw err;
      
      if (!results || !results.length) {
        console.log('No new emails');
        imap.end();
        return;
      }
      
      const fetch = imap.fetch(results, { bodies: '' });
      
      fetch.on('message', function(msg) {
        msg.on('body', function(stream) {
          simpleParser(stream, async (err, mail) => {
            if (err) {
              console.error(err);
              return;
            }
            
            const title = mail.subject;
            const content = mail.text || mail.html;
            
            if (!title || !content) {
              console.log('Missing title or content');
              return;
            }
            
            try {
              // Create a new GitHub issue with label 'blog-post'
              const response = await octokit.rest.issues.create({
                owner,
                repo,
                title,
                body: content,
                labels: ['blog-post']
              });
              
              console.log(`Created issue: ${response.data.html_url}`);
            } catch (error) {
              console.error('Failed to create issue:', error);
            }
          });
        });
      });
      
      fetch.once('end', function() {
        console.log('Done fetching emails');
        imap.end();
      });
    });
  });
});

imap.once('error', function(err) {
  console.error('IMAP error:', err);
});

imap.once('end', function() {
  console.log('IMAP connection ended');
});

imap.connect();
