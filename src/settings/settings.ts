import { ExportFormat } from "../exporter";

export const EXCLUDES = ["svg", "gif", "jpg", "png", "webp", "mp4"];

// Remember to rename these classes and interfaces!
export interface ImgMagicianPluginSettings {
	supportedFormats: string[];
	exportRelativePath: boolean;
	exportDirAbs: string;
	exportDirRel: string;

	fileNamePrefix: string;
	fileNameSuffix: string;

	autoExportFormats: ExportFormat[];

	supportAutoImgSrcLink: boolean;
	viewTreatVerticalOverflow: boolean;

	previewLink: boolean;
	/** support obsidian's markdown based imgage size format. e.g., [[IMAGE | IMAGE_SIZE]]*/
	supportMdImageSizeFormat: boolean;
	disbleClickToNavigate: boolean;
	previewImgTag: boolean;
}

export const DEFAULT_SETTINGS: ImgMagicianPluginSettings = {
	supportedFormats: [
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
		// MagickFormat.Tga.toLowerCase(),
	],

	exportRelativePath: true,
	exportDirAbs: "Psd Support",
	exportDirRel: "",

	fileNamePrefix: "",
	fileNameSuffix: ".exported",
	autoExportFormats: [],

	supportAutoImgSrcLink: true,
	viewTreatVerticalOverflow: false,

	previewLink: true,
	supportMdImageSizeFormat: true,
	disbleClickToNavigate: false,
	previewImgTag: true,
};

export class SettingsUtil {
	_settings: () => ImgMagicianPluginSettings;

	constructor(getSettings: () => ImgMagicianPluginSettings) {
		this._settings = getSettings;
	}

	getExportFormats = (): ExportFormat[] => {
		return this._settings().autoExportFormats;
	};

	getSupportedFormats = () => {
		return this._settings().supportedFormats;
	};
}
