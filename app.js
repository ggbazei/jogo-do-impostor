const game = {
  players: ["Jogador 1", "Jogador 2", "Jogador 3", "Jogador 4", "Jogador 5"],
  selectedCategories: [],
  impostorCount: 1,
  roles: [],
  secretWord: "",
  category: "",
  hint: "",
  revealIndex: 0,
  speakingOrder: [],
  voterIndex: 0,
  votes: [],
  selectedVotes: [],
  civilianScore: 0,
  impostorScore: 0,
  timerId: null,
  lastImpostors: []
};

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 15;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
}

function showScreen(screenId) {
  $$(".screen").forEach((screen) => screen.classList.remove("active"));
  $(`#${screenId}`).classList.add("active");
  window.scrollTo(0, 0);

  if (screenId === "players") {
    renderPlayers();
  }

  if (screenId === "votePass") {
    prepareVotePass();
  }
}

function renderPlayers() {
  const playerList = $("#playerList");
  playerList.innerHTML = "";

  game.players.forEach((name, index) => {
    const input = document.createElement("input");
    input.value = name;
    input.placeholder = `Nome do jogador ${index + 1}`;
    input.setAttribute("aria-label", `Nome do jogador ${index + 1}`);

    input.addEventListener("input", () => {
      game.players[index] = input.value;
      $("#playerError").hidden = true;
    });

    playerList.append(input);
  });

  $("#playerCount").textContent = game.players.length;
}

function syncPlayerNames() {
  game.players = $$("#playerList input").map((input) => input.value.trim());
}

function validatePlayers() {
  syncPlayerNames();

  const isValid =
    game.players.length >= MIN_PLAYERS &&
    game.players.every((name) => name.length > 0);

  $("#playerError").hidden = isValid;

  if (!isValid) {
    $$("#playerList input").find((input) => !input.value.trim())?.focus();
  }

  return isValid;
}

function updateImpostorCounter() {
  const maximum = Math.max(1, game.players.length - 2);
  game.impostorCount = Math.min(game.impostorCount, maximum);
  $("#impCount").textContent = game.impostorCount;
}

function renderCategories() {
  const grid = $("#categoryGrid");

  Object.keys(categories).forEach((category) => {
    const button = document.createElement("button");
    button.className = "cat";
    button.innerHTML = `<i>${categoryIcons[category]}</i>${category}`;

    button.addEventListener("click", () => {
      button.classList.toggle("on");

      if (button.classList.contains("on")) {
        game.selectedCategories = [...new Set([...game.selectedCategories, category])];
      } else {
        game.selectedCategories = game.selectedCategories.filter(
          (selected) => selected !== category
        );
      }
    });

    grid.append(button);
  });
}

function chooseImpostors(noImpostorRound) {
  if (noImpostorRound) {
    return [];
  }

  const allPlayers = game.players.map((_, index) => index);
  let available = allPlayers.filter(
    (index) => !game.lastImpostors.includes(index)
  );

  if (available.length < game.impostorCount) {
    available = allPlayers;
  }

  const chosen = shuffle(available).slice(0, game.impostorCount);
  game.lastImpostors = [...chosen];

  return chosen;
}

function getImpostorHint() {
  return wordHints[game.secretWord] || categoryHints[game.category] || "relacionado";
}

function getCustomWords() {
  return $("#customWords")
    .value
    .split(/[\n,]+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function chooseSecretWord() {
  const customWords = getCustomWords();

  if (customWords.length > 0) {
    game.category = "Personalizada";
    game.secretWord = randomItem(customWords);
    return;
  }

  const availableCategories =
    game.selectedCategories.length > 0
      ? game.selectedCategories
      : Object.keys(categories);

  game.category = randomItem(availableCategories);
  game.secretWord = randomItem(categories[game.category]);
}

function chooseDecoyWord() {
  const customWords = getCustomWords();
  const pool =
    game.category === "Personalizada" && customWords.length > 1
      ? customWords
      : categories[game.category] || Object.values(categories).flat();

  return randomItem(pool.filter((word) => word !== game.secretWord)) || "Mistério";
}

function setupRound() {
  if (!validatePlayers()) {
    showScreen("players");
    return;
  }

  updateImpostorCounter();
  chooseSecretWord();
  game.hint = getImpostorHint();

  const noImpostorRound = $("#chaos").checked && Math.random() < 0.2;
  const impostorIndexes = chooseImpostors(noImpostorRound);

  game.roles = game.players.map((name, index) => ({
    name,
    isImpostor: impostorIndexes.includes(index),
    decoyWord: impostorIndexes.includes(index) ? chooseDecoyWord() : null
  }));

  game.revealIndex = 0;
  game.votes = [];
  game.voterIndex = 0;
  game.selectedVotes = [];

  resetResult();
  showRevealScreen();
}

function showRevealScreen() {
  showScreen("reveal");

  const role = game.roles[game.revealIndex];

  $("#revealProgress").textContent =
    `Jogador ${game.revealIndex + 1} de ${game.players.length}`;
  $("#revealName").textContent = role.name;
  $("#hidden").hidden = false;
  $("#shown").hidden = true;
  $("#nextReveal").disabled = true;
}

function buildImpostorCard(role) {
  const category = $("#showCat").checked
    ? `<p>Categoria: <b>${game.category}</b></p>`
    : "";

  const firstPlayerHint =
    game.revealIndex === 0
      ? `<p>💡 Como você é o primeiro da roda, sua dica é: <b>${game.hint}</b></p>`
      : "";

  const partners = $("#knowEach").checked
    ? game.roles
        .filter((otherRole) => otherRole.isImpostor && otherRole !== role)
        .map((otherRole) => otherRole.name)
        .join(", ")
    : "";

  const partnerText = partners
    ? `<p>Outro impostor: <b>${partners}</b></p>`
    : "";

  return `
    <div class="role imp">😈 VOCÊ É O IMPOSTOR</div>
    <div class="secret">IMPOSTOR</div>
    ${category}
    ${firstPlayerHint}
    ${partnerText}
  `;
}

function buildWordCard(role, mysteryMode) {
  const word =
    role.isImpostor && mysteryMode ? role.decoyWord : game.secretWord;

  return `
    <div class="role civ">🔐 SUA PALAVRA</div>
    <div class="secret">${word}</div>
    <p>${game.category}</p>
  `;
}

function revealCard(showContent) {
  const role = game.roles[game.revealIndex];

  if (!showContent) {
    $("#shown").hidden = true;
    $("#hidden").hidden = false;
    $("#nextReveal").disabled = false;
    return;
  }

  $("#hidden").hidden = true;
  $("#shown").hidden = false;

  const mysteryMode = $("#mystery").checked;

  $("#shown").innerHTML =
    role.isImpostor && !mysteryMode
      ? buildImpostorCard(role)
      : buildWordCard(role, mysteryMode);

  navigator.vibrate?.(role.isImpostor ? [80, 50, 80] : 35);
}

function moveToNextReveal() {
  game.revealIndex++;

  if (game.revealIndex < game.roles.length) {
    showRevealScreen();
    return;
  }

  game.speakingOrder = shuffle(game.players);
  $("#starterName").textContent = game.speakingOrder[0];
  showScreen("starter");
}

function startDiscussion() {
  showScreen("discussion");

  $("#order").innerHTML = game.speakingOrder
    .map((player) => `<li>${player}</li>`)
    .join("");

  startTimer(Number($("#time").value));
}

function startTimer(totalSeconds) {
  clearInterval(game.timerId);

  let secondsLeft = totalSeconds;

  const renderTimer = () => {
    const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const seconds = String(secondsLeft % 60).padStart(2, "0");

    $("#timer").textContent = totalSeconds ? `${minutes}:${seconds}` : "∞";
    $("#timer").classList.toggle(
      "low",
      Boolean(totalSeconds && secondsLeft <= 20)
    );
  };

  renderTimer();

  if (!totalSeconds) {
    return;
  }

  game.timerId = setInterval(() => {
    secondsLeft--;
    renderTimer();

    if (secondsLeft <= 0) {
      clearInterval(game.timerId);
      navigator.vibrate?.([200, 100, 200]);
    }
  }, 1000);
}

function prepareVotePass() {
  clearInterval(game.timerId);
  $("#votePassName").textContent = game.players[game.voterIndex];
}

function votesRequiredPerPlayer() {
  return Math.min(game.impostorCount, game.players.length - 1);
}

function renderVoteSelection() {
  const requiredVotes = votesRequiredPerPlayer();

  $$("#voteList button").forEach((button) => {
    const playerIndex = Number(button.dataset.playerIndex);
    button.classList.toggle(
      "selected",
      game.selectedVotes.includes(playerIndex)
    );
  });

  $("#voteHelp").textContent =
    requiredVotes === 1
      ? "Escolha 1 jogador."
      : `Escolha ${requiredVotes} jogadores que você acha que são os impostores. (${game.selectedVotes.length}/${requiredVotes})`;

  $("#confirmVote").hidden = requiredVotes === 1;
  $("#confirmVote").disabled = game.selectedVotes.length !== requiredVotes;
}

function toggleVote(playerIndex) {
  const requiredVotes = votesRequiredPerPlayer();

  if (requiredVotes === 1) {
    game.selectedVotes = [playerIndex];
    submitVotes();
    return;
  }

  if (game.selectedVotes.includes(playerIndex)) {
    game.selectedVotes = game.selectedVotes.filter(
      (selected) => selected !== playerIndex
    );
  } else if (game.selectedVotes.length < requiredVotes) {
    game.selectedVotes.push(playerIndex);
  }

  renderVoteSelection();
}

function openVote() {
  showScreen("vote");

  game.selectedVotes = [];
  $("#voterName").textContent = game.players[game.voterIndex];
  $("#voteList").innerHTML = "";

  game.players.forEach((name, index) => {
    if (index === game.voterIndex) {
      return;
    }

    const button = document.createElement("button");
    button.textContent = name;
    button.dataset.playerIndex = index;
    button.addEventListener("click", () => toggleVote(index));

    $("#voteList").append(button);
  });

  renderVoteSelection();
}

function submitVotes() {
  game.votes.push(...game.selectedVotes);
  game.voterIndex++;
  game.selectedVotes = [];

  if (game.voterIndex < game.players.length) {
    showScreen("votePass");
  } else {
    finishVote();
  }
}

function getTopSuspects(voteCounts, amount) {
  const candidates = voteCounts.map((votes, index) => ({ index, votes }));

  return shuffle(candidates)
    .sort((first, second) => second.votes - first.votes)
    .slice(0, amount)
    .map((candidate) => candidate.index);
}

function getRealImpostorIndexes() {
  return game.roles
    .map((role, index) => (role.isImpostor ? index : -1))
    .filter((index) => index >= 0);
}

function showActualImpostors() {
  const names = game.roles
    .filter((role) => role.isImpostor)
    .map((role) => role.name);

  $("#actualImpostors").hidden = false;
  $("#actualImpostors").innerHTML = `
    <b>😈 ${names.length === 1 ? "O impostor era" : "Os impostores eram"}</b>
    <p>${names.length ? names.join(" • ") : "Nenhum impostor nesta rodada."}</p>
  `;
}

function setVerdict(message, resultClass) {
  $("#verdict").className = `verdict ${resultClass}`;
  $("#verdict").textContent = message;
}

function finishVote() {
  const realImpostors = getRealImpostorIndexes();
  const noImpostor = realImpostors.length === 0;
  const suspectsToChoose = votesRequiredPerPlayer();

  const voteCounts = game.players.map(
    (_, index) => game.votes.filter((vote) => vote === index).length
  );

  const accused = getTopSuspects(voteCounts, suspectsToChoose);
  const allCaught =
    !noImpostor &&
    realImpostors.every((impostorIndex) => accused.includes(impostorIndex));

  showScreen("result");

  $("#accused").textContent = accused
    .map((index) => game.players[index])
    .join(" • ");

  $("#resultIcon").textContent = noImpostor ? "🎲" : allCaught ? "😈" : "😇";
  $("#lastChance").hidden = true;

  if (noImpostor) {
    setVerdict("NÃO HAVIA IMPOSTOR!", "win");
    game.civilianScore++;
    showActualImpostors();
    renderScore();
    return;
  }

  if (game.impostorCount > 1) {
    if (allCaught) {
      setVerdict("🎉 TODOS OS IMPOSTORES FORAM DESCOBERTOS!", "win");
      game.civilianScore++;
    } else {
      setVerdict("😈 PELO MENOS UM IMPOSTOR ESCAPOU!", "lose");
      game.impostorScore++;
    }

    showActualImpostors();
    renderScore();
    return;
  }

  if (allCaught) {
    setVerdict("ERA O IMPOSTOR!", "win");
    $("#lastChance").hidden = false;
  } else {
    setVerdict("NÃO ERA O IMPOSTOR!", "lose");
    game.impostorScore++;
    showActualImpostors();
    renderScore();
  }
}

function handleFinalGuess() {
  const guess = $("#guess").value.trim();

  const guessedCorrectly =
    guess.localeCompare(game.secretWord, undefined, { sensitivity: "base" }) === 0;

  if (guessedCorrectly) {
    game.impostorScore++;
    setVerdict("😈 IMPOSTOR VIROU O JOGO!", "lose");
  } else {
    game.civilianScore++;
    setVerdict(
      `🎉 CIVIS VENCERAM! A palavra era ${game.secretWord}.`,
      "win"
    );
  }

  $("#lastChance").hidden = true;
  showActualImpostors();
  renderScore();
}

function renderScore() {
  $("#score").innerHTML = `
    <div>
      <strong>${game.civilianScore}</strong>
      <span>Civis</span>
    </div>
    <div>
      <strong>${game.impostorScore}</strong>
      <span>Impostores</span>
    </div>
  `;
}

function resetResult() {
  $("#actualImpostors").hidden = true;
  $("#actualImpostors").innerHTML = "";
  $("#lastChance").hidden = true;
  $("#guess").value = "";
}

function startNewRound() {
  resetResult();
  setupRound();
}

function bindEvents() {
  $$("[data-go]").forEach((button) => {
    button.addEventListener("click", () => showScreen(button.dataset.go));
  });

  $("#playerMinus").addEventListener("click", () => {
    syncPlayerNames();

    if (game.players.length > MIN_PLAYERS) {
      game.players.pop();
      renderPlayers();
    }

    updateImpostorCounter();
  });

  $("#playerPlus").addEventListener("click", () => {
    syncPlayerNames();

    if (game.players.length < MAX_PLAYERS) {
      game.players.push("");
      renderPlayers();
      $$("#playerList input").at(-1)?.focus();
    }
  });

  $("#playersContinue").addEventListener("click", () => {
    if (validatePlayers()) {
      showScreen("categories");
    }
  });

  $("#impMinus").addEventListener("click", () => {
    game.impostorCount = Math.max(1, game.impostorCount - 1);
    updateImpostorCounter();
  });

  $("#impPlus").addEventListener("click", () => {
    game.impostorCount++;
    updateImpostorCounter();
  });

  $("#start").addEventListener("click", setupRound);

  const revealCardElement = $("#revealCard");

  revealCardElement.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    revealCard(true);
  });

  ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
    revealCardElement.addEventListener(eventName, () => revealCard(false));
  });

  $("#nextReveal").addEventListener("click", moveToNextReveal);
  $("#beginDiscussion").addEventListener("click", startDiscussion);
  $("#openVote").addEventListener("click", openVote);

  $("#confirmVote").addEventListener("click", () => {
    if (game.selectedVotes.length === votesRequiredPerPlayer()) {
      submitVotes();
    }
  });

  $("#guessBtn").addEventListener("click", handleFinalGuess);
  $("#newRound").addEventListener("click", startNewRound);
  $("#how").addEventListener("click", () => $("#help").showModal());
  $("#closeHelp").addEventListener("click", () => $("#help").close());
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
}

renderPlayers();
renderCategories();
renderScore();
bindEvents();
registerServiceWorker();
