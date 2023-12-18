import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

export class PsdSupportSettingTab extends PluginSettingTab {
	onSettingsUpdate: () => void;

	constructor(app: App, plugin: Plugin, updateCallback: () => void) {
		super(app, plugin);
		this.onSettingsUpdate = updateCallback;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl).setName("Setting #1").setDesc("It's a secret");
		// .addText((text) =>
		// 	text
		// 		.setPlaceholder("Enter your secret")
		// 		.setValue(this.plugin.settings.mySetting)
		// 		.onChange(async (value) => {
		// 			this.plugin.settings.mySetting = value;
		// 			await this.plugin.saveSettings();
		// 		})
		// );
	}
}
