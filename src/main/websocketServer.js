/* eslint-disable prettier/prettier */
import { getNumberOfMonitors, getApps } from './utils.js'
import { Server } from 'socket.io'

export const setupSocketIOServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', async (socket) => {
    let userMonitorCount = null
    let appsData = null

    // Функция для отправки данных клиенту
    const sendDataToClient = () => {
      socket.emit('monitor', { count: userMonitorCount })
      socket.emit('apps', appsData)
    }

    // Функция для обновления данных и отправки клиенту в случае изменений
    const updateDataAndSend = async () => {
      const newMonitorCount = await getNumberOfMonitors()
      const newAppsData = await getApps()

      // Сравниваем данные в виде JSON-строк
      const currentAppsDataJSON = JSON.stringify(appsData)
      const newAppsDataJSON = JSON.stringify(newAppsData)

      if (newMonitorCount !== userMonitorCount || currentAppsDataJSON !== newAppsDataJSON) {
        userMonitorCount = newMonitorCount
        appsData = newAppsData
        sendDataToClient()
      }
    }

    // Отправляем данные клиенту при подключении
    await updateDataAndSend()

    // Обновляем данные и отправляем клиенту при изменениях
    const intervalId = setInterval(updateDataAndSend, 2000)

    socket.on('disconnect', () => {
      clearInterval(intervalId)
    })
  })
}
