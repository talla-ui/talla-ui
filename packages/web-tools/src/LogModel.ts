import {
	app,
	LogWriter,
	ObservableList,
	ObservableObject,
} from "@talla-ui/core";
import { PropertyInfo } from "./PropertyInfo";

let format = new Intl.DateTimeFormat(undefined, {
	timeStyle: "medium",
	dateStyle: undefined,
});

export type LogMessage = ObservableObject & {
	t: number;
	time: string;
	expr?: string;
	var?: string;
	text: string;
	loc: string;
	level: number;
	isError: boolean;
	data: unknown[];
	dataDisplay?: string;
};

export class LogModel extends ObservableObject {
	constructor() {
		super();
		app.log.addHandler(
			0,
			(m) => {
				try {
					// figure out the log location using an Error stack
					let loc = "";
					let s = new Error().stack?.split(/\n/);
					while (s?.length) {
						if (!/LogWriter|talla-ui/.test(s.shift()!)) continue;
						while (/LogWriter|talla-ui/.test(s[0]!)) s.shift();
						loc = (s[0] || "")
							.replace(/^\s*at\s+/, "")
							.replace(/http([^\/]*\/)+/, "")
							.replace(/\?[^:]+/, "")
							.trim();
						break;
					}

					// add the message to the list
					let listItem = this._makeListItem(m, loc);
					this.list.add(listItem);
					this.numMessages++;
					if (m.level >= 4) {
						this.numErrors++;
						this.errorList.add(listItem);
					}
					if (this.list.length > 999) {
						this.list.remove(this.list.first()!);
					}
					this.emitChange();
				} catch (err) {
					// don't log the error again
					console.error(err);
				}
			},
			true,
		);
	}

	numMessages = 0;
	list = new ObservableList<LogMessage>();

	numErrors = 0;
	errorList = new ObservableList<LogMessage>();

	private _makeListItem(m: LogWriter.LogMessageData, loc: string): LogMessage {
		let expr = "";
		let exprVar: string | undefined = undefined;
		let data = m.data;
		let text = m.message;
		if (m.data[0] && typeof m.data[0] === "object" && "_eval" in m.data[0]) {
			expr = m.data[0]._eval;
			exprVar = m.data[0]._var;
			data = [m.data[0].error || m.data[0].result];
			text = String(m.data[0].error || "");
		}
		if (m.data.length === 1 && typeof m.data[0] === "string") {
			text = (text ? text + " " : "") + m.data[0];
			data = [];
		}
		return Object.assign(new ObservableObject(), {
			t: Date.now(),
			time: format.format(new Date()),
			expr,
			var: exprVar,
			text,
			loc: expr ? "" : loc,
			level: m.level,
			isError: m.level >= 4,
			data,
			dataDisplay:
				data.map((d) => PropertyInfo.getDisplayValue(d)).join("\n") ||
				undefined,
		});
	}
}
