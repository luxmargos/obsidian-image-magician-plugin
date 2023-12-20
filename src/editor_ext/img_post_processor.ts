import {
	App,
	Editor,
	FileSystemAdapter,
	TAbstractFile,
	TFile,
	editorEditorField,
	editorInfoField,
	editorLivePreviewField,
} from "obsidian";

import {
	EditorView,
	ViewPlugin,
	ViewUpdate,
	Decoration,
	DecorationSet,
} from "@codemirror/view";

import { findValutFile, isTFile } from "../vault_util";
import { MainPluginContext } from "../context";
import { PIE } from "../engines/imgEngines";
import * as pb from "path-browserify";
import { ImgkMutationObserver } from "./mutation_ob";

export function normalImgHandler(
	context: MainPluginContext,
	contentDOM: HTMLElement,
	observer?: ImgkMutationObserver,
	cmView?: EditorView
) {
	const supportedFormats = context.plugin.settingsUtil.getSupportedFormats();
	const imgEls = contentDOM.querySelectorAll("img");

	for (let i = 0; i < imgEls.length; i++) {
		const imgEl = imgEls[i];
		if (!(imgEl instanceof HTMLImageElement)) {
			continue;
		}
		const src = imgEl.getAttribute("src");
		if (!src) {
			continue;
		}

		let srcFile: TFile | undefined | null;

		if (src.startsWith("app://")) {
			const qIndex = src.lastIndexOf("?");
			let fullResPath = src;
			if (qIndex >= 0) {
				fullResPath = src.substring(0, qIndex);
			}

			const ext = pb.extname(fullResPath).toLowerCase();
			if (ext) {
				const extWithoutDot = ext.startsWith(".")
					? ext.substring(1)
					: ext;

				let isSupportedExt = supportedFormats.contains(extWithoutDot);
				if (isSupportedExt) {
					if (
						context.plugin.app.vault.adapter instanceof
						FileSystemAdapter
					) {
						const fsa: FileSystemAdapter =
							context.plugin.app.vault.adapter;
						const basePath = fsa.getBasePath();
						const basePathIdx = fullResPath.indexOf(basePath);
						if (basePathIdx >= 0) {
							let valutRelativePath = fullResPath.substring(
								basePathIdx + basePath.length
							);

							//remove slash start
							if (valutRelativePath.startsWith("/")) {
								valutRelativePath =
									valutRelativePath.substring(1);
							}

							srcFile = findValutFile(
								context,
								valutRelativePath,
								true
							);
						}
					}
				}
			}
		}

		if (!srcFile) {
			continue;
		}

		if (!isTFile(srcFile, supportedFormats)) {
			continue;
		}

		const imgElParent = imgEl.parentElement;
		if (!imgElParent) {
			continue;
		}
		let draw = !isLatestImgDrawnElement(imgEl, srcFile);

		if (!draw) {
			console.log("pass redrawing");
			continue;
		}

		drawImageOnElement(context, imgElParent, imgEl, srcFile, observer);
	}
}

export function isLatestImgDrawnElement(el: HTMLElement, file: TFile) {
	if (el.hasAttribute("data-imgk-plugin-mod-date")) {
		try {
			const modDate = Number(
				el.getAttribute("data-imgk-plugin-mod-date")
			);
			return modDate >= file.stat.mtime;
		} catch (e) {
			console.log(e);
		}
	}
	return false;
}

export function signModDate(el: HTMLElement, file: TFile) {
	el.setAttribute("data-imgk-plugin-mod-date", String(file.stat.mtime));
}

export function linkedImgHandler(
	context: MainPluginContext,
	contentDOM: HTMLElement,
	observer?: ImgkMutationObserver,
	cmView?: EditorView
) {
	// return Decoration.none;

	const internalEmbeds = contentDOM.querySelectorAll(".internal-embed");
	const supportedFormats = context.plugin.settingsUtil.getSupportedFormats();

	for (let i = 0; i < internalEmbeds.length; i++) {
		const internalEmbed = internalEmbeds[i];
		if (!(internalEmbed instanceof HTMLElement)) {
			continue;
		}
		const src = internalEmbed.getAttribute("src");
		if (!src) {
			continue;
		}

		const srcFile = findValutFile(context, src, false);
		if (!srcFile) {
			continue;
		}
		if (!isTFile(srcFile, supportedFormats)) {
			continue;
		}

		let img: HTMLImageElement | null = internalEmbed.querySelector(
			"img.imgk-plugin-item"
		);

		//apply size without redrawing
		if (img) {
			applyContainerMdSize(
				context.plugin.settings.supportMdImageSizeFormat,
				internalEmbed,
				img
			);
		}

		// console.log("posAtDom ", cmView?.posAtDOM(internalEmbed));
		// console.log("found file : ", srcFile.path);
		// console.log(internalEmbed);

		let draw = true;

		if (img) {
			draw = !isLatestImgDrawnElement(img, srcFile);
		} else {
			img = internalEmbed.createEl("img", {
				cls: "imgk-plugin-item",
			});
		}

		// pass redrawing
		if (!draw) {
			continue;
		}

		applyContainerMdSize(
			context.plugin.settings.supportMdImageSizeFormat,
			internalEmbed,
			img
		);

		const titleNode = internalEmbed.querySelector(".file-embed-title");
		if (titleNode && titleNode instanceof HTMLElement) {
			// console.log("hide titleNode");
			// titleNode.style.display = "none";
			titleNode.style.height = "0px";
			titleNode.style.opacity = "0";
			titleNode.style.pointerEvents = "none";
			// internalEmbed.replaceChild(img, titleNode);
		}

		// disable navigate to file on click
		if (context.plugin.settings.disbleClickToNavigate) {
			internalEmbed.onClickEvent(
				(e) => {
					// e.stopImmediatePropagation();
					e.stopPropagation();
					e.preventDefault();
					return false;
				},
				{
					capture: true,
					passive: false,
				}
			);
		}

		internalEmbed.classList.remove("file-embed");
		internalEmbed.classList.add("image-embed");
		internalEmbed.classList.add("media-embed");

		drawImageOnElement(context, internalEmbed, img, srcFile, observer);
	}
}

export function applyContainerMdSize(
	apply: boolean,
	containerEl: HTMLElement,
	targetElement: HTMLElement
) {
	if (apply) {
		// [[IMAGE | 100]] markdown will represent as container width attribute.
		const containerWidth = containerEl.getAttribute("width");
		if (containerWidth) {
			targetElement.setAttribute("width", containerWidth);
		} else {
			targetElement.removeAttribute("width");
		}
	} else {
		targetElement.removeAttribute("width");
	}
}

export function drawImageOnElement(
	context: MainPluginContext,
	containerElement: HTMLElement,
	img: HTMLImageElement,
	targetFile: TFile,
	observer?: ImgkMutationObserver
) {
	//disable img click
	img.style.pointerEvents = "none";

	signModDate(img, targetFile);

	let cv: HTMLCanvasElement | null = containerElement.querySelector(
		"canvas.imgk-plugin-item"
	);
	if (!cv) {
		cv = containerElement.createEl("canvas", {
			cls: "imgk-plugin-item",
		});
	}

	// internalEmbed.empty();
	// internalEmbed.innerHTML = "FOUND : " + srcFile.path;
	PIE.magick()
		.drawOnCanvas(context, targetFile, cv)
		.then(() => {
			cv!.toBlob((blob) => {
				if (blob) {
					const burl = URL.createObjectURL(blob);
					img!.src = burl;

					// attachImgFollower(context, img!, targetFile, observer);
				}
			});
			// img!.src = canvasElement.toDataURL();
			// canvasElement.remove();
			cv!.remove();
		})
		.catch((err) => {
			cv!.remove();
		});

	attachImgFollower(context, img!, targetFile, observer);
}

export function attachImgFollower(
	context: MainPluginContext,
	img: HTMLImageElement,
	file: TFile,
	observer?: ImgkMutationObserver
) {
	const imgParent = img.parentElement;
	if (!imgParent) {
		return;
	}

	let imgOverlayEl: HTMLElement | null = imgParent.querySelector(
		"div.imgk-plugin-overlay"
	);
	if (!imgOverlayEl) {
		imgOverlayEl = imgParent.createDiv({
			cls: "imgk-plugin-overlay",
		});
	}

	imgOverlayEl.draggable = true;
	const resPath = context.plugin.app.vault.getResourcePath(file);
	imgOverlayEl.setAttribute("src", resPath);
	imgOverlayEl.setAttribute("alt", file.path);

	imgOverlayEl.addEventListener("dragstart", (e) => {
		e.dataTransfer?.setData("line", file.path);
		e.dataTransfer?.setData("link", file.path);
		//this is important
		e.dataTransfer?.setData("text/plain", `![[${file.path}]]`);
		e.dataTransfer?.setData("src", `${file.path}`);
		e.dataTransfer?.setData("text/uri-list", file.path);
	});

	const followImg = () => {
		imgOverlayEl!.style.left = `${img.offsetLeft}px`;
		imgOverlayEl!.style.top = `${img.offsetTop}px`;
		imgOverlayEl!.style.width = `${img.offsetWidth}px`;
		imgOverlayEl!.style.height = `${img.offsetHeight}px`;

		// console.log(
		// 	"followImg ",
		// 	img.src,
		// 	img,
		// 	imgOverlayEl,
		// 	img.getClientRects(),
		// 	img.offsetLeft,
		// 	img.offsetTop,
		// 	img.offsetWidth,
		// 	img.offsetHeight
		// );
		const success = img.offsetWidth > 0 || img.offsetHeight > 0;
		return success;
	};

	const lazyFollowImg = () => {
		followImg();
		setTimeout(followImg, 0);
	};

	followImg();
	const resizeOb = new ResizeObserver((entries) => {
		lazyFollowImg();
	});
	resizeOb.observe(img);

	observer?.addListener(lazyFollowImg);

	// new ImgkMutationObserver(img, {
	// 	attributes: true,
	// }).addListener(lazyFollowImg);

	new ImgkMutationObserver(imgParent, {
		childList: true,
		subtree: true,
		attributes: true,
		characterData: true,
	}).addListener(lazyFollowImg);
}
