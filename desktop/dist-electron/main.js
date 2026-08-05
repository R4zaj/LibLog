import { BrowserWindow, app } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
//#region electron/main.js
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
function createWindow() {
	const win = new BrowserWindow({
		width: 1200,
		height: 800,
		icon: path.join(__dirname, "../public/icon.ico"),
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		}
	});
	if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
	else win.loadFile(path.join(process.env.DIST, "index.html"));
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
//#endregion
export {};
