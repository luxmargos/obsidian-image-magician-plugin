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

export const findVaultFile = (
	context: PluginContext,
	path: string,
	strictMode:boolean
): TFile | undefined => {
	const aFile = context.plugin.app.vault.getAbstractFileByPath(path);
	
	if(aFile){
		return asTFile(aFile);
	}

	if(!strictMode){
		const file = context.plugin.app.metadataCache.getFirstLinkpathDest(path, "");
		if(file){
			return file;
		}
	}
	
	return undefined;
};
