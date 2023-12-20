import {
	App,
	Component,
	Plugin,
	PluginSettingTab,
	Setting,
	TextAreaComponent,
	TextComponent,
} from "obsidian";
import { MainPluginContext } from "src/context";

export class ImgkPluginSettingTab extends PluginSettingTab {
	onSettingsUpdate: () => void;

	private _context: MainPluginContext;
	constructor(context: MainPluginContext, updateCallback: () => void) {
		super(context.plugin.app, context.plugin);
		this._context = context;
		this.onSettingsUpdate = updateCallback;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Supported Formats")
			.addTextArea((comp: TextAreaComponent) => {
				comp.inputEl.style.width = "100%";
				comp.setValue(
					this._context.plugin.settingsUtil
						.getSupportedFormats()
						.join(", ")
				);
			});
		// .addText((cb: TextComponent) => {
		// 	cb.setValue(
		// 		this._context.plugin.settingsUtil
		// 			.getSupportedFormats()
		// 			.join(",")
		// 	);
		// });

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
