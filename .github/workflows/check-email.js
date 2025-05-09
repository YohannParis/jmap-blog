const Imap = require('imap');
const simpleParser = require('simple-mail-parser');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// IMAP configuration from GitHub secrets
const imap = new Imap({
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASSWORD,
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

function createSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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
            
            const today = new Date().toISOString().split('T')[0];
            const slug = createSlug(title);
            const fileName = `${today}-${slug}.md`;
            const filePath = path.join('content', 'posts', fileName);
            
            // Ensure the directory exists
            await mkdir(path.join('content', 'posts'), { recursive: true });
            
            // Create markdown file with frontmatter
            const markdown = `---
title: "${title}"
date: ${today}
---

${content}
`;
            
            await writeFile(filePath, markdown);
            console.log(`Created post: ${filePath}`);
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
