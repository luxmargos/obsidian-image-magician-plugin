import { Modal } from "obsidian";
import { MainPluginContext } from "../context";
import { ImgkPluginSettingTab } from "../settings/settings_tab";
import { ImgkPluginSettings } from "../settings/setting_types";

export class ImgkPluginSettingsDialog extends Modal {
	private context: MainPluginContext;
	settings: ImgkPluginSettings;
	private onCloseCallback: (newSettings: ImgkPluginSettings) => void;

	constructor(
		context: MainPluginContext,
		onCloseCallback: (newSettings: ImgkPluginSettings) => void
	) {
		super(context.plugin.app);
		this.context = context;
		this.onCloseCallback = onCloseCallback;
	}

	onOpen(): void {
		this.settings = this.context.plugin.settingsUtil.getSettingsRef();
		// this.settings = this.context.plugin.settingsUtil.getClone();

		ImgkPluginSettingTab.createPluginSettings(
			this.context,
			this.contentEl,
			this.settings
		);
	}

	onClose(): void {
		if (this.onCloseCallback) {
			this.onCloseCallback(this.settings);
		}
	}
}
