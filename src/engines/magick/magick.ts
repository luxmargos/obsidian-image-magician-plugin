import { asTFile, asTFileOrThrow, findValutFile } from "../../vault_util";
import { FileFormat, getExportFilePath, isImageFormat } from "../../exporter";
import { TAbstractFile, TFile } from "obsidian";
import { IMagickImage, ImageMagick } from "@imagemagick/magick-wasm";
import { PluginImageEngine, exportCanvasWithBlob } from "../imgEngine";
import { PluginContext } from "src/context";

export class PluginMagickEngine implements PluginImageEngine {
	draw(
		context: PluginContext,
		imgFile: TAbstractFile,
		el: HTMLElement
	): Promise<HTMLCanvasElement> {
		return new Promise<HTMLCanvasElement>(async (resolve, reject) => {
			const canvasElement: HTMLCanvasElement = el.createEl("canvas");
			const canvasContext: CanvasRenderingContext2D | null =
				canvasElement.getContext("2d");

			if (!canvasContext) {
				reject(new Error(`Context error`));
				return;
			}

			const psdTFile = asTFile(context, imgFile);
			if (!psdTFile) {
				reject(new Error("Could not read file"));
				return;
			}

			try {
				const buff: ArrayBuffer =
					await context.plugin.app.vault.readBinary(psdTFile);
				const byteArr = new Uint8Array(buff);
				await ImageMagick.read(byteArr, async (img: IMagickImage) => {
					canvasElement.width = img.width;
					canvasElement.height = img.height;
					img.writeToCanvas(canvasElement);
					console.log("write to canvas");
				});

				console.log("resolve");
				resolve(canvasElement);
			} catch (e) {
				reject(e);
			}
		});
	}

	export(
		context: PluginContext,
		source: TAbstractFile,
		exportFormat: FileFormat,
		refElement: HTMLElement
	): Promise<void> {
		return new Promise(async (resolve, reject) => {
			let sourceTFile: TFile | undefined;

			try {
				sourceTFile = asTFileOrThrow(context, source);
			} catch (e) {
				reject(e);
				return;
			}

			const exportPath: string = getExportFilePath(
				context,
				sourceTFile,
				exportFormat
			);
			const exportFile: TFile | undefined = findValutFile(
				context,
				exportPath
			);

			const exportImge: boolean =
				!exportFile || sourceTFile.stat.mtime > exportFile.stat.mtime;

			if (!exportImge) {
				resolve();
				return;
			}

			const canvasElement: HTMLCanvasElement = await this.draw(
				context,
				source,
				refElement
			);

			try {
				await exportCanvasWithBlob(
					context,
					canvasElement,
					exportFormat,
					1,
					true,
					exportPath,
					exportFile
				);

				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}
}
