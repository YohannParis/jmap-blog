import fs from "fs-extra";
import path from "path";
import { tokenizeString } from "./tokenizer.js";

/**
 * KitCompiler class
 * Handles compilation of Kit files.
 */
class KitCompiler {
  constructor(options = {}) {
    this.version = "1.0.0";
    this.options = {
      frameworkFolders: [],
      ...options,
    };
  }

  /**
   * Compiles a Kit file.
   *
   * @param {string} filePath - Path to the Kit file
   * @param {string} outputPath - Path where the compiled file should be written
   * @returns {Promise<Object>} - Result of compilation
   */
  async compile(filePath, outputPath) {
    try {
      const result = await this.recursivelyCompileKitFile(filePath);

      if (result.successful && result.compiledCode) {
        await fs.writeFile(outputPath, result.compiledCode, "utf8");
        return {
          successful: true,
          resultMessage: result.resultMessage,
          outputPath,
        };
      } else {
        return result;
      }
    } catch (error) {
      return {
        successful: false,
        resultMessage: `Error compiling file: ${error.message}`,
      };
    }
  }

  /**
   * Recursively compiles a Kit file.
   *
   * @param {string} filePath - Path to the Kit file
   * @param {Object} variablesDict - Object containing variables
   * @param {Array} forbiddenImportPaths - Array of file paths that can't be imported
   * @returns {Promise<Object>} - Result of compilation
   */
  async recursivelyCompileKitFile(
    filePath,
    variablesDict = {},
    forbiddenImportPaths = [],
  ) {
    const result = {
      successful: false,
      resultMessage: "",
      compiledCode: "",
    };

    const fileName = path.basename(filePath);

    // Check for infinite import loops
    if (
      forbiddenImportPaths.some(
        (p) => p.toLowerCase() === filePath.toLowerCase(),
      )
    ) {
      result.resultMessage =
        "Error: infinite import loop detected. (e.g. File A imports File B, which imports File A.) You must fix this before the file can be compiled.";
      return result;
    }

    // Add current file to forbidden imports
    const newForbiddenPaths = [...forbiddenImportPaths, filePath];

    // Read and tokenize the file
    try {
      const inputCode = await fs.readFile(filePath, "utf8");
      const comps = tokenizeString(inputCode);

      if (!comps) {
        result.resultMessage = `Failed to tokenize ${fileName}. (Is the file UTF-8 encoded? Ensure it is not malformed.)`;
        return result;
      }

      let compiledCode = "";
      let lineCount = 1;

      // Process the tokens
      for (let currentComp = 0; currentComp < comps.length; currentComp++) {
        let compString = comps[currentComp];
        const commentStartIndex = compString.indexOf("<!--");

        if (commentStartIndex === -1) {
          // Not a special comment, just copy to output
          compiledCode += compString;

          // Count newlines
          if (compString.endsWith("\n") || compString.endsWith("\r")) {
            lineCount++;
          }
          continue;
        }

        // Handle text before comment start
        if (commentStartIndex > 0) {
          const prefix = compString.substring(0, commentStartIndex);
          compiledCode += prefix;
          compString = compString.substring(commentStartIndex);
        }

        // Check if this is a special comment (starts with $ or @)
        const isSpecialComment = this.isSpecialComment(
          compString,
          comps,
          currentComp,
        );

        if (!isSpecialComment) {
          compiledCode += compString;
          continue;
        }

        // Build the full special comment string
        let specialCommentString = compString;
        let specialCommentSuffix = "";
        let specialCommentComp = currentComp;

        // Find the end of the comment
        while (specialCommentComp < comps.length) {
          const commentCompString = comps[specialCommentComp];
          const commentEndIndex = commentCompString.lastIndexOf("-->");

          if (commentEndIndex !== -1) {
            // Check for text after comment end
            if (commentEndIndex + 3 < commentCompString.length) {
              const possibleSuffix = commentCompString.substring(
                commentEndIndex + 3,
              );
              if (!["\n", "\r\n", "\r"].includes(possibleSuffix)) {
                specialCommentSuffix = possibleSuffix;
              }
            }
            break;
          }

          specialCommentComp++;
          if (specialCommentComp < comps.length) {
            specialCommentString += comps[specialCommentComp];
          }
        }

        if (specialCommentString.indexOf("-->") === -1) {
          result.resultMessage = `Line ${lineCount} of ${fileName}: Found a Kit comment, but could not parse it into a full string. (Ensure that the file is UTF-8 encoded and not damaged.)`;
          return result;
        }

        // Parse the special comment for keyword and predicate
        const { keyword, predicate } =
          this.parseSpecialComment(specialCommentString);

        if (!keyword) {
          result.resultMessage = `Line ${lineCount} of ${fileName}: Unable to find an appropriate keyword (either "@import" or a variable name) in this Kit comment: ${specialCommentString}`;
          return result;
        }

        // Process the keyword
        if (keyword.toLowerCase() === "@import-partial") {
          // Handle variable import
          if (!variablesDict) {
            result.resultMessage = `Line ${lineCount} of ${fileName}: Missing variables dictionary for import-partial.`;
            return result;
          }

          const variableName = predicate.trim();
          if (!variablesDict[variableName]) {
            result.resultMessage = `Line ${lineCount} of ${fileName}: The variable ${variableName} is undefined.`;
            return result;
          }

          const importPath = path.join(
            process.cwd(),
            "posts",
            variablesDict[variableName],
          );

          try {
            const content = await fs.readFile(importPath, "utf8");
            compiledCode += content;
          } catch (error) {
            result.resultMessage = `Line ${lineCount} in ${fileName}: Cannot read file ${importPath}: ${error.message}`;
            return result;
          }
        } else if (
          keyword.toLowerCase() === "@import" ||
          keyword.toLowerCase() === "@include"
        ) {
          // Handle import
          if (!predicate) {
            result.resultMessage = `Line ${lineCount} of ${fileName}: Missing a filepath after the import/include keyword in this Kit comment: ${specialCommentString}`;
            return result;
          }

          // Support comma-separated import lists
          const imports = predicate.split(",");

          for (const importString of imports) {
            const cleanedImportString = this.pruneCommonImportSyntaxCharacters(
              importString.trim(),
            );
            let fullImportFilePath = this.resolveRelativePath(
              cleanedImportString,
              filePath,
            );

            // Add extension if missing
            if (!path.extname(fullImportFilePath)) {
              fullImportFilePath += ".kit";
            }

            // Try to find the file, possibly with or without underscore prefix
            const pathInfo = await this.findImportFile(fullImportFilePath);

            if (!pathInfo.found) {
              result.resultMessage = `Line ${lineCount} in ${fileName}: You're attempting to import a file that does not exist in the specified location: ${cleanedImportString}`;
              return result;
            }

            // Process the file based on its extension
            const extension = path.extname(pathInfo.path).toLowerCase();

            if (extension === ".kit") {
              // Recursively compile Kit file
              const importResult = await this.recursivelyCompileKitFile(
                pathInfo.path,
                variablesDict,
                newForbiddenPaths,
              );

              if (importResult.successful && importResult.compiledCode) {
                compiledCode += importResult.compiledCode;
              } else {
                return importResult;
              }
            } else {
              // Non-Kit file, just include the content
              try {
                const text = await fs.readFile(pathInfo.path, "utf8");
                compiledCode += text;
              } catch (error) {
                result.resultMessage = `Line ${lineCount} in ${fileName}: The imported file at this path does not exist or is unreadable: ${pathInfo.path}`;
                return result;
              }
            }
          }
        } else {
          // Handle variable
          if (predicate) {
            // Assign variable
            variablesDict[keyword] = predicate;
          } else {
            // Use variable
            const insert = variablesDict[keyword];

            if (insert) {
              compiledCode += insert;
            } else {
              result.resultMessage = `Line ${lineCount} of ${fileName}: The variable ${keyword} is undefined.`;
              return result;
            }
          }
        }

        // Add suffix if any
        if (specialCommentSuffix) {
          compiledCode += specialCommentSuffix;
        }

        // Count newlines in the special comment
        const newlineCount = (specialCommentString.match(/\n/g) || []).length;
        lineCount += newlineCount;

        // Skip processed components
        currentComp = specialCommentComp;
      }

      result.compiledCode = compiledCode;
      result.successful = true;
      result.resultMessage = "Compiled successfully.";
      return result;
    } catch (error) {
      result.resultMessage = `Error processing file ${fileName}: ${error.message}`;
      return result;
    }
  }

  /**
   * Checks if a comment is a special Kit comment.
   *
   * @param {string} compString - Current component string
   * @param {Array} comps - All components
   * @param {number} currentComp - Current component index
   * @returns {boolean} - Whether this is a special comment
   */
  isSpecialComment(compString, comps, currentComp) {
    // Test for comments without spaces: <!--@import, <!--$var
    if (compString.length >= 6) {
      const keyChar = compString.charAt(4);
      const peekChar = compString.charAt(5);

      if ((keyChar === "$" || keyChar === "@") && /[a-zA-Z]/.test(peekChar)) {
        return true;
      }
    }

    // Test for comments WITH spaces: <!-- @import, <!-- $var
    let testComp = currentComp;
    while (testComp + 1 < comps.length) {
      testComp++;
      const testString = comps[testComp];

      if (testString.length > 1) {
        const firstChar = testString.charAt(0);

        if (firstChar === "\t" || firstChar === " ") {
          continue;
        } else if (firstChar === "$" || firstChar === "@") {
          const peekChar = testString.charAt(1);
          return /[a-zA-Z]/.test(peekChar);
        }
        break;
      }
    }

    return false;
  }

  /**
   * Parses a special comment for its keyword and predicate.
   *
   * @param {string} commentString - The full comment string
   * @returns {Object} - Object with keyword and predicate
   */
  parseSpecialComment(commentString) {
    // Extract content between <!-- and -->
    const commentContent = commentString
      .substring(
        commentString.indexOf("<!--") + 4,
        commentString.lastIndexOf("-->"),
      )
      .trim();

    // Find the key character ($ or @)
    const keyCharIndex = Math.min(
      commentContent.indexOf("$") === -1
        ? Infinity
        : commentContent.indexOf("$"),
      commentContent.indexOf("@") === -1
        ? Infinity
        : commentContent.indexOf("@"),
    );

    if (keyCharIndex === Infinity) {
      return { keyword: null, predicate: null };
    }

    // Extract the keyword
    let keywordEnd = keyCharIndex;
    for (let i = keyCharIndex + 1; i < commentContent.length; i++) {
      const char = commentContent.charAt(i);

      if (
        char === " " ||
        char === "=" ||
        char === "\t" ||
        char === ":" ||
        char === "-"
      ) {
        if (char === "-" && i + 2 < commentContent.length) {
          const next1 = commentContent.charAt(i + 1);
          const next2 = commentContent.charAt(i + 2);

          if (next1 === "-" && next2 === ">") {
            break;
          }
        } else {
          keywordEnd = i;
          break;
        }
      }
      keywordEnd = i + 1;
    }

    const keyword = commentContent.substring(keyCharIndex, keywordEnd);

    // Extract the predicate
    let predicate = null;
    if (keywordEnd < commentContent.length) {
      const predicateStart = commentContent
        .substring(keywordEnd)
        .search(/[^\s=:]+/);

      if (predicateStart !== -1) {
        let predicateContent = commentContent.substring(
          keywordEnd + predicateStart,
        );

        // Remove trailing whitespace
        predicate = predicateContent.trim();
      }
    }

    return { keyword, predicate };
  }

  /**
   * Clean up common syntax characters from import paths.
   *
   * @param {string} importString - The import string to clean
   * @returns {string} - Cleaned import string
   */
  pruneCommonImportSyntaxCharacters(importString) {
    return importString
      .replace(/^\s*['"]/, "") // Remove leading quotes
      .replace(/['"]\s*$/, "") // Remove trailing quotes
      .trim();
  }

  /**
   * Resolve a relative path against a base path.
   *
   * @param {string} relativePath - The relative path
   * @param {string} basePath - The base path
   * @returns {string} - Resolved path
   */
  resolveRelativePath(relativePath, basePath) {
    const baseDir = path.dirname(basePath);
    return path.resolve(baseDir, relativePath);
  }

  /**
   * Find an import file, considering underscore prefixes.
   *
   * @param {string} filePath - The file path to find
   * @returns {Promise<Object>} - Object with found status and path
   */
  async findImportFile(filePath) {
    // Try exact path first
    try {
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        return { found: true, path: filePath };
      }
    } catch (e) {
      // File not found, continue to alternatives
    }

    // Try with/without underscore prefix
    const dirname = path.dirname(filePath);
    const filename = path.basename(filePath);
    let alternateFilename;

    if (filename.startsWith("_")) {
      alternateFilename = filename.substring(1);
    } else {
      alternateFilename = "_" + filename;
    }

    const alternatePath = path.join(dirname, alternateFilename);

    try {
      const stats = await fs.stat(alternatePath);
      if (stats.isFile()) {
        return { found: true, path: alternatePath };
      }
    } catch (e) {
      // Alternate file not found
    }

    // Check in framework folders
    for (const folder of this.options.frameworkFolders) {
      // Try exact filename
      const frameworkPath = path.join(folder, filename);
      try {
        const stats = await fs.stat(frameworkPath);
        if (stats.isFile()) {
          return { found: true, path: frameworkPath };
        }
      } catch (e) {
        // Continue to next option
      }

      // Try alternate filename
      const alternateFrameworkPath = path.join(folder, alternateFilename);
      try {
        const stats = await fs.stat(alternateFrameworkPath);
        if (stats.isFile()) {
          return { found: true, path: alternateFrameworkPath };
        }
      } catch (e) {
        // Continue to next option
      }
    }

    return { found: false, path: filePath };
  }

  /**
   * Get the version of the compiler.
   *
   * @returns {string} - Version string
   */
  getVersion() {
    return this.version;
  }
}

export default KitCompiler;
