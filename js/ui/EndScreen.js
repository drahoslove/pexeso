import { html, Component } from 'https://unpkg.com/htm/preact/standalone.module.js'

export default class EndScreen extends Component {
  state = [0,0,0,0]
  componentDidMount() {
    const { piles } = this.props
    piles.forEach((pile, i) => {
      let p = 0
      const points = pile.stack.length/2
      const interval = setInterval(() => {
        if (p === points) {
          clearInterval(interval)
          return
        }
        p++
        this.setState({
          [i]: p,
        })
      }, 100)
    })
  }
  render ({ piles }, points) {
    return html`
      <div class="results">
        ${
          piles.map((pile, i) => {
            const { name } = pile
            const p = points[i]
            if (!name) {
              return null
            }
            return html`
              <div
                class="bar"
                style="
                  --name: '${name}';
                  --points: ${p};
                "
              />
            `
          }).filter(Boolean)
        }
      </div>
    `
  }
}
