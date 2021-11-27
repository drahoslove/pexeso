import { randomToken } from './utils'

type LVL = 1 | 2 | 3 | 4 | 5
type U = 'U'| 'u' | LVL | '-'
type UUUU = `${U}${U}${U}${U}`
export type RoomId = `${string}:${UUUU}`

type BaseUser = {
  type: 'human' | 'bot'
  isOp?: boolean
  status?: 'ready' // TODO - is this needed?
}

export type Bot = BaseUser & {
  type: 'bot'
  level: number
}
export type Human = BaseUser & {
  type: 'human'
  secret?: string
  nick?: string
  gender?: 'M' | 'F' | ''
  online?: boolean
}

export type User = Bot | Human | null

export default class Room {
  users: User[]
  id: string
  firstGoes: number
  actions: any[] // TODO
  restarts: number
  state: 'waiting' | 'playing' | 'done'

  static allRooms: {[id: string]: Room} = {}
  static genId(){
    let id
    do {
			id = randomToken(8)
		} while(id in Room.allRooms)
    return id
  }

  static getLobby() {
    return Object.entries(Room.allRooms)
      .filter(([_, { state }]) => ['waiting', 'playing'].includes(state))
      .map(([roomId, room]) => ({
        id: roomId,
        users: room.getPublicUsers(),
        state: room.state,
      }))
  }

  constructor(roomId: RoomId, secret: string) { // ${}
    const [_, uuuu] = roomId.split(':')
    const op: Human = { type: 'human' , isOp: true, secret }
    const users = uuuu.split('').map((u): User => {
      // U is op user
      // u is another user slot
      // - is empty
      // 1,2,3,4,5 is bot
      return {
        'U': op,
        'u': { type: 'human' } as Human,
        '-': null,
      }[u]
      || '12345'.includes(u) && { type: 'bot', level: +u, } as Bot
      || null
    })

  
    this.id = Room.genId() + ':' + uuuu
    this.state = 'waiting'
    this.users = users
    this.firstGoes = 0
    this.actions = []
    this.restarts = 0
  
    Room.allRooms[this.id] = this
  }

  isOp (secret: string) {
    const user = this.getUser(secret)
    return Boolean(user && user.isOp)
  }

  join (secret: string) {
    const emptySlot = this.users.find(u => u && u.type === 'human' && !u.secret)
    if (emptySlot && emptySlot.type === 'human') {
      emptySlot.secret = secret
    } else {
      throw new Error(`Room ${this.id} is full`)
    }
    return emptySlot
  }

  getUser (secret: string): User | undefined {
    return this.users.find(u => u && u.type === 'human' && secret === u.secret)
  }

  getPublicUsers (): Array<Object|null> {
    return this.users.map(u => u && ({
      type: u.type,
      ...(u && u.type === 'human' && {
        empty: !u.secret,
        nick: u.nick,
        gender: u.gender,
        online: u.online,
      }),
      ...(u && u.type === 'bot' && {
        level: u.level,
      }),
      ...(u.isOp && {
        isOp: true,
      })
    }))
  }

  allow (userIndex: number) {
    const user = this.users.find((u, i) => u && u.type === 'human' && i === userIndex)
    if (user) {
      user.status = 'ready'
    }
  }

  deny (userIndex: number) {
    const user = this.users.find((u, i) => u && u.type === 'human' && i === userIndex)
    if (user) {
      this.users[userIndex] = { type: 'human' }
    }
  }

  isFull () {
    return this.users.filter(u => u && (u.type === 'bot' || u.secret)).length === this.users.length
  }

  restart() {
    const firstGoes = +!this.firstGoes
    this.firstGoes = firstGoes
    this.actions = []
    this.restarts = (this.restarts || 0) + 1
  }

}