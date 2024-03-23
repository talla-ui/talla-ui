export enum TokenType {
	Keyword = 1,
	Symbol,
	String,
	Number,
	JSDoc,
}

export type TokenInfo = {
	type: TokenType;
	fileName: string;
	pos: number;
	spaceBefore: string;
	indent: string;
	line: number;
	col: number;
	content: string;
	jsdoc?: string;
};

const RE = {
	SPACE: /^\s+/,
	JSDOC: /^\/\*\*([^\*]|\*(?!\/))*\*\//,
	NUMBER: /^(?=[1-9]|0(?!\d))[_\d]+(\.\d+)?([eE][+-]?\d+)?/,
	NUMBER_HEX: /^0x[0-9A-F]+/,
	STRING1: /^\"(?:[^\\\"]+|\\["'\\bfnrt\/]|\\u[0-9a-f]{4})*\"/,
	STRING2: /^\'(?:[^\\\']+|\\["'\\bfnrt\/]|\\u[0-9a-f]{4})*\'/,
	STRING3: /^\`[^`]*\`/,
	KEYWORD: /^@?[a-zA-Z_$][\w$]*/,
	SYMBOL: /^(?:=>|\.\.\.|[\{\}\(\)\[\]\.:;,<>\?~!^\|\&%\/\*\-\+=])/,
};

export class Tokenizer {
	static locate(token?: TokenInfo) {
		if (!token) return "(unknown location)";
		return `(${token.fileName}:${token.line}:${token.col})`;
	}

	static toSource(tokens: TokenInfo[]) {
		let result = "";
		let firstIndent = tokens[0]?.indent || "";
		for (let token of tokens) {
			if (result && token.spaceBefore) {
				let lines = token.spaceBefore.split(/\r?\n/);
				if (lines.length > 1) {
					let indent = lines.pop();
					if (indent?.startsWith(firstIndent)) {
						indent = indent.slice(firstIndent.length);
					}
					result += "\n" + indent;
				} else {
					result += token.spaceBefore;
				}
			}
			result += token.content;
		}
		return result;
	}

	constructor(
		public fileName: string,
		public input: string,
	) {}

	tokenize() {
		let input = this.input;
		let orig = input;
		let tokens: TokenInfo[] = [];
		let pos = 0;
		let line = 1;
		let lastSpace = "";
		let lastIndent = "";
		let match: RegExpMatchArray | null;
		const update = (content: string, type?: TokenType) => {
			if (type) {
				tokens.push({
					pos,
					fileName: this.fileName,
					line,
					col: pos - orig.lastIndexOf("\n", pos),
					content,
					jsdoc:
						type === TokenType.JSDoc
							? this._getJSDocContent(content)
							: undefined,
					spaceBefore: lastSpace,
					indent: lastIndent,
					type,
				});
			}
			pos += content.length;
			line += content.split("\n").length - 1;
			input = input.slice(content.length);
			lastSpace = "";
		};
		while (input) {
			if ((match = input.match(RE.SPACE))) {
				let spaces = match[0];
				update(spaces);
				let lines = spaces.split(/\r?\n/);
				if (lines.length > 1) lastIndent = lines.pop()!;
				lastSpace += spaces;
			} else if ((match = input.match(RE.JSDOC))) {
				update(match[0], TokenType.JSDoc);
			} else if (
				(match = input.match(RE.NUMBER) || input.match(RE.NUMBER_HEX))
			) {
				update(match[0], TokenType.Number);
			} else if (
				(match =
					input.match(RE.STRING1) ||
					input.match(RE.STRING2) ||
					input.match(RE.STRING3))
			) {
				update(match[0], TokenType.String);
			} else if ((match = input.match(RE.KEYWORD))) {
				update(match[0], TokenType.Keyword);
			} else if ((match = input.match(RE.SYMBOL))) {
				update(match[0], TokenType.Symbol);
			} else {
				throw Error(
					"Unexpected token: " +
						input.slice(0, 3) +
						"... (" +
						this.fileName +
						":" +
						line +
						":" +
						(pos - orig.lastIndexOf("\n", pos)) +
						")",
				);
			}
		}

		return tokens;
	}

	private _getJSDocContent(jsdoc: string) {
		return (
			jsdoc.replace(/^\/\*\*\s*|\*\/$/g, "").replace(/^\s*\* ?/gm, "") + "\n"
		);
	}
}
