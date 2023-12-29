import {
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	TFile,
} from "obsidian";
import ImgMagicianPlugin from "./main";
import { debug } from "loglevel";

class FieldSuggester extends EditorSuggest<string> {
	plugin: ImgMagicianPlugin;
	suggestType: "psd";
	latestTriggerInfo: EditorSuggestTriggerInfo;

	constructor(plugin: ImgMagicianPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		file: TFile
	): EditorSuggestTriggerInfo | null {
		debug("onTrigger");
		if (true) {
			const sub = editor.getLine(cursor.line).substring(0, cursor.ch);
			const line = editor.getLine(cursor.line);
			debug("sub", sub);
			debug("line", line);
			const match = line.match(/\[.*psd/);
			debug("match", match);
			// if (match !== undefined) {
			//   this.suggestType = 'psd';
			//   this.latestTriggerInfo = {
			// 	end: cursor,
			// 	start: {
			// 	  ch: cursor.ch - match.length,
			// 	  line: cursor.line,
			// 	},
			// 	query: match,
			//   };
			//   return this.latestTriggerInfo;
			// }
		}
		return null;
	}

	getSuggestions = (context: EditorSuggestContext) => {
		const query = context.query.toLowerCase();
		return ["psd"];
	};

	renderSuggestion(suggestion: string, el: HTMLElement): void {
		return;
	}

	selectSuggestion(suggestion: string): void {
		const { context } = this;
		if (context) {
		}
	}
}
