import { Server, Socket } from 'socket.io'
import Room, { Human, RoomId } from './room'
import { randomToken, md5 } from './utils'

const ORIGINS = [
	'http://localhost:8080',
	'https://pexeso.draho.cz',
]
const {
	SALT = 'SALT',
  PASS = 'PASS',
} = process.env
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000

const io = new Server(PORT, {
  serveClient: false,
  allowRequest: (origin, callback) => {
    if (!ORIGINS.includes(origin.toString())) {
      return callback('origin not allowed', false);
    }
    callback(null, true)
  }
})

const rooms: {[id: string]: Room} = {
	['test']: new Room('test:Uu-3')
}

console.log('listening', PORT)

// game io:

const lobbyNS = io.of('/lobby')
const gameNS = io.of('/game')

lobbyNS.on('connect', (socket) => {
  socket.emit('lobby', Room.getLobby())
})

setTimeout(() => {
	gameNS.emit('lobby', Room.getLobby())
}, 5000)

gameNS.on('connect', async (socket: Socket & { secret?: string }) => {
	let { hashdata, secret } = socket.handshake.query as { hashdata?: string, secret?: string }
	let [ roomId, nick, gender, hash ]: string[] = ((hashdata || '') as string).split(';')
	console.log('hashdata:', hashdata)

	if (md5([ nick, gender, SALT ].join(';')) === hash) {
    console.log('hash matches')
	} else {
		nick = ''
		gender = ''
	}

	console.log(`connected to room ${roomId} as ${nick}/${gender} with secret ${secret}`)

	if (!secret) {
		secret = randomToken(16) // client will store for auth on subsequent connects
		socket.emit('new_secret', secret)
	}
	socket.secret = secret

	if (!roomId.match(/[a-z0-9]*:[Uu12345-]{4}}/)) {
		return err(socket, `Id ${roomId} is not a valid room id`)
	}

  const room: Room = !(roomId in rooms)
    ? new Room(roomId as RoomId)
    : rooms[roomId]

  if (!room) {
    return err(socket, `Room ${roomId} does not exist`)
  }
  
  rooms[room.id] = room
    
  let myself = room.getUser(secret)
  if (!myself) {
    try {
      myself = room.join(secret) // take your place in a room
    } catch (e) {
      return err(socket, e)
    }
  }

	if (myself.type !== 'human') {
		return err(socket, 'You are a bot')
	}

  // update me
  myself.nick = nick
  myself.gender = gender as 'M' | 'F' | ''
  myself.online = true

	// start listening in room
	await socket.join(room.id) 
	
	const playerIndex = room.users.indexOf(myself)
	const { isOp, status } = myself

	socket.emit('init', room.id, playerIndex, room.firstGoes, () => {
		emitPlayerInfo(room)
	})

	socket.on('allow', (userIndex) => {
		if (isOp) {
			room.allow(userIndex)
			emitPlayerInfo(room)
		}
	})
	socket.on('deny', (userIndex) => {
		if (isOp) {
			room.deny(userIndex)
			emitPlayerInfo(room)
		}
	})

	socket.on('restart', () => {
		room.restart()
		gameNS.to(room.id).emit('restart', room.firstGoes)
		emitPlayerInfo(room)
	})

	socket.on('sync_actions', (hasActions, ack) => {
		ack(room.actions.filter((_, i) => i >= hasActions))
	})

	socket.on('action', (action, ack) => {
		if (status !== 'ready') {
			return
		}
		const actionIndex = room.actions.length // index of action being sended
		// room.lastTime = Date.now()
		room.actions.push(action)
		ack(actionIndex)
		console.log('action', action)
		// broadcast incoming game actions to everyone in room including own socket
		gameNS.to(room.id).emit('action', action, actionIndex)
		// it's up to the client to distinguish apart the actions of oponets from your own actions from another window
		// actionIndex might be helpfull in this
		updateAdmin()
	})

	socket.on('chat', (data) => {
		// broadcast incoming chat messages to everyone in room including own socket
		gameNS.to(room.id).emit('chat', data)
	})

	socket.on('disconnect', () => {
		room.users.forEach(user => {
			if (user && user.type === 'human' && user.secret === secret) {
				user.online = Object.values(io.sockets||{}).some(socket =>
					Object.keys(socket.adapter.rooms||{}).includes(room.id) &&
						socket.secret === secret
				)
			}
		})
		emitPlayerInfo(room)
		updateAdmin()
	})
})

const emitPlayerInfo = (room: Room) => {
	room.getPublicUsers()
		.forEach((player, i) => {
			gameNS.to(room.id).emit('player_info', {
				playerIndex: i,
				...player,
			})
		})
}

const err = (socket: Socket, msg: string) => {
	socket.emit('err', msg)
	socket.disconnect()
}


// admin io:

const adminNamespace = io.of('/admin')
adminNamespace.on('connect', socket => {
	let { pass } = socket.handshake.query
	if (pass !== PASS) {
		socket.disconnect()
	}
	updateAdmin()
})

const updateAdmin = () => {
	adminNamespace.emit('stats', {
		rooms,
		uptime: process.uptime(),
	})
}


