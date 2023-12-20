import { TFile } from "obsidian";
import { ExportFormat, getExportFilePath } from "../exporter";
import { MainPluginContext, PluginContext } from "../context";
import { findValutFile } from "../vault_util";

export interface PluginImageEngine {
	draw(
		context: MainPluginContext,
		imgFile: TFile,
		el: HTMLElement
	): Promise<HTMLCanvasElement>;

	drawOnCanvas(
		context: MainPluginContext,
		imgFile: TFile,
		el: HTMLCanvasElement
	): Promise<void>;

	export(
		context: MainPluginContext,
		psdFile: TFile,
		exportFormat: ExportFormat,
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
 * @param file
 * @returns
 */
export const exportCanvasWithBlob = async (
	context: MainPluginContext,
	canvasElement: HTMLCanvasElement,
	exportFormat: ExportFormat,
	removeCanvas: boolean,
	filePath: string,
	file?: TFile
) => {
	return new Promise<void>((resolve, reject) => {
		const jobComplete = () => {
			if (removeCanvas) {
				canvasElement.remove();
			}
		};
		try {
			canvasElement.toBlob(
				async (blob: Blob) => {
					try {
						const ab = await blob.arrayBuffer();

						if (!file) {
							// create new one
							const tf =
								await context.plugin.app.vault.createBinary(
									filePath,
									ab
								);
						} else {
							// modify exist
							await context.plugin.app.vault.modifyBinary(
								file,
								ab
							);
						}

						jobComplete();
						resolve();
					} catch (e) {
						jobComplete();
						reject(e);
					}
				},
				exportFormat.mimeType,
				exportFormat.quality
			);
		} catch (e) {
			jobComplete();
			reject(e);
		}
	});
};

export type ExportData = {
	path: string;
	file?: TFile;
	isLatest: boolean;
};

export const resolveExportData = (
	context: MainPluginContext,
	source: TFile,
	exportFormat: ExportFormat
): ExportData => {
	const exportPath: string = getExportFilePath(context, source, exportFormat);
	const exportFile: TFile | undefined = findValutFile(context, exportPath);

	const isLatest: boolean =
		exportFile !== undefined &&
		exportFile != null &&
		exportFile.stat.mtime >= source.stat.mtime;

	return {
		path: exportPath,
		file: exportFile,
		isLatest: isLatest,
	};
};
