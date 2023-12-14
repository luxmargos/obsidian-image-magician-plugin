import { PluginContext } from "./app_types";

import {
	App,
	TAbstractFile,
	TFile,
	editorEditorField,
	editorInfoField,
	editorLivePreviewField,
} from "obsidian";

import {
	EditorView,
	ViewPlugin,
	ViewUpdate,
	Decoration,
	DecorationSet,
} from "@codemirror/view";

import type { PluginValue } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { findValutFile } from "./vault_util";

export const livePreviewExtension = (context: PluginContext) =>
	ViewPlugin.fromClass(
		class implements PluginValue {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = this.buildDecorations(view);
			}

			update(update: ViewUpdate) {
				console.log("updated", update);

				if (update.state.field(editorInfoField)) {
					console.log("editorInfoField");
				}
				if (update.state.field(editorEditorField)) {
					console.log("editorEditorField");
				}
				if (update.state.field(editorLivePreviewField)) {
					console.log("editorLivePreviewField");
				}
				if (!update.state.field(editorLivePreviewField)) {
					this.decorations = Decoration.none;
					return;
				}

				// if (
				// 	update.docChanged ||
				// 	update.viewportChanged ||
				// 	update.selectionSet
				// ) {
				this.decorations = this.buildDecorations(update.view);
				// }
			}

			destroy(): void {}

			private buildDecorations(view: EditorView): DecorationSet {
				if (!view.state.field(editorLivePreviewField))
					return Decoration.none;

				// console.log(view);

				const docTitleEl = view.dom.querySelector(".inline-title");
				if (docTitleEl) {
					console.log("title : ", docTitleEl.innerHTML);
				}
				// console.log(view.contentDOM.innerHTML);

				const nodeList =
					view.contentDOM.querySelectorAll(".internal-embed");

				console.log("internal embeds : ", nodeList);

				for (let i = 0; i < nodeList.length; i++) {
					const internalEmbed = nodeList[i];
					const src = internalEmbed.getAttribute("src");
					if (src) {
						const srcFile = findValutFile(context, src, false);

						if (srcFile) {
							console.log("found file : ", srcFile.path);
							console.log(internalEmbed);

							internalEmbed.empty();
							internalEmbed.innerHTML = "FOUND : " + srcFile.path;
						}
					}
				}

				return Decoration.none;

				// const uiHelper = new UiHelper();
				// const builder = new RangeSetBuilder<Decoration>();
				// const selection = view.state.selection;

				// for (const { from, to } of view.visibleRanges) {
				// 	syntaxTree(view.state).iterate({
				// 		from,
				// 		to,
				// 		enter(node) {
				// 			if (node.type.name.startsWith("inline-code")) {
				// 				const value = view.state.doc.sliceString(
				// 					node.from,
				// 					node.to
				// 				);
				// 				const isEncrypted =
				// 					value.indexOf(ENCRYPTED_CODE_PREFIX) === 0;

				// 				if (isEncrypted) {
				// 					if (
				// 						!uiHelper.selectionAndRangeOverlap(
				// 							selection,
				// 							node.from - 1,
				// 							node.to + 1
				// 						)
				// 					) {
				// 						builder.add(
				// 							node.from,
				// 							node.to,
				// 							Decoration.replace({
				// 								widget: new InlineWidget(
				// 									app,
				// 									value
				// 								),
				// 							})
				// 						);
				// 					}
				// 				}
				// 			}
				// 		},
				// 	});
				// }
				// return builder.finish();
			}
		},
		{
			decorations: (instance) => instance.decorations,
		}
	);
