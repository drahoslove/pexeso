import { Component, html, render } from 'https://unpkg.com/htm/preact/standalone.module.js'

import { wait, randomize } from '../tools.js'
import Card, { CCard } from './Card.js'


export default class Deck extends Component {
  constructor(props) {
    super(props)
    const { w, h } = props
    const cards = new Set()
    const grid = []
    for (let j = 0; j < h; j++) {
      grid[j] = []
      for (let i = 0; i < w; i++) {
        const card = {
          x: i, y: j, rotated: false,
        }
        cards.add(card)
        grid[j][i] = card
      }
    }
    this.state = {
      grid,
      cards,
      packed: false,
    }
    this.grid = grid
    this.pack(true)
  }

  componentDidUpdate(prevProps) {
    if (this.props.packed === !prevProps.packed) {
      this.props.packed
        ? this.pack()
        : this.unpack()
    }
  }


  toPos(x,y){
    const {w, h} = this.props
    return {
      x: x - w/2 + 0.5,
      y: y - h/2 + 0.5,
    }
  }
  cardAt (x, y) {
    return this.state.grid[y][x]
  }
  updateCard = (j, i, cardData) => {
    const { grid } = this
    const newGrid = grid.map((line) => line.map((card) => ({...card}))) // clone grid
    newGrid[i][j] = {
      ...(newGrid[i][j]),
      ...cardData,
    }
    this.grid = newGrid
    this.setState({
      grid: newGrid,
    })
  }
  
  moveCard = async (j, i, {x, y, z}, instant) => {
    this.updateCard(j, i, {x, y, z: z + 34})
    instant || await wait(350)
    this.updateCard(j, i, { z })
  }

  rotateCard = async (j, i, rotation) => {
    this.updateCard(j, i, {
      rotation,
    })
  }

  async pack (instant = true) {
    const {w, h, x, y, piles, updatePileStack} = this.props
    // this.setState({ packed: true })
    let size = 0
    const animationMoves = [] // to be animated
    for (let i = h-1; i >=0; i--) {
      for (let j = w-1; j >=0; j--) {
        // adjust offest to make 3D effect
        const xx = x + (0.005 * size)/2
        const yy = y + (0.01 * size)/1.2
        size++
        ;(async (i, j, x, y, z) => {
          this.updateCard(j, i, {
            piled: true,
            w: undefined,
            h: undefined,
            faceDown: undefined,
          })
          animationMoves.push(
            this.moveCard(j, i, {
              x,
              y,
              z,
            }, instant)
          )
          if (!instant) await wait(10)
        })(i, j, xx, yy, size)
      }
    }
    piles.forEach((pile, i) => { // remove cards from piles
      updatePileStack(i, [])
    })
    await Promise.all([
      instant || wait(600),
      ...animationMoves,
    ])
    // instant || (await wait(200))
    this.setState({ packed: true })
  }
  async unpack (instant=false) {
    const {w, h} = this.props
    this.setState({ packed: false }) // will hide deck-name
    const animationMoves = []
    let edge = 80 - (Math.max(w,h) - 8) * 10
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        ;(async (j, i, edge) => {
          this.updateCard(j, i, {
            piled: false,
            w: edge,
            h: edge,
          })
          animationMoves.push(
            this.moveCard(j, i, {
              ...this.toPos(j, i),
              z: 0,
            }, instant)
          )
        })(j, i, edge)
        if(!instant) await wait(15)
      }
    }
    await Promise.all([
      ...animationMoves,
    ])
    this.setState({ packed: false, })
  }

  cardOf (el) {
    const { w, h } = this.props
    const index = [el.parentElement.children].indexOf(el)
    const i = index % w
    const j = (index - index % w)/h
    return this.cardAt(i, j)
  }

  onClick = (e) => {
    const { onPackClick, w, h } = this.props
    const { packed } = this.state
    if (e.target === e.currentTarget) {
      // Firefox sometimes make this fire on the deck element instead of the card
      if (packed) {
        onPackClick({w, h}, this.updateCard)
      }
      return
    }
    const card = this.cardOf(e.target)
    if (e.target.classList.contains('card')) {
      if (packed) {
        onPackClick({w, h}, this.updateCard)
      } else {
        this.onCardClick && this.onCardClick(card)
      }
    }
  }
  render ({w, h, visible}, {grid, packed}) {
    return html`
      <div
        class="deck ${packed && 'packed'}"
        style="
          ${visible === false ? 'opacity: 0; pointer-events: none;' : ''}
          --deck-name: '${w}×${h}';
        "
        onClick=${this.onClick}
      >
        ${
          grid.map(line => line.map(({x, y, w, h, z, piled, rotated, ...rest}) => (
            html`
              <${Card}
                ...${{...rest, x, y, w, h, z, piled, rotated}}
                rotate=${(rotation) => this.rotateCard(x, y, rotation)}
              />
            `
          )))
        }
      </div>
    `
  }
}

export class DDeck {
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
        const card = new CCard(this, i, j)
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
      pile.stack = []
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
