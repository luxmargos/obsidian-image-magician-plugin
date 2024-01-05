export default {
	SUPPORTED_FORMATS: "Supported formats",
	SUPPORTED_FORMATS_DESC:
		"The plugin will support viewing the image formats listed here. Additionally, you can try any image format by adding it to the list with comma separation. If you attempt to remove a format from the list, restart the Obsidian application to apply the changes.",
	FORMATS_PLACEHOLDER: "e.g., psd, tiff, xcf",
	FORMATS_WARN:
		"Warning: attempting to add already supported extensions in obsidian",
	MD_SUPPORT: "Markdown support (for plugin-supported image formats only).",
	MD_SUPPORT_DESC:
		"Here are some options to make the supported image formats in the plugin behave like default Obsidian image formats in markdown.",

	MD_SUPPORT_ALL: "Markdown support for all images",

	INLINE_LINK_RENDER: "Inline link rendering",
	INLINE_LINK_RENDER_DESC:
		"The markdown inline link, such as ![[...]], will be rendered.",

	HTML_IMG_RENDER_RES_PATH: "HTML <img> tag rendering",
	HTML_IMG_RENDER_RES_PATH_DESC:
		'The <img> tag will be rendered with the file\'s resource path in the "src" attribute, such as src="app://..../img.psd"',

	SUPPORT_VAULT_PATH_IN_ELEMENT:
		"Supports using vault path syntax in `<img>` element.",
	SUPPORT_VAULT_PATH_IN_ELEMENT_DEC: `With this option, you can insert vault file paths in the 'src' attribute, such as <img src="My_Image.png">, <img src="[[My_Image.png]]">.`,

	PLAIN_PATH: "Plain path",
	PLAIN_PATH_DESC: 'Detects plain text, such as `src="Folder/Image.png"`',

	LINK_SYNTAX: "Link syntax",
	LINK_SYNTAX_DESC:
		'Detects markdown link syntax, such as `src="[[Image.png]]"`',

	OVERRIDE_DND: "Override drag and drop (experimental)",
	EXPORT: "Export",
	EXPORT_DESC:
		"Broader supported image formats, such as png, jpg, and webp, are always better in markdown.",

	INSTANT_EXPORT_FILE_TYPES: "Instant export file types",
	INSTANT_EXPORT_FILE_TYPES_DESC:
		"Easily access the image export dialog from the file context menu or a command if the active file's extension is included in the list. You can try different image formats by adding them to the list using commas for separation.",

	AUTO_EXPORT_OPT_RENAME: "Rename exproted images on source file rename",
	AUTO_EXPORT_OPT_RENAME_DESC:
		"Exported images will be renamed when their source files are renamed.",

	AUTO_EXPORT_OPT_DELETE: "Delete exported images on source file delete",
	AUTO_EXPORT_OPT_DELETE_DESC:
		"Exported images will be deleted when their source files are deleted.",

	NAME: "Name",
	PATH_SIMULATION: "Path simulation",

	SOURCE: "Source",
	DESTINATION: "Destination",

	INVALID_SETTINGS_MSG: "There are invalid settings.",
	SOURCE_FOLDER: "Folder",
	SOURCE_FOLDER_DESC:
		"Specify the folder to include its children files in export entries, or leave it empty to set it as the vault's root folder.",

	RECURSIVE: "Recursive",
	RECURSIVE_DESC: "Includes files from sub-folders recursively.",

	IMAGE_FORMAT_FILTER: "Image format filter",
	IMAGE_FORMAT_FILTER_DESC:
		"Insert the image formats you want to be exported, separated by commas.",

	FILTERS: "Filters",
	FILTERS_DESC: "You can export specific files using filter options.",
	BUILT_IN_FILTERS: "Built-in filters",

	NO_ACTIVE_ITEMS: "no activated items",
	ACTIVE_ITEMS: "items activated",
	BUILT_IN_FILTERS_DESC:
		"Filters to enhance auto-export stability. You can enable or disable each setting individually.",

	DOUBLE_EXTS_BLOCKER: "Double extensions blocker",
	DOUBLE_EXTS_BLOCKER_DESC:
		"Avoid export if source file has at least two extensions. The filter determine file is already exported from another source. e.g, 'MyImage.psd.exported.png'",

	AS_RELATIVE_FOLDER: "As relative folder",
	AS_RELATIVE_FOLDER_DESC:
		"If turned on, all exported images will be generated relative to their source file. Otherwise, they will be generated into the absolute folder.",

	FOLDER_ABSOLUTE: "Folder (Absolute)",
	FOLDER_RELATIVE: "Folder (Relative)",

	FILE_NAME_FORMAT: "File name format",
	PREFIX: "Prefix",
	SUFFIX: "Suffix",
	EXPORT_AS: "Export as ...",
	RESET: "Reset",

	AUTO_EXPORT: "Auto export",
	AUTO_EXPORT_DESC:
		"Automatically export the images in the selected format when the original image is modified or created.",
	AUTO_EXPORT_ENTRY: "Auto export entry",

	IMAGE_OPTIONS: "Image options",
	FORMAT: "Format",
	QUALITY: "Quality",

	ADJS_IMG_SIZE: "Image size adjustments",
	AJDS_IMG_SIZE_DESC:
		"With these options, the image will resize to the dimensions subsequently listed here during the export process. If you want to maintain the aspect ratio, leave the other size component (width or height) empty. To flip an image, use a negative scale, such as '-1'.",

	WIDTH_S: "width",
	HEIGHT_S: "height",

	CONTAINS_TEXT: "Contains text",
	EXCLUDES_TEXT: "Excludes text",

	REG_EXP_MATH: "Regular exp. (match)",
	REG_EXP_NON_MATH: "Regular exp. (non-match)",

	PATTERN: "Pattern",
	CASE_SENSITIVE: "Case sensitive",
	FLAGS: "Flags",
	EMPTY: "empty",

	EXPORT_SETTINGS: "Export settings",
	EXPORT_OPTIONS: "Export options",

	AUTO_EXPORT_TIP:
		"Tip: Recommended settings to prevent an infinite export loop.",
	AUTO_EXPORT_TIP_DESC:
		"In general, the plugin efficiently blocks an infinite export loop by using built-in filters \
and including two file extensions in the exported file name. When you want to break these default rules, \
an infinite export loop can occur with exported files having the same file extension, \
for example, 'MyImage.png.export.png.' \
In this circumstance, the auto-export process will continue until the file name exceeds its limit. \
If you find yourself in this situation, please refer to the following details.",

	AUTO_EXPORT_TIP_1:
		"1. Set a specific source folder instead of the root folder of the vault or turn off the recursive option.",
	AUTO_EXPORT_TIP_2: "2. Keep the source and exported folders separate",
	AUTO_EXPORT_TIP_3:
		"3. For plans with complex settings, consider using filters.",

	OPEN_IMAGE_EXPORT_DIALOG: "Open image export dialog",
	PROCESS_AUTO_EXPORT_SETTINGS: "Process all auto-export settings",
	PROCESS_AUTO_EXPORT_SETTINGS_FORCED:
		"Process all auto-export settings (forced)",

	MISCELLANEOUS: "Miscellaneous",
	EXCALIDRAW_STRETCHED_EMBEDDING:
		"Excalidraw: stretched image embedding mode",

	FORMAT_EXPORT_SUCCESS: 'Export successful: "${src}" as "${dst}"',
	FORMAT_EXPORT_FAILED: 'Export failed: "${src}"',
	FORMAT_SOURCE: "Source: ${src}",
	FORMAT_FAILED_EXT_LIST:
		'Some file extensions, such as "[${list}]" have failed to register in the obsidian app. The plugin will not support viewing them. Consider changing the ${name} plugin settings.',

	RENDER_OPT_BLOB_URL: "Blob (Better performance)",
	RENDER_OPT_DATA_URL: "Data URL (Markdown export friendly)",
	RENDER_MODE: "Render mode",
	RENDER_MODE_DESC:
		"Choose a rendering solution; if you encounter issues with export/publish, try the 'Data URL' option. You need to reload the document to apply changes.",

	WARN_PLUGIN_START_UP: "Warning on plugin startup",
	ERROR_PLUGIN_START_UP: "Error occurred on plugin startup",
	ERROR_IMAGE_MAGICK_LOAD_FAILED:
		"Initialization failed with ImageMagick. The browser appears lack of compatibility. Please try reinstalling this plugin or restarting the application.",
};
