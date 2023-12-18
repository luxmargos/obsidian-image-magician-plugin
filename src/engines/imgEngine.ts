import { TAbstractFile, TFile } from "obsidian";
import { FileFormat } from "../exporter";
import { PluginContext } from "../context";

export interface PluginImageEngine {
	draw(
		context: PluginContext,
		imgFile: TAbstractFile,
		el: HTMLElement
	): Promise<HTMLCanvasElement>;

	export(
		context: PluginContext,
		psdFile: TAbstractFile,
		exportFormat: FileFormat,
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
	context: PluginContext,
	canvasElement: HTMLCanvasElement,
	exportFormat: FileFormat,
	quality: number,
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
							console.log(
								"context.plugin.app.vault.createBinary"
							);
							const tf =
								await context.plugin.app.vault.createBinary(
									filePath,
									ab
								);
							console.log("png created : ", tf);
						} else {
							console.log(
								"context.plugin.app.vault.modifyBinary"
							);
							await context.plugin.app.vault.modifyBinary(
								file,
								ab
							);
							console.log("png modified : ", file);
						}

						jobComplete();
						resolve();
					} catch (e) {
						jobComplete();
						reject(e);
					}
				},
				exportFormat.mimeType,
				quality
			);
		} catch (e) {
			jobComplete();
			reject(e);
		}
	});
};
