import { TFile, normalizePath } from "obsidian";
import { genExportPath } from "../export_pack/export_utils";
import { MainPluginContext, PluginContext } from "../context";
import { findVaultFile } from "../vault_util";
import {
	ImageAdjFunc,
	ImgkRuntimeExportSettings,
} from "../settings/settings_as_func";
import * as pb from "path-browserify";
import { debug } from "loglevel";
import { ExportFormat } from "../export_pack/export_types";
import { ImgkExportSettings } from "../settings/setting_types";

export interface PluginImageEngine {
	draw(
		context: MainPluginContext,
		imgFile: TFile,
		el: HTMLElement,
		imageAdjFunc?: ImageAdjFunc
	): Promise<HTMLCanvasElement>;

	drawOnCanvas(
		context: MainPluginContext,
		imgFile: TFile,
		el: HTMLCanvasElement,
		imageAdjFunc?: ImageAdjFunc
	): Promise<void>;

	export(
		context: MainPluginContext,
		srcFile: TFile,
		settings: ImgkRuntimeExportSettings,
		refElement: HTMLElement,
		forcedExport: boolean,
		exportDstInfo: ExportDstInfo
	): Promise<string>;
}

/**
 *
 * @param context
 * @param canvasElement
 * @param exportFormat
 * @param quality 0 - 1
 * @param removeCanvas
 * @param filePath
 * @param existingFile
 * @returns
 */
export const exportCanvasWithBlob = async (
	context: MainPluginContext,
	canvasElement: HTMLCanvasElement,
	exportFormat: ExportFormat,
	quality: number,
	filePath: string,
	existingFile?: TFile
) => {
	return new Promise<void>((resolve, reject) => {
		try {
			debug("export with blob : ", quality, filePath);
			canvasElement.toBlob(
				async (blob: Blob) => {
					try {
						const ab = await blob.arrayBuffer();

						if (!existingFile) {
							const imgFolder = pb.dirname(filePath);
							const folderExists =
								await context.plugin.app.vault.adapter.exists(
									normalizePath(imgFolder)
								);

							if (!folderExists) {
								try {
									await context.plugin.app.vault.createFolder(
										imgFolder
									);
								} catch (err) {}
							}

							// create new one
							const tf =
								await context.plugin.app.vault.createBinary(
									filePath,
									ab
								);
						} else {
							// modify exist
							await context.plugin.app.vault.modifyBinary(
								existingFile,
								ab
							);
						}

						resolve();
					} catch (e) {
						reject(e);
					}
				},
				exportFormat.mimeType,
				quality
			);
		} catch (e) {
			reject(e);
		}
	});
};

export type ExportDstInfo = {
	path: string;
	file?: TFile;
	isLatest: boolean;
};

//TODO: Different size detection
export const resolveExportDstInfo = (
	context: MainPluginContext,
	source: TFile,
	exportSettings: ImgkExportSettings,
	specificDst: string | undefined
): ExportDstInfo | undefined => {
	const exportPathData = genExportPath(
		exportSettings,
		source.path,
		specificDst
	);
	if (!exportPathData) {
		return undefined;
	}

	const exportFile: TFile | undefined = findVaultFile(
		context,
		exportPathData.dst.path,
		true
	);

	const isLatest: boolean =
		exportFile !== undefined &&
		exportFile != null &&
		exportFile.stat.mtime >= source.stat.mtime;

	return {
		path: exportPathData.dst.path,
		file: exportFile,
		isLatest: isLatest,
	};
};
