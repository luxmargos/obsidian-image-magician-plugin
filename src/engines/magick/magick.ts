import { asTFile } from "../../vault_util";
import { ExportFormat } from "../../exporter";
import { TAbstractFile, TFile } from "obsidian";
import { IMagickImage, ImageMagick } from "@imagemagick/magick-wasm";
import {
	PluginImageEngine,
	exportCanvasWithBlob,
	resolveExportData,
} from "../imgEngine";
import { MainPluginContext } from "src/context";

export class PluginMagickEngine implements PluginImageEngine {
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
		return new Promise<void>(async (resolve, reject) => {
			const canvasContext: CanvasRenderingContext2D | null =
				cv.getContext("2d");

			if (!canvasContext) {
				reject(new Error(`Context error`));
				return;
			}

			const imgTFile = asTFile(context, imgFile);
			if (!imgTFile) {
				reject(new Error("Could not read file"));
				return;
			}

			try {
				const buff: ArrayBuffer =
					await context.plugin.app.vault.readBinary(imgTFile);
				const byteArr = new Uint8Array(buff);
				await ImageMagick.read(byteArr, async (img: IMagickImage) => {
					// canvasElement.width = img.width;
					// canvasElement.height = img.height;
					img.writeToCanvas(cv);
				});

				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}

	export(
		context: MainPluginContext,
		source: TFile,
		exportFormat: ExportFormat,
		refElement: HTMLElement
	): Promise<void> {
		return new Promise(async (resolve, reject) => {
			const exportData = resolveExportData(context, source, exportFormat);
			if (exportData.isLatest) {
				resolve();
				return;
			}

			try {
				const canvasElement: HTMLCanvasElement = await this.draw(
					context,
					source,
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
