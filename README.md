# JMAP Blog

A minimalist blog for publishing via emails. 
This project offers a simple workflow by using a JMAP mailbox as CMS, and make it a simple static website.

## How It Works

1. Send a post to your email account (with JMAP support)
2. The app fetches emails from a designated mailbox
3. Each post is processed and stored in a `posts.json` file
4. A static site is generated with [JS port of the .kit language](https://codekitapp.com/help/kit/)
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
3. Copy `.env.default` file into `.env` and fill it

## Usage

There are several ways to run the application:

### Local Development

- `npm start` - Run the complete workflow (fetch emails → build site → generate RSS)
- `npm run fetch` - Fetch new emails and create `posts.json`
- `npm run build` - Build the static site from `posts.json`
- `npm run rss` - Generate the RSS feed from `posts.json`

### GitHub Actions Workflow

The project includes a GitHub Actions workflow that:

- Runs on a schedule or can be triggered manually
- Fetches all posts from your mailbox
- Builds the static site
- Generate the RSS feed
- Deploys to GitHub Pages

## Configuration

- **Email Settings**: Add your JMAP token and Mailbox name to the `.env` file
- **Site Settings**: Configure site URL, title, and email in the `.env` file
- **Styling**: Edit the [.kit templates](https://codekitapp.com/help/kit/) in the `templates/` directory 
- **Schedule**: Modify the cron schedule in `.github/workflows/emails-to-deploy.yml`

## Requirements

- Node.js 20+
- An email account with JMAP support
- A GitHub repository (for GitHub Pages deployment only)

## License

MIT License
