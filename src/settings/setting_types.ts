import { ExportFormat } from "../export_pack/export_types";

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

export enum ImgkFolderDeterminer {
	Relative = 0,
	AbsoluteAndReflectFolderStructure = 1,
	Absolute = 2,
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
	/** @deprecated */
	asRelativePath?: boolean;
	folderDeterminer: ImgkFolderDeterminer;
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

export type ImgkPluginVaultBasedPathOptions = {
	enabled: boolean;
	plainText: boolean;
	inlineLink: boolean;
	filters: {
		el: string;
		attr: string;
	}[];
};

// Remember to rename these classes and interfaces!
export interface ImgkPluginSettings {
	/** Plugin version */
	version?: string;

	supportedFormats: string[];
	exportMenuSupportedFormats: string[];

	autoExportList: ImgkExportSettings[];
	instantExport: ImgkExportSettings;

	renderMarkdownInlineLink: boolean;
	renderMarkdownImgTag: boolean;
	overrideDragAndDrop: boolean;
	useBlob: boolean;

	excalidrawStretchEmbed: boolean;

	trackRename: boolean;
	trackDelete: boolean;

	/**
	 * Base features
	 */
	previewLink: boolean;
	/** support obsidian's markdown based imgage size format. e.g., [[IMAGE | IMAGE_SIZE]]*/
	supportMdImageSizeFormat: boolean;

	vaultBasedPathSupporter: ImgkPluginVaultBasedPathOptions;
}
