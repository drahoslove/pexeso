class Card {
  constructor(deck, x, y) {
    this.deck = deck
    this.x = x
    this.y = y
    const el = this.el = document.createElement('div')
    el.setAttribute('class', 'card')

    deck.el.appendChild(el)
    this.move(...deck.toPos(x, y), 0, true)
    this.rotated = false
  }
  async flip(image, force) {
    if (!force && this.deck.packed) return
    this.el.style.setProperty('--elevation', 15)
    // await wait(150)
    if (image === undefined) {
      this.el.classList.remove('rotated')
      this.el.style.removeProperty('--image')
    } else {
      this.el.classList.add('rotated')
      this.el.style.setProperty('--image', image)
    }
    await wait(150)
    if (this.deck.packed) return
    this.el.style.removeProperty('--elevation')
  }

  fold(force) {
    this.flip(undefined, force)
  }

  // move in the grid
  async move (x, y, elevation = 0, instant) {
    this.el.style.setProperty('--elevation', elevation + 34)
    this.el.style.setProperty('--x', x)
    this.el.style.setProperty('--y', y)

    instant ||  await wait(350)
    // await wait(1)
    if (!elevation) {
      this.el.style.removeProperty('--elevation')
    } else {
      this.el.style.setProperty('--elevation', elevation)
    }
  }


  // move to one of the 4 piles
  async toPile (pileIndex) {
    if (this.deck.packed) return
    const { piles } = this.deck
    if (this.deck.isPiled(this)) { // card already in pile
      return
    }

    const pile = piles[pileIndex]
    if (!pile.getName()) { // pile without player
      return
    }

    const [ver, hor] = indexToCorner(pileIndex)

    const x = ver * 5.31 + (0.005 * pile.size())
    const y = hor * 2.84 + (0.01 * pile.size())
    
    pile.add(this)
    
    // resize card to unified diemnsions
    this.el.classList.add('piled')
    this.el.style.removeProperty('--card-width')
    this.el.style.removeProperty('--card-height')
    this.el.style.setProperty('--elevation', 34)
    await wait(100)
    if (this.deck.packed) return
    this.el.style.setProperty('--x', x)
    this.el.style.setProperty('--y', y)
    await wait(400)
    if (this.deck.packed) return
    this.el.style.setProperty('--elevation', pile.size())
    // this.el.style.removeProperty('--elevation')
  }
}

class Deck {
  constructor(
    app, // parent element
    w=6, h=6, // dimension of grid
    x=0, y=-1.5, // position of packed deck
    piles,
    onPackClick, // action on click at packed deck
  ) {
    this.packed = false
    this.w = w
    this.h = h
    this.x = x // deck position
    this.y = y 

    this.cards = new Set() // all cards
    this.grid = [] // cards in grid

    this.piles = piles

    // create board element (zero size, in the center of the app, only for opsitioning elements inside)
    const el = this.el = document.createElement('div')
    el.setAttribute('class', 'deck')
    app.appendChild(el)

    // el.style.setProperty('--card-width', `84px`)
    // el.style.setProperty('--card-height', `84px`)

    el.style.setProperty('--deck-name', `'${w}×${h}'`)

    el.addEventListener('click', e => {
      const card = this.cardOf(e.target)
      if (e.target.classList.contains('card')) {
        if (this.packed) {
          onPackClick(this)
        } else {
          this.onCardClick && this.onCardClick(card)
        }
      }
    })

    // create cards
    for (let j = 0; j < h; j++) {
      this.grid[j] = []
      for (let i = 0; i < w; i++) {
        const card = new Card(this, i, j)
        this.cards.add(card)
        this.grid[j][i] = card
      }
    }

    // pack the deck
    this.pack(true)
  }

  toPos(x,y){
    const {w, h} = this
    return [
      x - w/2 + 0.5,
      y - h/2 + 0.5,
    ]
  }

  hide () {
    // this.el.setAttribute('hidden', true)
    this.el.style.setProperty('opacity', 0)
    this.el.style.setProperty('pointer-events', 'none')
  }

  show () {
    // this.el.removeAttribute('hidden')
    this.el.style.setProperty('opacity', 1)
    this.el.style.removeProperty('pointer-events')
  }

  swap (x1, y1, x2, y2) {
    const cardA = this.cardAt(x1, y1)
    const cardB = this.cardAt(x2, y2)

    cardA.move(...this.toPos(x2, y2))
    cardB.move(...this.toPos(x1, y1))
  }

  
  isPiled(card) {
    return this.piles.some(({stack})=> stack.includes(card))
  }

  cardOf (el) {
    return [...this.cards].find((card => card.el === el))
  }

  cardAt (x, y) {
    return this.grid[y][x]
  }

  async pack (instant = true) {
    this.packed = true
    const {w, h} = this
    let size = 0
    const moves = []
    for (let i = h-1; i >=0; i--) {
      for (let j = w-1; j >=0; j--) {
        const x = this.x + (0.005 * size)/2
        const y = this.y + (0.01 * size)/1.2
        size++
        const card = this.cardAt(j, i)
        card.el.classList.remove('piled')
        card.el.style.removeProperty('--card-width')
        card.el.style.removeProperty('--card-height')
        card.fold(true)
        moves.push(card.move(x, y, size, instant))
        if (!instant) await wait(10)
      }
    }
    this.piles.forEach(pile => { // remove cards from piles
      pile.empty()
    })
    await Promise.all([
      instant || wait(600),
      ...moves,
    ])
    // instant || (await wait(200))
    this.el.classList.add('packed')
  }

  async unpack () {
    this.el.classList.remove('packed')
    const {w, h} = this
    const moves = []
    let edge = 80 - (Math.max(w,h) - 8) * 10
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        const card = this.cardAt(j, i)
        card.el.classList.remove('piled')
        card.el.style.setProperty('--card-width', `${edge}px`)
        card.el.style.setProperty('--card-height', `${edge}px`)
        moves.push(card.move(...this.toPos(j, i), 0, false))
        await wait(15)
      }
    }
    await Promise.all([
      ...moves,
    ])
    this.packed = false
  }


  async reveal (trueImages, unreveal) {
    const {w,h} = this

    if (!unreveal) {
      for (let i = 0; i<2*h+w; i++) {
        for (let j = 0; j<2*w+h; j++) {
          const y = j;
          const x = i-y;
          if (y >= 0 && y <h && x >= 0 && x <w) {
            this.cardAt(x,y).flip(trueImages
              ? trueImages[y*w + x % trueImages.length]
              : (y+(x*h))%32
            ) //.flip(((i+1)*j+i) % 32)
            await wait(5)
          }
        }
        await wait(50)
      }
    } else {
      for (let i = 0; i<h+w; i++) {
        for (let j = 0; j<w+h; j++) {
          const y = j;
          const x = i-y;
          if (y >= 0 && y <h && x >= 0 && x <w) {
            this.cardAt(x,y).fold()
            await wait(5)
          }
        }
        await wait(50)
      }
    }
  }

  async shuffle (noReposition=true) {
    const {w,h} = this
    const moves = 12 - Math.sqrt(w*h) // number of moves each card does while shuffeling
    const que = []

    const positions = []
    for (let i = 0; i<w; i++) {
      for (let j = 0; j<h; j++) {
        positions.push({x:i, y:j})
      }
    }
    for (let f=0;  f <moves-noReposition; f++) {
      const newPositions = [...positions].sort(randomize)
      for (let i = 0; i< positions.length; i++) {
        const { x, y } = positions[i]
        const {x: nx, y: ny} = newPositions[i]
        const card = this.cardAt(x, y)
        que.push(async () => {
          if (this.isPiled(card)) {
            return
          }
          card.move(...this.toPos(nx, ny))
          await wait(20-Math.sqrt(w*h))
        })
      }
      que.sort(randomize) // shuffle que so it wont be apparent that the cards are moving in order
      while (que.length > 0) {
        await que.pop()()
      }
    }
    if (noReposition) { // return cards back to original grid positions
      this.grid.forEach((row, y) => {
        row.forEach((card, x) => {
          que.push(async () => {
            if (this.isPiled(card)) {
              return
            }
            card.move(...this.toPos(x, y))
            await wait(20-Math.sqrt(w*h))
          })
        })
      })
      que.sort(randomize) // shuffle que so it wont be apparent that the cards returned in the order
      while (que.length > 0) {
        await que.pop()()
      }
    }
  }
}

class Pile {
  constructor (i, parent, name='') {
    this.stack = []

    const [ver, hor] = indexToCorner(i)
    const x = ver * 1
    const y = hor * 1

    const pileBox = document.createElement('div')
    pileBox.classList.add('pile-frame')
    pileBox.style.setProperty(x < 0 ? 'left': 'right', Math.abs(x))
    pileBox.style.setProperty(y < 0 ? 'top': 'bottom', Math.abs(y))
    parent.appendChild(pileBox)
    this.pileBox = pileBox

    // create user name el
    const nameEl = document.createElement('div')
    nameEl.classList.add('user-name')
    nameEl.classList.add(y > 0 ? 'above' : 'below')
    nameEl.classList.add(x < 0 ? 'left' : 'right')
    pileBox.appendChild(nameEl)

    this.nameEl = nameEl
    this.rename(name)
  }

  empty () {
    this.stack = []
  }

  add (card) {
    this.stack.push(card)
  }

  size () {
    return this.stack.length
  }

  rename (name) {
    this.nameEl.innerText = name
    this.name = name
    this.pileBox.hidden = !name
  }

  getName () {
    return this.name
  }

  highlight() {
    this.nameEl.classList.add('highlighted')
  }
  
  lowlight() {
    this.nameEl.classList.remove('highlighted')
  }
}