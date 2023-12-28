import { TFile, normalizePath } from "obsidian";
import * as pb from "path-browserify";
import { findValutFile } from "./vault_util";
import { PluginContext } from "./context";
import { ImgkExportSettings } from "./settings/settings";
import * as bp from "path-browserify";

export type ExportFormat = {
	display?: string;
	mimeType: string;
	ext: string;
};

export const exportFormatMap: Record<string, ExportFormat> = {
	png: {
		display: "PNG",
		mimeType: "image/png",
		ext: "png",
	},

	jpg: {
		display: "JPEG",
		mimeType: "image/jpeg",
		ext: "jpg",
	},

	webp: {
		display: "WEBP",
		mimeType: "image/webp",
		ext: "webp",
	},
};

export const exportFormatList: ExportFormat[] = [
	exportFormatMap.png,
	exportFormatMap.jpg,
	exportFormatMap.webp,
];

export const isImageExportFormat = (
	exportFileFormat: ExportFormat
): boolean => {
	return (
		exportFormatList.findIndex((item: ExportFormat) => {
			return (
				item.ext.toLowerCase() === exportFileFormat.ext.toLowerCase()
			);
		}) >= 0
	);
};

export const genExportPath = (
	settings: ImgkExportSettings,
	srcFile: TFile | string
) => {
	const srcFilePath: string =
		srcFile instanceof TFile ? srcFile.path : srcFile;

	const dir = bp.dirname(srcFilePath);

	const srcFileName = bp.basename(srcFilePath);
	let srcFileNameWithoutExt = bp.basename(srcFilePath);
	let srcExt = bp.extname(srcFilePath);

	if (srcFileNameWithoutExt.endsWith(srcExt)) {
		srcFileNameWithoutExt = srcFileNameWithoutExt.substring(
			0,
			srcFileNameWithoutExt.lastIndexOf(srcExt)
		);
	}

	if (srcExt.startsWith(".")) {
		srcExt = srcExt.substring(1);
	}

	const expFileName = settings.pathOpts.fileNameFormat
		.replace(/\$\{name\}/g, srcFileNameWithoutExt)
		.replace(/\$\{ext\}/g, srcExt)
		.replace(/\$\{dst_ext\}/g, settings.format.ext)
		.trim();

	let dirText = dir;
	if (!settings.pathOpts.asRelativePath) {
		if (dir.length > 0 && dir !== ".") {
			dirText = settings.pathOpts.exportDirAbs + "/" + dir;
		} else {
			dirText = settings.pathOpts.exportDirAbs;
		}
	} else {
		if (dir.length > 0 && dir !== ".") {
			dirText = dir + "/" + settings.pathOpts.exportDirRel;
		} else {
			dirText = settings.pathOpts.exportDirRel;
		}
	}

	if (dirText.length > 0 && !dirText.endsWith("/")) {
		dirText = `${dirText}/`;
	}

	const dst = normalizePath(`${dirText}${expFileName}`);

	return {
		src: {
			name: srcFileName,
			nameWithoutExt: srcFileNameWithoutExt,
			ext: srcExt,
		},
		dst: {
			path: dst,
			name: expFileName,
		},
	};
};
