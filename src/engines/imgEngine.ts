import { TFile, normalizePath } from "obsidian";
import { ExportFormat, genExportPath } from "../exporter";
import { MainPluginContext, PluginContext } from "../context";
import { findValutFile } from "../vault_util";
import { ImgkExportImageProps, ImgkExportSettings } from "../settings/settings";
import {
	ImageAdj,
	ImageAdjFunc,
	ImgkRuntimeExportSettings,
} from "../settings/settings_as_func";
import * as pb from "path-browserify";

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
		psdFile: TFile,
		settings: ImgkRuntimeExportSettings,
		refElement: HTMLElement
	): Promise<void>;
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
			canvasElement.toBlob(
				async (blob: Blob) => {
					try {
						const ab = await blob.arrayBuffer();

						if (!existingFile) {
							console.log("wow", filePath);
							const imgFolder = pb.dirname(filePath);
							const folderExists =
								await context.plugin.app.vault.adapter.exists(
									normalizePath(imgFolder)
								);

							console.log("folderExists", folderExists);

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

//TODO: size difference detection
export const resolveExportDstInfo = (
	context: MainPluginContext,
	source: TFile,
	exportSettings: ImgkExportSettings
): ExportDstInfo => {
	const exportPath = genExportPath(exportSettings, source.path);
	const exportFile: TFile | undefined = findValutFile(
		context,
		exportPath.dst.path
	);

	const isLatest: boolean =
		exportFile !== undefined &&
		exportFile != null &&
		exportFile.stat.mtime >= source.stat.mtime;

	return {
		path: exportPath.dst.path,
		file: exportFile,
		isLatest: isLatest,
	};
};
