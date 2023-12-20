import { editorLivePreviewField } from "obsidian";

import {
	EditorView,
	ViewPlugin,
	ViewUpdate,
	Decoration,
	DecorationSet,
} from "@codemirror/view";

import { PluginValue } from "@codemirror/view";
import { MainPluginContext } from "../context";
import { linkedImgHandler, normalImgHandler } from "./img_post_processor";
import { ImgkMutationObserver } from "./mutation_ob";

export const livePreviewExtension = (context: MainPluginContext) => {
	const vp = ViewPlugin.fromClass(
		class implements PluginValue {
			decorations: DecorationSet = Decoration.none;
			initialDrawingPassed: boolean = false;
			observer: ImgkMutationObserver;

			constructor(view: EditorView) {
				this.observer = new ImgkMutationObserver(view.dom, {
					childList: true,
					subtree: true,
				});

				normalImgHandler(context, view.dom, this.observer, view);
				linkedImgHandler(context, view.dom, this.observer, view);
			}

			update(update: ViewUpdate) {
				// if (!update.state.field(editorEditorField)) {
				// 	this.decorations = Decoration.none;
				// 	return;
				// }

				// if (!update.state.field(editorInfoField)) {
				// 	this.decorations = Decoration.none;
				// 	return;
				// }
				if (!update.state.field(editorLivePreviewField)) {
					this.decorations = Decoration.none;
					return;
				}

				if (!this.initialDrawingPassed) {
					normalImgHandler(
						context,
						update.view.dom,
						this.observer,
						update.view
					);

					linkedImgHandler(
						context,
						update.view.dom,
						this.observer,
						update.view
					);
				} else if (update.docChanged || update.viewportChanged) {
					this.initialDrawingPassed = true;
					normalImgHandler(
						context,
						update.view.dom,
						this.observer,
						update.view
					);
					linkedImgHandler(
						context,
						update.view.dom,
						this.observer,
						update.view
					);
				}
			}

			destroy(): void {}
		},
		{
			decorations: (instance) => instance.decorations,
		}
	);

	return vp;
};
