import { BrowserWindow as e, app as t } from "electron";
import n from "node:path";
import { fileURLToPath as r } from "node:url";
//#region electron/main.js
var i = n.dirname(r(import.meta.url)), a = process.env.VITE_DEV_SERVER_URL;
function o() {
	let t = new e({
		width: 1200,
		height: 800,
		icon: n.join(i, "../public/icon.ico"),
		webPreferences: {
			nodeIntegration: !0,
			contextIsolation: !1
		}
	});
	a ? t.loadURL(a) : t.loadFile(n.join(i, "../dist/index.html"));
}
t.whenReady().then(o), t.on("window-all-closed", () => {
	process.platform !== "darwin" && t.quit();
}), t.on("activate", () => {
	e.getAllWindows().length === 0 && o();
});
//#endregion
export {};
