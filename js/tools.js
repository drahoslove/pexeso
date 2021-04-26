
const rand = (n) => Math.floor(Math.random()*n)

// use as filter to randomize array
const randomize = () => rand(2) - 0.5

const wait = async (t) => new Promise((resolve) => {
  setTimeout(resolve, t)
})

const $ = document.querySelector.bind(document)
const $$ = document.querySelectorAll.bind(document)

const ondemandRandomList = (values) => {
  let known = []
  return new Proxy(known, {
    get: (list, i) => {
      if (i === 'length') {
        return values.length + known.length
      }
      if (!(i in known)) {
        values.sort(randomize)
        known[i] = values.pop()
      } 
      return known[i]
    },
  })
}
