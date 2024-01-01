import { MarkdownPostProcessorContext } from "obsidian";
import { MainPluginContext } from "../context";
import { linkedImgHandler, normalImgHandler } from "./img_post_processor";
import { ImgkMutationObserver } from "./mutation_ob";

export const getMarkdownPostProcessor = (context: MainPluginContext) => {
	const postProcessor = async (
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	) => {
		const processor = () => {
			normalImgHandler(context, el);
			linkedImgHandler(context, el);
		};

		const moCallback = (
			mutations: MutationRecord[],
			observer: MutationObserver
		) => {
			if (!el.isConnected) {
				observer.disconnect();
				return;
			}

			processor();
		};

		const ob: ImgkMutationObserver = new ImgkMutationObserver(el, {
			childList: true,
			subtree: true,
			// this may call infinity loop
			// attributes: true,
		});
		ob.addListener(moCallback);

		processor();
	};

	return postProcessor;
};
