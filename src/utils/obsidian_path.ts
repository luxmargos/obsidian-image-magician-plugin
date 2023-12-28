import { normalizePath } from "obsidian";
import * as pb from "path-browserify";

export const normalizeObsidianDir = (path: string) => {
	const result = normalizePath(path);
	if (result === "/") {
		return "";
	}

	return result;
};

export const lowerCasedExtNameWithoutDot = (path: string) => {
	const ext = pb.extname(path).toLowerCase();
	const extWithoutDot = ext.startsWith(".") ? ext.substring(1) : ext;
	return extWithoutDot;
};
