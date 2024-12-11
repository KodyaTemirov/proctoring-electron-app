import os from 'os'
import activeWindow from 'active-win'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

export const getNumberOfMonitors = async () => {
  const platform = os.platform()

  let command
  if (platform === 'win32') {
    command =
      'powershell -Command "(Get-WmiObject -Namespace root\\wmi -Class WmiMonitorBasicDisplayParams).Count"'
  } else if (platform === 'linux') {
    command = 'xrandr -q | grep " connected" | wc -l'
  } else if (platform === 'darwin') {
    command = 'system_profiler SPDisplaysDataType | grep "Resolution" | wc -l'
  } else {
    console.error('Неизвестная операционная система')
    throw new Error('Неизвестная операционная система')
  }

  try {
    const res = await execPromise(command)
    const { stdout, stderr, child } = res

    if (stderr) {
      console.error(`Ошибк: ${stderr}`)
      throw new Error(stderr)
    }

    const numMonitors = parseInt(stdout.trim(), 10)
    return !numMonitors ? 1 : numMonitors
  } catch (error) {
    console.error(`Ошибка при выполнении команды: ${error.message}`)
    throw error
  }
}

export const getApps = async () => {
  const browsers = [
    'google chrome',
    'yandex with voice assistant alice',
    'microsoft edge',
    'firefox',
    'safari'
  ]
  const activeApps = activeWindow.getOpenWindowsSync({
    accessibilityPermission: false,
    screenRecordingPermission: false
  })

  const activeBrowsers = []
  const userDeniedApps = []

  const deniedApps = [
    'telegram desktop',
    'telegram',
    'teamviewer',
    'anydesk',
    'aeroadmin',
    'getscreen',
    'getscreen.me',
    'supremo',
    'supremo',
    'tightvnc',
    'radmin',
    'kickidler'
  ]

  activeApps.forEach(({ owner: { name, title } }) => {
    const ownerName = name.toLowerCase() || title.toLowerCase()

    if (browsers.includes(ownerName)) {
      activeBrowsers.push(name || title)
    }

    if (deniedApps.includes(ownerName)) {
      userDeniedApps.push(name || title)
    }
  })

  return { activeBrowsers, userDeniedApps }
}
