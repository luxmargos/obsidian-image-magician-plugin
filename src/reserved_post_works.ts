import {
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	TFile,
} from "obsidian";
import PsdSupportPlugin from "./main";

class FieldSuggester extends EditorSuggest<string> {
	plugin: PsdSupportPlugin;
	suggestType: "psd";
	latestTriggerInfo: EditorSuggestTriggerInfo;

	constructor(plugin: PsdSupportPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		file: TFile
	): EditorSuggestTriggerInfo | null {
		console.log("onTrigger");
		if (true) {
			const sub = editor.getLine(cursor.line).substring(0, cursor.ch);
			const line = editor.getLine(cursor.line);
			console.log("sub", sub);
			console.log("line", line);
			const match = line.match(/\[.*psd/);
			console.log("match", match);
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
