class Pexeso {
  constructor() {
    // test
    // console.assert(this.toI({...this.toXY(3)}) === 3, 'ee')
    // console.assert(this.toI({...this.toXY(5)}) === 5, 'ee')
    // console.assert(this.toI({...this.toXY(15)}) === 15, 'ee')
  }

  toI ({x, y}, w, h) {
    return  y * w + x
  }
  toXY (i, w, h) {
    const x = i % w
    const y = (i-x) / w
    return {
      x, y
    }
  }

  async newGame (w, h, players, onUpdate) {
    // TODO create instance on server and 
    const playerIndexes = players
      .map((_, i) => i).filter(i => players[i] !== 'none')

    const game = new Game(w*h, playerIndexes)
    game.onUpdate((data) => { // modify event data for user
      onUpdate({
        ...(data.i !== undefined ? this.toXY(data.i, w, h) : {}),
        ...data,
      })
    })

    const bots = []

    players.forEach((p, i) => {
      if (p.startsWith('bot')) {
        const level =  +p[3]
        const bot = new Bot(level, i, game)
        bots.push(bot)
      }
    })

    new AutoBackfliper(game, 2500)

    return { // return set of public methods
      tryCard: (x, y) => {
        if (players[game.activePlayer()] === 'user') {
          const i = this.toI({x, y}, w, h)
          if (game.two) {
            game.checkPair()
          } else {
            game.tryCard(i)
          }
        }
      },
      start: game.start.bind(game),
      end: () => {
        game.end()
      },
    }
  }
}

class AutoBackfliper {
  constructor(game, timeout=1500) {
    this.timer
    this.flipCounter = 0
    game.onUpdate(({i, image, user, end}) => {
      if (user !== undefined || end) {
        clearTimeout(this.timer)
        return
      }
      if (i !== undefined && image !== undefined) {
        this.flipCounter++

        if (this.flipCounter % 2 == 0) {
          clearTimeout(this.timer)
          this.timer = setTimeout(() => {
            game.checkPair()
          }, timeout)
        }
      }
    })
  }
}

const UNDISCOVERED = undefined
const PILED = null
class Bot {
  static levelToDifficulty(level) {
    return [4, 16, 32, 52, 76][level] || 100
  }
  constructor(level, id, game) {
    this.level = level
    this.moves = 0
    this.game = game
    this.iPlay = false
    this.currentCard = undefined // index of currently selected card
    this.mem = Array.from({length: game.size}).map(() => UNDISCOVERED)

    game.onUpdate((data) => {
      const { i: card, image, fold, pile, user, end } = data
      if (end) {
        clearTimeout(this.willPlay)
        this.willPlay = null
        return
      }
      if (user !== undefined) {
        this.iPlay = user === id
      }
      if (card !== undefined) {
        if(this.iPlay) {
          this.moves++
        }
        if (image !== undefined) {
          this.mem[card] = image
        }
        if (pile !== undefined) {
          this.mem[card] = PILED
          if (this.currentCard === card) {
            this.currentCard = undefined
          }
        }
        if (fold === true) {
          if (this.currentCard === card) {
            this.currentCard = undefined
          }
        }
      }

      clearTimeout(this.willPlay)
      this.willPlay = null
      if (this.iPlay) {
        const delay = (this.moves % 4 === 2)
          ? 500 + 2500/level // after second card (750-3000)
          : 200 + 500/level // between cards (300 - 700)
        this.willPlay = setTimeout(() => {
          this.play()
        }, delay)
      }
    })
  }

  play() {
    if (this.moves % 4 === 2) {
      this.game.checkPair()
      return
    }

    const card = this.selectCard()

    this.currentCard = card
    this.game.tryCard(card)
  }

  // returns indexes of selectable cards
  possibleCards() {
    return this.mem.map((_, i) => i)
      .filter(i => this.mem[i] !== PILED && i !== this.currentCard)
  }

  // return indexes of cards which have been discovered
  discoveredCards() {
    return this.mem.map((_, i) => i)
      .filter(i => this.mem[i] !== PILED && this.mem[i] !== UNDISCOVERED)
  }

  // returns indexes of cards not yet revealed
  undiscoveredCards() {
    return this.mem.map((_, i) => i)
      .filter(i => this.mem[i] === UNDISCOVERED)
  }

  // return indexes of card which has known match
  matchedCards() {
    const discoveted = this.discoveredCards()
    const matches = []
    discoveted.forEach(i => {
      discoveted.forEach(j => {
        if (i !== j && this.mem[i] === this.mem[j]) {
          matches.push(i, j)
        }
      })
    })
    return matches
  }

  // return index of card
  selectCard() {
    const difficulty = Bot.levelToDifficulty(this.level)
    if(rand(100) < difficulty ) {
      return this.smartSelect()
    } else {
      return this.randomSelect()
    }
  }

  randomSelect() {
    const possibleCards = this.possibleCards()
    if (possibleCards.length === 0) {
      return console.warn('No possible card for bot to select')
    }
    const card = possibleCards[rand(possibleCards.length)]
    return card
  }

  smartSelect() {
    const possibleCards = this.possibleCards()
    if (possibleCards.length === 0) {
      return console.warn('No possible card for bot to select')
    }

    if (this.currentCard !== undefined) {  // looking for second card
      const match = possibleCards.find(i => this.mem[i] === this.mem[this.currentCard])
      if (match) {
        return match
      } // else undiscovered
    } else { // looking for first card
      const matches = this.matchedCards()
      if (matches.length > 0) {
        return matches[rand(matches.length)]
      } // else undiscovered
    }
    const undiscoveredCards = this.undiscoveredCards()
    return undiscoveredCards[rand(undiscoveredCards.length)]
  }

}

// card states
const TOUCHED = 1
const VISIBLE = 2
const REMOVED = 4

class Game { // TODO move this to the server
  // no async or timers inside Game !
  constructor (size, players) {
    this.size = size
    this.busy = true
    this.players = players
    this.onUpdates = []

    // prepare cards
    const allImages = Array.from({ length: 32 }).map((_,i) => i)
    const pickedImages = [...allImages]
      .sort(randomize) // shuffle
      .filter((_, i) => i < size / 2) // pick subset of images
    
    // mapping of cards to images
    const allCards = [...pickedImages, ...pickedImages]
    const cardImages = ondemandRandomList(allCards)
    const cardStates = allCards.map((() => 0 ))

    this.cardImages = cardImages
    this.cardStates = cardStates
    
  }

  emit (data) {
    this.onUpdates.forEach(onUpdate => onUpdate(data))
  }

  onUpdate(callback) {
    this.onUpdates.push(callback)
  }

  start() {
    this.activePlayerIndex = rand(this.players.length)
    this.busy = false
    this.emit({
      user: this.activePlayer(),
    })
  }

  end() { // TODO
    this.emit({
      end: true,
    })
  }



  state(i) {
    return this.cardStates[i]
  }
  hasState(i, state) {
    return Boolean(this.cardStates[i] & state)
  }
  setState(i, state) {
    this.cardStates[i] |= state
  }
  clearState(i, state) {
    this.cardStates[i] &= ~state
  }

  sameImage(i, j) {
    return this.cardImages[i] === this.cardImages[j]
  }

  activePlayer() {
    return this.players[this.activePlayerIndex]
  }
  nextPlayer() {
    this.activePlayerIndex++
    this.activePlayerIndex %= this.players.length
    this.emit({
      user: this.activePlayer(),
    })
  }

  getVisible() {
    return this.cardImages
      .map((_, i) => i)
      .filter((i) => this.hasState(i, VISIBLE) && !this.hasState(i, REMOVED))
  }

  checkPair () {
    const visibleCards = this.getVisible()
    if (visibleCards.length !== 2) {
      return
    }
    const isMatch = this.sameImage(...visibleCards)
    visibleCards.forEach(i => {
      if (isMatch) {
        this.setState(i, REMOVED)
        this.emit({
          i,
          pile: this.activePlayer(),
        })
      } else {
        this.clearState(i, VISIBLE)
        this.emit({
          i,
          fold: true,
        })
      }
    })
    if (!isMatch) {
      this.nextPlayer()
    }
    this.two = false
  }

  tryCard (i) {
    if (this.getVisible().length === 2) {
      return
    }
    if (this.state(i) >= VISIBLE) { // untouchable
      return
    }
    this.setState(i, VISIBLE | TOUCHED)
    this.emit({
      i,
      image: this.cardImages[i],
    })

    const visibleCards = this.getVisible()

    if (visibleCards.length === 2) {
      this.two = true
    } else {
      this.two = false
    }
  }
}