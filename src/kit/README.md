# Kit Language Utility

A simple utility for processing the Kit templating language, which adds imports and variables to HTML.

## What is Kit?

[Created by CodeKit](https://codekitapp.com/help/kit/), Kit is a simple HTML templating language that adds two primary features:

1. **Imports** - Include other files
2. **Variables** - Define and use variables within your HTML

## Usage

```javascript
const kit = require("./utils/kit");

// Compile a Kit file to HTML
kit.compile("/path/to/input.kit", "/path/to/output.html").then((result) => {
  if (result.successful) {
    console.log("Compilation successful!");
  } else {
    console.error("Error:", result.resultMessage);
  }
});
```

### Options

```javascript
// With additional options
kit
  .compile("/path/to/input.kit", "/path/to/output.html", {
    frameworkFolders: ["/path/to/framework/templates"],
  })
  .then((result) => {
    console.log(result);
  });
```

## Kit Syntax

### Imports

Include other files:

```html
<!-- @import header.kit -->
<div class="content">Main content goes here</div>
<!-- @import footer.html -->
```

### Variables

Define and use variables:

```html
<!--$title My Awesome Page-->
<!DOCTYPE html>
<html>
  <head>
    <title><!--$title--></title>
  </head>
  <body>
    <h1><!--$title--></h1>
  </body>
</html>
```

## API

### `compile(inputPath, outputPath, options)`

Compiles a Kit file and writes the output to the specified path.

- `inputPath`: Path to the input Kit file
- `outputPath`: Path where the compiled file should be written
- `options`: Compilation options
  - `frameworkFolders`: Array of paths to look for imported files

Returns a Promise that resolves to an object with:

- `successful`: Boolean indicating success
- `resultMessage`: Message describing the result
- `outputPath`: Path to the output file (if successful)

### `KitCompiler`

The main compiler class that can be instantiated directly:

```javascript
const { KitCompiler } = require("./utils/kit");
const compiler = new KitCompiler({
  frameworkFolders: ["/path/to/frameworks"],
});

compiler.compile("/path/to/input.kit", "/path/to/output.html").then((result) => {
  console.log(result);
});
```
