import { html, Component } from 'https://unpkg.com/htm/preact/standalone.module.js'

export default class RoomSelector extends Component {
  render({ roomInfo }) {
    const { users } = roomInfo
    return html`
      <div class="paper">
        ${users
          .filter(Boolean)
          .map(({ type, level, empty, nick }) => html`
            <div>
              ${type === 'human' && (
                html`👤 ${(!empty
                  ? (nick || 'Anon')
                  : html`<i>___ ❓</i>`
                )}`
              )}
              ${type === 'bot' && (
                '🤖 Bot úrovně ' + level
              )}
            </div>
          `)
        }
      </div>
    `
  }
}