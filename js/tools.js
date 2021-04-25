
const rand = (n) => Math.floor(Math.random()*n)

// use as filter to randomize array
const randomize = () => rand(2) - 0.5

const wait = async (t) => new Promise((resolve) => {
  setTimeout(resolve, t)
})

const $ = document.querySelector.bind(document)
const $$ = document.querySelectorAll.bind(document)

