import { html, Component } from 'https://unpkg.com/htm/preact/standalone.module.js'
import { indexToCorner} from '../tools.js'

export default class Pile extends Component {
  render ({name, i, highlighted}) {
    const [ver, hor] = indexToCorner(i)
    const x = ver * 1
    const y = hor * 1
    if (!name) {
      return null
    }
    return html`
      <div
        class="pile-frame"
        style="
          ${x < 0 ? 'left': 'right'}: ${Math.abs(x)};
          ${y < 0 ? 'top': 'bottom'}: ${Math.abs(y)};
        "
      >
        <div hidden=${!name}  class="${[
          'user-name',
          y > 0 ? 'above' : 'below',
          x < 0 ? 'left' : 'right',
          highlighted && 'highlighted',
        ].join(' ')}">
        ${name}
        </div>
      </div>
    `
  }
}
