import KitCompiler from "./compiler.js";
import { tokenizeString } from "./tokenizer.js";

/**
 * Compiles a Kit file and writes the output to the specified path.
 *
 * @param {string} inputPath - Path to the input Kit file
 * @param {string} outputPath - Path where the compiled file should be written
 * @param {Object} options - Compilation options
 * @returns {Promise<Object>} - Result of compilation
 */
async function compile(inputPath, outputPath, options = {}) {
	const compiler = new KitCompiler(options);
	return compiler.compile(inputPath, outputPath);
}

/**
 * Compiles a Kit string and returns the result.
 *
 * @param {string} content - The Kit content to compile
 * @param {string} basePath - Base path for resolving imports
 * @param {Object} options - Compilation options
 * @returns {Promise<string>} - Compiled content
 */
async function compileString(content, basePath, options = {}) {
	const compiler = new KitCompiler(options);
	const result = {
		successful: false,
		resultMessage: "",
		compiledCode: "",
	};

	try {
		const comps = tokenizeString(content);
		if (!comps) {
			result.resultMessage = "Failed to tokenize content.";
			return result;
		}

		// Create a temporary variable dictionary
		const variablesDict = {};

		// Process the tokens similar to recursivelyCompileKitFile
		// This is simplified and would need to be expanded for full functionality
		let compiledCode = "";
		for (const comp of comps) {
			compiledCode += comp;
		}

		result.compiledCode = compiledCode;
		result.successful = true;
		result.resultMessage = "Compiled successfully.";
		return result;
	} catch (error) {
		result.resultMessage = `Error compiling string: ${error.message}`;
		return result;
	}
}

export { compile, compileString, KitCompiler, tokenizeString };
