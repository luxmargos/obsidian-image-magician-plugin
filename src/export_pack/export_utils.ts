import { TFile, normalizePath } from "obsidian";
import * as bp from "path-browserify";
import { ExportFormat, ExportPathData, exportFormatList } from "./export_types";
import {
	ImgkExportSettings,
	ImgkFolderDeterminer,
} from "../settings/setting_types";
import { ImgkRuntimeExportSettings } from "../settings/settings_as_func";
import { resolveExportDstInfo } from "../engines/imgEngine";
import { MainPluginContext } from "../context";
import { PIE } from "../engines/imgEngines";

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

export const buildFileNameFormat = (prefix: string, suffix: string) => {
	return (
		(prefix ? `${prefix}.` : "") +
		"${name}.${ext}" +
		(suffix ? `.${suffix}` : "") +
		".${dst_ext}"
	);
};

/**
 *
 * @param settings
 * @param srcFile
 * @param specificDst Optional. Specifies the destination file path.  If provided, 'settings' will be ignored. Used for instant export.
 * @returns
 */
export const genExportPath = (
	settings: ImgkExportSettings,
	srcFile: TFile | string,
	specificDst: string | undefined
): ExportPathData | undefined => {
	const srcFilePath: string =
		srcFile instanceof TFile ? srcFile.path : srcFile;

	const srcFileDir = bp.dirname(srcFilePath);

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

	if (specificDst !== undefined) {
		const expFileName = bp.basename(specificDst);
		if (expFileName.trim().length < 1) {
			return undefined;
		}
		const dst = normalizePath(specificDst);
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
	} else {
		let targetFormat: string;
		if (settings.pathOpts.useCustomFileNameFormat) {
			targetFormat = settings.pathOpts.customFileNameFormat;
		} else {
			targetFormat = buildFileNameFormat(
				settings.pathOpts.fileNameFormatPrefix,
				settings.pathOpts.fileNameFormatSuffix
			);
		}

		const expFileName = targetFormat
			.replace(/\$\{name\}/g, srcFileNameWithoutExt)
			.replace(/\$\{ext\}/g, srcExt)
			.replace(/\$\{dst_ext\}/g, settings.format.ext)
			.trim();

		if (expFileName.trim().length < 1) {
			return undefined;
		}

		let dirText = srcFileDir;
		const fd = settings.pathOpts.folderDeterminer;

		if (fd === ImgkFolderDeterminer.Absolute) {
			dirText = settings.pathOpts.exportDirAbs;
		} else if (
			fd === ImgkFolderDeterminer.AbsoluteAndReflectFolderStructure
		) {
			if (srcFileDir.length > 0 && srcFileDir !== ".") {
				dirText = settings.pathOpts.exportDirAbs + "/" + srcFileDir;
			} else {
				dirText = settings.pathOpts.exportDirAbs;
			}
		} else {
			if (srcFileDir.length > 0 && srcFileDir !== ".") {
				dirText = srcFileDir + "/" + settings.pathOpts.exportDirRel;
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
	}
};

export const exportImage = (
	context: MainPluginContext,
	refEl: HTMLElement,
	srcFile: TFile,
	specificDst: string | undefined,
	settings: ImgkRuntimeExportSettings,
	forcedExport: boolean
): Promise<string> => {
	return new Promise(async (resolve, reject) => {
		const exportData = resolveExportDstInfo(
			context,
			srcFile,
			settings.data,
			specificDst
		);

		if (!exportData) {
			reject(new Error("There are no export data"));
			return;
		}

		PIE.getEngine(srcFile.extension)
			.export(context, srcFile, settings, refEl, forcedExport, exportData)
			.then((path) => {
				resolve(path);
			})
			.catch((err) => {
				reject(err);
			});
	});
};
