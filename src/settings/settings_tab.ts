import {
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
import { genExportPath } from "../export_pack/export_utils";
import {
	DEFAULT_EXPORT_SETTINGS,
	DEFAULT_FILE_NAME_FORMAT,
	getDefaultSupportedFormats,
	getWarnList,
	DEFAULT_FILE_NAME_PREFIX,
	DEFAULT_FILE_NAME_SUFFIX,
	DEFAULT_EXPORT_SUPPORTED_FORMATS,
} from "./settings";
import { cloneDeep } from "lodash-es";
import { ImgkPluginExportDialog } from "../dialogs/export_opt_dialog";
import { normalizeObsidianDir } from "../utils/obsidian_path";
import { debug } from "loglevel";
import { t } from "../i18n/t";
import { exportFormatList } from "../export_pack/export_types";
import {
	ImgkExportSettings,
	ImgkFileFilterType,
	ImgkImageSize,
	ImgkPluginSettings,
	ImgkSizeAdjustType,
	ImgkTextFilter,
} from "./setting_types";

const ClsGroupMember = "imgk-settings-group-member";
const ClsGroupMemberLast = "imgk-settings-group-member-last";
const ClsGroupMemberFirst = "imgk-settings-group-member-first";

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
		// new Setting(containerEl).setName("General").setHeading();

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

		const supportedFormatSets = ImgkPluginSettingTab.createFormatEditSets(
			containerEl,
			t("SUPPORTED_FORMATS"),
			t("SUPPORTED_FORMATS_DESC"),
			t("FORMATS_PLACEHOLDER"),
			false,
			() => settings.supportedFormats,
			() => getDefaultSupportedFormats(),
			(value: string[]) => {
				settings.supportedFormats = value;
			},
			(value: string) => {
				refreshWarnings();
			}
		);

		supportedFormatSets.setting[0].setHeading();
		supportedFormatSets.setting[1].settingEl.classList.add(
			ClsGroupMemberLast
		);

		warnSet = new Setting(containerEl);
		warnSet.setName(t("FORMATS_WARN"));
		warnSet.settingEl.classList.add("imgk-warning");
		warnSet.settingEl.classList.add("imgk-no-border");
		warnSet.settingEl.classList.add(ClsGroupMemberLast);
		refreshWarnings();

		const renderOptionSet = new Setting(containerEl);
		renderOptionSet
			.setName(t("RENDER_MODE"))
			.setDesc(t("RENDER_MODE_DESC"));

		renderOptionSet.addDropdown((comp) => {
			const blobUrl = "blob_url";
			const dataUrl = "data_url";
			comp.addOption(blobUrl, t("RENDER_OPT_BLOB_URL"));
			comp.addOption(dataUrl, t("RENDER_OPT_DATA_URL"));
			comp.setValue(settings.useBlob ? blobUrl : dataUrl);

			comp.onChange((value) => {
				if (value === blobUrl) {
					settings.useBlob = true;
				} else {
					settings.useBlob = false;
				}
			});
		});

		const markdownSupportSet = new Setting(containerEl);
		markdownSupportSet.setName(t("MD_SUPPORT"));
		markdownSupportSet.setDesc(t("MD_SUPPORT_DESC"));
		markdownSupportSet.setHeading();

		new Setting(containerEl)
			.setName(t("INLINE_LINK_RENDER"))
			.setDesc(t("INLINE_LINK_RENDER_DESC"))
			.addToggle((comp) => {
				comp.setValue(settings.renderMarkdownInlineLink);
				comp.onChange((value) => {
					settings.renderMarkdownInlineLink = value;
				});
			});

		new Setting(containerEl)
			.setName(t("HTML_IMG_RENDER_RES_PATH"))
			.setDesc(t("HTML_IMG_RENDER_RES_PATH_DESC"))
			.addToggle((comp) => {
				comp.setValue(settings.renderMarkdownImgTag);
				comp.onChange((value) => {
					settings.renderMarkdownImgTag = value;
				});
			});

		new Setting(containerEl)
			.setName(t("OVERRIDE_DND"))
			.addToggle((comp) => {
				comp.setValue(settings.overrideDragAndDrop);
				comp.onChange((value) => {
					settings.overrideDragAndDrop = value;
				});
			});

		new Setting(containerEl).setName(t("MD_SUPPORT_ALL")).setHeading();

		let vaultPathSyntaxParsePlainTextSet: Setting;
		let vaultPathSyntaxParseLinkSet: Setting;
		const resfreshVaultPathSyntaxOptions = () => {
			vaultPathSyntaxParsePlainTextSet?.settingEl.toggle(
				settings.vaultBasedPathSupporter.enabled
			);
			vaultPathSyntaxParseLinkSet?.settingEl.toggle(
				settings.vaultBasedPathSupporter.enabled
			);
		};

		new Setting(containerEl)
			.setName(t("SUPPORT_VAULT_PATH_IN_ELEMENT"))
			.setDesc(t("SUPPORT_VAULT_PATH_IN_ELEMENT_DEC"))
			.addToggle((comp) => {
				comp.setValue(settings.vaultBasedPathSupporter.enabled);
				comp.onChange((value) => {
					settings.vaultBasedPathSupporter.enabled = value;
					resfreshVaultPathSyntaxOptions();
				});
				resfreshVaultPathSyntaxOptions();
			});

		vaultPathSyntaxParsePlainTextSet = new Setting(containerEl);
		vaultPathSyntaxParsePlainTextSet
			.setName(t("PLAIN_PATH"))
			.setDesc(t("PLAIN_PATH_DESC"))
			.addToggle((comp) => {
				comp.setValue(settings.vaultBasedPathSupporter.plainText);
				comp.onChange((value) => {
					settings.vaultBasedPathSupporter.plainText = value;
				});
			});
		vaultPathSyntaxParseLinkSet = new Setting(containerEl)
			.setName(t("LINK_SYNTAX"))
			.setDesc(t("LINK_SYNTAX_DESC"))
			.addToggle((comp) => {
				comp.setValue(settings.vaultBasedPathSupporter.inlineLink);
				comp.onChange((value) => {
					settings.vaultBasedPathSupporter.inlineLink = value;
				});
			});

		resfreshVaultPathSyntaxOptions();

		// AUTO EXPORT
		const headingSet = new Setting(containerEl);
		headingSet.setName(t("EXPORT"));
		headingSet.setDesc(t("EXPORT_DESC"));
		headingSet.setHeading();

		const exportMenuSupportedSets =
			ImgkPluginSettingTab.createFormatEditSets(
				containerEl,
				t("INSTANT_EXPORT_FILE_TYPES"),
				t("INSTANT_EXPORT_FILE_TYPES_DESC"),
				t("FORMATS_PLACEHOLDER"),
				false,
				() => settings.exportMenuSupportedFormats,
				() => DEFAULT_EXPORT_SUPPORTED_FORMATS,
				(value: string[]) => {
					settings.exportMenuSupportedFormats = value;
				},
				(value: string) => {}
			);

		exportMenuSupportedSets.setting[1].settingEl.addClass(
			ClsGroupMemberLast
		);

		ImgkPluginSettingTab.createExportSets(
			context,
			containerEl,
			settings,
			settings.autoExportList
		);

		new Setting(containerEl)
			.setName(t("AUTO_EXPORT_OPT_RENAME"))
			.setDesc(t("AUTO_EXPORT_OPT_RENAME_DESC"))
			.addToggle((comp) => {
				comp.setValue(settings.trackRename);
				comp.onChange((value) => {
					settings.trackRename = value;
				});
			});

		new Setting(containerEl)
			.setName(t("AUTO_EXPORT_OPT_DELETE"))
			.setDesc(t("AUTO_EXPORT_OPT_DELETE_DESC"))
			.addToggle((comp) => {
				comp.setValue(settings.trackDelete);
				comp.onChange((value) => {
					settings.trackDelete = value;
				});
			});

		new Setting(containerEl).setName(t("MISCELLANEOUS")).setHeading();
		new Setting(containerEl)
			.setName(t("EXCALIDRAW_STRETCHED_EMBEDDING"))
			.addToggle((comp) => {
				comp.setValue(settings.excalidrawStretchEmbed);
				comp.onChange((value) => {
					settings.excalidrawStretchEmbed = value;
				});
			});
	}

	static createExportGeneralSets(
		context: MainPluginContext,
		containerEl: HTMLElement,
		settings: ImgkExportSettings
	) {
		// new Setting(containerEl).setName("Export settings").setHeading();
		new Setting(containerEl)
			.setName(t("NAME"))
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
		onUpdate: () => void,
		srcFilePath?: string
	) {
		const isInstantMode = srcFilePath !== undefined;

		let dstSet: Setting;
		let exportPathTypeSet: Setting;
		let exportDirAbsSet: Setting;
		let exportDirRelativeSet: Setting;

		const pathOpts = settings.pathOpts;

		let exportPreviewSet: Setting;
		let exportPreviewSrcSet: Setting;
		let exportPreviewDstSet: Setting;

		let customPathNameSet: Setting;
		let customPathSet: Setting;
		let customPathComp: TextComponent;

		const textPreviewSettings = t("PATH_SIMULATION");

		const instantExportPathGetter = () => {
			return customPathComp?.getValue() ?? "";
		};

		const refreshExportPreview = () => {
			if (isInstantMode) {
				const exportPathData = genExportPath(
					settings,
					srcFilePath,
					undefined
				);
				if (exportPathData) {
					customPathComp?.setValue(exportPathData.dst.path);
					customPathComp?.inputEl.removeClass("imgk-warning");
					customPathNameSet?.settingEl.removeClass("imgk-warning");
				} else {
					customPathComp?.setValue("");
					customPathComp?.inputEl.addClass("imgk-warning");
					customPathNameSet?.settingEl.addClass("imgk-warning");
				}
			} else {
				try {
					if (settings.pathOpts.sourceExts.length < 1) {
						throw new Error("No source extensions");
					}

					const firstSourceExt = settings.pathOpts.sourceExts[0];
					const otherExts = settings.pathOpts.sourceExts.filter(
						(item, itemIndex) => {
							return itemIndex > 0;
						}
					);

					let testFileName = "My Image.";
					let testFilePath = testFileName + firstSourceExt;
					let srcDir = normalizeObsidianDir(
						settings.pathOpts.sourceDir
					);
					if (srcDir.length > 0) {
						testFilePath = `${srcDir}/${testFilePath}`;
					}

					let otherExtsStr: string = "";
					if (otherExts.length > 0) {
						otherExtsStr = `, ${otherExts.join(", ")}`;
					}
					exportPreviewSrcSet?.setDesc(
						`${t("SOURCE")} : ${testFilePath}${otherExtsStr}`
					);

					const exportPathData = genExportPath(
						settings,
						testFilePath,
						undefined
					);

					if (!exportPathData) {
						throw new Error("There are no export path");
					}

					exportPreviewSet?.setName(
						`${textPreviewSettings} (${exportPathData.src.ext} to ${settings.format.ext})`
					);
					exportPreviewSet?.setDesc("");
					exportPreviewSet?.settingEl.removeClass("imgk-warning");

					exportPreviewDstSet?.setDesc(
						`${t("DESTINATION")} : ${exportPathData.dst.path}`
					);
				} catch (error) {
					exportPreviewSet?.setName(textPreviewSettings);
					exportPreviewSet?.settingEl.addClass("imgk-warning");
					exportPreviewSet?.setDesc(t("INVALID_SETTINGS_MSG"));
					exportPreviewSrcSet?.setDesc("");
					exportPreviewDstSet?.setDesc("");
				}
			}
			onUpdate();
		}; // end of refresher

		if (!isInstantMode) {
			const sourceSet = new Setting(containerEl);
			sourceSet.setName(t("SOURCE"));
			sourceSet.setHeading();

			const sourceFolderSet = new Setting(containerEl);
			sourceFolderSet.setName(t("SOURCE_FOLDER"));
			sourceFolderSet.setDesc(t("SOURCE_FOLDER_DESC"));

			sourceFolderSet.addText((comp: TextComponent) => {
				comp.inputEl.classList.add("imgk-wide-input");
				comp.setValue(settings.pathOpts.sourceDir);

				comp.onChange((value) => {
					settings.pathOpts.sourceDir = normalizeObsidianDir(value);
					refreshExportPreview();
				});
			});

			new Setting(containerEl)
				.setName(t("RECURSIVE"))
				.setDesc(t("RECURSIVE_DESC"))
				.addToggle((comp) => {
					comp.setValue(settings.pathOpts.recursiveSources);
					comp.onChange((value) => {
						settings.pathOpts.recursiveSources = value;
					});
				});

			ImgkPluginSettingTab.createFormatEditSets(
				containerEl,
				t("IMAGE_FORMAT_FILTER"),
				t("IMAGE_FORMAT_FILTER_DESC"),
				t("FORMATS_PLACEHOLDER"),
				false,
				() => settings.pathOpts.sourceExts,
				() => [],
				(value: string[]) => {
					settings.pathOpts.sourceExts = value;
				},
				() => {
					refreshExportPreview();
				}
			).setting[1].settingEl.addClass(ClsGroupMemberLast);

			const listController = this.createList(
				t("FILTERS"),
				t("FILTERS_DESC"),
				false,
				containerEl,
				settings.pathOpts.sourceFilters,
				() => {
					return {
						active: true,
						content: "",
						type: ImgkFileFilterType.Includes,
						flags: "",
						isReversed: false,
					};
				},
				(listContEl, item, itemIndex) => {
					return this.createSourceFilterRow(
						context,
						listContEl,
						item,
						() => {
							listController.removeItem(itemIndex);
						}
					);
				}
			);

			let builtInFiltersListExpanded = false;
			let builtInFiltersExpandButton: ExtraButtonComponent;
			let builtInFiltersListDiv: HTMLElement;
			let builtInFiltersSet: Setting;
			const builtInFiltersName = t("BUILT_IN_FILTERS");
			const refreshBuiltInFiltersName = () => {
				let activeCount = 0;
				settings.pathOpts.builtInSourceFilters.forEach((item) => {
					if (item.active) {
						activeCount += 1;
					}
				});

				if (activeCount < 1) {
					builtInFiltersSet.setName(
						`${builtInFiltersName} (${t("NO_ACTIVE_ITEMS")})`
					);
				} else {
					builtInFiltersSet.setName(
						`${builtInFiltersName} (${activeCount} ${t(
							"ACTIVE_ITEMS"
						)})`
					);
				}
			};
			const refreshBuiltInFiltersListState = () => {
				if (builtInFiltersListExpanded) {
					builtInFiltersExpandButton?.setIcon("chevron-down");
				} else {
					builtInFiltersExpandButton?.setIcon("chevron-right");
				}
				builtInFiltersListDiv?.toggle(builtInFiltersListExpanded);
			};

			builtInFiltersSet = new Setting(containerEl)
				.setDesc(t("BUILT_IN_FILTERS_DESC"))
				.addExtraButton((comp) => {
					builtInFiltersExpandButton = comp;
					comp.onClick(() => {
						builtInFiltersListExpanded =
							!builtInFiltersListExpanded;
						refreshBuiltInFiltersListState();
					});
					refreshBuiltInFiltersListState();
				});

			builtInFiltersListDiv = this.createListDiv(containerEl);
			for (const filter of settings.pathOpts.builtInSourceFilters) {
				const filterSet = new Setting(builtInFiltersListDiv);
				if (filter.type === ImgkFileFilterType.DoubleExtsBlocker) {
					filterSet.setName(t("DOUBLE_EXTS_BLOCKER"));
					filterSet.setDesc(t("DOUBLE_EXTS_BLOCKER_DESC"));
				}

				filterSet.addToggle((comp) => {
					comp.setValue(filter.active);
					comp.onChange((value) => {
						filter.active = value;
						refreshBuiltInFiltersName();
					});
				});
			}
			refreshBuiltInFiltersListState();
			refreshBuiltInFiltersName();
		} // end of non-instant mode

		dstSet = new Setting(containerEl);
		dstSet.setName(t("DESTINATION"));
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
		exportPathTypeSet.setName(t("AS_RELATIVE_FOLDER"));
		exportPathTypeSet.setDesc(t("AS_RELATIVE_FOLDER_DESC"));

		exportPathTypeSet.addToggle((comp: ToggleComponent) => {
			comp.setValue(pathOpts.asRelativePath);
			comp.onChange((value) => {
				pathOpts.asRelativePath = value;
				refreshExportView();
			});
		});

		exportDirAbsSet = new Setting(containerEl);
		exportDirAbsSet
			.setName(t("FOLDER_ABSOLUTE"))
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
			.setName(t("FOLDER_RELATIVE"))
			.addText((comp: TextComponent) => {
				comp.inputEl.classList.add("imgk-wide-input");
				comp.setValue(pathOpts.exportDirRel);
				comp.onChange((value) => {
					pathOpts.exportDirRel = normalizeObsidianDir(value);
					refreshExportPreview();
				});
			});

		let customFileNameFormatSet: Setting;
		let fileNameFormatPrefixSet: Setting;
		let fileNameFormatSuffixSet: Setting;

		const refreshFileNameFormatSets = () => {
			customFileNameFormatSet?.settingEl.toggle(
				settings.pathOpts.useCustomFileNameFormat
			);
			fileNameFormatPrefixSet?.settingEl.toggle(
				!settings.pathOpts.useCustomFileNameFormat
			);
			fileNameFormatSuffixSet?.settingEl.toggle(
				!settings.pathOpts.useCustomFileNameFormat
			);
			refreshExportPreview();
		};

		const fileNameFormatSet = new Setting(containerEl);
		fileNameFormatSet.setName("Use custom file name format");
		fileNameFormatSet.addToggle((comp) => {
			comp.onChange((value) => {
				settings.pathOpts.useCustomFileNameFormat =
					!settings.pathOpts.useCustomFileNameFormat;
				refreshFileNameFormatSets();
			});

			refreshFileNameFormatSets();
		});

		customFileNameFormatSet = new Setting(containerEl);
		let customNameFormatSetComp: TextComponent;

		const refreshCustomNameFormatState = () => {
			if (settings.pathOpts.customFileNameFormat.trim().length < 1) {
				customFileNameFormatSet.settingEl.addClass("imgk-warning");
				customNameFormatSetComp?.inputEl.addClass("imgk-warning");
			} else {
				customFileNameFormatSet.settingEl.removeClass("imgk-warning");
				customNameFormatSetComp?.inputEl.removeClass("imgk-warning");
			}
		};

		const setCustomNameFormatControlValue = () => {
			customNameFormatSetComp?.setValue(
				settings.pathOpts.customFileNameFormat
			);
		};

		customFileNameFormatSet.setName(t("FILE_NAME_FORMAT"));
		customFileNameFormatSet.addExtraButton((comp) => {
			comp.setIcon("reset");
			comp.onClick(() => {
				settings.pathOpts.customFileNameFormat =
					DEFAULT_FILE_NAME_FORMAT;
				setCustomNameFormatControlValue();
				refreshCustomNameFormatState();
				refreshExportPreview();
			});
		});
		customFileNameFormatSet.addText((comp: TextComponent) => {
			customNameFormatSetComp = comp;
			comp.inputEl.classList.add("imgk-wide-input");
			comp.onChange((value: string) => {
				settings.pathOpts.customFileNameFormat = value;
				refreshExportPreview();
				refreshCustomNameFormatState();
			});
			setCustomNameFormatControlValue();
			refreshCustomNameFormatState();
		});

		let fileNamePrefixSetComp: TextComponent;
		const setFileNamePrefixControlValue = () => {
			fileNamePrefixSetComp?.setValue(
				settings.pathOpts.fileNameFormatPrefix
			);
		};

		fileNameFormatPrefixSet = new Setting(containerEl);
		fileNameFormatPrefixSet.setName(t("PREFIX"));
		fileNameFormatPrefixSet.addExtraButton((comp) => {
			comp.setIcon("reset");
			comp.onClick(() => {
				settings.pathOpts.fileNameFormatPrefix =
					DEFAULT_FILE_NAME_PREFIX;
				setFileNamePrefixControlValue();
				refreshExportPreview();
			});
		});
		fileNameFormatPrefixSet.addText((comp: TextComponent) => {
			fileNamePrefixSetComp = comp;
			comp.onChange((value) => {
				settings.pathOpts.fileNameFormatPrefix = value;
				refreshExportPreview();
			});
			setFileNamePrefixControlValue();
		});

		let fileNameSuffixSetComp: TextComponent;
		const setFileNameSuffixControlValue = () => {
			fileNameSuffixSetComp?.setValue(
				settings.pathOpts.fileNameFormatSuffix
			);
		};

		fileNameFormatSuffixSet = new Setting(containerEl);
		fileNameFormatSuffixSet.setName(t("SUFFIX"));
		fileNameFormatSuffixSet.addExtraButton((comp) => {
			comp.setIcon("reset");
			comp.onClick(() => {
				settings.pathOpts.fileNameFormatSuffix =
					DEFAULT_FILE_NAME_SUFFIX;
				setFileNameSuffixControlValue();
				refreshExportPreview();
			});
		});
		fileNameFormatSuffixSet.addText((comp: TextComponent) => {
			fileNameSuffixSetComp = comp;
			comp.onChange((value) => {
				settings.pathOpts.fileNameFormatSuffix = value;
				refreshExportPreview();
			});
			setFileNameSuffixControlValue();
		});

		refreshFileNameFormatSets();

		if (isInstantMode) {
			customPathNameSet = new Setting(containerEl);
			customPathNameSet.setName(t("EXPORT_AS"));
			customPathNameSet.setHeading();

			customPathSet = new Setting(containerEl);
			customPathSet.settingEl.classList.add("imgk-controls-only");
			customPathSet.addText((comp: TextComponent) => {
				customPathComp = comp;
				comp.inputEl.classList.add("imgk-wide-input");
				comp.onChange((_value) => {
					onUpdate();
				});
			});
			customPathSet.settingEl.classList.add(ClsGroupMemberLast);
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
		return { refreshExportPreview, instantExportPathGetter };
	}

	static createFormatEditSets = <T extends Array<string>>(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		placeHolder: string,
		allowEmpty: boolean,
		getter: () => T,
		defaultGetter: () => T,
		setter: (value: T) => void,
		onChange: (value: string) => void
	): {
		setting: Setting[];
	} => {
		let sourceFormatsResetBtn: ExtraButtonComponent;
		let sourceFormatsInputComp: TextAreaComponent;
		let mainSet: Setting;

		const refreshInputState = () => {
			const value = getter();
			if (!allowEmpty) {
				if (value.length < 1) {
					mainSet?.settingEl.addClass("imgk-warning");
					sourceFormatsInputComp?.inputEl.addClass("imgk-warning");
				} else {
					mainSet?.settingEl.removeClass("imgk-warning");
					sourceFormatsInputComp?.inputEl.removeClass("imgk-warning");
				}
			}
		};

		const setInputValue = () => {
			const value = getter();
			sourceFormatsInputComp.setValue(value.join(", "));
			refreshInputState();
		};
		const resetSourecFormats = () => {
			setter(cloneDeep(defaultGetter()));
			setInputValue();
		};

		mainSet = new Setting(containerEl).setName(name);

		refreshInputState();
		if (desc) {
			mainSet.setDesc(desc);
		}

		const subSet = new Setting(containerEl);
		subSet
			.addExtraButton((comp: ExtraButtonComponent) => {
				sourceFormatsResetBtn = comp;
				comp.setIcon("reset").setTooltip(t("RESET"));
				comp.onClick(() => {
					resetSourecFormats();
				});
			})
			.addTextArea((comp: TextAreaComponent) => {
				sourceFormatsInputComp = comp;
				comp.setPlaceholder(placeHolder);
				comp.inputEl.classList.add("imgk-textarea");
				comp.inputEl.addEventListener("blur", (evt) => {
					setInputValue();
				});
				setInputValue();

				comp.onChange((text: string) => {
					replaceFileFormats(getter(), text);
					onChange(text);
					refreshInputState();
				});
			});

		subSet.settingEl.addClass("imgk-controls-only");
		return {
			setting: [mainSet, subSet],
		};
	};

	static createExportSets(
		context: MainPluginContext,
		containerEl: HTMLElement,
		pluginSettings: ImgkPluginSettings,
		settings: ImgkExportSettings[],
		srcFilePath?: string
	) {
		const autoExportSet = new Setting(containerEl);
		autoExportSet.setName(t("AUTO_EXPORT"));
		autoExportSet.setDesc(t("AUTO_EXPORT_DESC"));
		autoExportSet.setHeading();

		const listController = this.createList(
			"Entries",
			"",
			false,
			containerEl,
			settings,
			() => {
				const newExportSettings = cloneDeep(DEFAULT_EXPORT_SETTINGS);
				newExportSettings.name = t("AUTO_EXPORT_ENTRY");
				return newExportSettings;
			},
			(contEl, item, itemIndex) => {
				return this.createExportRow(
					context,
					contEl,
					pluginSettings,
					item,
					srcFilePath,
					() => {
						listController.removeItem(itemIndex);
					},
					() => {
						listController.refresher();
					}
				);
			}
		);
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
			if (settings.active) {
				removeComp.extraSettingsEl.classList.add("imgk-disabled");
			} else {
				removeComp.extraSettingsEl.classList.remove("imgk-disabled");
			}

			// removeComp.extraSettingsEl.toggleVisibility(!settings.active);
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
			comp.setIcon("trash-2");
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
		settings: ImgkExportSettings,
		onUpdate: () => void
	) {
		const imagePropsSet = new Setting(containerEl);
		imagePropsSet.setName(t("IMAGE_OPTIONS"));
		imagePropsSet.setHeading();

		const exportFormatSet = new Setting(containerEl)
			.setName(t("FORMAT"))
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
					onUpdate();
				});
			});

		// formatSet.settingEl.classList.add(ClsGroupMember);

		let qualitySet: Setting;
		let qualityDisplayEl: HTMLElement | undefined;

		const refreshQualityDisplay = () => {
			if (qualityDisplayEl) {
				const q = settings.imgProps.quality ?? 1;
				qualityDisplayEl.setText(`${q * 100}%`);
			}
		};

		qualitySet = new Setting(containerEl);
		qualitySet.addSlider((comp: SliderComponent) => {
			comp.setValue(settings.imgProps.quality);
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
		qualitySet.setName(t("QUALITY"));
		// qualitySet.settingEl.classList.add(ClsGroupMember);

		const listController = this.createList(
			t("ADJS_IMG_SIZE"),
			t("AJDS_IMG_SIZE_DESC"),
			true,
			containerEl,
			settings.imgProps.sizeAdjustments,
			() => {
				return {
					type: ImgkSizeAdjustType.Fixed,
				};
			},
			(contEl, item, itemIndex) => {
				return this.genSizeSets(contEl, item, () => {
					listController.removeItem(itemIndex);
				});
			}
		);

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
			comp.inputEl.placeholder = t("WIDTH_S");
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
			comp.inputEl.placeholder = t("HEIGHT_S");
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
			comp.setIcon("trash-2");
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
				settings.type === ImgkFileFilterType.RegexMatch ||
					settings.type === ImgkFileFilterType.RegexNonMatch
			);
			flagsCompForText?.buttonEl.toggle(
				settings.type === ImgkFileFilterType.Includes ||
					settings.type === ImgkFileFilterType.Excludes
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
				ImgkFileFilterType.Includes,
				ImgkFileFilterType.RegexMatch,
			];

			comp.addOption(
				ImgkFileFilterType.Includes.toString(),
				t("CONTAINS_TEXT")
			);

			comp.addOption(
				ImgkFileFilterType.Excludes.toString(),
				t("EXCLUDES_TEXT")
			);

			comp.addOption(
				ImgkFileFilterType.RegexMatch.toString(),
				t("REG_EXP_MATH")
			);
			comp.addOption(
				ImgkFileFilterType.RegexNonMatch.toString(),
				t("REG_EXP_NON_MATH")
			);

			comp.setValue(settings.type.toString());
			comp.onChange((value: string) => {
				const valueNum = Number(value) as ImgkFileFilterType;
				settings.type = valueNum;
				updateRegexFlags();
				refreshFlagsView();
			});
		});

		mainSet.controlEl.createSpan({ cls: "imgk-fill-space" });
		mainSet.addText((comp: TextComponent) => {
			comp.inputEl.placeholder = t("PATTERN");
			comp.setValue(settings.content);
			comp.onChange((value) => {
				settings.content = value;
			});
		});

		mainSet.addButton((comp) => {
			flagsCompForText = comp;
			comp.setIcon("case-sensitive");
			comp.setTooltip(t("CASE_SENSITIVE"));
			comp.onClick(() => {
				settings.flags = settings.flags.length > 0 ? "" : "i";
				refreshFlagsView();
			});

			refreshFlagsView();
		});

		mainSet.addText((comp: TextComponent) => {
			flagsCompForRegex = comp;
			comp.inputEl.classList.add("imgk-narrow-input");
			comp.inputEl.placeholder = t("FLAGS");
			updateRegexFlags();
			comp.onChange((value) => {
				settings.flags = value.trim().toLowerCase();
			});

			refreshFlagsView();
		});

		mainSet.addExtraButton((comp: ExtraButtonComponent) => {
			comp.setIcon("trash-2");
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

	static createListDiv = (containerEl: HTMLElement) => {
		return containerEl.createDiv({
			cls: "imgk-custom-setting-item",
		});
	};
	static createList = <T>(
		name: string,
		desc: string,
		hideDescOnEmpty: boolean,
		containerEl: HTMLElement,
		list: Array<T>,
		createNew: () => T,
		createRow: (containerEl: HTMLElement, item: T, index: number) => Setting
	): { refresher: Function; removeItem: (itemIndex: number) => void } => {
		const mainSet = new Setting(containerEl);
		if (desc.length > 0) {
			mainSet.setDesc(desc);
		}

		mainSet.addButton((comp: ButtonComponent) => {
			comp.setIcon("plus-circle");
			comp.onClick((evt) => {
				list.push(createNew());
				refreshList();
			});
		});

		const allListSets: Setting[] = [];
		const listDiv = this.createListDiv(containerEl);

		const refreshList = () => {
			for (const setItem of allListSets) {
				setItem.settingEl.remove();
			}
			allListSets.splice(0, allListSets.length);

			if (list.length > 0) {
				mainSet.setName(name);
			} else {
				mainSet.setName(`${name} (${t("EMPTY")})`);
			}

			if (hideDescOnEmpty) {
				if (list.length > 0) {
					mainSet.setDesc(desc);
				} else {
					mainSet.setDesc("");
				}
			} else {
				mainSet.setDesc(desc);
			}

			list.forEach((item, itemIndex) => {
				const rowSet = createRow(listDiv, item, itemIndex);
				allListSets.push(rowSet);
			});
		};

		const removeItem = (index: number) => {
			list.splice(index, 1);
			refreshList();
		};
		refreshList();

		return {
			refresher: refreshList,
			removeItem: removeItem,
		};
	};
}
