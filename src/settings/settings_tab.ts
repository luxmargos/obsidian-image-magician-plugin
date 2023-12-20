import {
	ExtraButtonComponent,
	PluginSettingTab,
	Setting,
	TextAreaComponent,
	ToggleComponent,
} from "obsidian";
import { format } from "path";
import { MainPluginContext } from "src/context";
import { exportFormatList } from "src/exporter";

export class ImgkPluginSettingTab extends PluginSettingTab {
	onSettingsUpdate: () => void;

	private _context: MainPluginContext;
	constructor(context: MainPluginContext, updateCallback: () => void) {
		super(context.plugin.app, context.plugin);
		this._context = context;
		this.onSettingsUpdate = updateCallback;
	}

	display(): void {
		console.log("display");
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl).setName("Formats").setHeading();

		let resetBtn: ExtraButtonComponent;
		let formatText: TextAreaComponent;
		new Setting(containerEl)
			.setName("Supported formats")
			.addTextArea((comp: TextAreaComponent) => {
				formatText = comp;
				// comp.inputEl.style.width = "100%";
				comp.inputEl.style.flexGrow = "1";
				comp.inputEl.style.minHeight = "100px";
				comp.setValue(
					this._context.plugin.settingsUtil
						.getSupportedFormats()
						.join(", ")
				);
				comp.onChange((text: string) => {
					const arr = text
						.split(",")
						.map((val) => val.trim().toLowerCase())
						.filter((val) => {
							return val.length > 0;
						});
					console.log(arr);
				});
			})
			.addExtraButton((comp: ExtraButtonComponent) => {
				resetBtn = comp;
				comp.setIcon("reset").setTooltip("Reset");
			});

		const exportSet = new Setting(containerEl)
			.setName("Export")
			.setHeading();
		for (const ef of exportFormatList) {
			let detailSet: Setting;

			new Setting(containerEl)
				.setName(ef.display ? ef.display : ef.ext.toUpperCase())
				.addToggle((comp: ToggleComponent) => {
					comp.onChange((value) => {
						if (value) {
							detailSet.settingEl.style.display = "flex";
							// detailSet.clear();
							// detailSet.controlEl.style.display = "flex";
						} else {
							detailSet.settingEl.style.display = "none";

							// detailSet.clear();
							// detailSet.controlEl.style.display = "none";
						}
					});
				});

			detailSet = new Setting(containerEl);
			detailSet.addSlider(() => {});
			detailSet.settingEl.style.borderTop = "0px";
			detailSet.controlEl.style.flexGrow = "1";
		}
	}

	hide() {
		console.log("hide");
	}
}
