import { cloneDeep, size } from "lodash-es";
import { buildFileNameFormat } from "../export_pack/export_utils";
import { satisfies } from "compare-versions";
import { TAbstractFile, TFile, apiVersion } from "obsidian";
import {
	OBSIDIAN_NATIVE_IMAGE_FORMATS_1_5_3,
	OBSIDIAN_NATIVE_IMAGE_FORMATS_OLD,
	WARN_LIST_1_5_3,
	WARN_LIST_OLD,
} from "./obsidian_formats";
import {
	ImgkRuntimeExportSettings,
	convertAllExportSettingsToRuntime,
} from "./settings_as_func";
import { asTFile, isTFile } from "../vault_util";
import packageJson from "../../package.json";
import {
	ImgkExportSettings,
	ImgkFileFilterType,
	ImgkPluginSettings,
} from "./setting_types";
import { ExportFormatPng } from "../export_pack/export_types";

export const DEFAULT_EXPORT_SUPPORTED_FORMATS = [
	"psd",
	"psb",
	"xcf",
	"tif",
	"tiff",
	"dcm",
	"dds",
	"hdr",
	"heic",
	"mng",
	"pbm",
	"pcx",
	"pfm",
	"pgm",
	"pnm",
	"ppm",
	"sgi",
	"xbm",
	"avif",
	"jpg",
	"png",
	"bmp",
	"webp",
	"gif",
	// "tga", -> decode error
	// "svg", -> no inkscape commnand
];

export const getDefaultSupportedFormats = () => {
	return [
		"psd",
		"psb",
		"xcf",
		"tif",
		"tiff",
		"dcm",
		"dds",
		"hdr",
		"heic",
		"mng",
		"pbm",
		"pcx",
		"pfm",
		"pgm",
		"pnm",
		"ppm",
		"sgi",
		"xbm",
		// supported in obsidian 1.5.3
		// "avif",
		// "jpg",
		// "png",
		// "webp",

		// image magick does not support
		// "tga", -> decode error
		// "svg", -> no inkscape commnand
	];
};

export const DEFAULT_FILE_NAME_PREFIX = "";
export const DEFAULT_FILE_NAME_SUFFIX = "export";

export const DEFAULT_FILE_NAME_FORMAT = buildFileNameFormat(
	DEFAULT_FILE_NAME_PREFIX,
	DEFAULT_FILE_NAME_SUFFIX
);

export const DEFAULT_EXPORT_SETTINGS: ImgkExportSettings = {
	name: "",
	active: false,
	format: cloneDeep(ExportFormatPng),
	imgProps: {
		quality: 1,
		sizeAdjustments: [],
	},
	pathOpts: {
		sourceDir: "",
		recursiveSources: false,
		useBuiltInSourceFilters: true,
		builtInSourceFilters: [
			{ active: true, type: ImgkFileFilterType.DoubleExtsBlocker },
		],
		sourceExts: [],
		sourceFilters: [],
		asRelativePath: false,
		exportDirAbs: "Exported Images",
		exportDirRel: "",
		useCustomFileNameFormat: false,
		fileNameFormatPrefix: DEFAULT_FILE_NAME_PREFIX,
		fileNameFormatSuffix: DEFAULT_FILE_NAME_SUFFIX,
		customFileNameFormat: DEFAULT_FILE_NAME_FORMAT,
	},
};

const cloneDefaultExportSettings = () => {
	const defaultSettings = cloneDeep(DEFAULT_EXPORT_SETTINGS);
	defaultSettings.pathOpts.asRelativePath = true;
	return defaultSettings;
};

export const DEFAULT_INSTANT_EXPORT_SETTINGS: ImgkExportSettings =
	cloneDefaultExportSettings();

export const getWarnList = () => {
	if (satisfies(apiVersion, ">=1.5.3")) {
		return WARN_LIST_1_5_3;
	}

	return WARN_LIST_OLD;
};

export const getObsidianNativeImageList = () => {
	if (satisfies(apiVersion, ">=1.5.3")) {
		return OBSIDIAN_NATIVE_IMAGE_FORMATS_1_5_3;
	}

	return OBSIDIAN_NATIVE_IMAGE_FORMATS_OLD;
};

export const DEFAULT_SETTINGS: ImgkPluginSettings = {
	version: packageJson.version,
	supportedFormats: getDefaultSupportedFormats(),

	exportMenuSupportedFormats: cloneDeep(DEFAULT_EXPORT_SUPPORTED_FORMATS),
	autoExportList: [],
	instantExport: cloneDeep(DEFAULT_INSTANT_EXPORT_SETTINGS),

	renderMarkdownInlineLink: true,
	renderMarkdownImgTag: true,
	overrideDragAndDrop: true,
	useBlob: true,

	excalidrawStretchEmbed: true,

	previewLink: true,
	supportMdImageSizeFormat: true,

	trackRename: true,
	trackDelete: false,

	vaultBasedPathSupporter: {
		enabled: true,
		plainText: true,
		inlineLink: true,
		filters: [{ el: "img", attr: "src" }],
	},
};

export class SettingsUtil {
	private settings: ImgkPluginSettings;
	private runtimeSupportedFormats: Set<string> = new Set();
	private runtimeAutoExports: ImgkRuntimeExportSettings[] = [];
	private runtimeExportSupportedFormats: Set<string> = new Set();

	constructor(settings: ImgkPluginSettings) {
		this.settings = settings;
		this.generateRuntimeAutoExports();
		this.generateRuntimeExportSupportedFormats();
	}

	getIntantExport = (): ImgkExportSettings => {
		return this.settings.instantExport;
	};

	setRuntimeSupportedFormats(formats: Set<string>) {
		this.runtimeSupportedFormats = new Set(formats);
	}

	getRuntimeSupportedFormats = () => {
		return this.runtimeSupportedFormats;
	};

	getSupportedFormats = () => {
		return this.settings.supportedFormats;
	};

	getSettingsClone = (): ImgkPluginSettings => {
		return cloneDeep(this.settings);
	};
	getSettingsRef = (): ImgkPluginSettings => {
		return this.settings;
	};

	getClone = () => {
		const cloned = new SettingsUtil(this.getSettingsClone());
		cloned.setRuntimeSupportedFormats(
			new Set(this.runtimeSupportedFormats)
		);

		return cloned;
	};

	generateRuntimeExportSupportedFormats = () => {
		this.runtimeExportSupportedFormats = new Set([
			...this.settings.exportMenuSupportedFormats,
			...this.settings.exportMenuSupportedFormats.map((value) =>
				value.toUpperCase()
			),
		]);
	};

	isExportSupportedFormat = (ext?: string): boolean => {
		if (!ext) {
			return false;
		}
		return this.runtimeExportSupportedFormats.has(ext.toLowerCase());
	};

	generateRuntimeAutoExports = () => {
		this.runtimeAutoExports.splice(0, this.runtimeAutoExports.length);
		this.runtimeAutoExports = convertAllExportSettingsToRuntime(
			this.settings
		);
	};

	findRuntimeAutoExports = (file: TAbstractFile) => {
		const tflie = asTFile(file);
		if (!tflie) {
			return [];
		}

		const result: ImgkRuntimeExportSettings[] = [];
		for (const runtimeExport of this.runtimeAutoExports) {
			if (runtimeExport.exportSourceFilterFunc(tflie)) {
				result.push(runtimeExport);
			}
		}
		return result;
	};

	getRuntimeAutoExports = () => {
		return this.runtimeAutoExports;
	};
}
