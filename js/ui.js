const isMobileDevice = () => {

}


class Card {
  constructor(deck, x, y, twosided) {
    this.deck = deck
    this.x = x
    this.y = y
    const el = this.el = document.createElement('div')
    el.setAttribute('class', 'card')

    deck.el.appendChild(el)
    const deckPos = deck.toPos ? deck.toPos(x, y) : [x, y]
    this.move(...deckPos, 0, true)
    this.rotated = false
    this._el = el
    this.isTwosided = twosided
  }
  async flip(image, force) {
    if (!force && this.deck.packed) return
    this.el.style.setProperty('--elevation', 15)
    // await wait(150)
    if (this.isTwosided) {
      if (this.el.classList.contains('rotated')) {
        this.el.classList.remove('rotated')
      } else {
        this.el.classList.add('rotated')
      }
    } else {
      if (image === undefined) {
        this.el.classList.remove('rotated')
        this.el.style.removeProperty('--image')
      } else {
        this.el.classList.add('rotated')
        this.el.style.setProperty('--image', image)
      }
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
    w=6, h=6, // dimension of grid (number of cards)
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
      if (e.target === e.currentTarget) {
        // Firefox sometimes make this fire on the deck element instead of the card
        if (this.packed) {
          onPackClick(this)
        }
        return
      }
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
  constructor (i, parent, userSelector) {
    this.stack = []
    this.userSelector = userSelector

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
    this.setName('')
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

  setName (name) {
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

const LVLS = '12345' || '○◔◑◕⬤' || '⋅︰⁖⁘⁙'
const LOCS = [' ','🌐']
class UserSelector {
  constructor(parent, defaultVal) {
    UserSelector.list = [...(UserSelector.list || []), this] 
    // const [ver, hor] = indexToCorner(i)
    // const x = ver * 0.51
    // const y = hor * 0.51

    const selector = document.createElement('div')
    selector.className = 'user-selector'
    parent.appendChild(selector)
    this._el = selector

    const remover = document.createElement('button')
    remover.type = 'button'
    remover.innerText = '×'
    remover.onclick = () => { this.remove() }
    selector.appendChild(remover)

    const lvler = document.createElement('input')
    lvler.type = 'range'
    lvler.value = 3
    lvler.min = 1
    lvler.max = 5
    lvler.step = 1
    lvler.onchange = (e) => {
      const lvl = e.target.value
      this._el.style.setProperty('--mark', `'${LVLS[lvl-1]}'`)
    }
    selector.append(lvler)

    const locator = document.createElement('input')
    locator.id = `locator-${UserSelector.list.length}`
    locator.type = 'checkbox'
    locator.onchange = (e) => {
      this._el.style.setProperty('--mark', `'${LOCS[+this._locator.checked]}`)
      this.forceLocalUser()
    }
    selector.append(locator)
    const locatorLabel = document.createElement('label')
    locatorLabel.setAttribute('for', locator.id)
    selector.append(locatorLabel)

    
    const pseudoDeck = {el: selector}
    
    this.card = new Card(pseudoDeck, 0, 0, true)
    this._locator = locator
    this._lvler = lvler

    this._type = 'none'
    this.value = defaultVal

    this.card._el.addEventListener('click', (e) => {
      if (this.value === 'none') {
        this.add()
      } else {
        this.toggle()
      }
    })
  }

  get value() {
    if (this._type === 'none') {
      return 'none'
    }
    if (this._type === 'bot') {
      return this._type + +this._lvler.value
    }
    if (this._type === 'user') {
      return this._type + +this._locator.checked
    }
    return ''
  }

  set value(val) { // 'user0' = local user; 'user1' = remote user 'bot1' = bot level 1
    if (val === 'none') {
      this._type = val
    }
    if (val.startsWith('bot')) {
      const lvl = +val.substr(3)
      this._type = 'bot'
      this._lvler.value = lvl
    }
    if (val.startsWith('user')) {
      const location = +val.substr(4)
      this._type = 'user'
      this._locator.checked = !!location
    }
    this.card.flip()
    if (this._type === 'none') {
      this._el.style.removeProperty('--mark')
    }
    this.forceLocalUser()
    setTimeout(() => {
      const icon = {
        user: '👤',
        bot: '🤖',
      }[this._type] || ''
      this.card._el.style.setProperty('--user-icon', `'${icon}'`)
      if (this._type === 'bot') {
        this._el.style.setProperty('--mark', `'${LVLS[this._lvler.value-1]}'`)
      }
      if (this._type === 'user') {
        this._el.style.setProperty('--mark', `'${LOCS[+this._locator.checked]}`)
      }
      ;['none', 'bot', 'user'].forEach(name => {
        if (this._type === name) {
          this._el.classList.add(name)
        } else {
          this._el.classList.remove(name)
        }
      })
    }, 75)
  }

  forceLocalUser () {
    // ensure at least one user0
    if (
      UserSelector.list.every(({ value }) => value !== 'user0') && 
      UserSelector.list.some(({ value }) => value === 'user1')
    ) {
      const user = UserSelector.list.find(selector => selector !== this && selector.value === 'user1') || this
      user.value = 'user0'
    }
  }

  toggle() {
    if (this._type === 'bot') {
      const hasLocal = UserSelector.list.filter(({ value }) => value === 'user0').length > 0
      this.value = 'user' + (hasLocal ? 1 : 0)
    } else
    if (this._type === 'user') {
      this.value = 'bot' + (this._lvler.value)
    }
    this.forceLocalUser()
  }

  add () {
    const val = this.predVal()
    this.value = val === 'none'
      ?  ['user'+ +this._locator.checked, 'bot'+this._lvler.value][0]
      : val

    if (val === 'user0') {
      this.value = 'user1'
    }
    // if no local user - add it
    if (UserSelector.list.filter(({ value }) => value === 'user0').length === 0) {
      this.value ='user0'
    }
  }

  predVal () { // value of userSelector before me or none if all are none
    const i = UserSelector.list.indexOf(this)
    let j = i
    let val = 'none'
    do {
      j--
      j += 4
      j %= 4
      val = UserSelector.list[j].value
    } while (j !== i && val === 'none')
    return val
  }

  remove () {
    this.value = 'none'
  }
}


class EndScreen {
  constructor(el, piles) {
    this.el = el
    this.piles = piles
  }

  hide() {
    const { el, piles } = this
    ;[...el.children].forEach((bar, i) => {
      bar.style.setProperty('--size', 0)
      bar.style.setProperty('--name', '')
    })
    el.setAttribute('hidden', true)
  }
  
  show() {
    const { el, piles } = this
    ;[...el.children].forEach((bar, i) => {
      const name = piles[i].getName()
      const points = piles[i].size()/2
      let p = 0
      bar.style.setProperty('--name', `'${name}'`)
      bar.style.setProperty('--points', 0)
      const interval = setInterval(() => {
        if (p === points) {
          clearInterval(interval)
          return
        }
        p++
        bar.style.setProperty('--points', p)
      }, 100)
      if (name) {
        bar.removeAttribute('hidden')
      } else {
        bar.setAttribute('hidden', true)
      }
    })
    el.removeAttribute('hidden')
  }
}
