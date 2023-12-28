import { PluginFullName } from "./consts/main";

export const createErrorEl = (el: HTMLElement, path: string, err: unknown) => {
	const errorEl = el.createDiv();
	errorEl.createDiv({
		text: `${PluginFullName}: error with file '${path}'`,
	});
	errorEl.createDiv({
		text: `${err}`,
	});
};
