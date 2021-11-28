import { html, render } from 'https://unpkg.com/htm/preact/standalone.module.js'
import { $, $$, wait } from './tools.js'

import Pexeso from './pexeso.js'
import Pile from './ui/Pile.js'
import Deck from './ui/Deck.js'
import UserSelector from './ui/UserSelector.js'
import RoomSelector from './ui/RoomSelector.js'
import EndScreen from './ui/EndScreen.js'
import { watchLobby } from './io.js'

const pexeso = new Pexeso()


// create user selectors
const selectedUsers = [
  'user',
  'bot3',
  'none',
  'none',
]
const selectUser = (val, j) => {
  selectedUsers[j] = val
  renderUserSelectors()
}

const renderUserSelectors = () => {
  render(
    selectedUsers.map((defaultValue, i) => (
      html`<${UserSelector}
        i=${i}
        value=${defaultValue}
        allUsers=${selectedUsers}
        onChange=${(val, j=i) => { selectUser(val, j)}}
      />`
    )),
    $('#user-selectors'),
  )
}

// create piles
const piles = [0,1,2,3].map(i => ({name: '', stack: []}))

const renderPiles = (props) =>
  render(
    props.map(({i, name, highlighted}) =>
      html`<${Pile} ...${{i, name, highlighted}} />`
    ),
    $('#piles'),
  )


renderUserSelectors()

const decks = [
  [8, 8],
  [8, 6],
  [6, 6],
  [6, 4],
  [4, 4], 
  [4, 2],
].map(([w, h], i) => (
  new Deck(
    $('#app'),
    w, h,
    1.9 - (i%3)*1.95,
    i < 3 ? 2.5 : 1,
    piles,
    play,
  )
))


let isFirst = true

const menus = $$('.menu')


watchLobby((lobbyData) => {
  const waitingGames = lobbyData.filter(({ state }) => state === 'waiting')
  const playingGames = lobbyData.filter(({ state }) => state === 'playing')

  render(
    waitingGames.length === 0
      ? html`<div class='empty'>Nikdo zrovna nečeká na hráče</div>`
      : waitingGames.map(room => html`<${RoomSelector} roomInfo=${room} />`),
    $('#waiting-list'),
  )

  render(
    playingGames.length === 0
      ? html`<div class='empty'>Nikdo zrovna nečeká na hráče</div>`
      : playingGames.map(room => html`<${RoomSelector} roomInfo=${room} />`),
    $('#playing-list')
  )
})



async function play (deck) {
  // rederegister button events
  $('#shuffle-button').onclick = async(e) => {
    e.preventDefault()
    e.target.disabled = true
    $('#reset-button').disabled = true

    await deck.shuffle(false)
    e.target.disabled = false
    $('#reset-button').disabled = false
  }

  $('#reset-button').onclick = async (e) => {
    render(null, $('#results'))

    e.target.disabled = true
    $('#shuffle-button').disabled = true

    if (isFirst) {
      game.giveup()
      await wait(1200) // wait for reveal
      isFirst = false
    }
    await deck.pack(false)
    await wait(250)
    // show decks
    decks.forEach(deck => {
      deck.show()
    })
    // reset piles
    piles.forEach(pile => { pile.name = '' })
    renderPiles(piles.map(({name}, i) => ({i,  name, highlighted: false})))
    game.end()
    render(null, $('#results'))

    menus[0].setAttribute('hidden', false)
    menus[1].setAttribute('hidden', true)
    await wait(500)
  }
  render(null, $('#results'))


  // inits:


  const {w, h} = deck
  // init game logic
  const players = [...selectedUsers]

  // function handling incoming game events
  const onUpdate = (data) => {
    const {x, y, image, fold, pile, user, images, end } = data
    if (images) {
      deck.reveal(images)
      return
    }
    if (user !== undefined) {
      renderPiles(piles.map(({name}, i) => ({i, name, highlighted: i === user})))
      return
    }
    if (end) {
      render(html`<${EndScreen} piles=${piles} />`, $('#results'))
      return
    }
    if (x !== undefined && y !== undefined) {
      const card = deck.cardAt(x, y)
      if  (image !== undefined) {
        card.flip(image)
      }
      if (fold === true) {
        card.fold()
      }
      if (pile !== undefined) {
        card.toPile(pile)
      }
    }
  }

  const game = await pexeso.newGame(w, h, players, onUpdate)

  // init selected decks d piles
  const humans = players.filter(p => p === 'user0' || p === 'user1').length
  let counter = 0
  players
    .map((p, i) => {
      if (p === 'none') return ''
      if (p === 'user0') return humans === 1 ? '👤' : `👤💻`
      if (p === 'user1') return `👤🌐`
      return  p.replace('bot', '🤖 ˡᵛˡ ')
    })
    .forEach((name, i) => {
      piles[i].name = name
    })

  deck.onCardClick = (card) => {
    const {x, y} = card
    game.tryCard(x, y)
  }

  menus[0].setAttribute('hidden', true)
  menus[1].setAttribute('hidden', false)


  decks.forEach(d => { // hide other decks
    if (deck !== d) {
      d.hide()
    }
  })

  // await deck.wave(false)
  await deck.unpack()
  if (isFirst) {
    deck.reveal()
    await wait(500)
    await deck.reveal(null, true)
    await deck.shuffle()
  }
  $('#reset-button').disabled = false
  $('#shuffle-button').disabled = false
  await wait(200)
  game.start()
}
