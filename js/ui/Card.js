import { wait } from '../tools.js'

export default class Card {
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
