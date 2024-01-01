import { asTFile } from "../../vault_util";
import { ExportFormat } from "../../export_settings";
import { TAbstractFile, TFile } from "obsidian";
import {
	IMagickImage,
	ImageMagick,
	MagickGeometry,
} from "@imagemagick/magick-wasm";
import {
	ExportDstInfo,
	PluginImageEngine,
	exportCanvasWithBlob,
} from "../imgEngine";
import { MainPluginContext } from "../../context";
import { ImgkExportSettings, ImgkSize } from "../../settings/settings";
import {
	ImageAdj,
	ImageAdjFunc,
	ImgkRuntimeExportSettings,
} from "../../settings/settings_as_func";
import { fileURLToPath } from "url";
import { debug } from "loglevel";

export class PluginMagickEngine implements PluginImageEngine {
	draw(
		context: MainPluginContext,
		imgFile: TFile,
		el: HTMLElement,
		imageAdjFunc?: ImageAdjFunc
	): Promise<HTMLCanvasElement> {
		return new Promise(async (resolve, reject) => {
			const cv: HTMLCanvasElement = el.createEl("canvas", {
				cls: "imgk-plugin-export-canvas",
			});

			try {
				await this.drawOnCanvas(context, imgFile, cv, imageAdjFunc);
				resolve(cv);
			} catch (e) {
				cv.remove();
				reject(e);
			}
		});
	}

	drawOnCanvas(
		context: MainPluginContext,
		imgFile: TFile,
		cv: HTMLCanvasElement,
		imageAdjFunc?: ImageAdjFunc
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

					if (imageAdjFunc) {
						const imgSize: ImgkSize = {
							x: img.width,
							y: img.height,
						};
						const imgAdj: ImageAdj = imageAdjFunc(imgSize);

						if (imgAdj.scaleX < 0) {
							img.flop();
						}
						if (imgAdj.scaleY < 0) {
							img.flip();
						}

						if (
							imgAdj.width !== img.width ||
							imgAdj.height !== img.height
						) {
							const geo = new MagickGeometry(
								imgAdj.width,
								imgAdj.height
							);
							geo.ignoreAspectRatio = true;
							img.resize(geo);
						}
					}

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
		settings: ImgkRuntimeExportSettings,
		refElement: HTMLElement,
		forcedExport: boolean,
		exportDstInfo: ExportDstInfo
	): Promise<string> {
		return new Promise(async (resolve, reject) => {
			if (!forcedExport && exportDstInfo.isLatest) {
				debug(`skip export ${exportDstInfo.path}`);
				resolve(exportDstInfo.path);
				return;
			}

			let canvasElement: HTMLCanvasElement | undefined;
			try {
				canvasElement = await this.draw(
					context,
					source,
					refElement,
					settings.imageAdjFunc
				);

				await exportCanvasWithBlob(
					context,
					canvasElement,
					settings.data.format,
					settings.data.imgProps.quality,
					exportDstInfo.path,
					exportDstInfo.file
				);

				canvasElement.remove();
				resolve(exportDstInfo.path);
			} catch (e) {
				canvasElement?.remove();
				reject(e);
			}
		});
	}
}
