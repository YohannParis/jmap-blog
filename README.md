# Blog Generator using Kit Language

This example demonstrates how to create a simple static blog generator using the Kit templating language with an improved template-based approach.

## Getting Started

### 1. Install Dependencies

```bash
npm install
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

For poems with line breaks, write each line separately within the article tag:

```html
<h1>My Poem</h1>
<article>
  Line one of the poem, 
  Line two with a different thought, 
  Line three concludes it.
</article>
```

The system will automatically add `<br>` tags to preserve line breaks in poems.

### 3. Run the Blog Generator

Execute the blog generator script:

```bash
npm run build
```

This will:

1. Read all content files from the `posts/` directory
2. Extract metadata like titles from the H1 tags
3. Use the post template to generate individual HTML files
4. Create an index.html with links to all posts

After running the generator, your `build/` directory will look like:

```
build/
  index.html
  hello-world.html
  using-kit-variables.html
```

Where `index.html` contains links to all your posts, and each post has its own HTML file.
