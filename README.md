# Obsidian Image Magician Plugin

This plugin for Obsidian (https://obsidian.md) supports various image formats
not natively supported by the Obsidian app.

With this plugin, you can use various features based on images,
such as preview, link, embed, and export to other image formats like png, jpg, and webp.

This project mainly utilizes [magick-wasm](https://github.com/dlemstra/magick-wasm) to offer rendering and export features.
Especially, a dedicated engine [@webtoon/psd](https://github.com/webtoon/psd) is ready for the psd (Photoshop) format.

## Support

If you find this plugin helpful, please consider supporting the project.

[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/luxmargos)

## Features

-   Render

    -   Display various image formats in Obsidian without a third-party application. Add more formats within the plugin's settings.
    -   Markdown inline link syntax is supported, such as `![[My Image.psd]]`.
    -   HTML `<img>` tag is supported. However, it requires a resource path such as `src="app://..../My Image.psd"` to be visible. The Markdown link syntax, such as 'src="My Image.psd,"' is planned for a future update.

-   Export as png, jpg, webp
    -   You can promptly export specific images through the context menu or a command.
    -   The plugin features an auto-export functionality that triggers when the source file undergoes changes, determined by the file's modified date. You can customize which source files you wish to automatically export.

## Installation

### Manually Installing the Plugin

-   Create a plugin folder in your vault at `VaultFolder/.obsidian/plugins/image-magician-plugin`.
-   Download the latest release and copy over `main.js`, `styles.css`, and `manifest.json` into the folder.

### From the Community Plugins List

Search and install "Image Magician" in Obsidian's community plugins browser, then enable the plugin.

## Tips

Also you can embed any image directly such as psd, tiff, heic that plugin has support and a preview in markdown works well.
Although, using the boarder image formats are highly recommended such as jpg, png. I think that is more comfortable way, and plugin's auto-export feature will help it.

## Image formats

You can try with any known image formats that see through the plugin settings.
However, the plugin not guarantee it is works.

### Default supported formats in plugin

Here the list below that registered as default supported formats in plugin.

| Format          | Note                                                              |
| --------------- | ----------------------------------------------------------------- |
| PSD             | Photoshop.                                                        |
| PSB             | Photoshop (large format).                                         |
| TIFF,TIF,TIFF64 |                                                                   |
| DCM             |                                                                   |
| DDS             |                                                                   |
| HDR             |                                                                   |
| HEIC            |                                                                   |
| MNG             |                                                                   |
| PBM             |                                                                   |
| PCX             |                                                                   |
| PFM             |                                                                   |
| PGM             |                                                                   |
| PNM             |                                                                   |
| PPM             |                                                                   |
| SGI             |                                                                   |
| XBM             |                                                                   |
| XCF             | Gimp image. However, as I confirmed, it renders only single layer |

### Excludes: These are basically handled in obsidian

| Format | Note                 |
| ------ | -------------------- |
| PNG    |                      |
| JPG    |                      |
| WEBP   |                      |
| GIF    |                      |
| SVG    |                      |
| BMP    |                      |
| AVIF   | Since obsidian 1.5.3 |

### Seems Broken in ImageMagick

These are listed on Image Magick library. But not works.

| Format | Note                           |
| ------ | ------------------------------ |
| TGA    | Truevision Targa image         |
| SVG    | Required inkscape command line |

## Known problems and Tips

### Link suggestion

This problem(or just intended flow of an obsidian) has been found at least obsidian 0.15.0.
You might have not shown link suggestion when you embed 3rd party images that are not default supported in obsidian.
You can resolve it through turning on the 'Settings > File & Links > Detect all file extensions'.
And another way, use a plugin such as [Boost Link Suggestions](https://github.com/jglev/obsidian-boost-link-suggestions).

This issue (or the intended behavior in Obsidian) has been identified in at least Obsidian 0.15.0. You may not see link suggestions when embedding third-party images that are not default supported in Obsidian. You can resolve this by turning on 'Settings > File & Links > Detect all file extensions.' Alternatively, you can use a plugin such as [Boost Link Suggestions](https://github.com/jglev/obsidian-boost-link-suggestions).

## Format list in image-magick

The document of image-magick, there are listed various formats (100+),
but as I confirmed some of formats has been incomplete drawing or throw errors.
Therefore, I listed some of formats as default plugin supported that I confirmed that is renders as expected.

[Dump: Supported formats in Image Magick](./docs/ImageMagick_dump.md)
