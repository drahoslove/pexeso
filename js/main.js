import { html, render } from 'https://unpkg.com/htm/preact/standalone.module.js'
import { $, $$, wait } from './tools.js'

import Pexeso from './pexeso.js'
import Pile from './ui/Pile.js'
import Deck, { DDeck } from './ui/Deck.js'
import UserSelector from './ui/UserSelector.js'
import RoomSelector from './ui/RoomSelector.js'
import EndScreen from './ui/EndScreen.js'
import { watchLobby } from './io.js'

const pexeso = new Pexeso()


// create user selectors
const selectedUsers = [
  'user0',
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
const piles = [0,1,2,3].map(i => ({i, name: '', highlighted: false, stack: []}))

const renderPiles = () =>
  render(
    piles.map(({i, name, highlighted}) =>
      html`<${Pile} ...${{i, name, highlighted}} />`
    ),
    $('#piles'),
  )

const decks = [
  { dim: {w: 8, h:8}, visible: true, packed: true },
  { dim: {w: 8, h:6}, visible: true, packed: true },
  { dim: {w: 6, h:6}, visible: true, packed: true },
  { dim: {w: 6, h:4}, visible: true, packed: true },
  { dim: {w: 4, h:4}, visible: true, packed: true }, 
  { dim: {w: 4, h:2}, visible: true, packed: true },
]

const renderDecks = () => {
  render(
    decks.map(({ dim: {w, h}, visible, packed }, i) => html`
      <${Deck}
        w=${w}
        h=${h}
        x=${1.9 - (i%3)*1.95}
        y=${i < 3 ? 2.5 : 1}
        visible=${visible}
        packed=${packed}
        piles=${piles}
        updatePileStack=${(i, cards) => {
          piles[i] = { ...piles[i], cards }
          renderPiles()
        }}
        onPackClick=${play}
      />
    `),
    $('#decks'),
  )
}

renderUserSelectors()
renderDecks()


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



async function play (deck, updateCardAt) {
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
    decks.forEach((d, i) => { 
      if (deck.w === d.dim.w && deck.h === d.dim.h) {
        decks[i] = {...d, packed: true} // pack
      }
    })
    renderDecks()
    await wait(250)
    // show decks
    decks.forEach((d, i) => { 
      if (deck.w === d.dim.w && deck.h === d.dim.h) {
      } else {
        decks[i] = {...d, visible: true}
      }
    })
    renderDecks()
    // reset piles
    piles.forEach((pile, i) => {
      piles[i] = {
        ...pile,
        name: '',
        highlighted: false,
      }
    })
    renderPiles()
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
      // deck.reveal(images)
      return
    }
    if (user !== undefined) {
      piles.forEach((pile, i) => {
        piles[i] = {
          ...pile,
          highlighted: (pile.i === user)
        }
      })
      renderPiles()
      return
    }
    if (end) {
      render(html`<${EndScreen} piles=${piles} />`, $('#results'))
      return
    }
    if (x !== undefined && y !== undefined) {
      if  (image !== undefined) {
        updateCardAt(x, y, {
          image,
        })
        // card.flip(image)
      }
      if (fold === true) {
        updateCardAt(x, y, {

        })
        // card.fold()
      }
      if (pile !== undefined) {
        updateCardAt(x, y, {

        })
        // card.toPile(pile)
      }
    }
  }

  const game = await pexeso.newGame(w, h, players, onUpdate)

  // init selected decks d piles
  const isAlone = players.filter(p => p.startsWith('user')).length === 1
  let counter = 0
  players
    .map((p, i) => {
      if (p === 'none') return ''
      if (p === 'user0') return isAlone ? '👤' : `👤💻`
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


  decks.forEach((d, i) => { // hide other decks
    if (deck.w === d.dim.w && deck.h === d.dim.h) {
      decks[i] = {...d, packed: false} // unpack
    } else {
      decks[i] = {...d, visible: false} // hide
    }
  })
  renderDecks()

  // await deck.wave(false)
  // await deck.unpack()
  if (isFirst) {
    // deck.reveal()
    await wait(500)
    // await deck.reveal(null, true)
    // await deck.shuffle()
  }
  $('#reset-button').disabled = false
  $('#shuffle-button').disabled = false
  await wait(200)
  game.start()
}
