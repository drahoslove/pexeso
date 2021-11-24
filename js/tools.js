export const $ = document.querySelector.bind(document)
export const $$ = document.querySelectorAll.bind(document)


export const rand = (n) => Math.floor(Math.random()*n)

// use as filter to randomize array
export const randomize = () => rand(2) - 0.5

// returns pair of +- ones to indicate corner
// indexed from top left goin clockwise: --, -+, ++, +- 
export const indexToCorner = (i) => {
  i+=2
  i%=4
  return [
    (i % 2 ? -1 : +1) * (i >= 2 ? -1 : +1),
    (i >= 2 ? -1 : +1),
  ] 
}


export const wait = async (t) => new Promise((resolve) => {
  setTimeout(resolve, t)
})

export const ondemandRandomList = (values) => {
  const len = values.length
  let known = []
  return new Proxy(known, {
    get: (list, i) => {
      if (i === 'length') {
        return len
      }
      if (!(i in known)) {
        values.sort(randomize)
        known[i] = values.pop()
      } 
      return known[i]
    },
  })
}


