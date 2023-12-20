import { TAbstractFile, TFile } from "obsidian";
import * as pb from "path-browserify";
import { PluginContext } from "./context";

export const isTFile = (file: TAbstractFile, allowedExts?: string[]) => {
	// const result =
	// 	(file as any)["stat"] !== undefined &&
	// 	(file as any)["extension"] !== undefined;

	const result = file instanceof TFile;
	if (result && allowedExts) {
		const extLower = (file as TFile).extension.toLowerCase();
		return allowedExts.contains(extLower);
	}
	return result;
};

export const asTFile = (
	context: PluginContext,
	file: TAbstractFile
): TFile | undefined => {
	if (isTFile(file)) {
		return file as TFile;
	}

	return undefined;
};

export const asTFileOrThrow = (context: PluginContext, file: TAbstractFile) => {
	const result = asTFile(context, file);
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

	let result: TFile | undefined = files.find((f: TFile) => {
		return f.path === path;
	}) as TFile;

	// I think this is the link search behaviour of obsidian
	if (!result && strictMode === false) {
		result = files.find((f: TFile) => {
			//TEST : 'test.md' will be matched with 'FOLDER/test.md'
			return f.path.endsWith(path);
		});
	}

	return result;
};
