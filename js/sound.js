/* =========================================================
   Sons et musique du jeu
   Tout est fabriqué en direct avec la Web Audio API (oscillateurs + bruit) :
   aucun fichier audio à télécharger, ça marche hors-ligne, et il n'y a
   aucun problème de droits d'auteur.

   - sfx.xxx()      : petits bruitages (clic, bonne réponse, dé, oie…)
   - setScreen(nom) : choisit la musique d'ambiance selon l'écran (appelé par app.js)
   - soundButton()  : bouton haut-parleur (musique + bruitages → bruitages seuls → muet)

   Les navigateurs interdisent de jouer du son avant que l'utilisateur ait
   touché l'écran : le son démarre donc au premier tap.
   Sur iPhone, le bouton « silencieux » coupe aussi le son de l'app.
   ========================================================= */

import { t } from './i18n.js';

// ---------- Réglages faciles à modifier ----------
const MUSIC_VOLUME = 1;   // volume de la musique (0 à 1) : assez bas pour pouvoir parler
const SFX_VOLUME = 1.5;      // volume des bruitages (0 à 1)
const SETTINGS_KEY = 'goose-jumps-sound';

// Musique jouée sur chaque écran (les autres écrans jouent 'main')
const MOOD_BY_SCREEN = {
  question: 'think',  // calme et discrète pendant qu'on répond
  battle: 'battle'    // rapide et tendue
};

// ---------- Réglages sauvegardés (musique / bruitages) ----------
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (saved && typeof saved.music === 'boolean' && typeof saved.sfx === 'boolean') return saved;
  } catch (error) {
    // localStorage indisponible (navigation privée…) : réglages par défaut
  }
  return { music: true, sfx: true };
}

const settings = loadSettings();

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    // pas grave : le réglage ne sera simplement pas retenu
  }
}

// ---------- Moteur audio ----------
let ctx = null;        // AudioContext, créé au premier tap
let sfxBus = null;     // tous les bruitages passent par ici
let musicBus = null;   // toute la musique passe par ici
let noiseBuffer = null;

/** Crée (ou réveille) le moteur audio. Appelé à chaque interaction. */
function unlock() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return; // navigateur trop ancien : pas de son, pas grave
    ctx = new AudioCtx();

    // Compresseur : évite que les sons qui se superposent saturent
    const compressor = ctx.createDynamicsCompressor();
    compressor.connect(ctx.destination);
    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(compressor);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = SFX_VOLUME;
    sfxBus.connect(master);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0;
    musicBus.connect(master);

    // 2 secondes de bruit blanc, réutilisées pour les percussions et les « whoosh »
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const samples = noiseBuffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

    updateMusic();
  }
  if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
}

// Numéro de note MIDI → fréquence (69 = La 440 Hz, 60 = Do du milieu)
const hz = (note) => 440 * 2 ** ((note - 69) / 12);

/**
 * Joue une note.
 * t : moment de départ (secondes, horloge audio) · freq : fréquence en Hz
 * options : type d'onde, durée, volume, glissando vers `to`, filtre passe-bas…
 */
function tone(t, freq, { type = 'square', dur = 0.1, vol = 0.3, to = null, attack = 0.008, lowpass = null, bus = sfxBus } = {}) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);

  // Enveloppe : montée rapide puis extinction (évite les « clics »)
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(vol, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  let out = osc;
  if (lowpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    osc.connect(filter);
    out = filter;
  }
  out.connect(env);
  env.connect(bus);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** Joue du bruit filtré (percussions, souffle, carte qu'on retourne…) */
function noise(t, { dur = 0.1, vol = 0.3, type = 'bandpass', freq = 1000, to = null, q = 1, attack = 0.005, bus = sfxBus } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, t);
  if (to) filter.frequency.exponentialRampToValueAtTime(to, t + dur);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(vol, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  src.connect(filter);
  filter.connect(env);
  env.connect(bus);
  src.start(t, Math.random() * 0.8);
  src.stop(t + dur + 0.05);
}

/** Cri d'oie : onde en dents de scie + filtres qui imitent un son « nasal » */
function honk(t, pitch = 1) {
  const base = (300 + Math.random() * 90) * pitch;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(base * 0.8, t);
  osc.frequency.exponentialRampToValueAtTime(base * 1.15, t + 0.04);
  osc.frequency.exponentialRampToValueAtTime(base * 0.85, t + 0.22);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(1, t + 0.02);
  env.gain.setValueAtTime(1, t + 0.15);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

  // Deux « formants » (zones de résonance) : c'est ce qui donne le côté « coin coin »
  [[1100, 3], [2600, 5]].forEach(([freq, q]) => {
    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.value = freq;
    formant.Q.value = q;
    osc.connect(formant);
    formant.connect(env);
  });
  env.connect(sfxBus);
  osc.start(t);
  osc.stop(t + 0.3);
}

/** Lance un bruitage si le son est autorisé. `fn` reçoit l'heure de départ. */
function play(fn) {
  if (!ctx || !settings.sfx || ctx.state !== 'running') return;
  fn(ctx.currentTime + 0.01);
}

/** Baisse la musique pendant `seconds` (pour laisser la place à une fanfare) */
function duckMusic(seconds) {
  if (!ctx || !settings.music) return;
  const g = musicBus.gain;
  const now = ctx.currentTime;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  g.linearRampToValueAtTime(MUSIC_VOLUME * 0.15, now + 0.1);
  g.setValueAtTime(MUSIC_VOLUME * 0.15, now + seconds);
  g.linearRampToValueAtTime(MUSIC_VOLUME, now + seconds + 1.5);
}

// Petite mélodie : liste de [note MIDI, départ (s), durée (s)]
function melody(t, notes, options) {
  notes.forEach(([note, start, dur]) => tone(t + start, hz(note), { dur, ...options }));
}

// =========================================================
//   BRUITAGES
// =========================================================
export const sfx = {
  // Interface
  click: () => play((t) => tone(t, 620, { type: 'triangle', dur: 0.06, vol: 0.25, to: 460 })),
  select: () => play((t) => {
    tone(t, 880, { type: 'sine', dur: 0.08, vol: 0.3 });
    tone(t + 0.05, 1320, { type: 'sine', dur: 0.1, vol: 0.22 });
  }),
  pop: () => play((t) => tone(t, 380, { type: 'sine', dur: 0.16, vol: 0.45, to: 1100 })),
  remove: () => play((t) => tone(t, 700, { type: 'sine', dur: 0.2, vol: 0.4, to: 180 })),
  honk: (pitch = 1) => play((t) => honk(t, pitch)),
  // Coup sur l'oie de l'accueil : « bop » sec
  bop: () => play((t) => {
    noise(t, { dur: 0.07, vol: 0.5, freq: 900, q: 1.2 });
    tone(t, 240, { type: 'sine', dur: 0.1, vol: 0.5, to: 110 });
  }),
  // KO : choc, sifflet qui descend, puis petits oiseaux qui tournent
  ko: () => play((t) => {
    tone(t, 120, { type: 'sine', dur: 0.35, vol: 0.8, to: 40 });
    noise(t, { dur: 0.15, vol: 0.5, freq: 600 });
    tone(t + 0.05, 1400, { type: 'sine', dur: 0.6, vol: 0.25, to: 250 });
    [0.8, 1.2, 1.6, 2.0].forEach((start) => {
      tone(t + start, 2600, { type: 'sine', dur: 0.07, vol: 0.18, to: 3300 });
      tone(t + start + 0.1, 2800, { type: 'sine', dur: 0.07, vol: 0.18, to: 3500 });
    });
  }),
  // L'oie se relève : « boing » qui monte, puis un cri
  getUp: () => play((t) => {
    tone(t, 200, { type: 'sine', dur: 0.3, vol: 0.45, to: 800 });
    honk(t + 0.3, 1.1);
  }),

  // Dé
  dieTick: () => play((t) => {
    noise(t, { dur: 0.04, vol: 0.4, freq: 2500, q: 2 });
    tone(t, 900 + Math.random() * 500, { type: 'square', dur: 0.03, vol: 0.05 });
  }),
  dieLand: () => play((t) => {
    tone(t, 180, { type: 'sine', dur: 0.25, vol: 0.7, to: 55 });
    noise(t, { dur: 0.08, vol: 0.4, freq: 1200 });
    tone(t + 0.12, hz(84), { type: 'triangle', dur: 0.25, vol: 0.25 });
  }),

  // Début d'action (choix du niveau, début de partie, thème de Battle)
  start: () => play((t) => melody(t, [[72, 0, 0.12], [76, 0.07, 0.12], [79, 0.14, 0.2]], { type: 'square', vol: 0.2, lowpass: 3000 })),

  // « À toi de jouer ! » : ding-dong
  turn: () => play((t) => {
    tone(t, hz(79), { type: 'triangle', dur: 0.3, vol: 0.35 });
    tone(t + 0.16, hz(84), { type: 'triangle', dur: 0.5, vol: 0.35 });
  }),

  // Chrono : tic-tac des 10 dernières secondes, puis buzzer
  clock: (second) => play((t) => {
    tone(t, second % 2 ? 1500 : 1150, { type: 'sine', dur: 0.06, vol: 0.4 });
    noise(t, { dur: 0.02, vol: 0.2, freq: 3000, q: 3 });
  }),
  timeUp: () => play((t) => {
    tone(t, 196, { type: 'sawtooth', dur: 0.65, vol: 0.25, lowpass: 1400 });
    tone(t, 207, { type: 'sawtooth', dur: 0.65, vol: 0.25, lowpass: 1400 });
  }),

  // Réponse affichée : petit scintillement
  reveal: () => play((t) => melody(t, [[84, 0, 0.25], [88, 0.05, 0.25], [91, 0.1, 0.25], [96, 0.15, 0.35]], { type: 'triangle', vol: 0.22 })),

  // Jugement
  correct: () => play((t) => {
    melody(t, [[72, 0, 0.16], [76, 0.08, 0.16], [79, 0.16, 0.16], [84, 0.24, 0.2]], { type: 'square', vol: 0.2, lowpass: 3500 });
    tone(t + 0.32, hz(88), { type: 'triangle', dur: 0.55, vol: 0.22 });
  }),
  wrong: () => play((t) => {
    // « Wah wah » descendant
    tone(t, hz(55), { type: 'sawtooth', dur: 0.28, vol: 0.28, to: hz(54), lowpass: 1200 });
    tone(t + 0.3, hz(51), { type: 'sawtooth', dur: 0.6, vol: 0.28, to: hz(46), lowpass: 1000 });
  }),

  // Cartes Chance / Special
  cardFlip: () => play((t) => {
    noise(t, { dur: 0.28, vol: 0.7, freq: 500, to: 4500, q: 1.5, attack: 0.05 });
    tone(t + 0.2, hz(91), { type: 'triangle', dur: 0.35, vol: 0.16 });
  }),
  moveUp: () => play((t) => melody(t, [[67, 0, 0.1], [71, 0.08, 0.1], [74, 0.16, 0.1], [79, 0.24, 0.3]], { type: 'square', vol: 0.18, lowpass: 3000 })),
  moveDown: () => play((t) => melody(t, [[74, 0, 0.1], [70, 0.09, 0.1], [67, 0.18, 0.1], [62, 0.27, 0.35]], { type: 'square', vol: 0.18, lowpass: 2200 })),
  swap: () => play((t) => {
    tone(t, 300, { type: 'sine', dur: 0.35, vol: 0.3, to: 900 });
    tone(t, 900, { type: 'sine', dur: 0.35, vol: 0.3, to: 300 });
  }),
  // Gel : petits cristaux qui descendent
  freeze: () => play((t) => {
    melody(t, [[96, 0, 0.15], [91, 0.06, 0.15], [88, 0.12, 0.15], [84, 0.18, 0.3]], { type: 'triangle', vol: 0.2 });
    noise(t, { dur: 0.5, vol: 0.2, type: 'highpass', freq: 6000, attack: 0.02 });
  }),

  // Une oie qui ronfle (tour passé)
  snore: () => play((t) => {
    noise(t, { dur: 0.8, vol: 0.7, type: 'lowpass', freq: 250, to: 700, attack: 0.4 });
    noise(t + 1, { dur: 0.6, vol: 0.25, type: 'bandpass', freq: 2500, to: 900, q: 2, attack: 0.2 });
  }),

  // Battle
  battle: () => play((t) => {
    // Roulement de tambour qui accélère, puis accord de cuivres
    [0, 0.16, 0.3, 0.42, 0.52, 0.6].forEach((start) => {
      tone(t + start, 140, { type: 'sine', dur: 0.15, vol: 0.6, to: 50 });
      noise(t + start, { dur: 0.08, vol: 0.25, freq: 1500 });
    });
    [57, 64, 69].forEach((note) => tone(t + 0.7, hz(note), { type: 'sawtooth', dur: 0.6, vol: 0.12, lowpass: 1600, attack: 0.03 }));
  }),
  battleWin: () => play((t) => {
    melody(t, [[67, 0, 0.1], [72, 0.1, 0.1], [76, 0.2, 0.1], [79, 0.3, 0.45]], { type: 'square', vol: 0.15, lowpass: 3200 });
    honk(t + 0.8, 1.1);
  }),
  nobody: () => play((t) => tone(t, 520, { type: 'sine', dur: 0.45, vol: 0.4, to: 140 })),

  // Victoire : fanfare (la musique se baisse pendant ce temps)
  victory: () => play((t) => {
    duckMusic(3);
    const fanfare = [[67, 0, 0.12], [67, 0.14, 0.12], [67, 0.28, 0.12], [72, 0.42, 0.5],
      [67, 0.98, 0.14], [72, 1.14, 0.14], [76, 1.3, 0.14], [79, 1.46, 0.9]];
    melody(t, fanfare, { type: 'square', vol: 0.16, lowpass: 3000 });
    melody(t, fanfare.map(([n, s, d]) => [n - 12, s, d]), { type: 'triangle', vol: 0.2 });
    noise(t + 1.46, { dur: 1.2, vol: 0.15, type: 'highpass', freq: 5000, attack: 0.05 }); // cymbale
    honk(t + 2.5, 1);
    honk(t + 2.75, 1.2);
  })
};

// =========================================================
//   MUSIQUE D'AMBIANCE
//   Petit séquenceur : chaque morceau = 4 mesures de 8 croches qui tournent en boucle.
//   - bass   : décalage (en demi-tons) par rapport à la basse de la mesure, ou null
//   - chords : croches où l'accord est joué
//   - lead   : mélodie (notes MIDI, null = silence), une ligne par mesure
//   - kick / snare / hat : croches où la percussion est jouée
// =========================================================
const MOODS = {
  // Joyeuse et sautillante (menus, tour de jeu, classement…)
  main: {
    bpm: 112,
    bars: [
      { bass: 48, chord: [60, 64, 67] },  // Do
      { bass: 45, chord: [57, 60, 64] },  // La mineur
      { bass: 41, chord: [57, 60, 65] },  // Fa
      { bass: 43, chord: [55, 59, 62] }   // Sol
    ],
    bass: [0, null, 12, null, 7, null, 12, null],
    chords: [2, 6],
    lead: [
      [76, null, 79, null, 81, 79, 76, null],
      [72, null, 76, null, 74, 72, 69, null],
      [69, null, 72, null, 74, null, 77, 76],
      [74, null, 71, null, 67, null, null, null]
    ],
    kick: [0, 4],
    snare: [2, 6],
    hat: [1, 3, 5, 7]
  },
  // Très calme pendant les questions (on doit pouvoir parler)
  think: {
    bpm: 84,
    bars: [
      { bass: 45, chord: [57, 60, 64] },
      { bass: 41, chord: [57, 60, 65] },
      { bass: 48, chord: [55, 60, 64] },
      { bass: 43, chord: [55, 59, 62] }
    ],
    bass: [0, null, null, null, 7, null, null, null],
    chords: [],
    pluck: [0, 3, 6],  // notes de l'accord jouées une par une, une octave plus haut
    lead: null,
    kick: [],
    snare: [],
    hat: [2, 6]
  },
  // Rapide et tendue (Battle)
  battle: {
    bpm: 144,
    bars: [
      { bass: 45, chord: [57, 60, 64] },  // La mineur
      { bass: 45, chord: [57, 60, 64] },
      { bass: 41, chord: [57, 60, 65] },  // Fa
      { bass: 40, chord: [56, 59, 64] }   // Mi
    ],
    bass: [0, 0, 12, 0, 0, 0, 12, 0],
    chords: [3, 6],
    lead: [
      [69, null, 72, 69, 76, null, 74, 72],
      [71, null, 72, null, 69, null, null, null],
      [77, null, 76, null, 74, null, 72, null],
      [71, null, 68, null, 64, null, null, null]
    ],
    kick: [0, 2, 4, 6],
    snare: [2, 6],
    hat: [0, 1, 2, 3, 4, 5, 6, 7]
  }
};

let wantedMood = 'main';  // musique demandée par l'écran affiché
let mood = null;          // musique en cours
let step = 0;             // croche en cours dans la boucle
let loop = 0;             // nombre de boucles déjà jouées
let nextStepTime = 0;
let scheduler = null;

/** Joue toutes les notes d'une croche du morceau */
function playStep(m, index, t, stepDur) {
  const barIndex = Math.floor(index / 8);
  const bar = m.bars[barIndex];
  const s = index % 8;
  const bus = musicBus;

  const bassOffset = m.bass[s];
  if (bassOffset !== null) {
    tone(t, hz(bar.bass + bassOffset), { type: 'triangle', dur: stepDur * 0.9, vol: 0.55, bus });
  }
  if (m.chords.includes(s)) {
    bar.chord.forEach((note) => tone(t, hz(note), { type: 'square', dur: stepDur * 0.7, vol: 0.06, lowpass: 1800, bus }));
  }
  if (m.pluck && m.pluck.includes(s)) {
    const note = bar.chord[m.pluck.indexOf(s) % bar.chord.length] + 12;
    tone(t, hz(note), { type: 'sine', dur: stepDur * 2.5, vol: 0.22, bus });
  }
  // La mélodie fait une pause une boucle sur trois, pour ne pas lasser
  if (m.lead && loop % 3 !== 2) {
    const note = m.lead[barIndex][s];
    if (note) tone(t, hz(note), { type: 'square', dur: stepDur * 0.85, vol: 0.1, lowpass: 2400, bus });
  }
  if (m.kick.includes(s)) tone(t, 150, { type: 'sine', dur: 0.14, vol: 0.6, to: 45, bus });
  if (m.snare.includes(s)) noise(t, { dur: 0.1, vol: 0.18, freq: 1800, q: 0.8, bus });
  if (m.hat.includes(s)) noise(t, { dur: 0.03, vol: 0.07, type: 'highpass', freq: 7000, bus });
}

/** Appelé toutes les 25 ms : prépare les notes des 150 prochaines millisecondes */
function schedule() {
  if (mood !== wantedMood) {
    mood = wantedMood;
    step = 0;
    loop = 0;
  }
  const m = MOODS[mood];
  const stepDur = 30 / m.bpm; // durée d'une croche
  // Si l'app a été mise en pause (onglet caché), on repart de maintenant
  if (nextStepTime < ctx.currentTime - 0.2) nextStepTime = ctx.currentTime + 0.05;
  while (nextStepTime < ctx.currentTime + 0.15) {
    playStep(m, step, nextStepTime, stepDur);
    nextStepTime += stepDur;
    step += 1;
    if (step >= m.bars.length * 8) {
      step = 0;
      loop += 1;
    }
  }
}

/** Démarre ou arrête la musique selon les réglages */
function updateMusic() {
  if (!ctx) return;
  const g = musicBus.gain;
  g.cancelScheduledValues(ctx.currentTime);
  g.setTargetAtTime(settings.music ? MUSIC_VOLUME : 0, ctx.currentTime, 0.2);

  if (settings.music && !scheduler) {
    nextStepTime = ctx.currentTime + 0.1;
    scheduler = setInterval(schedule, 25);
  }
  if (!settings.music && scheduler) {
    clearInterval(scheduler);
    scheduler = null;
  }
}

/** Choisit la musique de l'écran affiché (appelé par le routeur, app.js) */
export function setScreen(name) {
  wantedMood = MOOD_BY_SCREEN[name] || 'main';
}

// =========================================================
//   BOUTON SON (3 états, dans cet ordre)
// =========================================================
const SPEAKER = '<path d="M4 9h4l5-4v14l-5-4H4z"/>';
const STATES = [
  {
    music: true, sfx: true, label: () => t('Sound: music and effects on', 'Son : musique et bruitages'),
    icon: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'
  },
  {
    music: false, sfx: true, label: () => t('Sound: effects only', 'Son : bruitages seulement'),
    icon: `${SPEAKER}<path d="M16.5 8.5a5 5 0 0 1 0 7M19.5 5.5a9 9 0 0 1 0 13"/>`
  },
  {
    music: false, sfx: false, label: () => t('Sound off', 'Son coupé'),
    icon: `${SPEAKER}<path d="M17 9l5 5M22 9l-5 5"/>`
  }
];

function currentState() {
  return STATES.findIndex((s) => s.music === settings.music && s.sfx === settings.sfx);
}

function buttonInner() {
  const s = STATES[Math.max(0, currentState())];
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${s.icon}</svg>`;
}

function buttonLabel() {
  return `${STATES[Math.max(0, currentState())].label()}${t('. Tap to change.', '. Toucher pour changer.')}`;
}

/** HTML du bouton son, à placer dans un écran */
export function soundButton(extraClass = '') {
  return `<button type="button" class="icon-btn ${extraClass}" data-sound-toggle aria-label="${buttonLabel()}" title="${buttonLabel()}">${buttonInner()}</button>`;
}

function cycleSettings() {
  const next = STATES[(currentState() + 1) % STATES.length];
  settings.music = next.music;
  settings.sfx = next.sfx;
  saveSettings();
  updateMusic();
  sfx.select();
  document.querySelectorAll('[data-sound-toggle]').forEach((button) => {
    button.innerHTML = buttonInner();
    button.setAttribute('aria-label', buttonLabel());
    button.setAttribute('title', buttonLabel());
  });
}

// =========================================================
//   ÉCOUTEURS GLOBAUX
// =========================================================

// Le premier contact avec l'écran débloque le son (règle des navigateurs)
['pointerdown', 'touchend', 'click', 'keydown'].forEach((type) => {
  document.addEventListener(type, unlock, true);
});

// Petit clic sur tous les boutons (un son plus aigu pour les sélections)
const SELECT_TARGETS = '.goose-pick, .chip, .tab, .cat-btn, .roster__item';
document.addEventListener('pointerdown', (event) => {
  const button = event.target.closest('button');
  // data-silent : bouton qui a ses propres sons (ex. l'oie de l'accueil)
  if (!button || button.disabled || button.hasAttribute('data-sound-toggle') || button.hasAttribute('data-silent')) return;
  if (button.matches(SELECT_TARGETS)) sfx.select();
  else sfx.click();
});

// Bouton son
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-sound-toggle]')) cycleSettings();
});

// App en arrière-plan (téléphone verrouillé, autre appli) : on coupe tout
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend();
  else ctx.resume();
});
