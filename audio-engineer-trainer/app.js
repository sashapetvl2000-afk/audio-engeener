const state = {
  audioContext: null,
  source: null,
  current: null,
  round: 1,
  correct: 0,
  total: 0,
  answered: false
};

const playBtn = document.getElementById("playBtn");
const replayBtn = document.getElementById("replayBtn");
const nextBtn = document.getElementById("nextBtn");
const answersEl = document.getElementById("answers");
const resultEl = document.getElementById("result");
const statusEl = document.getElementById("status");
const scoreEl = document.getElementById("score");
const roundEl = document.getElementById("round");

const FREQUENCIES = [
  80, 100, 125, 160, 200, 250, 315, 400,
  500, 630, 800, 1000, 1250, 1600, 2000,
  2500, 3150, 4000, 5000, 6300, 8000, 10000, 12000
];

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function formatHz(value) {
  if (value >= 1000) {
    const k = value / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)} kHz`;
  }
  return `${value} Hz`;
}

function createQuestion() {
  const frequency = randomItem(FREQUENCIES);

  // Cut becomes slightly deeper/shallower within the same training mode.
  const gain = -(4 + Math.random() * 3);
  const q = 1.15 + Math.random() * 0.8;

  // Pick three plausible distractors from nearby musical/frequency regions.
  const candidates = shuffle(
    FREQUENCIES.filter(f => f !== frequency)
  );

  const nearby = candidates
    .sort((a, b) => Math.abs(Math.log2(a / frequency)) - Math.abs(Math.log2(b / frequency)))
    .slice(0, 7);

  const options = shuffle([frequency, ...shuffle(nearby).slice(0, 3)]);

  state.current = { frequency, gain, q, options };
  state.answered = false;

  renderAnswers();
  resultEl.className = "result hidden";
  resultEl.textContent = "";
  nextBtn.disabled = true;
  replayBtn.disabled = true;
  playBtn.disabled = false;
  statusEl.textContent = "Нажми «Воспроизвести»";
  roundEl.textContent = `Раунд ${state.round}`;
}

function renderAnswers() {
  answersEl.innerHTML = "";

  state.current.options.forEach(value => {
    const button = document.createElement("button");
    button.className = "answer";
    button.textContent = formatHz(value);
    button.dataset.frequency = value;
    button.addEventListener("click", () => answer(value, button));
    answersEl.appendChild(button);
  });
}

function createAudioContext() {
  if (!state.audioContext) {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return state.audioContext;
}

/*
  Generates a short synthetic "mix-like" signal.
  It contains bass, midrange harmonics and noisy high frequencies,
  so a bell cut can be heard without external audio files.
*/
function createSourceBuffer(ctx) {
  const duration = 4;
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(2, sampleRate * duration, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);

    let noiseState = Math.random() * 2 - 1;

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;

      const kick =
        Math.sin(2 * Math.PI * 55 * t) *
        Math.exp(-7 * (t % 0.5));

      const bass =
        0.16 * Math.sin(2 * Math.PI * 110 * t) +
        0.09 * Math.sin(2 * Math.PI * 220 * t);

      const mids =
        0.075 * Math.sin(2 * Math.PI * 440 * t) +
        0.06 * Math.sin(2 * Math.PI * 660 * t) +
        0.045 * Math.sin(2 * Math.PI * 880 * t);

      // Simple high-frequency noise with a crude high-pass character.
      const white = Math.random() * 2 - 1;
      noiseState = noiseState * 0.96 + white * 0.04;
      const highs = (white - noiseState) * 0.24;

      // Gentle musical modulation prevents the signal from sounding like one static tone.
      const movement = 0.75 + 0.25 * Math.sin(2 * Math.PI * 0.5 * t);

      data[i] = (kick * 0.38 + bass + mids + highs) * movement;
    }
  }

  return buffer;
}

async function playQuestion() {
  const ctx = createAudioContext();

  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  stopCurrent();

  const source = ctx.createBufferSource();
  source.buffer = createSourceBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = "peaking";
  filter.frequency.value = state.current.frequency;
  filter.Q.value = state.current.q;
  filter.gain.value = state.current.gain;

  const output = ctx.createGain();
  output.gain.value = 0.72;

  source.connect(filter);
  filter.connect(output);
  output.connect(ctx.destination);

  source.onended = () => {
    if (state.source === source) {
      state.source = null;
      replayBtn.disabled = false;
      playBtn.disabled = false;
      statusEl.textContent = "Сигнал закончился — можешь повторить.";
    }
  };

  state.source = source;
  source.start();

  playBtn.disabled = true;
  replayBtn.disabled = true;
  statusEl.textContent = "Слушай внимательно…";
}

function stopCurrent() {
  if (state.source) {
    try {
      state.source.stop();
    } catch (_) {}
    state.source = null;
  }
}

function answer(value, clickedButton) {
  if (state.answered) return;

  state.answered = true;
  state.total++;

  const correct = value === state.current.frequency;

  if (correct) {
    state.correct++;
    clickedButton.classList.add("correct");
  } else {
    clickedButton.classList.add("wrong");

    [...answersEl.children].forEach(button => {
      if (Number(button.dataset.frequency) === state.current.frequency) {
        button.classList.add("correct");
      }
    });
  }

  [...answersEl.children].forEach(button => {
    button.disabled = true;
  });

  const accuracy = Math.round((state.correct / state.total) * 100);
  scoreEl.textContent = `${state.correct} / ${state.total}`;

  resultEl.className = "result";
  resultEl.innerHTML = correct
    ? `<strong>✓ Правильно.</strong><br>
       Частота: <strong>${formatHz(state.current.frequency)}</strong><br>
       Срез: ${state.current.gain.toFixed(1)} dB · Q: ${state.current.q.toFixed(2)}<br>
       Точность: ${accuracy}%`
    : `<strong>✕ Неверно.</strong><br>
       Правильный ответ: <strong>${formatHz(state.current.frequency)}</strong><br>
       Срез: ${state.current.gain.toFixed(1)} dB · Q: ${state.current.q.toFixed(2)}<br>
       Точность: ${accuracy}%`;

  nextBtn.disabled = false;
  replayBtn.disabled = false;
  statusEl.textContent = "Ответ проверен.";
}

playBtn.addEventListener("click", playQuestion);
replayBtn.addEventListener("click", playQuestion);

nextBtn.addEventListener("click", () => {
  stopCurrent();
  state.round++;
  createQuestion();
});

createQuestion();
