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
import { getCache, setCache } from "./img_cache";
import {
	attachImgFollower,
	setImgTagImageWithCache,
} from "./editor_ext/img_post_processor";

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
			.has(extension);
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
			this.contentEl.empty();
			resolve();
		});
	}

	protected onClose(): Promise<void> {
		return new Promise((resolve, _reject) => {
			this.cleraMainObDisconnector();
			resolve();
		});
	}

	private mainObDisconnector?: () => void;
	private cleraMainObDisconnector() {
		if (this.mainObDisconnector !== undefined) {
			this.mainObDisconnector();
			this.mainObDisconnector = undefined;
		}
	}

	onLoadFile(file: TFile): Promise<void> {
		return new Promise(async (resolve, reject) => {
			this.contentEl.empty();
			const imgElement = await this.loadImage(file);
			resolve();

			if (
				imgElement &&
				this.context.plugin.settingsUtil.getSettingsRef()
					.overrideDragAndDrop
			) {
				if (this.contentEl.isConnected) {
					attachImgFollower(this.context, imgElement, file);
				} else {
					this.mainObDisconnector =
						this.context.plugin.mainObserver.addListener(() => {
							if (this.contentEl.isConnected) {
								this.cleraMainObDisconnector();
								attachImgFollower(
									this.context,
									imgElement,
									file
								);
							}
						});
				}
			}
		});
	}

	onUnloadFile(file: TFile): Promise<void> {
		return new Promise(async (resolve, reject) => {
			this.cleraMainObDisconnector();
			resolve();
		});
	}

	loadImage(file: TFile): Promise<HTMLImageElement | undefined> {
		return new Promise(async (resolve, reject) => {
			this.contentEl.empty();

			const imgContainer = this.contentEl.createDiv({
				cls: "image-container",
			});
			const imgElement = imgContainer.createEl("img", {
				cls: ["imgk-plugin-item"],
			});

			let canvas: HTMLCanvasElement | undefined;
			const finishJob = () => {
				canvas?.remove();
				canvas = undefined;
				this.showUi(imgContainer);
				resolve(imgElement);
			};

			try {
				const cache = getCache(file);
				if (cache) {
					imgElement.src = cache;
					finishJob();
					return;
				}

				canvas = await PIE.getEngine(file.extension).draw(
					this.context,
					file,
					this.contentEl
				);

				await setImgTagImageWithCache(
					this.context.plugin.settingsUtil.getSettingsRef().useBlob,
					file,
					imgElement,
					canvas
				);

				finishJob();
			} catch (err) {
				canvas?.remove();
				createErrorEl(this.contentEl, file.path, err);
				resolve(undefined);
			}
		});
	}

	showUi(contEl: HTMLElement) {}
}
