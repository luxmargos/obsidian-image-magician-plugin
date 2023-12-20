import { FileView, TFile, WorkspaceLeaf } from "obsidian";
import { MainPluginContext } from "./context";
import { PIE } from "./engines/imgEngines";

export const VIEW_TYPE_IMGK_PLUGIN = "imgk-plugin-view";
export class ImgkPluginFileView extends FileView {
	context: MainPluginContext;

	constructor(context: MainPluginContext, leaf: WorkspaceLeaf) {
		super(leaf);
		this.context = context;
		this.allowNoFile = false;
		this.navigation = true;
	}

	canAcceptExtension(extension: string): boolean {
		return this.context.plugin.settingsUtil
			.getSupportedFormats()
			.contains(extension);
	}

	getViewType(): string {
		return VIEW_TYPE_IMGK_PLUGIN;
	}

	getDisplayText(): string {
		return this.file?.basename ?? "";
	}

	onload(): void {}

	onunload(): void {}

	protected onOpen(): Promise<void> {
		return new Promise((resolve, _reject) => {
			resolve();
		});
	}
	protected onClose(): Promise<void> {
		return new Promise((resolve, _reject) => {
			resolve();
		});
	}

	onLoadFile(file: TFile): Promise<void> {
		return new Promise(async (resolve, reject) => {
			let canvas: HTMLCanvasElement | undefined;
			try {
				this.contentEl.empty();

				canvas = await PIE.magick().draw(
					this.context,
					file,
					this.contentEl
				);

				const imgContainer = this.contentEl.createDiv({
					cls: "image-container",
				});
				const imgElement = imgContainer.createEl("img", {
					cls: ["imgk-plugin-item"],
				});

				// support excalidraw interaction mode. unfortunately it is not working well.
				// attachImgFollower(this.context, imgElement, file);

				canvas.toBlob((blob) => {
					if (blob) {
						const burl = URL.createObjectURL(blob);
						imgElement.src = burl;
					}
				});

				// imgElement.src = canvas.toDataURL();

				canvas?.remove();
				resolve();
			} catch (err) {
				canvas?.remove();
				resolve();
			}
		});
	}
}
