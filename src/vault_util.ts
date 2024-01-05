import { TAbstractFile, TFile } from "obsidian";
import { PluginContext } from "./context";

export const isTFile = (file: TAbstractFile, allowedExts?: Set<string>) => {
	const result = file instanceof TFile;
	if (result && allowedExts) {
		return allowedExts.has(file.extension);
	}
	return result;
};

export const asTFile = (file: TAbstractFile): TFile | undefined => {
	if (file instanceof TFile) {
		return file;
	}

	return undefined;
};

export const asTFileOrThrow = (file: TAbstractFile) => {
	const result = asTFile(file);
	if (!result) {
		throw new Error("Not a file");
	}
	return result;
};

export const findValutFile = (
	context: PluginContext,
	path: string,
	strictMode: boolean = true
): TFile | undefined => {
	const files = context.plugin.app.vault.getFiles();

	let result = files.find((f: TFile) => {
		return f.path === path;
	});

	// I think this is the link search behaviour of obsidian
	if (!result && strictMode === false) {
		result = files.find((f: TFile) => {
			//TEST : 'test.md' will be matched with 'FOLDER/test.md'
			return f.path.endsWith(path);
		});
	}

	return result;
};
