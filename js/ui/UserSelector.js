import Card from './Card.js'


const LVLS = '12345' || '○◔◑◕⬤' || '⋅︰⁖⁘⁙'
const LOCS = [' ','🌐']

export default class UserSelector {
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
