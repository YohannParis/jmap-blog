# Blog Generator using Kit Language

This example demonstrates how to create a simple static blog generator using the Kit templating language with an improved template-based approach.

## Features

- Clean separation of content and presentation
- Posts contain only title and content (minimal boilerplate)
- Single post template used for all posts
- Generates individual HTML pages for each post
- Creates an `index.html` with links to all posts, sorted by date
- Extracts post titles from H1 tags
- Automatically includes shared components and styles
- Preserves line breaks in poems by automatically adding `<br>` tags

## Project Structure

```
/Kit-master/
  ├── blog-generator.js       # The generator script
  ├── utils/                  # Utility modules
  │   └── kit/                # Kit language utility
  │       ├── index.js        # Main module interface
  │       ├── compiler.js     # Kit compiler implementation
  │       ├── tokenizer.js    # String tokenizer for Kit files
  │       └── README.md       # Kit utility documentation
  ├── posts/                  # Post content files
  │   ├── hello-world.kit     # Just contains <h1> and <article>
  │   └── using-kit-variables.kit
  └── templates/              # Templates and shared components
      ├── post.kit            # Main post template
      ├── index.kit           # Index page template
      ├── _header-styles.kit  # Shared styles
      ├── _navbar.kit         # Shared navigation
      └── _footer.kit         # Shared footer
```

## Getting Started

### 1. Install Dependencies

Make sure you have the fs-extra package:

```bash
npm install fs-extra
```

### 2. Create Post Content

Create post files in the `posts/` directory. Each post should only contain the title and content:

```html
<h1>Hello World</h1>
<article>
  <p>This is my first blog post using Kit language!</p>
  <p>Kit allows me to:</p>
  <ul>
    <li>Use variables like the title</li>
    <li>Import shared components</li>
    <li>Create templates efficiently</li>
  </ul>
</article>
```

For poems with line breaks, simply write each line separately within the article tag:

```html
<h1>My Poem</h1>
<article>
  Line one of the poem,
  Line two with a different thought,
  Line three concludes it.
</article>
```

The system will automatically add `<br>` tags to preserve line breaks in poems.

### 3. Set Up Templates

Create templates in the `templates/` directory:

1. **post.kit** - Main template for individual post pages:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--$postTitle-->
  <title><!--$postTitle--> | My Blog</title>
  <!-- @import _header-styles.kit -->
</head>
<body>
  <!-- @import _navbar.kit -->
  
  <div class="container">
    <!-- @import ../posts/<!--$postFile--> -->
  </div>

  <!-- @import _footer.kit -->
</body>
</html>
```

2. **index.kit** - Template for the index page:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Blog</title>
  <!-- @import _header-styles.kit -->
  <style>
    .post-list { list-style: none; padding: 0; }
    .post-item { margin-bottom: 1.5rem; }
    .post-date { color: #666; font-size: 0.9rem; }
  </style>
</head>
<body>
  <!-- @import _navbar.kit -->
  
  <div class="container">
    <header>
      <h1>My Blog</h1>
    </header>
    <main>
      <ul class="post-list">
        <!--$postList-->
      </ul>
    </main>
  </div>

  <!-- @import _footer.kit -->
</body>
</html>
```

### 4. Run the Blog Generator

Execute the blog generator script:

```bash
node blog-generator.js
```

This will:
1. Read all content files from the `posts/` directory
2. Extract metadata like titles from the H1 tags
3. Use the post template to generate individual HTML files
4. Create an index.html with links to all posts

## How It Works

The blog generator uses a two-step process:

1. **Metadata Extraction**:
   - Scans the posts directory for .kit files
   - Extracts the title from the H1 tag
   - Gathers file metadata like dates

2. **Post Generation**:
   - Creates temporary Kit files that set variables for the templates
   - Uses the post template to create individual HTML files
   - Uses the index template to create the index page

## The Template-Based Approach

The main advantage of this approach is:

1. **Minimized Boilerplate** - Post files only contain the essential content
2. **Consistent Styling** - All presentation is defined in templates
3. **Easy Updates** - Change the template once to update all posts
4. **Separation of Concerns** - Content is separate from presentation

## Customization

You can customize the blog generator by:

1. Modifying the templates to change the site's appearance
2. Adding more metadata extraction in the main loop
3. Adding categories or tags support
4. Implementing pagination for larger blogs

## Example Output Structure

After running the generator, your `build/` directory will look like:

```
build/
  index.html
  hello-world.html
  using-kit-variables.html
```

Where `index.html` contains links to all your posts, and each post has its own HTML file.