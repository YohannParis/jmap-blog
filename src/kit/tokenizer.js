/**
 * Tokenizes a string based on spaces, tabs and newlines.
 *
 * @param {string} inputString - The string to tokenize
 * @returns {Array} - Array of tokens
 */
function tokenizeString(inputString) {
	if (!inputString) return [];

	const result = [];
	let buffer = "";

	for (let i = 0; i < inputString.length; i++) {
		const currentChar = inputString[i];
		const nextChar = inputString[i + 1];

		buffer += currentChar;

		let shouldSplit = false;

		// Split on space, tab, and LF
		if (currentChar === " " || currentChar === "\t" || currentChar === "\n") {
			shouldSplit = true;
		}
		// Split on CR only if not immediately followed by LF
		else if (currentChar === "\r" && nextChar !== "\n") {
			shouldSplit = true;
		}
		// Split on '>' if immediately followed by '<'
		else if (currentChar === ">" && nextChar === "<") {
			shouldSplit = true;
		}

		// Split at the end of the string too
		if (shouldSplit || i === inputString.length - 1) {
			result.push(buffer);
			buffer = "";
		}
	}

	return result;
}

export { tokenizeString };
