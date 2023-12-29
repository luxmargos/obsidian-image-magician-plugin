import {
	ButtonComponent,
	EditableFileView,
	FileView,
	Modal,
	Setting,
	TFile,
	WorkspaceLeaf,
} from "obsidian";
import { MainPluginContext } from "./context";
import { PIE } from "./engines/imgEngines";
import { PluginFullName } from "./consts/main";
import { createErrorEl } from "./errors";
import { ImgkPluginSettingTab } from "./settings/settings_tab";
import { exportFormatMap } from "./export_settings";
import { ImgkPluginExportDialog } from "./dialogs/export_opt_dialog";

export const VIEW_TYPE_IMGK_PLUGIN = "imgk-plugin-view";
export class ImgkPluginFileView extends EditableFileView {
	context: MainPluginContext;

	constructor(context: MainPluginContext, leaf: WorkspaceLeaf) {
		super(leaf);
		this.context = context;
		this.allowNoFile = false;
		this.navigation = true;

		this.addAction("file-output", "Export", (evt) => {
			if (!this.file) {
				return;
			}

			const md = new ImgkPluginExportDialog(
				context,
				context.plugin.settingsUtil.getSettingsRef(),
				context.plugin.settingsUtil.getIntantExport(),
				this.file
			);
			md.open();
		});
	}

	canAcceptExtension(extension: string): boolean {
		return this.context.plugin.settingsUtil
			.getRuntimeSupportedFormats()
			.contains(extension);
	}

	getViewType(): string {
		return VIEW_TYPE_IMGK_PLUGIN;
		// return "image";
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
				this.showUi(imgContainer);
				resolve();
			} catch (err) {
				canvas?.remove();
				createErrorEl(this.contentEl, file.path, err);
				resolve();
			}
		});
	}

	showUi(contEl: HTMLElement) {}
}
