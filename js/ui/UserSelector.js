import { html, Component, render } from 'https://unpkg.com/htm/preact/standalone.module.js'
import { wait } from '../tools.js'

import Card from './Card.js'


const LVLS = '12345' || '○◔◑◕⬤' || '⋅︰⁖⁘⁙'
const LOCS = [' ','🌐']

export default class UserSelector extends Component {
  state = {
    lastLvl: 3,
    rotated: false,
  }
  componentDidMount () {
    this.setVal(this.props.value)
  }
  componentDidUpdate (prevProps) {
    if (this.props.value !== prevProps.value) {
      this.setVal(this.props.value)
    }
  }
  getType = () => {
    const { value } = this.props
    return ['user', 'bot', 'none'].find(type => value.startsWith(type))
  }
  getLvl = () => {
    const { value } = this.props
    return value.startsWith('bot')
      ? value.substr(3)
      : undefined
  }
  isRemote = () => {
    const { value } = this.props
    return value.startsWith('user')
      ? +value.substr(4)
      : undefined
  }
  forceLocalUser () {
    const { allUsers, i: index, onChange } = this.props
    // ensure at least one user0
    if (
      !allUsers.includes('user0') && 
      allUsers.includes('user1')
    ) {
      // find index of user to be changed to local user
      const ui = allUsers
        .map((u, i) => ({u, i}))
        .find(({u,i}) => i !== index && u === 'user1')
      const i = ui ? ui.i : index
      onChange('user0', i)
    }
  }

  toggle() {
    const { allUsers } = this.props
    const { lastLvl } = this.state
    const type = this.getType()
    if (type === 'bot') {
      const hasLocal = allUsers.includes('user0')
      this.setVal('user' + (hasLocal ? 1 : 0))
    } else
    if (type === 'user') {
      this.setVal('bot' + lastLvl)
    }
    this.forceLocalUser()
  }
  add () {
    const { allUsers } = this.props
    const remote = this.isRemote()
    const lvl = this.getLvl()
    let val = this.predVal()
    if (val === 'none') {
      val = ['user'+ +remote, 'bot'+lvl][0]
    }
    if (val === 'user0') {
      val = 'user1'
    }
    // if no local user - add it
    if (!allUsers.includes('user0')) {
      val ='user0'
    }
    this.setVal(val)
  }
  predVal () { // value of userSelector before me or none if all are none
    const { i, allUsers } = this.props
    let j = i
    let val = 'none'
    do {
      j--
      j += 4
      j %= 4
      val = allUsers[j]
    } while (j !== i && val === 'none')
    return val
  }
  setVal (val) { // 'user0' = local user; 'user1' = remote user 'bot1' = bot level 1
    const { onChange } = this.props
    if (val.startsWith('bot')) {
      this.setState({
        lastLvl: +val.substr(3),
      })
    }
    
    onChange(val)
    // delay to change the mark and tweaks in the middle of animation
    wait(75).then(() => {
      this.forceLocalUser()
      const type = this.getType()
      const lvl = this.getLvl()
      const remote = this.isRemote()
      this.setState({
        mark: (type === 'bot' && LVLS[lvl-1]) || (type === 'user' && LOCS[+remote]) || undefined,
        typeClass: type,
      })
    })
  }

  render({i},{mark, rotated, typeClass}) {
    const icon = {
      user: '👤',
      bot: '🤖',
    }[this.getType()] || ''

    return html`
      <div
        class="user-selector ${typeClass}"
        style="
          ${mark ? `--mark: '${mark}';`:""}
        "
      >
        <button
          type="button"
          onClick=${() => { this.setVal('none') }}
        > × </button>
        <input type="range"
          value=${this.getLvl()}
          min=1 max=5 step=1
          onInput=${(e) => {
            this.setVal('bot'+ +e.target.value)
          }}
        />
        <input type="checkbox"
          id="locator-${i}"
          checked=${!!this.isRemote()}
          onClick=${(e) => {
            this.setVal('user'+ +!this.isRemote())
          }}
        />
        <label for="locator-${i}"></label>
        <div
          onClick=${(e) => {
            if (this.props.value === 'none') {
              this.add()
            } else {
              this.toggle()
            }
          }}
        >
          <${Card} x=${0} y=${0} userIcon=${icon} rotated=${rotated} twosided
            rotate=${(rotated) => { this.setState({ rotated })}}
          />
        </div>
      </div>
    `
  }
}
