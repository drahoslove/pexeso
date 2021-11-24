export default class EndScreen {
  constructor(el, piles) {
    this.el = el
    this.piles = piles
  }

  hide() {
    const { el, piles } = this
    ;[...el.children].forEach((bar, i) => {
      bar.style.setProperty('--size', 0)
      bar.style.setProperty('--name', '')
    })
    el.setAttribute('hidden', true)
  }
  
  show() {
    const { el, piles } = this
    ;[...el.children].forEach((bar, i) => {
      const name = piles[i].getName()
      const points = piles[i].size()/2
      let p = 0
      bar.style.setProperty('--name', `'${name}'`)
      bar.style.setProperty('--points', 0)
      const interval = setInterval(() => {
        if (p === points) {
          clearInterval(interval)
          return
        }
        p++
        bar.style.setProperty('--points', p)
      }, 100)
      if (name) {
        bar.removeAttribute('hidden')
      } else {
        bar.setAttribute('hidden', true)
      }
    })
    el.removeAttribute('hidden')
  }
}
