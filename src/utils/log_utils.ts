import log from "loglevel";
import { Platform, Plugin, TFile } from "obsidian";

export const logLevelMobilePatcher = (plugin: Plugin) => {
	if (!Platform.isMobile) {
		return;
	}

	//const logFile = `${plugin.manifest.dir}/logs.txt`;
	const logFile = `${plugin.manifest.id}-logs.md`;
	const logs: string[] = [];

	let logTargetFile: TFile | undefined;
	const mobileLogger = async () => {
		if (!logTargetFile) {
			if ((await plugin.app.vault.adapter.exists(logFile)) === false) {
				await plugin.app.vault.create(logFile, "");
			}

			const abFile = await plugin.app.vault.getAbstractFileByPath(
				logFile
			);
			if (abFile && abFile instanceof TFile) {
				logTargetFile = abFile;
			}
		}

		if (logTargetFile) {
			await plugin.app.vault.modify(logTargetFile, logs.join(" "));
		}
	};

	var originalFactory = log.methodFactory;
	log.methodFactory = function (methodName, logLevel, loggerName) {
		var rawMethod = originalFactory(methodName, logLevel, loggerName);

		return function (...messages: any[]) {
			rawMethod(messages);
			logs.push(...messages);
			logs.push("\n");

			mobileLogger()
				.then(() => {})
				.catch((err) => {});
		};
	};

	log.setLevel(log.getLevel()); // Be sure to call setLevel method in order to apply plugin
};
