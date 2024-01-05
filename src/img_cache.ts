import { debug } from "loglevel";
import { TFile } from "obsidian";

const imgCaches: Record<string, string> = {};
export const createCacheString = (file: TFile) => {
	return `${file.path}_${file.stat.mtime}`;
};

export const getCache = (file: TFile) => {
	const cacheString = createCacheString(file);
	if (cacheString in imgCaches) {
		debug("found cache : ", file.path);
		return imgCaches[cacheString];
	}

	return undefined;
};

export const setCache = (file: TFile, blobOrDataUrl: string) => {
	debug("set cache : ", file.path);
	imgCaches[createCacheString(file)] = blobOrDataUrl;
};

export const clearCaches = () => {
	for (const k in imgCaches) {
		debug("clear cache : ", k);
		delete imgCaches[k];
	}
	debug("clear cache", imgCaches);
};
