import { cloneDeep, size } from "lodash-es";
import { ExportFormat } from "../export_settings";
import { satisfies } from "compare-versions";
import { TAbstractFile, TFile, apiVersion } from "obsidian";
import { WARN_LIST_1_5_3, WARN_LIST_OLD } from "./obsidian_formats";
import {
	ImgkRuntimeExportSettings,
	convertAllExportSettingsToRuntime,
} from "./settings_as_func";
import { isTFile } from "src/vault_util";

export enum ImgkSizeAdjustType {
	Fixed = 0,
	Scale = 1,
	Minimum = 2,
	Maximum = 3,
}

export enum ImgkFileFilterType {
	Includes = 0,
	Excludes = 1,
	RegexMatch = 2,
	RegexNonMatch = 3,
	DoubleExtsBlocker = 4,
}

export interface ImgkFileFilter {
	active: boolean;
	type: ImgkFileFilterType;
}

export interface ImgkTextFilter extends ImgkFileFilter {
	content: string;
	flags: string;
	isReversed: boolean;
}

export type ImgkSize = { x: number; y: number };

export interface ImgkExportPath {
	sourceDir: string;
	recursiveSources: boolean;
	sourceExts: string[];
	sourceFilters: ImgkTextFilter[];
	useBuiltInSourceFilters: boolean;
	builtInSourceFilters: ImgkFileFilter[];
	asRelativePath: boolean;
	exportDirAbs: string;
	exportDirRel: string;
	useCustomFileNameFormat: boolean;
	fileNameFormatPrefix: string;
	fileNameFormatSuffix: string;
	customFileNameFormat: string;
}

export interface ImgkImageSize {
	x?: number;
	y?: number;
	type: ImgkSizeAdjustType;
}

export interface ImgkExportImageProps {
	quality: number;
	sizeAdjustments: ImgkImageSize[];
}

export interface ImgkExportSettings {
	active: boolean;
	name: string;
	format: ExportFormat;
	imgProps: ImgkExportImageProps;
	pathOpts: ImgkExportPath;
}

export const getDefaultSupportedFormats = () => {
	return [
		"psd",
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

		// image magick does not support
		// "tga",
	];
};

export const DEFAULT_FILE_NAME_PREFIX = "";
export const DEFAULT_FILE_NAME_SUFFIX = "export";

export const buildFileNameFormat = (prefix: string, suffix: string) => {
	return (
		(prefix ? `${prefix}.` : "") +
		"${name}.${ext}" +
		(suffix ? `.${suffix}` : "") +
		".${dst_ext}"
	);
};

export const DEFAULT_FILE_NAME_FORMAT = buildFileNameFormat(
	DEFAULT_FILE_NAME_PREFIX,
	DEFAULT_FILE_NAME_SUFFIX
);

export const DEFAULT_EXPORT_SETTINGS: ImgkExportSettings = {
	name: "",
	active: false,
	format: {
		ext: "png",
		mimeType: "image/png",
		display: "png",
	},
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

// Remember to rename these classes and interfaces!
export interface ImgkPluginSettings {
	supportedFormats: string[];

	autoExportList: ImgkExportSettings[];
	instantExport: ImgkExportSettings;

	supportAutoImgSrcLink: boolean;
	viewTreatVerticalOverflow: boolean;

	trackRename: boolean;
	trackDelete: boolean;

	/**
	 * Base features
	 */
	previewLink: boolean;
	/** support obsidian's markdown based imgage size format. e.g., [[IMAGE | IMAGE_SIZE]]*/
	supportMdImageSizeFormat: boolean;
	disbleClickToNavigate: boolean;
	previewImgTag: boolean;
}

export const getWarnList = () => {
	if (satisfies(apiVersion, ">=1.5.3")) {
		return WARN_LIST_1_5_3;
	}

	return WARN_LIST_OLD;
};

export const DEFAULT_SETTINGS: ImgkPluginSettings = {
	supportedFormats: getDefaultSupportedFormats(),

	autoExportList: [],
	instantExport: cloneDeep(DEFAULT_EXPORT_SETTINGS),

	supportAutoImgSrcLink: true,
	viewTreatVerticalOverflow: false,

	previewLink: true,
	supportMdImageSizeFormat: true,
	disbleClickToNavigate: true,
	previewImgTag: true,

	trackRename: true,
	trackDelete: true,
};

export class SettingsUtil {
	private settings: ImgkPluginSettings;
	private runtimeSupportedSettings: string[] = [];
	private runtimeAutoExports: ImgkRuntimeExportSettings[] = [];

	constructor(settings: ImgkPluginSettings) {
		this.settings = settings;
		this.generateRuntimeAutoExports();
	}

	getIntantExport = (): ImgkExportSettings => {
		return this.settings.instantExport;
	};

	setRuntimeSupportedFormats(formats: string[]) {
		this.runtimeSupportedSettings = formats;
	}

	getRuntimeSupportedFormats = () => {
		return this.runtimeSupportedSettings;
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
			cloneDeep(this.getRuntimeSupportedFormats())
		);

		return cloned;
	};

	generateRuntimeAutoExports = () => {
		this.runtimeAutoExports.splice(0, this.runtimeAutoExports.length);
		this.runtimeAutoExports = convertAllExportSettingsToRuntime(
			this.settings
		);
	};

	findRuntimeAutoExports = (file: TAbstractFile) => {
		if (!isTFile(file)) {
			return [];
		}

		const tflie = file as TFile;

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
