/* =========================================================
   Écran Joueurs (maquette Players)
   2 à 5 joueurs, chacun avec un prénom et une oie à choisir parmi 5.
   Chaque oie ne peut appartenir qu'à un joueur : choisir une oie déjà prise
   échange les oies des deux joueurs.
   ========================================================= */

import { CHARACTERS, character, gooseImg, avatar } from '../goose.js';
import { MIN_PLAYERS, MAX_PLAYERS } from '../game.js';
import { makePlayer } from '../state.js';
import { esc, backButton, bindActions, ICONS } from '../ui.js';
import { sfx } from '../sound.js';

export function render(root, app) {
  const state = app.state;
  let selectedId = state.players[0].id; // joueur affiché dans l'éditeur

  const selected = () => state.players.find((p) => p.id === selectedId);

  function draw() {
    // On retient le bouton qui avait le focus pour le remettre après le redessin
    const focused = document.activeElement && document.activeElement.dataset
      ? { action: document.activeElement.dataset.action, value: document.activeElement.dataset.value || document.activeElement.dataset.id }
      : null;

    const player = selected();
    const mine = character(player);
    const canAdd = state.players.length < MAX_PLAYERS;
    const canRemove = state.players.length > MIN_PLAYERS;

    root.innerHTML = `
    <section class="screen players">
      <div class="topbar">
        ${backButton('back')}
        <h1>Who's playing?</h1>
      </div>
      <p class="hint">${MIN_PLAYERS} to ${MAX_PLAYERS} players · tap a player below to edit them</p>

      <div class="panel panel--lift editor">
        <div class="editor__preview">
          ${gooseImg(mine.id, 124)}
        </div>
        <p class="editor__character"><strong>${mine.name}</strong>${mine.tagline}</p>

        <label for="player-name" class="sr-only">Player name</label>
        <input id="player-name" class="editor__name" type="text" maxlength="12"
               autocomplete="off" autocapitalize="words" spellcheck="false"
               value="${esc(player.name)}" placeholder="Name">

        <div class="editor__options">
          <span class="label" id="goose-label">Choose your goose</span>
          <div class="goose-picker" role="group" aria-labelledby="goose-label">
            ${CHARACTERS.map((c) => {
              const isMine = c.id === mine.id;
              const owner = state.players.find((p) => p.character === c.id && p.id !== player.id);
              const label = owner ? `${c.name}, taken by ${esc(owner.name)}. Tap to swap.` : c.name;
              return `
              <button type="button" class="goose-pick${isMine ? ' is-selected' : ''}${owner ? ' is-taken' : ''}"
                      data-action="goose" data-value="${c.id}" aria-pressed="${isMine}"
                      aria-label="${label}" title="${label}">
                ${gooseImg(c.id, 48, { head: true })}
              </button>`;
            }).join('')}
          </div>
          <p class="editor__picker-hint">Faded geese are taken: tap one to swap with its player.</p>
        </div>

        ${canRemove ? `
          <button type="button" class="link-btn editor__remove" data-action="remove">
            ${ICONS.close} Remove ${esc(player.name)}
          </button>` : ''}
      </div>

      <div class="roster">
        ${state.players.map((p) => `
          <button type="button" class="roster__item" data-action="select" data-id="${p.id}"
                  aria-label="Edit ${esc(p.name)}" aria-pressed="${p.id === selectedId}">
            ${avatar(p, 56, { active: p.id === selectedId })}
            <span class="roster__name" data-name-of="${p.id}">${esc(p.name)}</span>
          </button>`).join('')}
      </div>

      ${canAdd ? `<button type="button" class="dashed-btn" data-action="add">+ Add a player</button>` : ''}

      <div class="spacer"></div>
      <button type="button" class="btn" data-action="roll">ROLL FOR ORDER</button>
    </section>`;

    // Le prénom est mis à jour pendant la frappe, sans tout redessiner (garde le clavier ouvert)
    const input = root.querySelector('#player-name');
    input.addEventListener('input', () => {
      selected().name = input.value;
      const label = root.querySelector(`[data-name-of="${selectedId}"]`);
      if (label) label.textContent = input.value;
      app.save();
    });

    if (focused && focused.action) {
      const selector = focused.value
        ? `[data-action="${focused.action}"][data-${focused.action === 'select' ? 'id' : 'value'}="${focused.value}"]`
        : `[data-action="${focused.action}"]`;
      const again = root.querySelector(selector);
      if (again) again.focus();
    }
  }

  // Remplace les prénoms vides par « Player N »
  function cleanNames() {
    state.players.forEach((p, i) => {
      p.name = p.name.trim() || `Player ${i + 1}`;
    });
  }

  bindActions(root, {
    back() {
      cleanNames();
      app.save();
      app.go('home');
    },
    select({ id }) {
      cleanNames();
      selectedId = Number(id);
      draw();
    },
    goose({ value }) {
      const me = selected();
      if (me.character === value) return;
      // Oie déjà prise : les deux joueurs échangent leurs oies
      const owner = state.players.find((p) => p.character === value);
      if (owner) owner.character = me.character;
      me.character = value;
      app.save();
      draw();
      if (owner) sfx.swap();
      else sfx.honk();
    },
    add() {
      cleanNames();
      const player = makePlayer(state.nextId, state.players);
      player.name = `Player ${state.players.length + 1}`;
      state.nextId += 1;
      state.players.push(player);
      selectedId = player.id;
      app.save();
      draw();
      sfx.pop();
      root.querySelector('#player-name').focus();
    },
    remove() {
      state.players = state.players.filter((p) => p.id !== selectedId);
      selectedId = state.players[0].id;
      app.save();
      draw();
      sfx.remove();
    },
    roll() {
      cleanNames();
      state.phase = 'order';
      state.rolls = {};
      app.save();
      app.go('order');
    }
  });

  draw();
}
