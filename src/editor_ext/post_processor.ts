import { MarkdownPostProcessorContext } from "obsidian";
import { MainPluginContext } from "../context";
import { linkedImgHandler, normalImgHandler } from "./img_post_processor";
import { ImgkMutationObserver } from "./mutation_ob";
import { debug } from "loglevel";

export const getMarkdownPostProcessor = (context: MainPluginContext) => {
	const postProcessor = async (
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	) => {
		debug("===========================getMarkdownPostProcessor");

		const processor = () => {
			normalImgHandler(context, el);
			linkedImgHandler(context, el);
		};

		const moCallback = (
			mutations: MutationRecord[],
			observer: MutationObserver
		) => {
			processor();
		};

		const ob: ImgkMutationObserver = new ImgkMutationObserver(el, {
			childList: true,
			subtree: true,
		});
		ob.addListener(moCallback);

		processor();
	};

	return postProcessor;
};
