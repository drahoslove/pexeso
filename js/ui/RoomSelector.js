export default class RoomSelector {
  constructor(parent, roomInfo) {
    const { id, users } = roomInfo

    const selector = document.createElement('div')
    selector.className = 'paper'
    parent.appendChild(selector)
    this._el = selector


    selector.innerHTML = users
      .filter(Boolean)
      .map(({ type, level, empty, nick }) => (`
        <div>
        ${
          (type === 'human') && (
            '👤 ' + (!empty
              ? (nick || 'Anon')
              : '<i>___ ❓</i>')
          ) ||
          (type === 'bot' && (
            '🤖 Bot úrovně ' + level)
          ) ||
          ''
        }
        </div>
    `)).join('<br />')
  }
}