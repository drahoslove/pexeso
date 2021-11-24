import { indexToCorner} from '../tools.js'

export default class Pile {
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
