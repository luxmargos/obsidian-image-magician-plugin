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
import { exportFormatList, genExportPath } from "../export_settings";
import {
	DEFAULT_EXPORT_SETTINGS,
	DEFAULT_FILE_NAME_FORMAT,
	ImgkSizeAdjustType,
	ImgkExportSettings,
	ImgkImageSize,
	ImgkPluginSettings,
	ImgkFileFilterType,
	getDefaultSupportedFormats,
	getWarnList,
	ImgkTextFilter,
	DEFAULT_FILE_NAME_PREFIX,
	DEFAULT_FILE_NAME_SUFFIX,
	DEFAULT_EXPORT_SUPPORTED_FORMATS,
} from "./settings";
import { cloneDeep } from "lodash-es";
import { ImgkPluginExportDialog } from "../dialogs/export_opt_dialog";
import { normalizeObsidianDir } from "../utils/obsidian_path";
import { debug, getLevel, getLogger } from "loglevel";

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
			"Supported formats",
			"The plugin will support viewing the image formats listed here. Additionally, you can try any image format by adding it to the list with comma separation. If you attempt to remove a format from the list, restart the Obsidian application to apply the changes.",
			"e.g., psd, tiff, xcf",
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
		warnSet.setName(
			"Warning: attempting to add default supported extensions in obsidian"
		);
		warnSet.settingEl.classList.add("imgk-warning");
		warnSet.settingEl.classList.add("imgk-no-border");
		warnSet.settingEl.classList.add(ClsGroupMemberLast);
		refreshWarnings();

		const markdownSupportSet = new Setting(containerEl);
		markdownSupportSet.setName("Markdown support");
		markdownSupportSet.setDesc(
			"Here are some options to make the supported image formats in the plugin behave like default Obsidian image formats in markdown."
		);

		markdownSupportSet.setHeading();

		new Setting(containerEl)
			.setName("Inline link rendering")
			.setDesc(
				"The markdown inline link, such as ![[...]], will be rendered."
			)
			.addToggle((comp) => {
				comp.setValue(settings.renderMarkdownInlineLink);
				comp.onChange((value) => {
					settings.renderMarkdownInlineLink = value;
				});
			});

		new Setting(containerEl)
			.setName("HTML <img> tag rendering")
			.setDesc(
				`HTML <img> Tag Rendering: The <img> tag will be rendered with the file resource path in the "src" attribute, such as src="app://..../img.psd?xxxxxxx"`
			)
			.addToggle((comp) => {
				comp.setValue(settings.renderMarkdownImgTag);
				comp.onChange((value) => {
					settings.renderMarkdownImgTag = value;
				});
			});

		new Setting(containerEl)
			.setName("Override drag and drop (experimental)")
			.addToggle((comp) => {
				comp.setValue(settings.overrideDragAndDrop);
				comp.onChange((value) => {
					settings.overrideDragAndDrop = value;
				});
			});

		// new Setting(containerEl).setName("Use BLOB").addToggle((comp) => {
		// 	comp.setValue(settings.useBlob);
		// 	comp.onChange((value) => {
		// 		settings.useBlob = value;
		// 	});
		// });

		// AUTO EXPORT

		const headingSet = new Setting(containerEl);
		headingSet.setName("Export");
		headingSet.setDesc(
			"Broader supported image formats, such as png, jpg, and webp, are always better in markdown."
		);
		headingSet.setHeading();

		const exportMenuSupportedSets =
			ImgkPluginSettingTab.createFormatEditSets(
				containerEl,
				"Instant export file types",
				"Easily access the image export dialog from the file context menu or a command if the active file's extension is included in the list. You can try different image formats by adding them to the list using commas for separation.",
				"e.g., psd, tiff, xcf",
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
			.setName("Rename exproted images on source file rename")
			.setDesc(
				"Exported images will be renamed when their source files are renamed."
			)
			.addToggle((comp) => {
				comp.setValue(settings.trackRename);
				comp.onChange((value) => {
					settings.trackRename = value;
				});
			});

		new Setting(containerEl)
			.setName("Delete exported images on source file delete")
			.setDesc(
				"Exported images will be deleted when their source files are deleted."
			)
			.addToggle((comp) => {
				comp.setValue(settings.trackDelete);
				comp.onChange((value) => {
					settings.trackDelete = value;
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

		const textPreviewSettings = "Path simulation";

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
						`Source : ${testFilePath}${otherExtsStr}`
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
						`Destination : ${exportPathData.dst.path}`
					);
				} catch (error) {
					exportPreviewSet?.setName(textPreviewSettings);
					exportPreviewSet?.settingEl.addClass("imgk-warning");
					exportPreviewSet?.setDesc("There are invalid settings.");
					exportPreviewSrcSet?.setDesc("");
					exportPreviewDstSet?.setDesc("");
				}
			}
			onUpdate();
		}; // end of refresher

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

			new Setting(containerEl)
				.setName("Recursive")
				.setDesc("Includes sub-folder files recursively.")
				.addToggle((comp) => {
					comp.setValue(settings.pathOpts.recursiveSources);
					comp.onChange((value) => {
						settings.pathOpts.recursiveSources = value;
					});
				});

			ImgkPluginSettingTab.createFormatEditSets(
				containerEl,
				"Image format filter",
				"Insert image formats of export target with comma separated list.",
				"e.g., psd, tiff, xcf",
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
				"Filters",
				"You can export specific files with filter options.",
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
			const builtInFiltersName = "Built-in filters";
			const refreshBuiltInFiltersName = () => {
				let activeCount = 0;
				settings.pathOpts.builtInSourceFilters.forEach((item) => {
					if (item.active) {
						activeCount += 1;
					}
				});

				if (activeCount < 1) {
					builtInFiltersSet.setName(
						`${builtInFiltersName} (no activated items)`
					);
				} else {
					builtInFiltersSet.setName(
						`${builtInFiltersName} (${activeCount} items activated)`
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
				.setDesc(
					"Filters to enhance auto-export stability. You can enable or disable each setting individually."
				)
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
					filterSet.setName("Double extensions blocker");
					filterSet.setDesc(
						"Avoid export if source file has at least two extensions. The filter determine file is already exported from another source. e.g, 'MyImage.psd.exported.png'"
					);
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

		customFileNameFormatSet.setName("File name format");
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
		fileNameFormatPrefixSet.setName("Prefix");
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
		fileNameFormatSuffixSet.setName("Suffix");
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
			customPathNameSet.setName("Export as ...");
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
				comp.setIcon("reset").setTooltip("Reset");
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
		autoExportSet.setName("Auto export");
		autoExportSet.setDesc(
			"Automatically export the images in the selected format when the original image is modified or created."
		);
		autoExportSet.setHeading();

		const listController = this.createList(
			"Entries",
			"",
			containerEl,
			settings,
			() => {
				const newExportSettings = cloneDeep(DEFAULT_EXPORT_SETTINGS);
				newExportSettings.name = "Auto export entry";
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
		imagePropsSet.setName("Image options");
		imagePropsSet.setHeading();

		const exportFormatSet = new Setting(containerEl)
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
		qualitySet.setName("Quality");
		// qualitySet.settingEl.classList.add(ClsGroupMember);

		const listController = this.createList(
			"Adjustments to image size",
			"",
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
				"Contains text"
			);

			comp.addOption(
				ImgkFileFilterType.Excludes.toString(),
				"Excludes text"
			);

			comp.addOption(
				ImgkFileFilterType.RegexMatch.toString(),
				"Regular expression (match)"
			);
			comp.addOption(
				ImgkFileFilterType.RegexNonMatch.toString(),
				"Regular expression (non-match)"
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
				mainSet.setName(`${name} (empty)`);
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
