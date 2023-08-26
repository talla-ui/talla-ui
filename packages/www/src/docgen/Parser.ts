import { DocGenOptions } from "./DocGenOptions.js";
import { TokenInfo, TokenType, Tokenizer } from "./Tokenizer.js";

const MODIFIER_KEYWORDS = [
	"declare",
	"readonly",
	"static",
	"private",
	"public",
	"protected",
	"abstract",
];

export enum NodeType {
	Type,
	TypeList,
	TypeParams,
	TypeParamsDefinition,
	ParamsDefinition,
	BodyMembers,
	PropertyDefinition,
	MethodDefinition,
	GlobalVar,
	TypeDefinition,
	ClassDefinition,
	Namespace,
	Root,
	Export,
	Import,
}

export type ParsedNode = {
	type: NodeType;
	name?: string;
	jsdoc?: string;
	signature?: string;
	modifiers?: string[];
	extendsNames?: string[];
	paramNames?: string[];
	nodes?: ParsedNode[];
};

type ParseResult =
	| undefined
	| {
			next: number;
			node: ParsedNode;
	  };

export class Parser {
	constructor(
		public input: ReadonlyArray<TokenInfo>,
		public options: DocGenOptions
	) {}

	parse() {
		let result = this.expectDefinitions();
		if (!result) throw Error("Parser stopped");
		if (result.next < this.input.length) {
			let token = this.input[result.next];
			throw Error(
				"Unexpected token: " + token?.content + " " + Tokenizer.locate(token)
			);
		}
		return result.node;
	}

	expectDefinitions(cur = 0): ParseResult {
		this._log(cur, "expectDefinitions");

		let members: ParsedNode[] = [];
		while (cur < this.input.length) {
			let parsedDefinition = this.expectDefinition(cur);
			if (!parsedDefinition) break;
			members.push(parsedDefinition.node);
			cur = parsedDefinition.next;
		}

		if (!members) return this._throwParseError(cur);
		return this._accept(cur, {
			type: NodeType.Root,
			nodes: members,
		});
	}

	expectDefinition(cur: number): ParseResult {
		this._log(cur, "expectDefinition");

		// read JSDoc first
		let jsdoc = this.expectToken(cur, TokenType.JSDoc);
		if (jsdoc) cur++;

		// read modifiers
		let modifiers: TokenInfo[] = [];
		let token: TokenInfo | undefined;
		while ((token = this.expectToken(cur, TokenType.Keyword))) {
			if (!MODIFIER_KEYWORDS.includes(token.content)) break;
			modifiers.push(token);
			cur++;
		}

		// check for different types of definitions
		let parsedDefinition =
			this.expectNamespace(cur) ||
			this.expectClassDefinition(cur) ||
			this.expectGlobalDefinition(cur);
		if (!parsedDefinition) return;
		parsedDefinition.node.jsdoc = jsdoc?.jsdoc;
		parsedDefinition.node.modifiers = [
			...(parsedDefinition.node.modifiers || []),
			...modifiers.map((m) => m.content),
		];
		return parsedDefinition;
	}

	expectGlobalDefinition(cur: number): ParseResult {
		this._log(cur, "expectGlobalDefinition");

		let keyword = this.input[cur]?.content;
		if (keyword === "type") {
			let start = cur++;
			if (!this.expectToken(cur, TokenType.Keyword))
				return this._throwParseError(cur, "type identifier");
			let name = this.input[cur]!.content;
			cur++;

			let parsedTypeParams = this.expectTypeParamsDefinition(cur);
			if (parsedTypeParams) cur = parsedTypeParams.next;

			if (this.expectToken(cur, TokenType.Symbol, "=")) {
				cur++;
				let parsedType = this.expectType(cur);
				if (!parsedType) return this._throwParseError(cur, "type");
				cur = parsedType.next;
			}
			let signature = Tokenizer.toSource(this.input.slice(start, cur));

			if (!this.expectToken(cur, TokenType.Symbol, ";"))
				return this._throwParseError(cur, "semicolon");
			cur++;

			return this._accept(cur, {
				type: NodeType.TypeDefinition,
				name,
				signature,
			});
		}

		if (keyword === "enum") {
			let start = cur++;
			if (!this.expectToken(cur, TokenType.Keyword))
				return this._throwParseError(cur, "enum identifier");
			let name = this.input[cur]!.content;
			cur++;

			if (this.expectToken(cur, TokenType.Symbol, "{")) {
				cur++;
				let parsedTypes = this.expectTypeList(cur);
				if (!parsedTypes) return this._throwParseError(cur, "type");
				cur = parsedTypes.next;
			}

			if (!this.expectToken(cur, TokenType.Symbol, "}"))
				return this._throwParseError(cur, "}");
			cur++;
			let signature = Tokenizer.toSource(this.input.slice(start, cur));

			return this._accept(cur, {
				type: NodeType.TypeDefinition,
				name,
				signature,
			});
		}

		if (keyword === "const" || keyword === "let" || keyword === "function") {
			cur++;

			let parsedDef = this.expectMethod(cur) || this.expectPropertyMember(cur);
			if (!parsedDef) return this._throwParseError(cur, "variable or function");
			cur = parsedDef.next;

			if (!this.expectToken(cur, TokenType.Symbol, ";"))
				return this._throwParseError(cur, "semicolon");
			cur++;

			return this._accept(cur, { ...parsedDef.node, type: NodeType.GlobalVar });
		}

		if (keyword === "export") {
			// check if exporting a global/namespaced definition
			let parsedDef = this.expectDefinition(cur + 1);
			if (parsedDef) return parsedDef;

			// ...continue below if `export *` or `export { ... }`
			if (
				!this.expectToken(cur + 1, TokenType.Symbol, "*") &&
				!this.expectToken(cur + 1, TokenType.Symbol, "{")
			)
				return this._throwParseError(cur + 1, "* or {");
		}
		if (keyword === "import" || keyword === "export") {
			// ignore everything until semicolon
			cur++;
			while (
				cur < this.input.length &&
				!this.expectToken(cur, TokenType.Symbol, ";")
			)
				cur++;
			return this._accept(cur + 1, {
				type: keyword === "import" ? NodeType.Import : NodeType.Export,
			});
		}
	}

	expectNamespace(cur: number): ParseResult {
		this._log(cur, "expectNamespace");

		let keyword = this.input[cur]?.content;
		if (keyword !== "namespace") return;
		if (!this.expectToken(cur + 1, TokenType.Keyword)) return;
		let name = this.input[cur + 1]!.content;
		let start = cur;
		cur += 2;

		// parse body and its definitions
		if (!this.expectToken(cur, TokenType.Symbol, "{"))
			return this._throwParseError(cur, "namespace body");
		let signature = Tokenizer.toSource(this.input.slice(start, cur));
		cur++;

		let parsedBody = this.expectDefinitions(cur);
		if (!parsedBody) return this._throwParseError(cur, "namespace body");
		cur = parsedBody.next;

		if (!this.expectToken(cur, TokenType.Symbol, "}"))
			return this._throwParseError(cur, "}");
		cur++;

		return this._accept(cur, {
			type: NodeType.Namespace,
			name,
			signature,
			nodes: parsedBody.node.nodes,
		});
	}

	expectClassDefinition(cur: number): ParseResult {
		this._log(cur, "expectClassDefinition");

		let keyword = this.input[cur]?.content;
		if (keyword !== "class" && keyword !== "interface") return;
		if (!this.expectToken(cur + 1, TokenType.Keyword)) return;
		let name = this.input[cur + 1]!.content;
		let start = cur;
		cur += 2;

		// parse optional type parameters
		let parsedTypeParams = this.expectTypeParamsDefinition(cur);
		if (parsedTypeParams) cur = parsedTypeParams.next;
		let signature = Tokenizer.toSource(this.input.slice(start, cur));

		// parse optional extends/implements clause
		let extendsNames: string[] = [];
		while (
			this.expectToken(cur, TokenType.Keyword, "extends") ||
			this.expectToken(cur, TokenType.Keyword, "implements")
		) {
			let parsedType = this.expectType(cur + 1);
			if (!parsedType) return this._throwParseError(cur, "extends type");
			extendsNames.push(
				Tokenizer.toSource(this.input.slice(cur, parsedType.next))
			);
			cur = parsedType.next;
		}

		// parse body and its members
		let parsedBody = this.expectBody(cur);
		if (!parsedBody) return this._throwParseError(cur, "class body");
		cur = parsedBody.next;

		return this._accept(cur, {
			type: NodeType.ClassDefinition,
			name,
			signature,
			nodes: parsedBody.node.nodes,
			extendsNames,
		});
	}

	expectBody(cur: number): ParseResult {
		this._log(cur, "expectBody");

		if (!this.expectToken(cur, TokenType.Symbol, "{")) return;
		cur++;

		let members: ParsedNode[] = [];
		while (cur < this.input.length) {
			// check if done
			if (this.expectToken(cur, TokenType.Symbol, "}")) {
				return this._accept(cur + 1, {
					type: NodeType.BodyMembers,
					nodes: members,
				});
			}

			// parse the next member declaration (including semicolon)
			let parsedMember = this.expectMember(cur);
			if (!parsedMember)
				return this._throwParseError(cur, "member declaration");
			members.push(parsedMember.node);
			cur = parsedMember.next;
		}
	}

	expectMember(cur: number): ParseResult {
		this._log(cur, "expectMember");

		// read JSDoc first
		let jsdoc = this.expectToken(cur, TokenType.JSDoc);
		if (jsdoc) cur++;

		// read modifiers
		let start = cur;
		let modifiers: string[] = [];
		let token: TokenInfo | undefined;
		while ((token = this.expectToken(cur, TokenType.Keyword))) {
			if (!MODIFIER_KEYWORDS.includes(token.content)) break;
			modifiers.push(token.content);
			cur++;
		}

		// find different kinds of members
		let parsedMember = this.expectMethod(cur) || this.expectPropertyMember(cur);
		if (!parsedMember) return;
		cur = parsedMember.next;
		let signature = Tokenizer.toSource(this.input.slice(start, cur));

		// check for semicolon
		if (!this.expectToken(cur, TokenType.Symbol, ";")) {
			return this._throwParseError(cur, "semicolon");
		}
		cur++;

		return this._accept(cur, {
			...parsedMember.node,
			jsdoc: jsdoc?.jsdoc,
			modifiers: [...(parsedMember.node.modifiers || []), ...modifiers],
			signature,
		});
	}

	expectPropertyMember(cur: number): ParseResult {
		this._log(cur, "expectPropertyMember");

		let start = cur;
		if (this.expectToken(cur, TokenType.Symbol, "[")) {
			cur++;
			let parsedIndex = this.expectSingleType(cur);
			if (!parsedIndex) return;
			cur = parsedIndex.next;

			// check for index signature
			if (this.expectToken(cur, TokenType.Symbol, ":")) {
				let parsedType = this.expectType(cur + 1);
				if (parsedType) cur = parsedType.next;
			}

			// check for mapped types ('[X in Type]')
			if (this.expectToken(cur, TokenType.Keyword, "in")) {
				cur++;
				let parsedTypeMap = this.expectType(cur);
				if (!parsedTypeMap)
					return this._throwParseError(cur, "mapped type clause");
				cur = parsedTypeMap.next;
			}

			if (!this.expectToken(cur, TokenType.Symbol, "]")) return;
			cur++;
		} else if (this.expectToken(cur, TokenType.Keyword)) {
			cur++;
		} else return;

		let name = Tokenizer.toSource(this.input.slice(start, cur));

		if (this.expectToken(cur, TokenType.Symbol, "?")) cur++;

		if (this.expectToken(cur, TokenType.Symbol, ":")) {
			cur++;

			let parsedType = this.expectType(cur);
			if (!parsedType) return this._throwParseError(cur, "property type");
			cur = parsedType.next;
		}

		return this._accept(cur, {
			type: NodeType.PropertyDefinition,
			name,
			signature: Tokenizer.toSource(this.input.slice(start, cur)),
		});
	}

	expectMethod(cur: number): ParseResult {
		this._log(cur, "expectMethod");

		let start = cur;

		// check for getter/setter
		if (
			this.expectToken(cur, TokenType.Keyword, "get") ||
			this.expectToken(cur, TokenType.Keyword, "set")
		) {
			let parsedMethod = this.expectMethod(cur + 1);
			if (parsedMethod && parsedMethod.node.name !== "[call]") {
				return this._accept(parsedMethod.next, {
					...parsedMethod.node,
					type: NodeType.PropertyDefinition,
				});
			}
		}

		if (this.expectToken(cur, TokenType.Symbol, "[")) {
			cur++;
			let parsedIndex = this.expectSingleType(cur);
			if (!parsedIndex) return;
			cur = parsedIndex.next;
			if (!this.expectToken(cur, TokenType.Symbol, "]")) return;
			cur++;
		} else if (this.expectToken(cur, TokenType.Keyword)) {
			cur++;
		}
		let name =
			cur > start ? Tokenizer.toSource(this.input.slice(start, cur)) : "[call]";

		if (this.expectToken(cur, TokenType.Symbol, "<")) {
			let parsedTypeParams = this.expectTypeParamsDefinition(cur);
			if (!parsedTypeParams) return;
			cur = parsedTypeParams.next;
		}

		if (!this.expectToken(cur, TokenType.Symbol, "(")) return;

		let parsedParams = this.expectParams(cur);
		if (!parsedParams)
			return this._throwParseError(cur, "function/method parameters");
		cur = parsedParams.next;

		if (this.expectToken(cur, TokenType.Symbol, ":")) {
			cur++;
			let parsedType = this.expectType(cur);
			if (!parsedType)
				return this._throwParseError(cur, "function/method return type");
			cur = parsedType.next;
		}

		return this._accept(cur, {
			type: NodeType.MethodDefinition,
			name,
			signature: Tokenizer.toSource(this.input.slice(start, cur)),
			paramNames: parsedParams.node.paramNames,
		});
	}

	expectParams(cur: number): ParseResult {
		this._log(cur, "expectParams");

		if (!this.expectToken(cur, TokenType.Symbol, "(")) return;
		cur++;

		let paramNames: string[] = [];
		while (cur < this.input.length) {
			// check if done
			if (this.expectToken(cur, TokenType.Symbol, ")")) {
				return this._accept(cur + 1, {
					type: NodeType.ParamsDefinition,
					paramNames,
				});
			}

			// find next parameter
			let paramName = "";

			// skip optional ...
			if (this.expectToken(cur, TokenType.Symbol, "...")) {
				paramName += "...";
				cur++;
			}

			// parse the next parameter identifier
			let nameToken = this.expectToken(cur, TokenType.Keyword);
			if (!nameToken) return this._throwParseError(cur, "parameter name");
			paramName += nameToken.content.replace(/^_/, "");
			cur++;

			// check for type
			if (this.expectToken(cur, TokenType.Symbol, "?")) {
				paramName += "?";
				cur++;
			}
			if (this.expectToken(cur, TokenType.Symbol, ":")) {
				cur++;
				let parsedType = this.expectType(cur);
				if (!parsedType) return this._throwParseError(cur, "parameter type");
				cur = parsedType.next;
			}
			paramNames.push(paramName);

			// check for comma
			if (this.expectToken(cur, TokenType.Symbol, ",")) cur++;
			else if (!this.expectToken(cur, TokenType.Symbol, ")")) {
				return this._throwParseError(cur, ") or ,");
			}
		}
	}

	expectTypeParams(cur: number): ParseResult {
		this._log(cur, "expectTypeParams");

		if (!this.expectToken(cur, TokenType.Symbol, "<")) return;
		cur++;

		let parsedList = this.expectTypeList(cur);
		if (!parsedList) return this._throwParseError(cur, "list of types");
		cur = parsedList.next;

		if (!this.expectToken(cur, TokenType.Symbol, ">"))
			return this._throwParseError(cur, ">");
		return this._accept(cur + 1, {
			type: NodeType.TypeParamsDefinition,
		});
	}

	expectTypeList(cur: number): ParseResult {
		this._log(cur, "expectTypeList");

		let found = false;
		while (cur < this.input.length) {
			// skip JSDoc if any
			if (this.expectToken(cur, TokenType.JSDoc)) cur++;

			// skip ... if any (last element, but don't care here)
			if (this.expectToken(cur, TokenType.Symbol, "...")) cur++;

			// parse the next parameter type
			let parsedParam = this.expectType(cur);
			if (!parsedParam) break;
			cur = parsedParam.next;
			found = true;

			// check for (non) nullable suffixes
			if (
				this.expectToken(cur, TokenType.Symbol, "?") ||
				this.expectToken(cur, TokenType.Symbol, "!")
			) {
				cur++;
			}

			// check for = and type
			if (this.expectToken(cur, TokenType.Symbol, "=")) {
				cur++;
				let parsedType = this.expectSingleType(cur);
				if (!parsedType) break;
				cur = parsedType.next;
			}

			// check for comma
			if (!this.expectToken(cur, TokenType.Symbol, ",")) break;
			cur++;
		}

		if (found) {
			return this._accept(cur, {
				type: NodeType.TypeList,
			});
		}
	}

	expectTypeParamsDefinition(cur: number): ParseResult {
		this._log(cur, "expectTypeParamsDefinition");

		if (!this.expectToken(cur, TokenType.Symbol, "<")) return;
		cur++;

		while (cur < this.input.length) {
			// check if done
			if (this.expectToken(cur, TokenType.Symbol, ">")) {
				return this._accept(cur + 1, {
					type: NodeType.Type,
				});
			}

			// parse the next parameter (including 'extends' and default)
			let parsedParam = this.expectTypeParamDefinition(cur);
			if (!parsedParam)
				return this._throwParseError(cur, "type parameter definition");
			cur = parsedParam.next;

			// check for comma
			if (this.expectToken(cur, TokenType.Symbol, ",")) cur++;
			else if (!this.expectToken(cur, TokenType.Symbol, ">")) {
				return this._throwParseError(cur, "> or ,");
			}
		}
	}

	expectTypeParamDefinition(cur: number): ParseResult {
		this._log(cur, "expectTypeParamDefinition");

		// get parameter name
		if (!this.expectToken(cur, TokenType.Keyword)) return;
		cur++;

		// parse extends clause, if any
		if (this.expectToken(cur, TokenType.Keyword, "extends")) {
			cur++;
			let parsedExtendsType = this.expectType(cur);
			if (!parsedExtendsType) return this._throwParseError(cur, "extends type");
			cur = parsedExtendsType.next;
		}

		// parse default type, if any
		if (this.expectToken(cur, TokenType.Symbol, "=")) {
			cur++;
			let parsedDefaultType = this.expectType(cur);
			if (!parsedDefaultType) return this._throwParseError(cur, "default type");
			cur = parsedDefaultType.next;
		}

		return this._accept(cur, { type: NodeType.Type });
	}

	expectType(cur: number): ParseResult {
		this._log(cur, "expectType");

		let found = false;
		while (cur < this.input.length) {
			// parse the next type
			let parsedType = this.expectSingleType(cur);
			if (!parsedType) {
				return found ? this._throwParseError(cur, "type") : undefined;
			}
			cur = parsedType.next;
			found = true;

			// check for arrays and property access
			while (this.expectToken(cur, TokenType.Symbol, "[")) {
				cur++;
				let parsedPropertyAccess = this.expectType(cur);
				if (parsedPropertyAccess) cur = parsedPropertyAccess.next;
				if (!this.expectToken(cur, TokenType.Symbol, "]"))
					return this._throwParseError(cur, "]");
				cur++;
			}

			// check for type predicate ('X is ...')
			if (this.expectToken(cur, TokenType.Keyword, "is")) {
				cur++;
				let parsedType = this.expectType(cur);
				if (!parsedType) return this._throwParseError(cur, "type predicate");
				cur = parsedType.next;
			}

			// check for conditional types ('extends' and ternary operator)
			if (this.expectToken(cur, TokenType.Keyword, "extends")) {
				cur++;
				let parsedExtendsType = this.expectType(cur);
				if (!parsedExtendsType)
					return this._throwParseError(cur, "conditional type clause");
				cur = parsedExtendsType.next;

				if (!this.expectToken(cur, TokenType.Symbol, "?"))
					return this._throwParseError(cur, "?");
				cur++;

				let parsedFirstType = this.expectType(cur);
				if (!parsedFirstType) return this._throwParseError(cur, "type");
				cur = parsedFirstType.next;

				if (!this.expectToken(cur, TokenType.Symbol, ":"))
					return this._throwParseError(cur, ":");
				cur++;

				let parsedSecondType = this.expectType(cur);
				if (!parsedSecondType) return this._throwParseError(cur, "type");
				cur = parsedSecondType.next;
			}

			// check for | &
			if (this.expectToken(cur, TokenType.Symbol, "|")) cur++;
			else if (this.expectToken(cur, TokenType.Symbol, "&")) cur++;
			else return this._accept(cur, { type: NodeType.Type });
		}
	}

	expectSingleType(cur: number): ParseResult {
		this._log(cur, "expectSingleType");

		// parse type prefixes
		if (this.expectToken(cur, TokenType.Keyword, "infer")) cur++;
		if (this.expectToken(cur, TokenType.Keyword, "keyof")) cur++;
		if (this.expectToken(cur, TokenType.Keyword, "typeof")) cur++;
		if (this.expectToken(cur, TokenType.Keyword, "unique")) cur++;

		// handle (template) literal strings and numbers
		if (
			this.expectToken(cur, TokenType.String) ||
			this.expectToken(cur, TokenType.Number)
		) {
			return this._accept(cur + 1, { type: NodeType.Type });
		}

		// check for constructors (i.e. 'new (...) => X')
		if (this.expectToken(cur, TokenType.Keyword, "new")) {
			let parsedArrowFn = this.expectSingleType(cur + 1);
			if (parsedArrowFn) return parsedArrowFn;
		}

		// check for brackets OR arrow function
		if (this.expectToken(cur, TokenType.Symbol, "(")) {
			let parsedContent = this.expectType(cur + 1);
			if (
				parsedContent &&
				this.expectToken(parsedContent.next, TokenType.Symbol, ")") &&
				!this.expectToken(parsedContent.next + 1, TokenType.Symbol, "=>")
			) {
				// accept as bracketed type
				return this._accept(parsedContent.next + 1, { type: NodeType.Type });
			}

			let parsedParams = this.expectParams(cur);
			if (!parsedParams) return;
			cur = parsedParams.next;

			if (this.expectToken(cur, TokenType.Symbol, "=>")) {
				cur++;

				let parsedReturnType = this.expectType(cur);
				if (!parsedReturnType)
					return this._throwParseError(cur, "arrow function return type");
				cur = parsedReturnType.next;
				return this._accept(cur, { type: NodeType.Type });
			}
			return this._throwParseError(cur, ")");
		}

		// check for interface
		if (this.expectToken(cur, TokenType.Symbol, "{")) {
			let parsedBody = this.expectBody(cur);
			if (!parsedBody) return;
			cur = parsedBody.next;
			return this._accept(cur, { type: NodeType.Type });
		}

		// check for array with types
		if (this.expectToken(cur, TokenType.Symbol, "[")) {
			cur++;
			if (this.input[cur]?.content !== "]") {
				let parsedTypes = this.expectTypeList(cur);
				if (!parsedTypes) return;
				cur = parsedTypes.next;
			}
			if (!this.expectToken(cur, TokenType.Symbol, "]")) return;
			return this._accept(cur + 1, { type: NodeType.Type });
		}

		// check for single identifier
		let nameToken = this.expectToken(cur, TokenType.Keyword);
		if (!nameToken) return;
		cur++;

		// handle properties
		while (this.expectToken(cur, TokenType.Symbol, ".")) {
			cur++;
			nameToken = this.expectToken(cur, TokenType.Keyword);
			if (!nameToken) return this._throwParseError(cur, "identifier");
			cur++;
		}

		let parsedTypeParams = this.expectTypeParams(cur);
		if (parsedTypeParams) cur = parsedTypeParams.next;

		return this._accept(cur, { type: NodeType.Type });
	}

	expectToken(cur: number, type: TokenType, content?: string) {
		this._log(cur, "expectToken" + (content ? " (" + content + ")" : ""));

		let token = this.input[cur];
		if (token?.type === type && (!content || token.content === content)) {
			return token;
		}
	}

	private _throwParseError(cur: number, expected?: string): undefined {
		let token = this.input[cur];
		if (token?.type === TokenType.JSDoc) token = this.input[cur + 1];
		let content = token?.content || "<no content>";
		if (content.length > 80) content = content.slice(0, 77) + "...";
		if (expected) {
			throw Error(
				"Expected " +
					expected +
					", but found " +
					content +
					" " +
					Tokenizer.locate(token)
			);
		}
		throw Error("Unexpected token: " + content + " " + Tokenizer.locate(token));
	}

	private _accept(cur: number, node: ParsedNode): ParseResult {
		this._log(
			cur,
			"ACCEPT " +
				NodeType[node.type] +
				(node.signature ? "\n  " + node.signature : "")
		);
		return { next: cur, node };
	}

	private _log(cur: number, name: string) {
		if (!this.options.parserDebug) return;
		let token = this.input[cur];
		let content = token?.content || "<no content>";
		if (content.length > 80) content = content.slice(0, 77) + "...";
		console.log(`Debug: ${name} @ ${token?.line || "?"}(${cur}): ${content}`);
	}
}
