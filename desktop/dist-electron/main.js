import { BrowserWindow as e, app as t } from "electron";
import n from "node:path";
import r from "node:fs";
import { fileURLToPath as i } from "node:url";
//#region electron/main.js
var a = n.dirname(i(import.meta.url)), o = process.env.VITE_DEV_SERVER_URL;
function s() {
	let t = n.join(a, "../dist/icon.ico"), i = n.join(a, "../public/icon.ico"), s = new e({
		width: 1200,
		height: 800,
		icon: r.existsSync(t) ? t : i,
		webPreferences: {
			nodeIntegration: !0,
			contextIsolation: !1
		}
	});
	o ? s.loadURL(o) : s.loadFile(n.join(a, "../dist/index.html"));
}
t.whenReady().then(s), t.on("window-all-closed", () => {
	process.platform !== "darwin" && t.quit();
}), t.on("activate", () => {
	e.getAllWindows().length === 0 && s();
});
//#endregion
export {};
