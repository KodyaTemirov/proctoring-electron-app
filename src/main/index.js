import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/logo.png?asset'

import http from 'http'
import { setupSocketIOServer } from './websocketServer.js'
import { getNumberOfMonitors, getApps } from './utils'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')

    if (req.url === '/monitors') {
      try {
        const data = await getNumberOfMonitors()
        res.end(JSON.stringify({ count: data }))
      } catch (error) {
        console.error(error)
        res.statusCode = 500
        res.end('Internal Server Error')
      }
    } else if (req.url === '/apps') {
      try {
        const data = await getApps()
        const stringifyObject = JSON.parse(data)

        if (stringifyObject.hasDeniedApps) {
          res.end(stringifyObject.userDeniedApps)
        } else {
          res.end([])
        }
      } catch (error) {
        console.error(error)
      }
    } else {
      res.statusCode = 404
      res.end('Not Found')
    }
  })

  // Создаем WebSocket сервер на основе HTTP сервера
  await setupSocketIOServer(server)

  server.listen(9061, () => {
    console.log('Server is listening on port 9061')
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
