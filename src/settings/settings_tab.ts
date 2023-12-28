import {
	App,
	ButtonComponent,
	DropdownComponent,
	ExtraButtonComponent,
	PluginSettingTab,
	Setting,
	SliderComponent,
	TextAreaComponent,
	TextComponent,
	ToggleComponent,
} from "obsidian";
import { MainPluginContext } from "../context";
import { exportFormatList, genExportPath } from "../exporter";
import {
	DEFAULT_EXPORT_FORMATS,
	DEFAULT_EXPORT_SETTINGS,
	DEFAULT_FILE_NAME_FORMAT,
	ImgkSizeAdjustType,
	ImgkExportSettings,
	ImgkImageSize,
	ImgkPluginSettings,
	ImgkTextFilter,
	ImgkTextFilterType,
	getDefaultSupportedFormats,
	getWarnList,
} from "./settings";
import { cloneDeep, head } from "lodash-es";
import { ImgkPluginExportDialog } from "../dialogs/export_opt_dialog";
import { normalizeObsidianDir } from "../utils/obsidian_path";

const ClsGroupMember = "imgk-settings-group-member";
const ClsGroupMemberLast = "imgk-settings-group-member-last";

const asFileFormatsArray = (text: string) => {
	return text
		.split(",")
		.map((val) => val.trim().toLowerCase())
		.filter((val, index, selfArr) => {
			//allow not empty and unique
			return val.length > 0 && selfArr.indexOf(val) === index;
		});
};

const replaceFileFormats = (target: string[], text: string) => {
	const arr = asFileFormatsArray(text);
	target.splice(0, target.length);
	target.push(...arr);
};

export class ImgkPluginSettingTab extends PluginSettingTab {
	onSettingsUpdate: (newSettings: ImgkPluginSettings) => void;
	settings: ImgkPluginSettings;

	private context: MainPluginContext;
	constructor(
		context: MainPluginContext,
		updateCallback: (newSettings: ImgkPluginSettings) => void
	) {
		super(context.plugin.app, context.plugin);
		this.context = context;
		this.onSettingsUpdate = updateCallback;
	}

	hide() {
		this.onSettingsUpdate(this.settings);
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		this.settings = this.context.plugin.settingsUtil.getSettingsRef();
		// this.settings = this.context.plugin.settingsUtil.getClone();

		ImgkPluginSettingTab.createPluginSettings(
			this.context,
			containerEl,
			this.settings
		);
	}

	static createPluginSettings(
		context: MainPluginContext,
		containerEl: HTMLElement,
		settings: ImgkPluginSettings
	) {
		new Setting(containerEl).setName("General").setHeading();

		let warnedArr: string[] = [];
		let warnSet: Setting;

		const refreshWarnings = () => {
			warnedArr = [];
			for (const item of settings.supportedFormats) {
				if (getWarnList().includes(item)) {
					warnedArr.push(item);
				}
			}

			if (warnedArr.length < 1) {
				warnSet?.settingEl.toggle(false);
				return;
			}

			warnSet?.settingEl.toggle(true);
			warnSet?.setDesc(warnedArr.join(", "));
		};

		ImgkPluginSettingTab.createFormatEditSets(
			containerEl,
			"Supported formats",
			"The plugin will support viewing the image formats listed here. Additionally, you can try any image format by adding it to the list with comma separation. If you attempt to remove a format from the list, restart the Obsidian application to apply the changes.",
			() => settings.supportedFormats,
			() => getDefaultSupportedFormats(),
			(value: string[]) => {
				settings.supportedFormats = value;
			},
			(value: string) => {
				refreshWarnings();
			}
		);

		warnSet = new Setting(containerEl);
		warnSet.setName(
			"Warning: attempting to add default supported extensions in obsidian"
		);
		warnSet.settingEl.classList.add("imgk-warning");
		warnSet.settingEl.classList.add("imgk-no-border");
		refreshWarnings();

		const headingSet = new Setting(containerEl);
		headingSet.setName("Export");
		headingSet.setHeading();

		ImgkPluginSettingTab.createFormatEditSets(
			containerEl,
			"Image format filter",
			"The plugin determines which image formats to include in the export feature based on the list here",
			() => settings.exportSourceExtsFilter,
			() => DEFAULT_EXPORT_FORMATS,
			(value: string[]) => {
				settings.exportSourceExtsFilter = value;
			},
			() => {}
		);

		ImgkPluginSettingTab.createExportSets(
			context,
			containerEl,
			settings,
			settings.autoExportList
		);
	}

	static createExportGeneralSets(
		context: MainPluginContext,
		containerEl: HTMLElement,
		settings: ImgkExportSettings
	) {
		// new Setting(containerEl).setName("Export settings").setHeading();
		new Setting(containerEl)
			.setName("Name")
			.addText((comp: TextComponent) => {
				comp.setValue(settings.name);
				comp.onChange((value) => {
					settings.name = value;
				});
			});
	}

	static createExportPathSets(
		context: MainPluginContext,
		containerEl: HTMLElement,
		pluginSettings: ImgkPluginSettings,
		settings: ImgkExportSettings,
		srcFilePath?: string
	) {
		const isInstantMode = srcFilePath !== undefined;

		let dstSet: Setting;
		let exportPathTypeSet: Setting;
		let exportDirAbsSet: Setting;
		let exportDirRelativeSet: Setting;

		const pathOpts = settings.pathOpts;
		const exportFormat = settings.format;

		let exportPreviewSet: Setting;
		let exportPreviewSrcSet: Setting;
		let exportPreviewDstSet: Setting;

		let customPathNameSet: Setting;
		let customPathSet: Setting;
		let customPathComp: TextComponent;

		const textPreviewSettings = "Path simulation";

		const refreshExportPreview = () => {
			let exportPathData;
			if (isInstantMode) {
				exportPathData = genExportPath(settings, srcFilePath);
				customPathComp?.setValue(exportPathData.dst.path);
			} else {
				let testFilePath = "My Image.psd";
				let srcDir = normalizeObsidianDir(settings.pathOpts.sourceDir);
				if (srcDir.length > 0) {
					testFilePath = `${srcDir}/${testFilePath}`;
				}

				exportPathData = genExportPath(settings, testFilePath);

				exportPreviewSet?.setName(
					`${textPreviewSettings} (${exportPathData.src.ext} to ${exportFormat.ext})`
				);

				exportPreviewSrcSet?.setDesc(`Source : ${testFilePath}`);
				exportPreviewDstSet?.setDesc(
					`Destination : ${exportPathData.dst.path}`
				);
			}
		};

		if (!isInstantMode) {
			const sourceSet = new Setting(containerEl);
			sourceSet.setName("Source");
			sourceSet.setHeading();

			const sourceFolderSet = new Setting(containerEl);
			sourceFolderSet.setName("Folder");

			sourceFolderSet.setDesc(
				"Specify the folder to include its children files in export entries, or leave it empty to affect all files in the vault."
			);
			sourceFolderSet.addText((comp: TextComponent) => {
				comp.inputEl.classList.add("imgk-wide-input");
				comp.setValue(settings.pathOpts.sourceDir);

				comp.onChange((value) => {
					settings.pathOpts.sourceDir = normalizeObsidianDir(value);
					refreshExportPreview();
				});
			});

			const sourceFormatSetName = "Image format filter";
			let sourceFormatSet: Setting;
			let customSourceFileFormatSet: Setting;
			const refreshCustomSourceFileFormats = () => {
				customSourceFileFormatSet?.settingEl.toggle(
					!settings.pathOpts.useDefaultExtFilter
				);
				if (settings.pathOpts.useDefaultExtFilter) {
					sourceFormatSet.setName(
						`${sourceFormatSetName} (Using default plugin settings)`
					);

					sourceFormatSet.setDesc(
						pluginSettings.exportSourceExtsFilter.join(", ")
					);
				} else {
					sourceFormatSet.setName(`${sourceFormatSetName}`);
					sourceFormatSet.setDesc("Edit with comma separated list.");
				}
			};

			sourceFormatSet = new Setting(containerEl);
			sourceFormatSet.settingEl.classList.add("imgk-wide-controls");
			sourceFormatSet.setName(sourceFormatSetName);
			sourceFormatSet.addToggle((comp) => {
				comp.setValue(!settings.pathOpts.useDefaultExtFilter);
				comp.onChange((value) => {
					settings.pathOpts.useDefaultExtFilter = !value;
					refreshCustomSourceFileFormats();
				});
			});

			customSourceFileFormatSet =
				ImgkPluginSettingTab.createFormatEditSets(
					containerEl,
					"",
					"",
					() => settings.pathOpts.sourceExts,
					() => pluginSettings.exportSourceExtsFilter,
					(value: string[]) => {
						settings.pathOpts.sourceExts = value;
					},
					() => {}
				).setting;
			customSourceFileFormatSet.settingEl.classList.add(
				ClsGroupMemberLast
			);
			customSourceFileFormatSet.settingEl.classList.add(
				"imgk-controls-only"
			);

			refreshCustomSourceFileFormats();
			const sourceFilterSet = new Setting(containerEl).setDesc(
				"You can export specific files with filter options."
			);

			const filterListName = "Filters";

			sourceFilterSet.addButton((comp: ButtonComponent) => {
				comp.setIcon("plus-circle");
				comp.onClick((evt) => {
					settings.pathOpts.sourceFilters.push({
						content: "",
						type: ImgkTextFilterType.PlainText,
						flags: "",
					});
					refreshSourceFilterList();
				});
			});

			const allFilterSets: Setting[] = [];
			const listDiv = containerEl.createDiv({
				cls: "imgk-custom-setting-item",
			});
			const refreshSourceFilterList = () => {
				for (const setItem of allFilterSets) {
					setItem.settingEl.remove();
				}
				allFilterSets.splice(0, allFilterSets.length);

				if (settings.pathOpts.sourceFilters.length > 0) {
					sourceFilterSet.setName(filterListName);
				} else {
					sourceFilterSet.setName(`${filterListName} (empty)`);
				}

				settings.pathOpts.sourceFilters.forEach((item, itemIndex) => {
					const rowSet = this.createSourceFilterRow(
						context,
						listDiv,
						item,
						() => {
							settings.pathOpts.sourceFilters.splice(
								itemIndex,
								1
							);
							refreshSourceFilterList();
						}
					);
					allFilterSets.push(rowSet);
				});
			};

			refreshSourceFilterList();
		}

		dstSet = new Setting(containerEl);
		dstSet.setName("Destination");
		dstSet.setHeading();

		const refreshExportView = () => {
			if (pathOpts.asRelativePath) {
				exportDirAbsSet.settingEl.hide();
				exportDirRelativeSet.settingEl.show();
			} else {
				exportDirAbsSet.settingEl.show();
				exportDirRelativeSet.settingEl.hide();
			}

			refreshExportPreview();
		};
		exportPathTypeSet = new Setting(containerEl);
		exportPathTypeSet.setName("As relative folder");
		exportPathTypeSet.setDesc(
			"If turned on, all exported images will be generated relative to the its source file. Otherwise, they will be generated into the absolute folder."
		);

		exportPathTypeSet.addToggle((comp: ToggleComponent) => {
			comp.setValue(pathOpts.asRelativePath);
			comp.onChange((value) => {
				pathOpts.asRelativePath = value;
				refreshExportView();
			});
		});

		exportDirAbsSet = new Setting(containerEl);
		exportDirAbsSet
			.setName("Folder (Absolute)")
			.addText((comp: TextComponent) => {
				comp.inputEl.classList.add("imgk-wide-input");
				comp.setValue(pathOpts.exportDirAbs);
				comp.onChange((value) => {
					pathOpts.exportDirAbs = normalizeObsidianDir(value);
					refreshExportPreview();
				});
			});

		exportDirRelativeSet = new Setting(containerEl);
		exportDirRelativeSet
			.setName("Folder (Relative)")
			.addText((comp: TextComponent) => {
				comp.inputEl.classList.add("imgk-wide-input");
				comp.setValue(pathOpts.exportDirRel);
				comp.onChange((value) => {
					pathOpts.exportDirRel = normalizeObsidianDir(value);
					refreshExportPreview();
				});
			});

		const nameFormatSet: Setting = new Setting(containerEl);
		let nameFormatSetComp: TextComponent;

		const refershNameFormat = () => {
			nameFormatSetComp?.setValue(settings.pathOpts.fileNameFormat);
		};

		nameFormatSet.setName("File name format");
		nameFormatSet.addExtraButton((comp) => {
			comp.setIcon("reset");
			comp.onClick(() => {
				settings.pathOpts.fileNameFormat = DEFAULT_FILE_NAME_FORMAT;
				refershNameFormat();
				refreshExportPreview();
			});
		});
		nameFormatSet.addText((comp: TextComponent) => {
			nameFormatSetComp = comp;
			comp.inputEl.classList.add("imgk-wide-input");
			comp.onChange((value: string) => {
				settings.pathOpts.fileNameFormat = value;
				refreshExportPreview();
			});
			refershNameFormat();
		});

		// exportDirAbsSet.settingEl.classList.add(ClsGroupMember);
		// exportDirRelativeSet.settingEl.classList.add(ClsGroupMember);
		// nameFormatSet.settingEl.classList.add(ClsGroupMember);

		if (isInstantMode) {
			customPathNameSet = new Setting(containerEl);
			customPathNameSet.setName("Export as ...");
			customPathNameSet.setHeading();

			customPathSet = new Setting(containerEl);
			customPathSet.settingEl.classList.add("imgk-controls-only");
			customPathSet.addText((comp: TextComponent) => {
				customPathComp = comp;
				comp.inputEl.classList.add("imgk-wide-input");
			});
			// customPathSet.settingEl.classList.add(ClsGroupMemberLast);
		} else {
			exportPreviewSet = new Setting(containerEl);
			exportPreviewSet.setName(textPreviewSettings);
			exportPreviewSet.setHeading();
			// exportPreviewSet.settingEl.classList.add(ClsGroupMemberLast);

			exportPreviewSrcSet = new Setting(containerEl);
			exportPreviewSrcSet.settingEl.classList.add(ClsGroupMember);
			exportPreviewDstSet = new Setting(containerEl);
			exportPreviewDstSet.settingEl.classList.add(ClsGroupMemberLast);
		}

		refreshExportView();
	}

	static createFormatEditSets = <T extends Array<string>>(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		getter: () => T,
		defaultGetter: () => T,
		setter: (value: T) => void,
		onChange: (value: string) => void
	): {
		setting: Setting;
	} => {
		let sourceFormatsResetBtn: ExtraButtonComponent;
		let sourceFormatsInputComp: TextAreaComponent;

		const refreshSourceFormats = () => {
			sourceFormatsInputComp.setValue(getter().join(", "));
		};
		const resetSourecFormats = () => {
			setter(cloneDeep(defaultGetter()));
			refreshSourceFormats();
		};

		const mainSet = new Setting(containerEl)
			.setName(name)
			.addExtraButton((comp: ExtraButtonComponent) => {
				sourceFormatsResetBtn = comp;
				comp.setIcon("reset").setTooltip("Reset");
				comp.onClick(() => {
					resetSourecFormats();
				});
			})
			.addTextArea((comp: TextAreaComponent) => {
				sourceFormatsInputComp = comp;
				comp.inputEl.classList.add("imgk-textarea");
				comp.inputEl.addEventListener("blur", (evt) => {
					refreshSourceFormats();
				});
				refreshSourceFormats();
				comp.onChange((text: string) => {
					replaceFileFormats(getter(), text);
					onChange(text);
				});
			});

		if (desc) {
			mainSet.setDesc(desc);
		}

		return {
			setting: mainSet,
		};
	};
	static createExportSets(
		context: MainPluginContext,
		containerEl: HTMLElement,
		pluginSettings: ImgkPluginSettings,
		settings: ImgkExportSettings[],
		srcFilePath?: string
	) {
		const autoExportName = "Auto export";
		const autoExportSet = new Setting(containerEl).setDesc(
			"Automatically export the images in the selected format when the original image is modified or created."
		);

		autoExportSet.addButton((comp: ButtonComponent) => {
			comp.setIcon("plus-circle");
			comp.onClick((evt) => {
				const newExportSettings = cloneDeep(DEFAULT_EXPORT_SETTINGS);
				newExportSettings.pathOpts.sourceExts = cloneDeep(
					pluginSettings.exportSourceExtsFilter
				);
				settings.push(newExportSettings);
				refreshList();
			});
		});

		const allListSets: Setting[] = [];
		const listDiv = containerEl.createDiv({
			cls: "imgk-custom-setting-item",
		});
		const refreshList = () => {
			for (const setItem of allListSets) {
				setItem.settingEl.remove();
			}
			allListSets.splice(0, allListSets.length);

			if (settings.length > 0) {
				autoExportSet.setName(autoExportName);
			} else {
				autoExportSet.setName(`${autoExportName} (empty)`);
			}

			settings.forEach((item, itemIndex) => {
				const rowSet = this.createExportRow(
					context,
					listDiv,
					pluginSettings,
					item,
					srcFilePath,
					() => {
						settings.splice(itemIndex, 1);
						refreshList();
					},
					() => {
						refreshList();
					}
				);
				allListSets.push(rowSet);
			});
		};

		refreshList();
	}

	static createExportRow(
		context: MainPluginContext,
		containerEl: HTMLElement,
		pluginSetings: ImgkPluginSettings,
		settings: ImgkExportSettings,
		srcFilePath?: string,
		onRemoveAttempt?: () => void,
		onUpdate?: () => void
	) {
		let onOffComp: ToggleComponent;
		let removeComp: ExtraButtonComponent;
		const autoExportEntrySet = new Setting(containerEl);
		// autoExportEntrySet.settingEl.classList.add(ClsGroupMember);

		const refreshRemoveComp = () => {
			// removeComp.extraSettingsEl.disabled = settings.active;
			removeComp.extraSettingsEl.toggleVisibility(!settings.active);
		};

		const refreshName = () => {
			autoExportEntrySet.setName(settings.name);
		};
		refreshName();

		autoExportEntrySet.addToggle((comp: ToggleComponent) => {
			onOffComp = comp;
			comp.setValue(settings.active);
			comp.onChange((value) => {
				settings.active = value;
				refreshRemoveComp();
			});
		});
		autoExportEntrySet.addExtraButton((comp: ExtraButtonComponent) => {
			comp.setIcon("sliders-horizontal");
			comp.onClick(() => {
				const exportOptsDialog = new ImgkPluginExportDialog(
					context,
					pluginSetings,
					settings,
					srcFilePath,
					() => {
						if (onUpdate) {
							onUpdate();
						}
					}
				);
				exportOptsDialog.open();
			});
		});

		autoExportEntrySet.addExtraButton((comp: ExtraButtonComponent) => {
			removeComp = comp;
			comp.setIcon("x-circle");
			comp.onClick(() => {
				if (onRemoveAttempt) {
					onRemoveAttempt();
				}
			});
			refreshRemoveComp();
		});

		return autoExportEntrySet;
	}

	static createExportImagePropsSet(
		context: MainPluginContext,
		containerEl: HTMLElement,
		settings: ImgkExportSettings
	) {
		const imagePropsSet = new Setting(containerEl);
		imagePropsSet.setName("Export image settings");
		imagePropsSet.setHeading();

		const formatSet = new Setting(containerEl)
			.setName("Format")
			.addDropdown((comp: DropdownComponent) => {
				for (const fm of exportFormatList) {
					comp.addOption(fm.ext, fm.display ? fm.display : fm.ext);
				}
				comp.setValue(settings.format.ext);
				comp.onChange((value) => {
					const newFormat = exportFormatList.find((fmt) => {
						return fmt.ext === value;
					});

					if (newFormat) {
						settings.format = cloneDeep(newFormat);
					}
				});
			});

		// formatSet.settingEl.classList.add(ClsGroupMember);

		let imagePropSets: Setting[] = [];
		let qualitySet: Setting;
		let qualityDisplayEl: HTMLElement | undefined;

		const refreshQualityDisplay = () => {
			if (qualityDisplayEl) {
				const q = settings.imgProps.quality ?? 1;
				qualityDisplayEl.textContent = `${q * 100}%`;
			}
		};

		qualitySet = new Setting(containerEl);
		qualitySet.addSlider((comp: SliderComponent) => {
			comp.setLimits(0, 1, 0.1);
			comp.onChange((value) => {
				settings.imgProps.quality = Math.clamp(value, 0, 1);
				refreshQualityDisplay();
			});
			qualityDisplayEl = comp.sliderEl.parentElement?.createSpan({
				text: "0",
				cls: "imgk-settings-quality",
			});
		});
		qualitySet.setName("Quality");
		// qualitySet.settingEl.classList.add(ClsGroupMember);

		const listHeadName = "Adjustments to image size";
		const listHeadSet = new Setting(containerEl);
		listHeadSet.addButton((comp: ButtonComponent) => {
			comp.setIcon("plus-circle");
			comp.onClick((evt) => {
				if (settings.imgProps.sizeAdjustments === undefined) {
					settings.imgProps.sizeAdjustments = [];
				}
				settings.imgProps.sizeAdjustments.push({
					type: ImgkSizeAdjustType.Fixed,
				});

				refreshList();
			});
		});

		const listDiv = containerEl.createDiv({
			cls: "imgk-custom-setting-item",
		});
		const refreshList = () => {
			for (const propSet of imagePropSets) {
				propSet.settingEl.remove();
			}
			imagePropSets.splice(0, imagePropSets.length);

			if (settings.imgProps.sizeAdjustments.length > 0) {
				listHeadSet.setName(listHeadName);
			} else {
				listHeadSet.setName(`${listHeadName} (empty)`);
			}

			settings.imgProps.sizeAdjustments?.forEach((item, itemIndex) => {
				const adjustSet = this.genSizeSets(listDiv, item, () => {
					settings.imgProps.sizeAdjustments?.splice(itemIndex, 1);
					refreshList();
				});
				imagePropSets.push(adjustSet);
			});
		};

		refreshList();
		refreshQualityDisplay();
	}

	static genSizeSets(
		containerEl: HTMLElement,
		obj: ImgkImageSize,
		onRemoveAttempt: () => void
	) {
		const sizeSet = new Setting(containerEl);
		sizeSet.settingEl.classList.add("imgk-controls-only");

		sizeSet.addDropdown((comp) => {
			const allValues = [
				ImgkSizeAdjustType.Fixed,
				ImgkSizeAdjustType.Scale,
				ImgkSizeAdjustType.Minimum,
				ImgkSizeAdjustType.Maximum,
			];

			for (const v of allValues) {
				comp.addOption(v.toString(), ImgkSizeAdjustType[v]);
			}

			comp.onChange((value: string) => {
				const valueNum = Number(value) as ImgkSizeAdjustType;
				obj.type = valueNum;
			});

			comp.setValue(obj.type.toString());
		});

		sizeSet.controlEl.createSpan({ cls: "imgk-fill-space" });
		sizeSet.addText((comp: TextComponent) => {
			comp.inputEl.inputMode = "numeric";
			comp.inputEl.type = "number";
			comp.inputEl.min = "0";
			comp.inputEl.classList.add("imgk-size-input");
			comp.inputEl.placeholder = "width";
			comp.setValue(obj.x?.toString() ?? "");
			comp.onChange((value) => {
				const num = Number(value);
				if (!isNaN(num)) {
					obj.x = num;
				} else {
					obj.x = undefined;
				}
			});
		});

		sizeSet.controlEl.createSpan({ text: "x" });
		sizeSet.addText((comp: TextComponent) => {
			comp.inputEl.inputMode = "numeric";
			comp.inputEl.type = "number";
			comp.inputEl.classList.add("imgk-size-input");
			comp.inputEl.placeholder = "height";
			comp.setValue(obj.y?.toString() ?? "");
			comp.onChange((value) => {
				const num = Number(value);
				if (!isNaN(num)) {
					obj.y = num;
				} else {
					obj.y = undefined;
				}
			});
		});

		sizeSet.addExtraButton((comp: ExtraButtonComponent) => {
			comp.setIcon("x-circle");
			comp.onClick(onRemoveAttempt);
		});

		// sizeSet.settingEl.classList.add(ClsGroupMemberLast);
		return sizeSet;
	}

	static createSourceFilterRow(
		context: MainPluginContext,
		containerEl: HTMLElement,
		settings: ImgkTextFilter,
		onRemoveAttempt: () => void
	) {
		const mainSet = new Setting(containerEl);
		mainSet.settingEl.classList.add("imgk-controls-only");

		let flagsCompForRegex: TextComponent;
		let flagsCompForText: ButtonComponent;
		const refreshFlagsView = () => {
			flagsCompForRegex?.inputEl.toggle(
				settings.type === ImgkTextFilterType.Regex
			);
			flagsCompForText?.buttonEl.toggle(
				settings.type === ImgkTextFilterType.PlainText
			);
			if (settings.flags.contains("i")) {
				flagsCompForText?.buttonEl.classList.add("imgk-toggle-off");
			} else {
				flagsCompForText?.buttonEl.classList.remove("imgk-toggle-off");
			}
		};

		const updateRegexFlags = () => {
			flagsCompForRegex?.setValue(settings.flags);
		};

		mainSet.addDropdown((comp) => {
			const allValues = [
				ImgkTextFilterType.PlainText,
				ImgkTextFilterType.Regex,
			];

			comp.addOption(
				ImgkTextFilterType.PlainText.toString(),
				"Plain text"
			);

			comp.addOption(
				ImgkTextFilterType.Regex.toString(),
				"Regular expression"
			);

			comp.setValue(settings.type.toString());
			comp.onChange((value: string) => {
				const valueNum = Number(value) as ImgkTextFilterType;
				settings.type = valueNum;
				updateRegexFlags();
				refreshFlagsView();
			});
		});

		mainSet.controlEl.createSpan({ cls: "imgk-fill-space" });
		mainSet.addText((comp: TextComponent) => {
			comp.inputEl.placeholder = "Pattern";
			comp.setValue(settings.content);
			comp.onChange((value) => {
				settings.content = value;
			});
		});

		mainSet.addButton((comp) => {
			flagsCompForText = comp;
			comp.setIcon("case-sensitive");
			comp.setTooltip("Case sensitive");
			comp.onClick(() => {
				settings.flags = settings.flags.length > 0 ? "" : "i";
				refreshFlagsView();
			});

			refreshFlagsView();
		});

		mainSet.addText((comp: TextComponent) => {
			flagsCompForRegex = comp;
			comp.inputEl.classList.add("imgk-narrow-input");
			comp.inputEl.placeholder = "Flags";
			updateRegexFlags();
			comp.onChange((value) => {
				settings.flags = value.trim().toLowerCase();
			});

			refreshFlagsView();
		});

		mainSet.addExtraButton((comp: ExtraButtonComponent) => {
			comp.setIcon("x-circle");
			comp.onClick(() => {
				if (onRemoveAttempt) {
					onRemoveAttempt();
				}
			});
		});

		refreshFlagsView();

		// sizeSet.settingEl.classList.add(ClsGroupMemberLast);
		return mainSet;
	}
}
