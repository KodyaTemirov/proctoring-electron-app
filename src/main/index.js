/* eslint-disable prettier/prettier */
import { app, shell, BrowserWindow, dialog } from "electron";
import { join } from "path";

import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import icon from "../../resources/logo.png?asset";
import { autoUpdater } from "electron-updater";

import http from "http";
import { setupSocketIOServer } from "./websocketServer.js";
import { getNumberOfMonitors, getApps } from "./utils";
import fs from "fs";

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    title: "Proctoring",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return mainWindow;
}

function setupAutoUpdaterAndCheck(mainWindow) {
  return new Promise((resolve, reject) => {
    autoUpdater.autoDownload = false;

    autoUpdater.on("update-available", (info) => {
      dialog
        .showMessageBox(mainWindow, {
          type: "info",
          title: "Обновление доступно",
          message: `Новая версия (${info.version}) доступна. Загрузка и установка начнется.`,
        })
        .then(() => {
          autoUpdater.downloadUpdate();
        });
    });

    autoUpdater.on("update-downloaded", () => {
      dialog
        .showMessageBox(mainWindow, {
          type: "info",
          title: "Обновление готово",
          message:
            "Обновление было загружено. Приложение будет перезапущено для установки.",
        })
        .then(() => {
          autoUpdater.quitAndInstall();
        });
    });

    autoUpdater.on("update-not-available", () => {
      resolve(); // Продолжить запуск приложения
    });

    autoUpdater.on("error", (error) => {
      console.error("Ошибка обновления:", error);
      fs.writeFileSync(
        "error.log",
        `
        Дата: ${new Date().toISOString()}
        Сообщение: ${error.message}
        Стек: ${error.stack || "Нет данных"}
        Имя ошибки: ${error.name || "Нет данных"}
      `,
        { flag: "a" },
      );

      dialog.showMessageBox(mainWindow, {
        type: "error",
        title: "Ошибка обновления",
        message: `Произошла ошибка. Подробнее смотрите в файле error.log.`,
      });

      reject(new Error("Не удалось проверить обновления."));
    });

    autoUpdater.checkForUpdates();
  });
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId("com.electron");

  const mainWindow = new BrowserWindow({
    show: false,
  });

  try {
    await setupAutoUpdaterAndCheck(mainWindow);

    const server = http.createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Type", "application/json");

      if (req.url === "/monitors") {
        try {
          const data = await getNumberOfMonitors();
          res.end(JSON.stringify({ count: data }));
        } catch (error) {
          console.error(error);
          res.statusCode = 500;
          res.end("Internal Server Error");
        }
      } else if (req.url === "/apps") {
        try {
          const data = await getApps();
          const stringifyObject = JSON.parse(data);

          if (stringifyObject.hasDeniedApps) {
            res.end(stringifyObject.userDeniedApps);
          } else {
            res.end([]);
          }
        } catch (error) {
          console.error(error);
        }
      } else {
        res.statusCode = 404;
        res.end("Not Found");
      }
    });

    await setupSocketIOServer(server);

    server.listen(9061, () => {
      console.log("Server is listening on port 9061");
    });

    app.on("browser-window-created", (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    createWindow();

    app.on("activate", function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  } catch (error) {
    console.error("Ошибка при запуске приложения:", error);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
