# Obsidian Image Magician Plugin

This is a plugin for Obsidian (https://obsidian.md) which are support various image formats.
The Obsidian app only supports image formats that are most of web browser do.

With this plugin, you can use various features based on image, such as preview,
link, embed and export as another image format such as png, jpg.

This project mainly uses [magick-wasm](https://github.com/dlemstra/magick-wasm) to offer render and export features.
Especially, a dedicated engine [@webtoon/psd](https://github.com/webtoon/psd) is ready for the psd(photoshop) format.

## Features

-   Preview
-   Export as png, jpg
    -   Automatically export when the source file have changes(by a modified date of a file)
-   Embed in markdown

## Embed and preview in markdown

Also you can embed any image directly such as psd, tiff, heic that plugin has support and a preview in markdown works well.
Although, I recommend that embed an image as highly supported format such as jpg, png, etc, because you should consider publishment workflow.
Plugin's export feature will help it.

## Image formats

You can try with any known image formats that see through the plugin settings.
However, the plugin not guarantee it is works.

### Default supported formats in plugin

Here the list below that registered as default supported formats in plugin.

| Format          | Note                                                                       |
| --------------- | -------------------------------------------------------------------------- |
| PSD             | Photoshop. You can choose between psd or imagemagick engine as your favor. |
| TIFF,TIF,TIFF64 |                                                                            |
| DCM             |                                                                            |
| DDS             |                                                                            |
| HDR             |                                                                            |
| HEIC            |                                                                            |
| MNG             |                                                                            |
| PBM             |                                                                            |
| PCX             |                                                                            |
| PFM             |                                                                            |
| PGM             |                                                                            |
| PNM             |                                                                            |
| PPM             |                                                                            |
| SGI             |                                                                            |
| XBM             |                                                                            |
| XCF             | Gimp image. However, as I confirmed, it renders only single layer          |

### Excludes: These are basically handled in obsidian

| Format | Note |
| ------ | ---- |
| PNG    |      |
| JPG    |      |
| WEBP   |      |
| GIF    |      |

### Seems Broken in ImageMagick

These are listed on Image Magick library. But not works.

| Format | Note                   |
| ------ | ---------------------- |
| TGA    | Truevision Targa image |

## Known problems and Tips

### Link suggestion

This problem(or just intended flow of an obsidian) has been found at least obsidian 0.15.0.
You might have not shown link suggestion when you embed 3rd party images that are not default supported in obsidian.
You can resolve it through turning on the 'Settings > File & Links > Detect all file extensions'.
And another way, use a plugin such as [Boost Link Suggestions](https://github.com/jglev/obsidian-boost-link-suggestions).

## Renders checklist

The document of imagemagick, there are listed several formats (100+),
but as I confirmed some of formats has been incomplete drawing or throw errors.
Therefore, I listed some of formats as default plugin supported that I confirmed that is renders as expected.

## Appendix

### Dump: Listed in Image Magick library

Here the list I dumped a supported formats from a Image Magick library.
You have to remind that some of formats are may not work as you expected.

Version: ImageMagick 7.1.1-23 Q8 x86_64 54b13e91d:20231210 https://imagemagick.org

| Format          | Description                                                     | Note |
| --------------- | --------------------------------------------------------------- | ---- |
| 3FR             | Hasselblad CFV/H3D39II                                          |      |
| 3G2             | Media Container                                                 |      |
| 3GP             | Media Container                                                 |      |
| A               | Raw alpha samples                                               |      |
| AAI             | AAI Dune image                                                  |      |
| AI              | Adobe Illustrator CS2                                           |      |
| APNG            | Animated Portable Network Graphics                              |      |
| ART             | PFS: 1st Publisher Clip Art                                     |      |
| ARW             | Sony Alpha Raw Image Format                                     |      |
| AVI             | Microsoft Audio/Visual Interleaved                              |      |
| AVIF            | AV1 Image File Format                                           |      |
| AVS             | AVS X image                                                     |      |
| B               | Raw blue samples                                                |      |
| BAYER           | Raw mosaiced samples                                            |      |
| BAYERA          | Raw mosaiced and alpha samples                                  |      |
| BGR             | Raw blue, green, and red samples                                |      |
| BGRA            | Raw blue, green, red, and alpha samples                         |      |
| BGRO            | Raw blue, green, red, and opacity samples                       |      |
| BMP             | Microsoft Windows bitmap image                                  |      |
| BMP2            | Microsoft Windows bitmap image (V2)                             |      |
| BMP3            | Microsoft Windows bitmap image (V3)                             |      |
| C               | Raw cyan samples                                                |      |
| CAL             | Continuous Acquisition and Life-cycle Support Type 1            |      |
| CALS            | Continuous Acquisition and Life-cycle Support Type 1            |      |
| CANVAS          | Constant image uniform color                                    |      |
| CAPTION         | Caption                                                         |      |
| CIN             | Cineon Image File                                               |      |
| CLIP            | Image Clip Mask                                                 |      |
| CMYK            | Raw cyan, magenta, yellow, and black samples                    |      |
| CMYKA           | Raw cyan, magenta, yellow, black, and alpha samples             |      |
| CR2             | Canon Digital Camera Raw Image Format                           |      |
| CR3             | Canon Digital Camera Raw Image Format                           |      |
| CRW             | Canon Digital Camera Raw Image Format                           |      |
| CUBE            | Cube LUT                                                        |      |
| CUR             | Microsoft icon                                                  |      |
| CUT             | DR Halo                                                         |      |
| DATA            | Base64-encoded inline images                                    |      |
| DCM             | Digital Imaging and Communications in Medicine image            |      |
| DCR             | Kodak Digital Camera Raw Image File                             |      |
| DCRAW           | Raw Photo Decoder (dcraw)                                       |      |
| DCX             | ZSoft IBM PC multi-page Paintbrush                              |      |
| DDS             | Microsoft DirectDraw Surface                                    |      |
| DFONT           | Multi-face font package                                         |      |
| DNG             | Digital Negative                                                |      |
| DPX             | SMPTE 268M-2003 (DPX 2.0)                                       |      |
| DXT1            | Microsoft DirectDraw Surface                                    |      |
| DXT5            | Microsoft DirectDraw Surface                                    |      |
| EPDF            | Encapsulated Portable Document Format                           |      |
| EPI             | Encapsulated PostScript Interchange format                      |      |
| EPS             | Encapsulated PostScript                                         |      |
| EPSF            | Encapsulated PostScript                                         |      |
| EPSI            | Encapsulated PostScript Interchange format                      |      |
| EPT             | Encapsulated PostScript with TIFF preview                       |      |
| EPT2            | Encapsulated PostScript Level II with TIFF preview              |      |
| EPT3            | Encapsulated PostScript Level III with TIFF preview             |      |
| ERF             | Epson RAW Format                                                |      |
| EXR             | High Dynamic-range (HDR)                                        |      |
| FARBFELD        | Farbfeld                                                        |      |
| FAX             | Group 3 FAX                                                     |      |
| FF              | Farbfeld                                                        |      |
| FILE            | Uniform Resource Locator (file://)                              |      |
| FITS            | Flexible Image Transport System                                 |      |
| FL32            | FilmLight                                                       |      |
| FLV             | Flash Video Stream                                              |      |
| FRACTAL         | Plasma fractal image                                            |      |
| FTS             | Flexible Image Transport System                                 |      |
| FTXT            | Formatted text image                                            |      |
| G               | Raw green samples                                               |      |
| G3              | Group 3 FAX                                                     |      |
| G4              | Group 4 FAX                                                     |      |
| GIF             | CompuServe graphics interchange format                          |      |
| GIF87           | CompuServe graphics interchange format                          |      |
| GRADIENT        | Gradual linear passing from one shade to another                |      |
| GRAY            | Raw gray samples                                                |      |
| GRAYA           | Raw gray and alpha samples                                      |      |
| GROUP4          | Raw CCITT Group4                                                |      |
| HALD            | Identity Hald color lookup table image                          |      |
| HDR             | Radiance RGBE image format                                      |      |
| HEIC            | High Efficiency Image Format                                    |      |
| HEIF            | High Efficiency Image Format                                    |      |
| HRZ             | Slow Scan TeleVision                                            |      |
| HTTP            | Uniform Resource Locator (http://)                              |      |
| HTTPS           | Uniform Resource Locator (https://)                             |      |
| ICB             | Truevision Targa image                                          |      |
| ICO             | Microsoft icon                                                  |      |
| ICON            | Microsoft icon                                                  |      |
| IIQ             | Phase One Raw Image Format                                      |      |
| INLINE          | Base64-encoded inline images                                    |      |
| IPL             | IPL Image Sequence                                              |      |
| J2C             | JPEG-2000 Code Stream Syntax                                    |      |
| J2K             | JPEG-2000 Code Stream Syntax                                    |      |
| JNG             | JPEG Network Graphics                                           |      |
| JNX             | Garmin tile format                                              |      |
| JP2             | JPEG-2000 File Format Syntax                                    |      |
| JPC             | JPEG-2000 Code Stream Syntax                                    |      |
| JPE             | Joint Photographic Experts Group JFIF format                    |      |
| JPEG            | Joint Photographic Experts Group JFIF format                    |      |
| JPG             | Joint Photographic Experts Group JFIF format                    |      |
| JPM             | JPEG-2000 File Format Syntax                                    |      |
| JPS             | Joint Photographic Experts Group JFIF format                    |      |
| JPT             | JPEG-2000 File Format Syntax                                    |      |
| JXL             | JPEG XL (ISO/IEC 18181)                                         |      |
| K               | Raw black samples                                               |      |
| K25             | Kodak Digital Camera Raw Image Format                           |      |
| KDC             | Kodak Digital Camera Raw Image Format                           |      |
| LABEL           | Image label                                                     |      |
| M               | Raw magenta samples                                             |      |
| M2V             | MPEG Video Stream                                               |      |
| M4V             | Raw VIDEO-4 Video                                               |      |
| MAC             | MAC Paint                                                       |      |
| MAP             | Colormap intensities and indices                                |      |
| MASK            | Image Clip Mask                                                 |      |
| MAT             | MATLAB level 5 image format                                     |      |
| MEF             | Mamiya Raw Image File                                           |      |
| MIFF            | Magick Image File Format                                        |      |
| MKV             | Multimedia Container                                            |      |
| MNG             | Multiple-image Network Graphics                                 |      |
| MONO            | Raw bi-level bitmap                                             |      |
| MOV             | MPEG Video Stream                                               |      |
| MP4             | VIDEO-4 Video Stream                                            |      |
| MPC             | Magick Pixel Cache image format                                 |      |
| MPEG            | MPEG Video Stream                                               |      |
| MPG             | MPEG Video Stream                                               |      |
| MPO             | Joint Photographic Experts Group JFIF format                    |      |
| MRW             | Sony (Minolta) Raw Image File                                   |      |
| MSL             | Magick Scripting Language                                       |      |
| MSVG            | ImageMagick's own SVG internal renderer                         |      |
| MTV             | MTV Raytracing image format                                     |      |
| MVG             | Magick Vector Graphics                                          |      |
| NEF             | Nikon Digital SLR Camera Raw Image File                         |      |
| NRW             | Nikon Digital SLR Camera Raw Image File                         |      |
| NULL            | Constant image of uniform color                                 |      |
| O               | Raw opacity samples                                             |      |
| ORF             | Olympus Digital Camera Raw Image File                           |      |
| OTB             | On-the-air bitmap                                               |      |
| OTF             | Open Type font                                                  |      |
| PAL             | 16bit/pixel interleaved YUV                                     |      |
| PALM            | Palm pixmap                                                     |      |
| PAM             | Common 2-dimensional bitmap format                              |      |
| PATTERN         | Predefined pattern                                              |      |
| PBM             | Portable bitmap format (black and white)                        |      |
| PCD             | Photo CD                                                        |      |
| PCDS            | Photo CD                                                        |      |
| PCL             | Printer Control Language                                        |      |
| PCT             | Apple Macintosh QuickDraw/PICT                                  |      |
| PCX             | ZSoft IBM PC Paintbrush                                         |      |
| PDB             | Palm Database ImageViewer Format                                |      |
| PDF             | Portable Document Format                                        |      |
| PDFA            | Portable Document Archive Format                                |      |
| PEF             | Pentax Electronic File                                          |      |
| PES             | Embrid Embroidery Format                                        |      |
| PFA             | Postscript Type 1 font (ASCII)                                  |      |
| PFB             | Postscript Type 1 font (binary)                                 |      |
| PFM             | Portable float format                                           |      |
| PGM             | Portable graymap format (gray scale)                            |      |
| PGX             | JPEG 2000 uncompressed format                                   |      |
| PHM             | Portable half float format                                      |      |
| PICON           | Personal Icon                                                   |      |
| PICT            | Apple Macintosh QuickDraw/PICT                                  |      |
| PIX             | Alias/Wavefront RLE image format                                |      |
| PJPEG           | Joint Photographic Experts Group JFIF format                    |      |
| PLASMA          | Plasma fractal image                                            |      |
| PNG             | Portable Network Graphics                                       |      |
| PNG00           | PNG inheriting bit-depth, color-type from original, if possible |      |
| PNG24           | opaque or binary transparent 24-bit RGB                         |      |
| PNG32           | opaque or transparent 32-bit RGBA                               |      |
| PNG48           | opaque or binary transparent 48-bit RGB                         |      |
| PNG64           | opaque or transparent 64-bit RGBA                               |      |
| PNG8            | 8-bit indexed with optional binary transparency                 |      |
| PNM             | Portable anymap                                                 |      |
| POCKETMOD       | Pocketmod Personal Organizer                                    |      |
| PPM             | Portable pixmap format (color)                                  |      |
| PS              | PostScript                                                      |      |
| PSB             | Adobe Large Document Format                                     |      |
| PSD             | Adobe Photoshop bitmap                                          |      |
| PTIF            | Pyramid encoded TIFF                                            |      |
| PWP             | Seattle Film Works                                              |      |
| QOI             | Quite OK image format                                           |      |
| R               | Raw red samples                                                 |      |
| RADIAL-GRADIENT | Gradual radial passing from one shade to another                |      |
| RAF             | Fuji CCD-RAW Graphic File                                       |      |
| RAS             | SUN Rasterfile                                                  |      |
| RAW             | Raw                                                             |      |
| RGB             | Raw red, green, and blue samples                                |      |
| RGB565          | Raw red, green, blue samples in 565 format                      |      |
| RGBA            | Raw red, green, blue, and alpha samples                         |      |
| RGBO            | Raw red, green, blue, and opacity samples                       |      |
| RGF             | LEGO Mindstorms EV3 Robot Graphic Format (black and white)      |      |
| RLA             | Alias/Wavefront image                                           |      |
| RLE             | Utah Run length encoded image                                   |      |
| RMF             | Raw Media Format                                                |      |
| RW2             | Panasonic Lumix Raw Image                                       |      |
| SCR             | ZX-Spectrum SCREEN$                                             |      |
| SCREENSHOT      | Screen shot                                                     |      |
| SCT             | Scitex HandShake                                                |      |
| SFW             | Seattle Film Works                                              |      |
| SGI             | Irix RGB image                                                  |      |
| SIX             | DEC SIXEL Graphics Format                                       |      |
| SIXEL           | DEC SIXEL Graphics Format                                       |      |
| SR2             | Sony Raw Format 2                                               |      |
| SRF             | Sony Raw Format                                                 |      |
| STEGANO         | Steganographic image                                            |      |
| STRIMG          | String to image and back                                        |      |
| SUN             | SUN Rasterfile                                                  |      |
| SVG             | Scalable Vector Graphics                                        |      |
| SVGZ            | Compressed Scalable Vector Graphics                             |      |
| TEXT            | Text                                                            |      |
| TGA             | Truevision Targa image                                          |      |
| TIFF            | Tagged Image File Format                                        |      |
| TIFF64          | Tagged Image File Format (64-bit)                               |      |
| TILE            | Tile image with a texture                                       |      |
| TIM             | PSX TIM                                                         |      |
| TM2             | PS2 TIM2                                                        |      |
| TTC             | TrueType font collection                                        |      |
| TTF             | TrueType font                                                   |      |
| TXT             | Text                                                            |      |
| UYVY            | 16bit/pixel interleaved YUV                                     |      |
| VDA             | Truevision Targa image                                          |      |
| VICAR           | Video Image Communication And Retrieval                         |      |
| VID             | Visual Image Directory                                          |      |
| VIFF            | Khoros Visualization image                                      |      |
| VIPS            | VIPS image                                                      |      |
| VST             | Truevision Targa image                                          |      |
| WBMP            | Wireless Bitmap (level 0) image                                 |      |
| WEBM            | Open Web Media                                                  |      |
| WEBP            | WebP Image Format                                               |      |
| WMV             | Windows Media Video                                             |      |
| WPG             | Word Perfect Graphics                                           |      |
| X3F             | Sigma Camera RAW Picture File                                   |      |
| XBM             | X Windows system bitmap (black and white)                       |      |
| XC              | Constant image uniform color                                    |      |
| XCF             | GIMP image                                                      |      |
| XPM             | X Windows system pixmap (color)                                 |      |
| XPS             | Microsoft XML Paper Specification                               |      |
| XV              | Khoros Visualization image                                      |      |
| Y               | Raw yellow samples                                              |      |
| YCbCr           | Raw Y, Cb, and Cr samples                                       |      |
| YCbCrA          | Raw Y, Cb, Cr, and alpha samples                                |      |
| YUV             | CCIR 601 4:1:1 or 4:2:2                                         |      |
