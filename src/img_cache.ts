import { TFile } from "obsidian";

const imgCaches: Record<string, string> = {};
export const createCacheString = (file: TFile) => {
	return `${file.path}_${file.stat.mtime}`;
};

export const getCache = (file: TFile) => {
	const cacheString = createCacheString(file);
	if (cacheString in imgCaches) {
		return imgCaches[cacheString];
	}

	return undefined;
};

export const setCache = (file: TFile, blobUrl: string) => {
	imgCaches[createCacheString(file)] = blobUrl;
};
