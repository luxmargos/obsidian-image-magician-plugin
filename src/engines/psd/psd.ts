import Psd from "@webtoon/psd";
import { asTFile, asTFileOrThrow, findValutFile } from "../../vault_util";
import { FileFormat, getExportFilePath, isImageFormat } from "../../exporter";
import { TAbstractFile, TFile } from "obsidian";
import { PluginImageEngine, exportCanvasWithBlob } from "../imgEngine";
import { PluginContext } from "src/context";

export class PluginPsdEngine implements PluginImageEngine {
	draw(
		context: PluginContext,
		imgFile: TAbstractFile,
		el: HTMLElement
	): Promise<HTMLCanvasElement> {
		return new Promise<HTMLCanvasElement>(async (resolve, reject) => {
			const canvasElement: HTMLCanvasElement =
				document.createElement("canvas");
			const canvasContext: CanvasRenderingContext2D | null =
				canvasElement.getContext("2d");
			el.append(canvasElement);

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
				const parsedPsd = Psd.parse(buff);

				const compositeBuffer = await parsedPsd.composite();
				const imageData = new ImageData(
					compositeBuffer,
					parsedPsd.width,
					parsedPsd.height
				);

				canvasElement.width = parsedPsd.width;
				canvasElement.height = parsedPsd.height;
				canvasContext.putImageData(imageData, 0, 0);

				resolve(canvasElement);
			} catch (err) {
				reject(err);
			}
		});
	}

	export(
		context: PluginContext,
		sourceFile: TAbstractFile,
		exportFormat: FileFormat,
		refElement: HTMLElement
	): Promise<void> {
		return new Promise<void>(async (resolve, reject) => {
			let sourceTFile: TFile | undefined;

			try {
				sourceTFile = asTFileOrThrow(context, sourceFile);
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

			// 0-1
			const quality: number = 1;

			const canvasElement: HTMLCanvasElement = await this.draw(
				context,
				sourceFile,
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
