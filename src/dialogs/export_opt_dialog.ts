import {
	ButtonComponent,
	ExtraButtonComponent,
	Modal,
	Notice,
	Setting,
	TFile,
} from "obsidian";
import { MainPluginContext } from "../context";
import { ImgkPluginSettingTab } from "../settings/settings_tab";
import { ImgkExportSettings, ImgkPluginSettings } from "../settings/settings";
import { debug } from "loglevel";
import { findValutFile } from "../vault_util";
import { exportImage } from "../exporter";
import { convertExportSettingsToRuntime } from "../settings/settings_as_func";

const ClsGroupMember = "imgk-settings-group-member";
const ClsGroupMemberLast = "imgk-settings-group-member-last";

export class ImgkPluginExportDialog extends Modal {
	private context: MainPluginContext;

	private pluginSettings: ImgkPluginSettings;
	private exportSettings: ImgkExportSettings;

	private onCloseCallback?: () => void;

	private source?: TFile | string;
	private srcPath?: string;

	constructor(
		context: MainPluginContext,
		pluginSettings: ImgkPluginSettings,
		exportSettings: ImgkExportSettings,
		source?: TFile | string,
		onCloseCallback?: () => void
	) {
		super(context.plugin.app);

		this.onCloseCallback = onCloseCallback;

		this.pluginSettings = pluginSettings;
		this.exportSettings = exportSettings;
		this.context = context;
		this.source = source;
		if (this.source) {
			if (this.source instanceof TFile) {
				this.srcPath = this.source.path;
			} else {
				this.srcPath = this.source;
			}
		}

		if (!this.srcPath) {
			this.titleEl.setText("Export settings");
		} else {
			this.titleEl.setText(`Export options`);
		}
	}

	onOpen(): void {
		const srcPath = this.srcPath;

		const isInstantMode = srcPath && srcPath.length > 0;

		if (!isInstantMode) {
			let detailSets: Setting[] = [];
			let detailSetsToggleBtn: ExtraButtonComponent;
			let expandDetailSets = false;
			let tipSet: Setting;
			const refreshDetailSets = () => {
				for (const detailSet of detailSets) {
					detailSet.settingEl.toggle(expandDetailSets);
				}

				if (expandDetailSets) {
					detailSetsToggleBtn?.setIcon("chevron-down");
					tipSet.setDesc(
						"In general, the plugin efficiently blocks an infinite export loop by using built-in filters \
						and including two file extensions in the exported file name. When you want to break these default rules, \
						an infinite export loop can occur with exported files having the same file extension, \
						for example, 'MyImage.png.export.png.' \
						In this circumstance, the auto-export process will continue until the file name exceeds its limit. \
						If you find yourself in this situation, please refer to the following details."
					);
				} else {
					detailSetsToggleBtn?.setIcon("chevron-right");
					tipSet.setDesc("");
				}
			};
			tipSet = new Setting(this.contentEl)
				.setName(
					"Tip: Recommended settings to avoid infinity export loop."
				)
				.setHeading()
				.addExtraButton((comp) => {
					detailSetsToggleBtn = comp;
					comp.onClick(() => {
						expandDetailSets = !expandDetailSets;
						refreshDetailSets();
					});
				});

			refreshDetailSets();

			const detailSet1 = new Setting(this.contentEl);
			detailSet1
				.setDesc(
					"1. Set a specific source folder rather than root folder of vault."
				)
				.settingEl.addClass(ClsGroupMember);

			const detailSet2 = new Setting(this.contentEl);
			detailSet2
				.setDesc("2. Isolate source and exported folder.")
				.settingEl.addClass(ClsGroupMember);

			const detailSet3 = new Setting(this.contentEl);
			detailSet3
				.setDesc(
					"3. If you have a plan with complex settings, try to use filter."
				)
				.settingEl.addClass(ClsGroupMemberLast);

			detailSets.push(detailSet1, detailSet2, detailSet3);
			refreshDetailSets();

			ImgkPluginSettingTab.createExportGeneralSets(
				this.context,
				this.contentEl,
				this.exportSettings
			);
		} else {
			new Setting(this.contentEl).setName(`Source: ${this.srcPath}`);
		}

		let exportPathSetReturns: {
			refreshExportPreview: () => void;
			instantExportPathGetter: () => string;
		};

		ImgkPluginSettingTab.createExportImagePropsSet(
			this.context,
			this.contentEl,
			this.exportSettings,
			() => {
				if (exportPathSetReturns) {
					exportPathSetReturns.refreshExportPreview();
				}
			}
		);

		let exportBtn: ButtonComponent;
		const refreshExportBtnState = () => {
			debug(
				"refreshExportBtnState",
				exportPathSetReturns?.instantExportPathGetter()
			);
			if (
				exportPathSetReturns &&
				exportPathSetReturns.instantExportPathGetter().length > 0
			) {
				exportBtn?.buttonEl.removeClass("imgk-disabled");
			} else {
				exportBtn?.buttonEl.addClass("imgk-disabled");
			}
		};
		exportPathSetReturns = ImgkPluginSettingTab.createExportPathSets(
			this.context,
			this.contentEl,
			this.pluginSettings,
			this.exportSettings,
			() => {
				refreshExportBtnState();
			},
			srcPath
		);

		if (isInstantMode) {
			const runExportBtnSet = new Setting(this.contentEl);
			runExportBtnSet.addButton((comp: ButtonComponent) => {
				exportBtn = comp;
				comp.setButtonText("Export");
				comp.onClick((evt) => {
					if (!srcPath) {
						return;
					}
					const srcFile = findValutFile(this.context, srcPath, true);
					if (!srcFile) {
						return;
					}
					const exportPath =
						exportPathSetReturns.instantExportPathGetter();

					const runtimeExportSettings =
						convertExportSettingsToRuntime(
							this.pluginSettings,
							this.exportSettings,
							new Set()
						);

					if (exportPath) {
						exportImage(
							this.context,
							this.contentEl,
							srcFile,
							exportPath,
							runtimeExportSettings,
							true
						)
							.then((path) => {
								debug(
									"export complete : ",
									srcFile.path,
									"=>",
									path
								);

								const message = `Exporte successful: "${this.srcPath}" as "${path}"`;
								new Notice(message);
							})
							.catch((err) => {
								debug(err);
								new Notice(`Export failed: ${this.srcPath}`);
							})
							.finally(() => {});
					}
				});
				refreshExportBtnState();
			});
		}
	}

	onClose(): void {
		if (this.onCloseCallback) {
			this.onCloseCallback();
		}
	}
}
