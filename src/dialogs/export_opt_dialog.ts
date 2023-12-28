import { ButtonComponent, Modal, Setting, TFile } from "obsidian";
import { MainPluginContext } from "../context";
import { ImgkPluginSettingTab } from "../settings/settings_tab";
import { ImgkExportSettings, ImgkPluginSettings } from "../settings/settings";

export class ImgkPluginExportDialog extends Modal {
	private context: MainPluginContext;

	private pluginSettings: ImgkPluginSettings;
	private exportSettings: ImgkExportSettings;

	private sourceFile: TFile;
	private sourcePath: string;
	private instantMode: boolean;

	private onCloseCallback?: () => void;

	constructor(
		context: MainPluginContext,
		pluginSettings: ImgkPluginSettings,
		exportSettings: ImgkExportSettings,
		source?: TFile | string,
		onCloseCallback?: () => void
	) {
		super(context.plugin.app);

		this.onCloseCallback = onCloseCallback;

		this.titleEl.textContent = "Export settings";
		this.pluginSettings = pluginSettings;
		this.exportSettings = exportSettings;
		this.context = context;

		if (source) {
			if (source instanceof TFile) {
				this.sourceFile = source;
			} else {
				this.sourcePath = source;
			}
		}
	}

	onOpen(): void {
		const srcPath: string = this.sourceFile
			? this.sourceFile.path
			: this.sourcePath;

		ImgkPluginSettingTab.createExportGeneralSets(
			this.context,
			this.contentEl,
			this.exportSettings
		);

		ImgkPluginSettingTab.createExportImagePropsSet(
			this.context,
			this.contentEl,
			this.exportSettings
		);

		ImgkPluginSettingTab.createExportPathSets(
			this.context,
			this.contentEl,
			this.pluginSettings,
			this.exportSettings,
			srcPath
		);

		if (this.instantMode) {
			const runExportBtnSet = new Setting(this.contentEl);
			runExportBtnSet.addButton((comp: ButtonComponent) => {
				comp.setButtonText("Export");
				comp.onClick((evt) => {
					console.log("export");
				});
			});
		}
	}

	onClose(): void {
		if (this.onCloseCallback) {
			this.onCloseCallback();
		}
	}
}
