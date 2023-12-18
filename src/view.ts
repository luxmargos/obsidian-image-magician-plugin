import { FileView, TFile, WorkspaceLeaf } from "obsidian";
import { MainPluginContext } from "./context";
import { EXT_ALL } from "./settings";
import { PIE } from "./engines/imgEngines";

export const VIEW_TYPE_PSD = "psd-view";
export class PsdFileView extends FileView {
	context: MainPluginContext;

	constructor(context: MainPluginContext, leaf: WorkspaceLeaf) {
		super(leaf);
		this.context = context;
		this.allowNoFile = false;
		this.navigation = true;
	}

	canAcceptExtension(extension: string): boolean {
		console.log("canAcceptExtension ", extension);
		return EXT_ALL.contains(extension);
	}

	getViewType(): string {
		return VIEW_TYPE_PSD;
	}

	getDisplayText(): string {
		return this.file?.basename ?? "";
	}

	onload(): void {
		console.log("onload", this.file);
	}

	onunload(): void {
		console.log("onunload");
	}
	protected onOpen(): Promise<void> {
		return new Promise((resolve, _reject) => {
			console.log("onOpen");
			resolve();
		});
	}
	protected onClose(): Promise<void> {
		return new Promise((resolve, _reject) => {
			console.log("onClose");
			resolve();
		});
	}

	onLoadFile(file: TFile): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {
				this.contentEl.empty();
				const _canvas = await PIE.magick().draw(
					this.context,
					file,
					this.contentEl
				);
				resolve();
			} catch (err) {
				console.log("error", err);
				resolve();
			}
		});
	}
}
