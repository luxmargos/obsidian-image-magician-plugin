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
import { debug } from "loglevel";
import { findVaultFile } from "../vault_util";
import { convertExportSettingsToRuntime } from "../settings/settings_as_func";
import { t } from "../i18n/t";
import {
	ImgkExportSettings,
	ImgkPluginSettings,
} from "../settings/setting_types";
import { exportImage } from "../export_pack/export_utils";

const ClsGroupMember = "imgk-settings-group-member";
const ClsGroupMemberLast = "imgk-settings-group-member-last";

export class ImgkPluginExportDialog extends Modal {
	private context: MainPluginContext;

	private pluginSettings: ImgkPluginSettings;
	private exportSettings: ImgkExportSettings;

	private onCloseCallback?: () => void;

	private source?: TFile | string;
	private srcPath?: string;
	private isInstantMode: boolean;

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

		this.isInstantMode =
			this.srcPath && this.srcPath.length > 0 ? true : false;

		if (!this.srcPath) {
			this.titleEl.setText(t("EXPORT_SETTINGS"));
		} else {
			this.titleEl.setText(t("EXPORT_OPTIONS"));
		}
	}

	onOpen(): void {
		const srcPath = this.srcPath;

		if (!this.isInstantMode) {
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
					tipSet.setDesc(t("AUTO_EXPORT_TIP_DESC"));
				} else {
					detailSetsToggleBtn?.setIcon("chevron-right");
					tipSet.setDesc("");
				}
			};
			tipSet = new Setting(this.contentEl)
				.setName(t("AUTO_EXPORT_TIP"))
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
				.setDesc(t("AUTO_EXPORT_TIP_1"))
				.settingEl.addClass(ClsGroupMember);

			const detailSet2 = new Setting(this.contentEl);
			detailSet2
				.setDesc(t("AUTO_EXPORT_TIP_2"))
				.settingEl.addClass(ClsGroupMember);

			const detailSet3 = new Setting(this.contentEl);
			detailSet3
				.setDesc(t("AUTO_EXPORT_TIP_3"))
				.settingEl.addClass(ClsGroupMemberLast);

			detailSets.push(detailSet1, detailSet2, detailSet3);
			refreshDetailSets();

			ImgkPluginSettingTab.createExportGeneralSets(
				this.context,
				this.contentEl,
				this.exportSettings
			);
		} else {
			new Setting(this.contentEl).setName(
				t("FORMAT_SOURCE").replace("${src}", this.srcPath ?? "")
			);
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

		if (this.isInstantMode) {
			const runExportBtnSet = new Setting(this.contentEl);
			runExportBtnSet.addButton((comp: ButtonComponent) => {
				exportBtn = comp;
				comp.setButtonText(t("EXPORT"));
				comp.onClick((evt) => {
					if (!srcPath) {
						return;
					}
					const srcFile = findVaultFile(this.context, srcPath, true);
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

								const message = t("FORMAT_EXPORT_SUCCESS")
									.replace("${src}", this.srcPath ?? "")
									.replace("${dst}", path);
								new Notice(message);
							})
							.catch((err) => {
								debug(err);
								new Notice(
									t("FORMAT_EXPORT_FAILED").replace(
										"${src}",
										this.srcPath ?? ""
									)
								);
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
