# JMAP Blog

A minimalist blog for publishing via email. This project offers a simple workflow for turning emails into a simple static website.

## How It Works

1. Send a post to your email account (with JMAP support)
2. The app fetches emails from a designated "Poems" mailbox
3. Each post is processed and stored in a `posts.json` file
4. A static site is generated with a clean, typography-focused design
5. An RSS feed is created at `/rss.xml` for easy subscription

## Project Structure

```
jmap-blog/
├── .github/workflows/     # GitHub Actions workflow
├── build/                 # Generated static site (not tracked in git)
├── src/                   # Source code
│   ├── kit/               # Custom templating engine
│   ├── build-site.js      # Static site generator
│   ├── fetch-jmap.js      # Email fetching module
│   └── generate-rss.js    # RSS feed generator
├── templates/             # HTML templates
│   ├── index.kit          # Homepage template
│   ├── post.kit           # Post template
│   └── styles.kit         # CSS styling
├── .env                   # Environment configuration (not in git)
├── index.js               # Main workflow script
├── package.json           # Project dependencies
└── posts.json             # Poem data storage (not in git)
```

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your `JMAP_TOKEN`

## Usage

There are several ways to run the application:

### Local Development

- `npm start` - Run the complete workflow (fetch emails → build site → generate RSS)
- `npm run fetch` - Only fetch new emails and update posts.json
- `npm run build` - Only build the static site from posts.json
- `npm run rss` - Only generate the RSS feed from posts.json

### GitHub Actions Workflow

The project includes a GitHub Actions workflow that:

- Runs on a schedule or can be triggered manually
- Fetches all posts from your email folder
- Builds the static site
- Deploys to GitHub Pages

## Configuration

- **Email Settings**: Add your JMAP token and Mailbox name to the `.env` file
- **Site Settings**: Configure site URL, title, and email in the `.env` file for the RSS feed
- **Styling**: Edit the templates in the `templates/` directory
- **Schedule**: Modify the cron schedule in `.github/workflows/emails-to-deploy.yml`

## Requirements

- Node.js 20+
- An email account with JMAP support
- A GitHub repository (for GitHub Pages deployment only)

## License

MIT License
