// import io from './socket.io.dev.js'
const io = window.io

// import { getStorage, setStorage } from './common.js'

const BACKEND = window.location.origin.includes('localhost')
  ? 'http://localhost:3003'
  : 'https://gamsoc.draho.cz'



export function watchLobby(onLobby) {

  const socket = io(`${BACKEND}/lobby`, {})

  socket.on('connect', () => {
    console.log('connected')
  })

  socket.on('lobby', (lobby) => {
    console.log('lobby', lobby)
    onLobby(lobby)
  })
  
  let log
}


