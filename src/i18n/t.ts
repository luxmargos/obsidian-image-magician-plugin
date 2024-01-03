import { locale } from "moment";
import { Translates } from "./langType";

import en from "./trans/en";
import ko from "./trans/ko";
import ar from "./trans/ar";
import cz from "./trans/cz";
import da from "./trans/da";
import de from "./trans/de";
import enGB from "./trans/en-gb";
import es from "./trans/es";
import fr from "./trans/fr";
import hi from "./trans/hi";
import id from "./trans/id";
import it from "./trans/it";
import ja from "./trans/ja";
import nl from "./trans/nl";
import no from "./trans/no";
import pl from "./trans/pl";
import pt from "./trans/pt";
import ptBR from "./trans/pt-br";
import ro from "./trans/ro";
import ru from "./trans/ru";
import tr from "./trans/tr";
import zhCN from "./trans/zh-cn";
import zhTW from "./trans/zh-tw";

const allLangs: { [key: string]: Partial<Translates> } = {
	ar,
	cs: cz,
	da,
	de,
	en,
	"en-gb": enGB,
	es,
	fr,
	hi,
	id,
	it,
	ja,
	ko,
	nl,
	nn: no,
	pl,
	pt,
	"pt-br": ptBR,
	ro,
	ru,
	tr,
	"zh-cn": zhCN,
	"zh-tw": zhTW,
};

let currentDict: Partial<Translates>;
// export const setLocale = (locale: keyof Dicts) => {
export const setLocale = (locale: string) => {
	if (locale in allLangs) {
		currentDict = allLangs[locale] as Translates;
		return;
	}
	currentDict = en;
};

setLocale(locale());

export const t = (key: keyof Translates): string => {
	if (key in currentDict) {
		return currentDict[key] ?? "";
	}

	return en[key] ?? key;
};
