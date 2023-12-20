import Psd from "@webtoon/psd";
import { asTFile, asTFileOrThrow, findValutFile } from "../../vault_util";
import { ExportFormat, getExportFilePath } from "../../exporter";
import { TFile } from "obsidian";
import {
	PluginImageEngine,
	exportCanvasWithBlob,
	resolveExportData,
} from "../imgEngine";
import { MainPluginContext } from "../../context";

export class PluginPsdEngine implements PluginImageEngine {
	draw(
		context: MainPluginContext,
		imgFile: TFile,
		el: HTMLElement
	): Promise<HTMLCanvasElement> {
		return new Promise(async (resolve, reject) => {
			let cv: HTMLCanvasElement | null = el.querySelector(
				"canvas.imgk-plugin-item"
			);
			if (!cv) {
				cv = el.createEl("canvas", { cls: "imgk-plugin-item" });
				console.log("create canvas element");
			} else {
				console.log("reuse canvas element");
			}

			try {
				await this.drawOnCanvas(context, imgFile, cv);
				resolve(cv);
			} catch (e) {
				reject(e);
			}
		});
	}

	drawOnCanvas(
		context: MainPluginContext,
		imgFile: TFile,
		cv: HTMLCanvasElement
	): Promise<void> {
		return new Promise(async (resolve, reject) => {
			const canvasContext: CanvasRenderingContext2D | null =
				cv.getContext("2d");

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

				// canvasElement.width = parsedPsd.width;
				// canvasElement.height = parsedPsd.height;
				canvasContext.putImageData(imageData, 0, 0);
				resolve();
			} catch (err) {
				reject(err);
			}
		});
	}

	export(
		context: MainPluginContext,
		sourceFile: TFile,
		exportFormat: ExportFormat,
		refElement: HTMLElement
	): Promise<void> {
		return new Promise<void>(async (resolve, reject) => {
			const exportData = resolveExportData(
				context,
				sourceFile,
				exportFormat
			);

			if (exportData.isLatest) {
				resolve();
				return;
			}

			try {
				const canvasElement: HTMLCanvasElement = await this.draw(
					context,
					sourceFile,
					refElement
				);

				await exportCanvasWithBlob(
					context,
					canvasElement,
					exportFormat,
					true,
					exportData.path,
					exportData.file
				);
				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}
}
