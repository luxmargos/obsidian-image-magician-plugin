import { TAbstractFile, TFile } from "obsidian";
import { PluginContext } from "./app_types";

export type TUnionFile = TFile | TAbstractFile;

export const isTFile = (file: TUnionFile, ext?: string) => {
	const result =
		(file as any)["stat"] !== undefined &&
		(file as any)["extension"] !== undefined;
	if (result && ext !== undefined) {
		return (file as TFile).extension.toLowerCase() === ext.toLowerCase();
	}
	return result;
};

export const asTFile = (context: PluginContext, file: TUnionFile) => {
	if (isTFile(file)) {
		return file as TFile;
	}

	return context.plugin.app.vault.getFiles().find((item: TFile) => {
		return file.path === item.path;
	});
};

export const asTFileOrThrow = (context: PluginContext, file: TUnionFile) => {
	const result = asTFile(context, file);
	if (!result) {
		throw new Error("Not a file");
	}
	return result;
};

export const findValutFile = (
	context: PluginContext,
	path: string
): TFile | undefined => {
	return context.plugin.app.vault.getFiles().find((f: TFile) => {
		return f.path === path;
	});
};
