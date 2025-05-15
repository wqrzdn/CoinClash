const mapData = {
  minX: 1,
  maxX: 14,
  minY: 4,
  maxY: 12,
  blockedSpaces: {
    "7x4": true,
    "1x11": true,
    "12x10": true,
    "4x7": true,
    "5x7": true,
    "6x7": true,
    "8x6": true,
    "9x6": true,
    "10x6": true,
    "7x9": true,
    "8x9": true,
    "9x9": true,
  },
  // Hazard zones that deal damage to players
  hazardSpaces: {
    "3x5": true,
    "3x6": true,
    "3x7": true,
  }
};

// Options for Player Colors... these are in the same order as our sprite sheet
const playerColors = ["blue", "red", "orange", "yellow", "green", "purple"];

// Coin types with their values
const coinTypes = [
  { type: "bronze", value: 1 },
  { type: "silver", value: 3 },
  { type: "gold", value: 5 }
];

// Emotes that players can use
const emotes = [
  { key: "1", emoji: "😀", name: "smile" },
  { key: "2", emoji: "😎", name: "cool" },
  { key: "3", emoji: "😡", name: "angry" }
];

//Misc Helpers
function randomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}
function getKeyString(x, y) {
  return `${x}x${y}`;
}

function createName() {
  const prefix = randomFromArray([
    "COOL",
    "SUPER",
    "HIP",
    "SMUG",
    "COOL",
    "SILKY",
    "GOOD",
    "SAFE",
    "DEAR",
    "DAMP",
    "WARM",
    "RICH",
    "LONG",
    "DARK",
    "SOFT",
    "BUFF",
    "DOPE",
  ]);
  const animal = randomFromArray([
    "BEAR",
    "DOG",
    "CAT",
    "FOX",
    "LAMB",
    "LION",
    "BOAR",
    "GOAT",
    "VOLE",
    "SEAL",
    "PUMA",
    "MULE",
    "BULL",
    "BIRD",
    "BUG",
  ]);
  return `${prefix} ${animal}`;
}

function isSolid(x,y) {
  const blockedNextSpace = mapData.blockedSpaces[getKeyString(x, y)];
  return (
    blockedNextSpace ||
    x >= mapData.maxX ||
    x < mapData.minX ||
    y >= mapData.maxY ||
    y < mapData.minY
  )
}

function isHazard(x,y) {
  return mapData.hazardSpaces[getKeyString(x, y)] || false;
}

function getRandomSafeSpot() {
  //We don't look things up by key here, so just return an x/y
  return randomFromArray([
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { x: 1, y: 5 },
    { x: 2, y: 6 },
    { x: 2, y: 8 },
    { x: 2, y: 9 },
    { x: 4, y: 8 },
    { x: 5, y: 5 },
    { x: 5, y: 8 },
    { x: 5, y: 10 },
    { x: 5, y: 11 },
    { x: 11, y: 7 },
    { x: 12, y: 7 },
    { x: 13, y: 7 },
    { x: 13, y: 6 },
    { x: 13, y: 8 },
    { x: 7, y: 6 },
    { x: 7, y: 7 },
    { x: 7, y: 8 },
    { x: 8, y: 8 },
    { x: 10, y: 8 },
    { x: 8, y: 8 },
    { x: 11, y: 4 },
  ]);
}


(function () {

  let playerId;
  let playerRef;
  let players = {};
  let playerElements = {};
  let coins = {};
  let coinElements = {};
  let playerLastActivity = {};
  let playerEmotes = {};
  let hazardDamageIntervals = {};
  let leaderboardRef;
  let chatRef;

  const gameContainer = document.querySelector(".game-container");
  const playerNameInput = document.querySelector("#player-name");
  const playerColorButton = document.querySelector("#player-color");
  
  // Create leaderboard container
  const leaderboardContainer = document.createElement("div");
  leaderboardContainer.classList.add("leaderboard-container");
  leaderboardContainer.innerHTML = `
    <h3>Top Players</h3>
    <ul class="leaderboard-list"></ul>
  `;
  document.body.appendChild(leaderboardContainer);
  
  // Create chat container
  const chatContainer = document.createElement("div");
  chatContainer.classList.add("chat-container");
  chatContainer.innerHTML = `
    <div class="chat-messages"></div>
    <div class="chat-input-container">
      <input type="text" class="chat-input" placeholder="Type a message...">
      <button class="chat-send-button">Send</button>
    </div>
  `;
  document.body.appendChild(chatContainer);
  
  const chatMessages = chatContainer.querySelector(".chat-messages");
  const chatInput = chatContainer.querySelector(".chat-input");
  const chatSendButton = chatContainer.querySelector(".chat-send-button");


  function placeCoin() {
    const { x, y } = getRandomSafeSpot();
    const coinType = randomFromArray(coinTypes);
    const coinRef = firebase.database().ref(`coins/${getKeyString(x, y)}`);
    coinRef.set({
      x,
      y,
      type: coinType.type,
      value: coinType.value
    })

    const coinTimeouts = [2000, 3000, 4000, 5000];
    setTimeout(() => {
      placeCoin();
    }, randomFromArray(coinTimeouts));
  }

  function attemptGrabCoin(x, y) {
    const key = getKeyString(x, y);
    if (coins[key]) {
      // Get coin value based on type
      const coinValue = coins[key].value || 1;
      
      // Remove this key from data, then uptick Player's coin count
      firebase.database().ref(`coins/${key}`).remove();
      playerRef.update({
        coins: players[playerId].coins + coinValue,
      });
      
      // Play coin collection sound
      playSoundEffect('coin');
    }
  }
  
  function playSoundEffect(type) {
    // TODO: Implement sound effects
    // This is a placeholder for sound effects implementation
    console.log(`Playing sound effect: ${type}`);
  }
  
  function showEmote(playerId, emoteKey) {
    const emote = emotes.find(e => e.key === emoteKey);
    if (!emote || !players[playerId]) return;
    
    // Create or update emote element
    if (!playerEmotes[playerId]) {
      const emoteEl = document.createElement("div");
      emoteEl.classList.add("Character_emote");
      playerElements[playerId].appendChild(emoteEl);
      playerEmotes[playerId] = emoteEl;
    }
    
    // Show emote
    playerEmotes[playerId].innerText = emote.emoji;
    playerEmotes[playerId].classList.add("active");
    
    // Play emote sound
    playSoundEffect('emote');
    
    // Remove emote after 2 seconds
    setTimeout(() => {
      if (playerEmotes[playerId]) {
        playerEmotes[playerId].classList.remove("active");
      }
    }, 2000);
  }
  
  function updatePlayerActivity(playerId) {
    playerLastActivity[playerId] = Date.now();
    
    // Remove idle state if it exists
    if (playerElements[playerId] && playerElements[playerId].classList.contains("idle")) {
      playerElements[playerId].classList.remove("idle");
    }
  }
  
  function checkPlayerIdle() {
    const now = Date.now();
    Object.keys(players).forEach(id => {
      if (playerLastActivity[id] && now - playerLastActivity[id] > 10000) {
        // Player is idle for more than 10 seconds
        if (playerElements[id] && !playerElements[id].classList.contains("idle")) {
          playerElements[id].classList.add("idle");
        }
      }
    });
  }
  
  function applyHazardDamage(playerId) {
    if (!players[playerId]) return;
    
    const playerRef = firebase.database().ref(`players/${playerId}`);
    const newHealth = Math.max(0, players[playerId].health - 10);
    
    playerRef.update({ health: newHealth });
    
    // If health reaches 0, handle player death
    if (newHealth === 0) {
      handlePlayerDeath(playerId);
    }
  }
  
  function handlePlayerDeath(playerId) {
    // Play death sound
    playSoundEffect('death');
    
    const { x, y } = getRandomSafeSpot();
    
    // Respawn player with full health and reset coins
    firebase.database().ref(`players/${playerId}`).update({
      health: 100,
      coins: 0,
      x,
      y
    });
  }
  
  function checkHazards() {
    // Check if current player is in a hazard zone
    if (players[playerId]) {
      const key = getKeyString(players[playerId].x, players[playerId].y);
      
      if (mapData.hazardSpaces[key]) {
        // Player is in a hazard zone, apply damage if interval not already set
        if (!hazardDamageIntervals[playerId]) {
          // Apply damage immediately
          applyHazardDamage(playerId);
          
          // Set interval to apply damage every second
          hazardDamageIntervals[playerId] = setInterval(() => {
            applyHazardDamage(playerId);
          }, 1000);
        }
      } else {
        // Player is not in a hazard zone, clear interval if it exists
        if (hazardDamageIntervals[playerId]) {
          clearInterval(hazardDamageIntervals[playerId]);
          hazardDamageIntervals[playerId] = null;
        }
      }
    }
  }
  
  function updateLeaderboard() {
    const leaderboardList = document.querySelector(".leaderboard-list");
    if (!leaderboardList) return;
    
    // Clear current leaderboard
    leaderboardList.innerHTML = "";
    
    // Get players sorted by coins
    const sortedPlayers = Object.values(players)
      .sort((a, b) => b.coins - a.coins)
      .slice(0, 5); // Get top 5
    
    // Add players to leaderboard
    sortedPlayers.forEach(player => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `
        <span class="leaderboard-name">${player.name}</span>
        <span class="leaderboard-coins">${player.coins}</span>
      `;
      
      // Highlight current player
      if (player.id === playerId) {
        listItem.classList.add("current-player");
      }
      
      leaderboardList.appendChild(listItem);
    });
  }
  
  function sendChatMessage() {
    if (!chatInput.value.trim() || !players[playerId]) return;
    
    const message = chatInput.value.trim();
    chatInput.value = "";
    
    // Add message to Firebase
    chatRef.push({
      playerId: playerId,
      playerName: players[playerId].name,
      message: message,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
  }
  
  function displayChatMessage(message) {
    const messageEl = document.createElement("div");
    messageEl.classList.add("chat-message");
    
    // Highlight messages from current player
    if (message.playerId === playerId) {
      messageEl.classList.add("own-message");
    }
    
    messageEl.innerHTML = `
      <span class="chat-player-name">${message.playerName}:</span>
      <span class="chat-message-text">${message.message}</span>
    `;
    
    chatMessages.appendChild(messageEl);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }


  function handleArrowPress(xChange=0, yChange=0) {
    const player = players[playerId];
    if (!player) {
      console.warn("Player data is undefined or not loaded yet");
      return; // Stop early if no player data
    }
    
    const newX = player.x + xChange;
    const newY = player.y + yChange;
    
    if (!isSolid(newX, newY)) {
      // move to the next space
      player.x = newX;
      player.y = newY;
      if (xChange === 1) player.direction = "right";
      if (xChange === -1) player.direction = "left";

      playerRef.set(player);
      attemptGrabCoin(newX, newY);
      
      // Update player activity timestamp
      updatePlayerActivity(playerId);
      
      // Check if player is in a hazard zone
      checkHazards();
    }
  }


  // Function to render hazard zones on the map
  function renderHazardZones() {
    // Clear any existing hazard zones
    const existingHazards = document.querySelectorAll('.hazard-zone');
    existingHazards.forEach(hazard => hazard.remove());
    
    // Create hazard zones based on mapData.hazardSpaces
    Object.keys(mapData.hazardSpaces).forEach(key => {
      const [x, y] = key.split('x').map(Number);
      
      const hazardElement = document.createElement('div');
      hazardElement.classList.add('hazard-zone', 'grid-cell');
      
      // Position the hazard zone
      const left = 16 * x + 'px';
      const top = 16 * y - 4 + 'px';
      hazardElement.style.transform = `translate3d(${left}, ${top}, 0)`;
      
      gameContainer.appendChild(hazardElement);
    });
  }
  
  function initGame() {

    new KeyPressListener("ArrowUp", () => handleArrowPress(0, -1))
    new KeyPressListener("ArrowDown", () => handleArrowPress(0, 1))
    new KeyPressListener("ArrowLeft", () => handleArrowPress(-1, 0))
    new KeyPressListener("ArrowRight", () => handleArrowPress(1, 0))
    
    // Add emote key listeners
    emotes.forEach(emote => {
      new KeyPressListener(emote.key, () => {
        showEmote(playerId, emote.key);
        updatePlayerActivity(playerId);
      });
    })
    
    // Render hazard zones
    renderHazardZones();

    const allPlayersRef = firebase.database().ref(`players`);
    const allCoinsRef = firebase.database().ref(`coins`);
    leaderboardRef = firebase.database().ref(`players`);
    chatRef = firebase.database().ref(`chat`);

    allPlayersRef.on("value", (snapshot) => {
      //Fires whenever a change occurs
      players = snapshot.val() || {};
      Object.keys(players).forEach((key) => {
        const characterState = players[key];
        let el = playerElements[key];
        if (!el) return; // Skip if element doesn't exist
        
        // Now update the DOM
        el.querySelector(".Character_name").innerText = characterState.name;
        el.querySelector(".Character_coins").innerText = characterState.coins;
        
        // Update health bar if it exists
        const healthBar = el.querySelector(".Character_health-bar-fill");
        if (healthBar && characterState.health !== undefined) {
          healthBar.style.width = `${characterState.health}%`;
          
          // Update health bar color based on health level
          if (characterState.health < 30) {
            healthBar.classList.add("low-health");
          } else {
            healthBar.classList.remove("low-health");
          }
        }
        
        el.setAttribute("data-color", characterState.color);
        el.setAttribute("data-direction", characterState.direction);
        const left = 16 * characterState.x + "px";
        const top = 16 * characterState.y - 4 + "px";
        el.style.transform = `translate3d(${left}, ${top}, 0)`;
      });
      
      // Update leaderboard whenever player data changes
      updateLeaderboard();
    })
    allPlayersRef.on("child_added", (snapshot) => {
      //Fires whenever a new node is added the tree
      const addedPlayer = snapshot.val();
      const characterElement = document.createElement("div");
      characterElement.classList.add("Character", "grid-cell");
      if (addedPlayer.id === playerId) {
        characterElement.classList.add("you");
      }
      characterElement.innerHTML = (`
        <div class="Character_shadow grid-cell"></div>
        <div class="Character_sprite grid-cell"></div>
        <div class="Character_name-container">
          <span class="Character_name"></span>
          <span class="Character_coins">0</span>
        </div>
        <div class="Character_health-container">
          <div class="Character_health-bar">
            <div class="Character_health-bar-fill"></div>
          </div>
        </div>
        <div class="Character_you-arrow"></div>
      `);
      playerElements[addedPlayer.id] = characterElement;

      //Fill in some initial state
      characterElement.querySelector(".Character_name").innerText = addedPlayer.name;
      characterElement.querySelector(".Character_coins").innerText = addedPlayer.coins;
      
      // Set health bar width based on player health
      const healthBar = characterElement.querySelector(".Character_health-bar-fill");
      if (healthBar) {
        const health = addedPlayer.health !== undefined ? addedPlayer.health : 100;
        healthBar.style.width = `${health}%`;
        
        if (health < 30) {
          healthBar.classList.add("low-health");
        }
      }
      
      characterElement.setAttribute("data-color", addedPlayer.color);
      characterElement.setAttribute("data-direction", addedPlayer.direction);
      const left = 16 * addedPlayer.x + "px";
      const top = 16 * addedPlayer.y - 4 + "px";
      characterElement.style.transform = `translate3d(${left}, ${top}, 0)`;
      gameContainer.appendChild(characterElement);
      
      // Initialize player activity timestamp
      playerLastActivity[addedPlayer.id] = Date.now();
    })


    //Remove character DOM element after they leave
    allPlayersRef.on("child_removed", (snapshot) => {
      const removedKey = snapshot.val().id;
      gameContainer.removeChild(playerElements[removedKey]);
      delete playerElements[removedKey];
    })


    //New - not in the video!
    //This block will remove coins from local state when Firebase `coins` value updates
    allCoinsRef.on("value", (snapshot) => {
      coins = snapshot.val() || {};
    });
    //

    allCoinsRef.on("child_added", (snapshot) => {
      const coin = snapshot.val();
      const key = getKeyString(coin.x, coin.y);
      coins[key] = coin; // Store the full coin object instead of just true

      // Create the DOM Element
      const coinElement = document.createElement("div");
      coinElement.classList.add("Coin", "grid-cell");
      
      // Add coin type class for styling
      if (coin.type) {
        coinElement.classList.add(`Coin--${coin.type}`);
      }
      
      coinElement.innerHTML = `
        <div class="Coin_shadow grid-cell"></div>
        <div class="Coin_sprite grid-cell"></div>
      `;

      // Position the Element
      const left = 16 * coin.x + "px";
      const top = 16 * coin.y - 4 + "px";
      coinElement.style.transform = `translate3d(${left}, ${top}, 0)`;

      // Keep a reference for removal later and add to DOM
      coinElements[key] = coinElement;
      gameContainer.appendChild(coinElement);
    })
    allCoinsRef.on("child_removed", (snapshot) => {
      const {x,y} = snapshot.val();
      const keyToRemove = getKeyString(x,y);
      gameContainer.removeChild( coinElements[keyToRemove] );
      delete coinElements[keyToRemove];
    })


    //Updates player name with text input
    playerNameInput.addEventListener("change", (e) => {
      const newName = e.target.value || createName();
      playerNameInput.value = newName;
      playerRef.update({
        name: newName
      })
    })

    //Update player color on button click
    playerColorButton.addEventListener("click", () => {
      const mySkinIndex = playerColors.indexOf(players[playerId].color);
      const nextColor = playerColors[mySkinIndex + 1] || playerColors[0];
      playerRef.update({
        color: nextColor
      })
    })

    //Place my first coin
    placeCoin();
    
    // Set up chat event listeners
    chatSendButton.addEventListener("click", sendChatMessage);
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        sendChatMessage();
      }
    });
    
    // Listen for chat messages
    chatRef.on("child_added", (snapshot) => {
      const message = snapshot.val();
      displayChatMessage(message);
    });
    
    // Set up idle animation check
    setInterval(checkPlayerIdle, 1000);
  }

  firebase.auth().onAuthStateChanged((user) => {
    console.log(user)
    if (user) {
      //You're logged in!
      playerId = user.uid;
      playerRef = firebase.database().ref(`players/${playerId}`);

      const name = createName();
      playerNameInput.value = name;

      const {x, y} = getRandomSafeSpot();


      playerRef.set({
        id: playerId,
        name,
        direction: "right",
        color: randomFromArray(playerColors),
        x,
        y,
        coins: 0,
        health: 100,
      })

      //Remove me from Firebase when I diconnect
      playerRef.onDisconnect().remove();

      //Begin the game now that we are signed in
      initGame();
    } else {
      //You're logged out.
    }
  })

  firebase.auth().signInAnonymously().catch((error) => {
    var errorCode = error.code;
    var errorMessage = error.message;
    // ...
    console.log(errorCode, errorMessage);
  });


})();
