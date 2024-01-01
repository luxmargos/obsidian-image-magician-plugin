import { TFile, normalizePath } from "obsidian";
import {
	ImgkSizeAdjustType,
	ImgkExportSettings,
	ImgkImageSize,
	ImgkPluginSettings,
	ImgkFileFilter,
	ImgkFileFilterType,
	ImgkSize,
	ImgkTextFilter,
} from "./settings";
import {
	lowerCasedExtNameWithoutDot,
	nonDotDirName,
} from "../utils/obsidian_path";
import * as pb from "path-browserify";

const resolveSizeNum = (num?: number): number | undefined => {
	if (num === undefined) {
		return undefined;
	}

	if (isNaN(num)) {
		return undefined;
	}
	let roundedNum = Math.round(num);
	if (roundedNum <= 0) {
		return undefined;
	}

	return roundedNum;
};

const resolveScaleNum = (num?: number): number | undefined => {
	if (num === undefined) {
		return undefined;
	}

	if (isNaN(num)) {
		return undefined;
	}
	return num;
};

export type SizeAdjFunc = (size: ImgkSize) => void;
export type ImageAdj = {
	width: number;
	height: number;
	scaleX: number;
	scaleY: number;
};
export type ImageAdjFunc = (size: ImgkSize) => ImageAdj;

export type ImgkRuntimeExportSettings = {
	data: ImgkExportSettings;
	imageAdjFunc: ImageAdjFunc;
	exportSourceFilterFunc: (fileOrPath: TFile | string) => boolean;
};

export const convertAllExportSettingsToRuntime = (
	pluginSetings: ImgkPluginSettings
): ImgkRuntimeExportSettings[] => {
	const result = [];
	const allExtSet: Set<string> = new Set();

	for (const autoExport of pluginSetings.autoExportList) {
		if (!autoExport.active) {
			continue;
		}

		result.push(
			convertExportSettingsToRuntime(pluginSetings, autoExport, allExtSet)
		);
	}

	return result;
};

export const convertExportSettingsToRuntime = (
	pluginSetings: ImgkPluginSettings,
	settings: ImgkExportSettings,
	allExtSet: Set<string>
): ImgkRuntimeExportSettings => {
	const sideAdjFuncs: SizeAdjFunc[] = [];
	const imageAdjFunc = (size: ImgkSize): ImageAdj => {
		const resultSize: ImgkSize = {
			x: size.x,
			y: size.y,
		};
		const resultScale: ImgkSize = {
			x: 1,
			y: 1,
		};

		for (const func of sideAdjFuncs) {
			func(resultSize);
			if (resultSize.x < 0) {
				resultSize.x = resultSize.x * -1;
				resultScale.x = resultScale.x * -1;
			}

			if (resultSize.y < 0) {
				resultSize.y = resultSize.y * -1;
				resultScale.y = resultScale.y * -1;
			}
		}

		return {
			width: resultSize.x,
			height: resultSize.y,
			scaleX: resultScale.x,
			scaleY: resultScale.y,
		};
	};

	const sourceFilterFuncs: PathFilterFunc[] = [];

	let extFilter: string[] = settings.pathOpts.sourceExts;

	const extSet: Set<string> = new Set();
	extFilter.forEach((value) => {
		const lowerExt = value.toLowerCase();
		const upperExt = value.toUpperCase();
		extSet.add(lowerExt);
		extSet.add(upperExt);
		// allExtSetWithDot.add(`.${lowerExt}`);
		// allExtSetWithDot.add(`.${upperExt}`);
		allExtSet.add(lowerExt);
		allExtSet.add(upperExt);
	});

	const exportSourceFilterFunc = (fileOrPath: TFile | string): boolean => {
		let path: string;

		if (fileOrPath instanceof TFile) {
			path = fileOrPath.path;
		} else {
			path = normalizePath(fileOrPath);
		}

		const ext = lowerCasedExtNameWithoutDot(path);

		const sourceDir = settings.pathOpts.sourceDir;
		const normalizedSourceDir = normalizePath(sourceDir);
		if (settings.pathOpts.recursiveSources) {
			if (sourceDir.length > 0 && !path.startsWith(sourceDir)) {
				return false;
			}
		} else {
			const pathDir = normalizePath(nonDotDirName(path));
			if (normalizedSourceDir !== pathDir) {
				return false;
			}
		}

		if (!extSet.has(ext)) {
			return false;
		}

		// if(extFilter.includes())
		for (const func of sourceFilterFuncs) {
			if (!func(path)) {
				return false;
			}
		}

		return true;
	};

	for (const sizeAdj of settings.imgProps.sizeAdjustments) {
		sideAdjFuncs.push(exportSizeAdjAsFunc(sizeAdj));
	}

	for (const filter of settings.pathOpts.builtInSourceFilters) {
		if (!filter.active) {
			continue;
		}
		sourceFilterFuncs.push(
			exportBuiltInSourceFilterAsFunc(filter, allExtSet)
		);
	}
	for (const filter of settings.pathOpts.sourceFilters) {
		if (!filter.active) {
			continue;
		}
		sourceFilterFuncs.push(exportSourceFilterAsFunc(filter));
	}

	return {
		data: settings,
		imageAdjFunc: imageAdjFunc,
		exportSourceFilterFunc,
	};
};

export const exportSizeAdjAsFunc = (sizeAdj: ImgkImageSize): SizeAdjFunc => {
	if (sizeAdj.type === ImgkSizeAdjustType.Scale) {
		return (size: ImgkSize) => {
			const x = resolveScaleNum(sizeAdj.x);
			const y = resolveScaleNum(sizeAdj.y);

			if (x !== undefined && y !== undefined) {
				size.x = size.x * x;
				size.y = size.y * y;
			} else if (x !== undefined) {
				const ratio = size.y / size.x;
				size.x = size.x * x;
				size.y = size.x * ratio;
			} else if (y !== undefined) {
				const ratio = size.x / size.y;
				size.y = size.y * y;
				size.x = size.y * ratio;
			}
		};
	}

	if (sizeAdj.type === ImgkSizeAdjustType.Fixed) {
		return (size: ImgkSize) => {
			const x = resolveSizeNum(sizeAdj.x);
			const y = resolveSizeNum(sizeAdj.y);

			if (x !== undefined && y !== undefined) {
				size.x = x;
				size.y = y;
			} else if (x !== undefined) {
				const ratio = size.y / size.x;
				size.x = x;
				size.y = size.x * ratio;
			} else if (y !== undefined) {
				const ratio = size.x / size.y;
				size.y = y;
				size.x = size.y * ratio;
			}
		};
	}

	if (sizeAdj.type === ImgkSizeAdjustType.Minimum) {
		return (size: ImgkSize) => {
			const x = resolveSizeNum(sizeAdj.x);
			const y = resolveSizeNum(sizeAdj.y);

			while (true) {
				let passed = true;
				if (x !== undefined) {
					if (size.x < x) {
						passed = false;
						const ratio = size.y / size.x;
						size.x = x;
						size.y = size.x * ratio;
					}
				}
				if (y !== undefined) {
					if (size.y < y) {
						passed = false;
						const ratio = size.x / size.y;
						size.y = y;
						size.x = size.y * ratio;
					}
				}
				if (passed) {
					break;
				}
			}
		};
	}

	if (sizeAdj.type === ImgkSizeAdjustType.Maximum) {
		return (size: ImgkSize) => {
			const x = resolveSizeNum(sizeAdj.x);
			const y = resolveSizeNum(sizeAdj.y);

			while (true) {
				let passed = true;
				if (x !== undefined) {
					if (size.x > x) {
						passed = false;
						const ratio = size.y / size.x;
						size.x = x;
						size.y = size.x * ratio;
					}
				}
				if (y !== undefined) {
					if (size.y > y) {
						passed = false;
						const ratio = size.x / size.y;
						size.y = y;
						size.x = size.y * ratio;
					}
				}
				if (passed) {
					break;
				}
			}
		};
	}

	return (size: ImgkSize) => {};
};

export type PathFilterFunc = (path: string) => boolean;

const exportBuiltInSourceFilterAsFunc = (
	filter: ImgkFileFilter,
	extSet: Set<string>
): PathFilterFunc => {
	if (filter.type === ImgkFileFilterType.DoubleExtsBlocker) {
		// Block export if the filename has at least two extensions, e.g., 'my_image.psd.exported.png', 'my_image.png.exported.png'.
		return (path: string) => {
			const fileName = pb.basename(path);
			const fileNameComps = fileName.split(".");
			let matchCount = 0;
			for (const comp of fileNameComps) {
				if (extSet.has(comp)) {
					matchCount += 1;
				}

				if (matchCount >= 2) {
					return false;
				}
			}
			return true;
		};
	}

	return (path: string) => true;
};

const exportSourceFilterAsFunc = (filter: ImgkTextFilter): PathFilterFunc => {
	if (
		filter.type === ImgkFileFilterType.Includes ||
		filter.type === ImgkFileFilterType.Excludes
	) {
		if (filter.flags.includes("i") || filter.flags.includes("I")) {
			const lowerCasedContent = filter.content.toLowerCase();
			if (filter.type === ImgkFileFilterType.Includes) {
				return (path: string) => {
					return path.toLowerCase().includes(lowerCasedContent);
				};
			} else {
				return (path: string) => {
					return !path.toLowerCase().includes(lowerCasedContent);
				};
			}
		}

		const content = filter.content;
		if (filter.type === ImgkFileFilterType.Includes) {
			return (path: string) => {
				return path.includes(content);
			};
		} else {
			return (path: string) => {
				return !path.includes(content);
			};
		}
	}

	if (
		filter.type === ImgkFileFilterType.RegexMatch ||
		filter.type === ImgkFileFilterType.RegexNonMatch
	) {
		let regex: RegExp | undefined;
		try {
			regex = new RegExp(filter.content, filter.flags);
		} catch (err) {}

		if (!regex) {
			try {
				regex = new RegExp(filter.content, filter.flags);
			} catch (e) {}
		}

		if (regex) {
			const reqRegex = regex;
			if (filter.type === ImgkFileFilterType.RegexMatch) {
				return (path: string) => {
					return reqRegex.test(path);
				};
			} else {
				return (path: string) => {
					return !reqRegex.test(path);
				};
			}
		}

		return (path: string) => true;
	}

	return (path: string) => true;
};
