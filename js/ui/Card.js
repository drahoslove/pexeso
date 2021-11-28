import { html, Component } from 'https://unpkg.com/htm/preact/standalone.module.js'

import { wait, indexToCorner } from '../tools.js'

export default class Card extends Component {
  state = {
    elevation: 15,
    image: undefined,
    rotated: false,
    userIcon: ''
  }
  componentDidMount () {
    const {x, y} = this.props
    this.move(x, y, 0, true)
    this.flip(undefined, this.props.userIcon, false)
  }

  componentDidUpdate(prevProps) {
    // if userIcon is changed do a flip
    if (this.props.userIcon !== prevProps.userIcon) {
       // actually change the icon in the midle of the flip
      this.flip(undefined, this.props.userIcon, false)
    }
  }

  flip = async (image, userIcon, force) => {
    const { deck, twosided } = this.props
    if (!force && deck && deck.packed) return
    this.setState({
      elevation: 15,
    })
    // await wait(150)
    if (twosided) {
      this.setState({
        rotated: !this.state.rotated
      })
    } else {
      if (image === undefined) {
        this.setState({
          rotated: false,
          image: undefined,
        })
      } else {
        this.setState({
          rotated: true,
          image,
        })
      }
    }
    await wait(75)
    this.setState({
      userIcon,
    })
    await wait(75)
    if (deck && deck.packed) return
    this.setState({
      elevation: undefined,
    })
  }

  move = async (x, y, elevation, instant) => {
    this.setState({
      elevation: elevation + 34,
    })

    instant ||  await wait(350)
    this.setState({ elevation: elevation || undefined})
  }

  render (
    {deck, x, y, twosided},
    {elevation, image, rotated, userIcon},
  ){
    return html`
      <div
        class="card ${rotated ? 'rotated' : ''}"
        style="
          --x: ${x};
          --y: ${y};
          ${elevation !== undefined ? `--elevation: ${elevation};`: ''}
          ${userIcon !== undefined ? `--user-icon: '${userIcon}';`: ''}
          ${image ? `--image: ${image};`: ''}
        "
      >
      </div>
    `
  }
}

export class CCard {
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
    if (!pile.name) { // pile without player
      return
    }

    const [ver, hor] = indexToCorner(pileIndex)

    const x = ver * 5.31 + (0.005 * pile.stack.length)
    const y = hor * 2.84 + (0.01 * pile.stack.length)
    
    pile.stack.push(this)
    
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
    this.el.style.setProperty('--elevation', pile.stack.length)
    // this.el.style.removeProperty('--elevation')
  }
}
