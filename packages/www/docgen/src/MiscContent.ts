import { readdirSync, readFileSync, statSync } from "fs";
import * as path from "path";

/** Additional content reader */
export class MiscContent {
  /** Read all files in given directory, and parse additional content */
  readDir(p: string) {
    let files = readdirSync(p);
    for (let name of files) {
      let fileName = path.join(p, name);
      if (statSync(fileName).isDirectory()) {
        this.readDir(fileName);
        continue;
      }
      let text = readFileSync(fileName).toString();
      for (let part of text.split(/[\n\r]+\-{3,}[\n\r]+/)) {
        let id: string | undefined;
        part = part.replace(/^\#+\s*([^\n\r]+)[\n\r]+/, (_s, t) => {
          id = t;
          return "";
        });
        if (id) this._content[id] = part;
      }
    }
  }

  /** Returns the additional content that has been read for given ID, if any */
  getContentFor(id: string) {
    return this._content[id] || "";
  }

  private _content: { [id: string]: string } = {};
}
