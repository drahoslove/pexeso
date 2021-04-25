class Card {
  constructor(board, x, y) {
    this.board = board
    this.x = x
    this.y = y
    const el = this.el = document.createElement('div')
    el.setAttribute('class', 'card')

    board.el.appendChild(el)
    this.move(...board.toPos(x, y))
    this.rotated = false
  }
  async flip(image) {
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
    this.el.style.removeProperty('--elevation')
  }

  fold() {
    this.flip()
  }

  // move in the grid
  async move (x, y, elevation = 0) {
    this.el.style.setProperty('--elevation', elevation + 34)
    this.el.style.setProperty('--x', x)
    this.el.style.setProperty('--y', y)
    await wait(350)
    if (!elevation) {
      this.el.style.removeProperty('--elevation')
    } else {
      this.el.style.setProperty('--elevation', elevation)
    }
  }


  // move to one of the 4 piles
  async toPile (pileIndex) {
    const { players, toCorner } = this.board
    pileIndex %= players.length
    if (board.isPiled(this)) { // card already in pile
      return
    }

    const { pile, name } = players[pileIndex]
    if (!name) { // pile without player
      return
    }

    const [ver, hor] = toCorner(pileIndex)

    const x = ver * 5.35 + (0.005 * pile.length)
    const y = hor * 2.9 + (0.01 * pile.length)
    
    pile.push(this)
    
    // resize card to unified diemnsions
    this.el.style.setProperty('--card-width', '84px')
    this.el.style.setProperty('--card-height', '84px')
    this.el.style.setProperty('--elevation', 34)
    await wait(100)
    this.el.style.setProperty('--x', x)
    this.el.style.setProperty('--y', y)
    await wait(400)
    this.el.style.setProperty('--elevation', pile.length)
    // this.el.style.removeProperty('--elevation')

  }
}

class Board {
  constructor(app, w=6, h=6, players, onClick) {
    this.w = w
    this.h = h
    this.players = players.map((name) => ({
      name,
      pile: [],
    }))
    this.cards = new Set() // all cards
    this.grid = [] // cards in grid

    // create board element (zero size, in the center of the app, only for opsitioning elements inside)
    const el = this.el = document.createElement('div')
    el.setAttribute('class', 'board')
    app.appendChild(el)

    let edge = 80 - (Math.max(w,h) - 8) * 10

    el.style.setProperty('--card-width', `${edge}px`)
    el.style.setProperty('--card-height', `${edge}px`)

    el.addEventListener('click', e => {
      const card = this.cardOf(e.target)
      if (e.target.classList.contains('card')) {
        onClick(card)
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

    // create piles
    this.players.forEach(({pile, name}, i) => {
      if (!name) {
        return
      }

      const [ver, hor] = this.toCorner(i)
      {
        const [x , y] = [
          ver * 5.35,
          hor * 2.9,
        ]
  
        const pileBox = document.createElement('div')
        pileBox.classList.add('pile-frame')
        pileBox.style.setProperty('--x', x)
        pileBox.style.setProperty('--y', y)
        this.el.appendChild(pileBox)
      }
      // create user names
      { 
        const [x, y] = [
          ver * 5.35,
          hor * 1.9,
        ]
        const nameEl = document.createElement('div')
        nameEl.classList.add('user-name')
        nameEl.innerText = name

        nameEl.style.setProperty('--x', x)
        nameEl.style.setProperty('--y', y)
        this.el.appendChild(nameEl)

        this.players[i].nameEl = nameEl
      }
    })
  }

  toCorner(i) {
    i+=2
    i%=4
    return [
      (i % 2 ? -1 : +1) * (i >= 2 ? -1 : +1),
      (i >= 2 ? -1 : +1),
    ] 
  }

  highlightUser(index) {
    this.players.forEach(({ nameEl }, i) => {
      if (!nameEl) {
        return
      }
      if (index === i) {
        nameEl.classList.add('highlighted')
      } else {
        nameEl.classList.remove('highlighted')
      }
    })
  }

  toPos(x,y){
    const {w, h} = this
    return [
      x - w/2 + 0.5,
      y - h/2 + 0.5,
    ]
  }

  destroy() {
    this.grid.forEach(row => {
      row.forEach(card => {
        card.el.remove()
      })
    })
    this.el.remove()
  }

  swap (x1, y1, x2, y2) {
    const cardA = this.cardAt(x1, y1)
    const cardB = this.cardAt(x2, y2)

    cardA.move(...this.toPos(x2, y2))
    cardB.move(...this.toPos(x1, y1))
  }

  
  isPiled(card) {
    return this.players.some(({pile})=> pile.includes(card))
  }

  cardOf (el) {
    return [...this.cards].find((card => card.el === el))
  }

  cardAt (x, y) {
    return this.grid[y][x]
  }

  async pack (instant = true) {
    const {w, h} = this
    let size = 0
    const moves = []
    for (let i = 0; i<h; i++) {
      for (let j = 0; j<w; j++) {
        const x = 0 + (0.005 * size)
        const y = -1.5 + (0.01 * size)
        size++
        const card = this.cardAt(j, i)
        card.el.style.removeProperty('--card-width')
        card.el.style.removeProperty('--card-height')
        moves.push(card.move(x, y, size))
        if (!instant) await wait(15)
      }
    }
    await Promise.all([
      wait(600),
      ...moves,
    ])
  }

  async unpack () {
    const {w, h} = this
    const moves = []
    for (let i = h-1; i>=0; i--) {
      for (let j = w-1; j>=0; j--) {
        const card = this.cardAt(j, i)
        moves.push(card.move(...this.toPos(j, i)))
        await wait(15)
      }
    }
    await Promise.all([
      ...moves,
    ])
  }


  async wave () {
    const {w,h} = this

    await Promise.all([
      new Promise((resolve) => {
        setTimeout(async() => {
          for (let i = 0; i<2*h+w; i++) {
            for (let j = 0; j<2*w+h; j++) {
              const y = j;
              const x = i-y;
              if (y >= 0 && y <h && x >= 0 && x <w) {
                this.cardAt(x,y).flip(((y+1)*(x+1)+1)%32) //.flip(((i+1)*j+i) % 32)
                await wait(5)
              }
            }
            await wait(50)
            resolve()
          }
        }, 100)
      }),
      new Promise((resolve) => {
        setTimeout(async() => {
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
          resolve()
        }, 750)
      }),
    ])
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

