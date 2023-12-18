import { TFile } from "obsidian";
import * as pb from "path-browserify";
import { findValutFile } from "./vault_util";
import { PluginContext } from "./context";

export type FileFormat = {
	mimeType: string;
	ext: string;
	optAvoidStringFormat?: boolean;
};

export const isImageFormat = (exportFileFormat: FileFormat): boolean => {
	console.log("isImageFormat : ", exportFileFormat);
	return (
		imageFormatList.findIndex((item: FileFormat) => {
			return (
				item.ext.toLowerCase() === exportFileFormat.ext.toLowerCase()
			);
		}) >= 0
	);
};

export const imageFormatMap = {
	png: {
		mimeType: "image/png",
		ext: "png",
	},

	jpg: {
		mimeType: "image/jpg",
		ext: "jpg",
	},
};

export const imageFormatList: FileFormat[] = [
	imageFormatMap.png,
	imageFormatMap.jpg,
];

export const getExportSuffix = (
	context: PluginContext,
	exportFormat: FileFormat
): string => {
	if (exportFormat.optAvoidStringFormat) {
		return `.${exportFormat.ext}`;
	}

	return `.exported.${exportFormat.ext}`;
};

export const getExportFileName = (
	context: PluginContext,
	file: TFile,
	exportFormat: FileFormat
): string => {
	return buildExportFileName(context, file.path, exportFormat);
};

export const getExportFilePath = (
	context: PluginContext,
	file: TFile,
	exportFormat: FileFormat
): string => {
	return buildExportFilePath(context, file.path, exportFormat);
};

export const buildExportFileName = (
	context: PluginContext,
	targetPath: string,
	exportFormat: FileFormat
): string => {
	return `${pb.basename(targetPath)}${getExportSuffix(
		context,
		exportFormat
	)}`;
};

export const buildExportFilePath = (
	context: PluginContext,
	targetPath: string,
	exportFormat: FileFormat
): string => {
	return `${targetPath}${getExportSuffix(context, exportFormat)}`;
};

export const embedMarkDownCreator = async (
	context: PluginContext,
	targetFile: TFile,
	exportFormat: FileFormat,
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
