import { TFile } from "obsidian";
import * as pb from "path-browserify";
import { findValutFile } from "./vault_util";
import { PluginContext } from "./context";

export type ExportFormat = {
	display?: string;
	mimeType: string;
	ext: string;
	optAvoidStringFormat?: boolean;
	quality: number;

	scaleX?: number;
	scaleY?: number;
	fixedWidth?: number;
	fixedHeight?: number;
	maxWidth?: number;
	maxHeight?: number;
	minWidth?: number;
	minHeight?: number;
};

export const exportFormatMap: Record<string, ExportFormat> = {
	png: {
		display: "PNG",
		mimeType: "image/png",
		ext: "png",
		quality: 1,
	},

	jpg: {
		display: "JPEG",
		mimeType: "image/jpeg",
		ext: "jpg",
		quality: 1,
	},

	webp: {
		display: "WEBP",
		mimeType: "image/webp",
		ext: "webp",
		quality: 1,
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

export const getExportSuffix = (
	context: PluginContext,
	exportFormat: ExportFormat
): string => {
	if (exportFormat.optAvoidStringFormat) {
		return `.${exportFormat.ext}`;
	}

	return `.exported.${exportFormat.ext}`;
};

export const getExportFileName = (
	context: PluginContext,
	file: TFile,
	exportFormat: ExportFormat
): string => {
	return buildExportFileName(context, file.path, exportFormat);
};

export const getExportFilePath = (
	context: PluginContext,
	file: TFile,
	exportFormat: ExportFormat
): string => {
	return buildExportFilePath(context, file.path, exportFormat);
};

export const buildExportFileName = (
	context: PluginContext,
	targetPath: string,
	exportFormat: ExportFormat
): string => {
	return `${pb.basename(targetPath)}${getExportSuffix(
		context,
		exportFormat
	)}`;
};

export const buildExportFilePath = (
	context: PluginContext,
	targetPath: string,
	exportFormat: ExportFormat
): string => {
	return `${targetPath}${getExportSuffix(context, exportFormat)}`;
};

/**
 * @deprecated
 *
 * @param context
 * @param targetFile
 * @param exportFormat
 * @param propName
 */
export const embedMarkDownCreator = async (
	context: PluginContext,
	targetFile: TFile,
	exportFormat: ExportFormat,
	propName: string
) => {
	const mdPath = getExportFilePath(context, targetFile, exportFormat);
	const markdownContent = `---
${propName}: true
---
![[${targetFile.path}]]
`;

	const mdFile = findValutFile(context, mdPath);
	if (mdFile) {
		if (targetFile.stat.mtime > mdFile.stat.mtime) {
			// console.log("modify : ", markdownContent);
			await context.plugin.app.vault.modify(mdFile, markdownContent);
		}
	} else {
		// console.log(mdPath, "create new : ", markdownContent);
		await context.plugin.app.vault.create(mdPath, markdownContent);
	}
};
