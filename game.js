/*
 * ============================================================
 * FROKO.IO - GAME.JS
 * ============================================================
 */


/*
 * ============================================================
 * ELEMENTS
 * ============================================================
 */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const connectBtn = document.getElementById("connect-btn");
const serverUrlInput = document.getElementById("server-url");
const statusText = document.getElementById("status");

const healthText = document.getElementById("health");
const ammoText = document.getElementById("ammo");
const roundText = document.getElementById("round");
const reloadText = document.getElementById("reload");

const usernameInput = document.getElementById("usernameInput");
const createRoomButton = document.getElementById("createRoomButton");
const joinRoomButton = document.getElementById("joinRoomButton");
const roomInput = document.getElementById("roomInput");

const roomDisplay = document.getElementById("roomDisplay");
const roomError = document.getElementById("roomError");
const roomMenu = document.getElementById("roomMenu");

const gameRoomCode = document.getElementById("gameRoomCode");
const panelRoomCode = document.getElementById("panelRoomCode");
const copyBttn = document.getElementById("copyBttn");

const playerList = document.getElementById("playerList");
const startGameButton = document.getElementById("startGameButton");
const waitingForHost = document.getElementById("waitingForHost");

const roundCountdown =
    document.getElementById("roundCountdown");

const roundCountdownNumber =
    document.getElementById("roundCountdownNumber");

const mainGameLayout =
    document.getElementById("main-game-layout");

const gameSection =
    document.getElementById("game-section");

const playerPanel =
    document.getElementById("playerPanel");


/*
 * ============================================================
 * PAUSE MENU
 * ============================================================
 */

const pauseMenu =
    document.getElementById("pauseMenu");

const colorButton =
    document.getElementById("colorButton");

const leaveRoomButton =
    document.getElementById("leaveRoomButton");


/*
 * ============================================================
 * GAME END SCREEN
 * ============================================================
 */

const gameEndScreen =
    document.getElementById("gameEndScreen");

const gameWinner =
    document.getElementById("gameWinner");

const finalStats =
    document.getElementById("finalStats");

const gameEndCountdown =
    document.getElementById("gameEndCountdown");


/*
 * ============================================================
 * GAME VARIABLES
 * ============================================================
 */

let socket = null;

let players = {};
let bullets = {};
let obstacles = [];

let myPlayerId = null;
let currentHost = null;

let currentGameState = "lobby";

let currentRound = 1;
let totalRounds = 5;

let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

let myAngle = 0;

const speed = 8;

let shooting = false;


/*
 * ============================================================
 * VIEW MANAGEMENT
 * ============================================================
 *
 * Lobby:
 * - Room menu centered
 * - Canvas hidden
 * - Player panel hidden
 *
 * Game:
 * - Canvas visible
 * - Player panel visible
 * - Room menu hidden
 *
 * ============================================================
 */

function showLobbyView() {

    canvas.style.display = "none";

    playerPanel.style.display = "none";

    roomMenu.style.display = "block";

    if (mainGameLayout) {
        mainGameLayout.style.justifyContent = "center";
    }

    if (gameSection) {
        gameSection.style.alignItems = "center";
    }

    document.getElementById("hud").style.display = "none";
    document.getElementById("gameRoomInfo").style.display = "none";
    document.getElementById("instructions").style.display = "none";

}


function showGameView() {

    canvas.style.display = "block";

    playerPanel.style.display = "block";

    roomMenu.style.display = "none";

    if (mainGameLayout) {
        mainGameLayout.style.justifyContent = "center";
    }

    if (gameSection) {
        gameSection.style.alignItems = "center";
    }

    document.getElementById("hud").style.display = "flex";
    document.getElementById("gameRoomInfo").style.display = "block";
    document.getElementById("instructions").style.display = "block";

}


/*
 * Start in lobby view.
 */

showLobbyView();


/*
 * ============================================================
 * ROOM BUTTONS
 * ============================================================
 */


/*
 * CREATE ROOM
 */

createRoomButton.addEventListener("click", () => {

    if (!socket || !socket.connected) {
        return;
    }

    const username =
        usernameInput.value.trim();

    if (!username) {

        roomError.innerText =
            "Enter a username first.";

        return;
    }

    socket.emit(
        "createRoom",
        username
    );

});


/*
 * JOIN ROOM
 */

joinRoomButton.addEventListener("click", () => {

    if (!socket || !socket.connected) {
        return;
    }

    const username =
        usernameInput.value.trim();

    const roomCode =
        roomInput.value.trim();

    if (!username) {

        roomError.innerText =
            "Enter a username first.";

        return;
    }

    if (!roomCode) {

        roomError.innerText =
            "Enter a room code.";

        return;
    }

    socket.emit(
        "joinRoom",
        {
            username: username,
            roomCode: roomCode
        }
    );

});


/*
 * ============================================================
 * PAUSE MENU BUTTONS
 * ============================================================
 */


/*
 * CHANGE COLOR
 */

colorButton.addEventListener("click", () => {

    if (
        !socket ||
        !socket.connected ||
        !myPlayerId ||
        !players[myPlayerId]
    ) {
        return;
    }

    socket.emit("changeColor");

});


/*
 * LEAVE ROOM
 */

leaveRoomButton.addEventListener("click", () => {

    if (!socket || !socket.connected) {
        return;
    }

    socket.emit("leaveRoom");

});


/*
 * ============================================================
 * START GAME
 * ============================================================
 */

startGameButton.addEventListener("click", () => {

    if (!socket || !socket.connected) {
        return;
    }

    if (
        !myPlayerId ||
        !players[myPlayerId]
    ) {
        return;
    }

    socket.emit("startGame");

});


/*
 * ============================================================
 * LOBBY PLAYER LIST
 * ============================================================
 */

function updatePlayerList() {

    if (!playerList) {
        return;
    }

    playerList.innerHTML = "";

    const playerIds =
        Object.keys(players);

    if (playerIds.length === 0) {

        playerList.innerText =
            "No players yet.";

        return;
    }

    playerIds.forEach((id) => {

        const player =
            players[id];

        if (!player) {
            return;
        }

        const entry =
            document.createElement("div");

        entry.className =
            "playerListEntry";


        /*
         * HOST CROWN
         */

        const crown =
            document.createElement("span");

        crown.className =
            "playerHostCrown";

        if (id === currentHost) {

            crown.innerText =
                "👑";

        }


        /*
         * COLOR DOT
         */

        const colorDot =
            document.createElement("span");

        colorDot.className =
            "playerColorDot";

        colorDot.style.backgroundColor =
            player.color || "green";


        /*
         * NAME
         */

        const name =
            document.createElement("span");

        name.className =
            "playerName";

        name.innerText =
            player.username || "Unknown";

        if (id === myPlayerId) {

            name.innerText +=
                " (You)";

        }


        entry.appendChild(crown);
        entry.appendChild(colorDot);
        entry.appendChild(name);

        playerList.appendChild(entry);

    });

}


/*
 * ============================================================
 * LOBBY CONTROLS
 * ============================================================
 */

function updateLobbyControls() {

    if (
        !myPlayerId ||
        !players[myPlayerId]
    ) {

        startGameButton.style.display =
            "none";

        waitingForHost.style.display =
            "none";

        return;
    }


    /*
     * Only show controls while
     * actually in the lobby.
     */

    if (currentGameState !== "lobby") {

        startGameButton.style.display =
            "none";

        waitingForHost.style.display =
            "none";

        return;
    }


    /*
     * HOST
     */

    if (currentHost === myPlayerId) {

        startGameButton.style.display =
            "block";

        waitingForHost.style.display =
            "none";

    }

    /*
     * NOT HOST
     */

    else {

        startGameButton.style.display =
            "none";

        waitingForHost.style.display =
            "block";

    }

}


/*
 * ============================================================
 * INTERNET CONNECTION STATUS
 * ============================================================
 */

window.addEventListener("offline", () => {

    statusText.innerText =
        "Internet Down: Reconnect to play";

    statusText.style.color =
        "red";

});


window.addEventListener("online", () => {

    if (socket && socket.connected) {

        statusText.innerText =
            "Connected as " + socket.id;

        statusText.style.color =
            "lightgreen";

    }

    else {

        statusText.innerText =
            "Reconnecting...";

        statusText.style.color =
            "yellow";

    }

});


/*
 * ============================================================
 * CONNECT TO SERVER
 * ============================================================
 */

function connectToServer() {

    /*
     * Don't attempt a connection
     * if the internet is offline.
     */

    if (!navigator.onLine) {

        statusText.innerText =
            "Internet Down: Reconnect to play";

        statusText.style.color =
            "red";

        return;
    }


    /*
     * Make sure Socket.IO loaded.
     */

    if (typeof io === "undefined") {

        console.error(
            "Socket.io failed to load."
        );

        statusText.innerText =
            "ERROR: Socket.io library failed to load.";

        statusText.style.color =
            "red";

        return;
    }


    /*
     * Disconnect an old socket.
     */

    if (socket) {
        socket.disconnect();
    }


    const url =
        serverUrlInput.value.trim();

    console.log(
        "Connecting to:",
        url
    );


    statusText.innerText =
        "Connecting...";

    statusText.style.color =
        "yellow";

    connectBtn.innerText =
        "Connecting...";

    connectBtn.style.backgroundColor =
        "#b8860b";


    socket = io(url);


    /*
     * ========================================================
     * CONNECTED
     * ========================================================
     */

    socket.on("connect", () => {

        console.log(
            "Connected!",
            socket.id
        );

        myPlayerId =
            socket.id;

        connectBtn.innerText =
            "Connected!";

        connectBtn.style.backgroundColor =
            "green";

        statusText.innerText =
            "Connected as " +
            socket.id;

        statusText.style.color =
            "lightgreen";

    });


    /*
     * ========================================================
     * DISCONNECTED
     * ========================================================
     */

    socket.on("disconnect", (reason) => {

        console.log(
            "Disconnected:",
            reason
        );

        myPlayerId = null;
        currentHost = null;

        players = {};
        bullets = {};

        connectBtn.innerText =
            "Connect to Server";

        connectBtn.style.backgroundColor =
            "#007bff";


        /*
         * Don't replace the internet-down
         * message with "Disconnected" if
         * the internet is actually offline.
         */

        if (!navigator.onLine) {

            statusText.innerText =
                "Internet Down: Reconnect to play";

            statusText.style.color =
                "red";

        }

        else {

            statusText.innerText =
                "Disconnected: " + reason;

            statusText.style.color =
                "orange";

        }


        pauseMenu.style.display =
            "none";


        gameRoomCode.innerText =
            "---";

        reloadText.style.display =
            "none";


        updatePlayerList();
        updateLobbyControls();

        showLobbyView();

        drawGame();

    });


    /*
     * ========================================================
     * CONNECTION ERROR
     * ========================================================
     */

    socket.on("connect_error", (error) => {

        console.error(
            "Connection error:",
            error
        );


        connectBtn.innerText =
            "Connection Failed";

        connectBtn.style.backgroundColor =
            "red";


        /*
         * If the internet is down,
         * keep the useful message.
         */

        if (!navigator.onLine) {

            statusText.innerText =
                "Internet Down: Reconnect to play";

            statusText.style.color =
                "red";

        }

        else {

            statusText.innerText =
                "Connection error: " +
                error.message;

            statusText.style.color =
                "red";

        }

    });


    /*
     * ========================================================
     * ROOM JOINED
     * ========================================================
     */

    socket.on("roomJoined", (data) => {

        gameRoomCode.innerText =
            data.roomCode;

        panelRoomCode.innerText =
            data.roomCode;

        roomError.innerText =
            "";


        /*
         * Stay in lobby view.
         * The arena should not appear
         * until the game actually starts.
         */

        showLobbyView();


        console.log(
            "Joined room:",
            data.roomCode
        );

    });


    /*
     * ========================================================
     * ROOM ERROR
     * ========================================================
     */

    socket.on("roomError", (message) => {

        roomError.innerText =
            message;

    });


    /*
     * ========================================================
     * LEFT ROOM
     * ========================================================
     */

    socket.on("leftRoom", () => {

        console.log(
            "Left room."
        );


        /*
         * Reset local game state.
         */

        players = {};
        bullets = {};

        myAngle = 0;
        shooting = false;

        currentHost = null;
        currentGameState = "lobby";

        obstacles = [];


        /*
         * Close pause menu.
         */

        pauseMenu.style.display =
            "none";


        /*
         * Reset UI.
         */

        gameRoomCode.innerText =
            "---";

        panelRoomCode.innerText =
            "---";

        roomDisplay.innerText =
            "";

        roomError.innerText =
            "";

        reloadText.style.display =
            "none";


        /*
         * Return to centered lobby.
         */

        showLobbyView();

        updatePlayerList();
        updateLobbyControls();
        updateHUD();

        drawGame();

    });


    /*
     * ========================================================
     * PLAYER UPDATES
     * ========================================================
     */

    socket.on("updatePlayers", (newPlayers) => {

        players = newPlayers;


        /*
         * Only update the lobby player
         * controls while actually in lobby.
         */

        if (currentGameState === "lobby") {

            updatePlayerList();
            updateLobbyControls();

        }

        updateHUD();

    });


    /*
     * ========================================================
     * BULLET UPDATES
     * ========================================================
     */

    socket.on("updateBullets", (newBullets) => {

        bullets =
            newBullets;

    });


    /*
     * ========================================================
     * GAME STATE
     * ========================================================
     */

    socket.on("gameState", (data) => {

        if (!data) {
            return;
        }


        currentGameState =
            data.state || "lobby";


        /*
         * ROUND COUNTDOWN
         */

        if (
            currentGameState === "roundEnd"
        ) {

            showRoundCountdown(
                data.roundEndAt
            );

        }

        else {

            roundCountdown.style.display =
                "none";

        }


        /*
         * HOST
         */

        currentHost =
            data.host || null;


        /*
         * MAP
         */

        obstacles =
            data.obstacles || [];


        /*
         * ROUND
         */

        currentRound =
            data.currentRound || 0;

        totalRounds =
            data.totalRounds || 5;


        /*
         * LOBBY VS GAME VIEW
         */

        if (
            currentGameState === "lobby"
        ) {

            showLobbyView();

        }

        else {

            showGameView();

        }


        /*
         * GAME END
         */

        if (
            currentGameState === "gameEnd"
        ) {

            showGameEnd(data);

        }

        else {

            gameEndScreen.style.display =
                "none";

        }


        updatePlayerList();
        updateLobbyControls();
        updateHUD();

    });

}


/*
 * ============================================================
 * MOUSE AIMING
 * ============================================================
 */

canvas.addEventListener("mousemove", (e) => {

    const rect =
        canvas.getBoundingClientRect();

    mouseX =
        e.clientX - rect.left;

    mouseY =
        e.clientY - rect.top;

    updateAim();

});


function updateAim() {

    if (
        !myPlayerId ||
        !players[myPlayerId]
    ) {
        return;
    }


    const player =
        players[myPlayerId];


    /*
     * Don't aim while spectating.
     */

    if (player.spectating) {
        return;
    }


    myAngle =
        Math.atan2(
            mouseY - player.y,
            mouseX - player.x
        );


    /*
     * Update local player immediately.
     */

    player.angle =
        myAngle;


    /*
     * Send aim to server.
     */

    if (
        socket &&
        socket.connected
    ) {

        socket.emit(
            "aim",
            {
                angle: myAngle
            }
        );

    }


    drawGame();

}


/*
 * ============================================================
 * SHOOTING
 * ============================================================
 */

canvas.addEventListener("mousedown", (e) => {

    if (e.button !== 0) {
        return;
    }


    /*
     * Don't shoot while spectating.
     */

    if (
        myPlayerId &&
        players[myPlayerId] &&
        players[myPlayerId].spectating
    ) {

        return;

    }


    shooting = true;

    shoot();

});


window.addEventListener("mouseup", (e) => {

    if (e.button === 0) {

        shooting = false;

    }

});


function shoot() {

    if (
        !socket ||
        !socket.connected
    ) {
        return;
    }


    if (
        !myPlayerId ||
        !players[myPlayerId]
    ) {
        return;
    }


    if (
        players[myPlayerId].spectating
    ) {
        return;
    }


    socket.emit("shoot");

}


/*
 * ============================================================
 * RELOADING
 * ============================================================
 */

window.addEventListener("keydown", (e) => {

    /*
     * Don't control the game
     * while typing.
     */

    if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA"
    ) {

        return;

    }


    const key =
        (e.key || "").toLowerCase();


    if (key === "r") {

        if (
            socket &&
            socket.connected &&
            myPlayerId &&
            players[myPlayerId] &&
            !players[myPlayerId].spectating
        ) {

            socket.emit("reload");

        }

    }

});


/*
 * ============================================================
 * ENTER TO START GAME
 * ============================================================
 */

window.addEventListener("keydown", (e) => {

    if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA"
    ) {

        return;

    }


    if (e.key !== "Enter") {
        return;
    }


    if (
        !socket ||
        !socket.connected
    ) {
        return;
    }


    if (
        !myPlayerId ||
        !players[myPlayerId]
    ) {
        return;
    }


    if (
        currentHost !== myPlayerId
    ) {
        return;
    }


    socket.emit("startGame");

});


/*
 * ============================================================
 * MOVEMENT
 * ============================================================
 */

const keys = {};


document.addEventListener("keydown", (e) => {

    if (
        ["INPUT", "TEXTAREA"].includes(
            document.activeElement.tagName
        )
    ) {

        return;

    }


    const key =
        (e.key || "").toLowerCase();


    /*
     * WASD
     */

    if (key === "w") {

        keys.w = true;
        e.preventDefault();

    }

    if (key === "a") {

        keys.a = true;
        e.preventDefault();

    }

    if (key === "s") {

        keys.s = true;
        e.preventDefault();

    }

    if (key === "d") {

        keys.d = true;
        e.preventDefault();

    }


    /*
     * Arrow keys
     */

    if (key === "arrowup") {

        keys.w = true;
        e.preventDefault();

    }

    if (key === "arrowleft") {

        keys.a = true;
        e.preventDefault();

    }

    if (key === "arrowdown") {

        keys.s = true;
        e.preventDefault();

    }

    if (key === "arrowright") {

        keys.d = true;
        e.preventDefault();

    }

});


document.addEventListener("keyup", (e) => {

    const key =
        (e.key || "").toLowerCase();


    if (key === "w" || key === "arrowup") {

        keys.w = false;

    }


    if (key === "a" || key === "arrowleft") {

        keys.a = false;

    }


    if (key === "s" || key === "arrowdown") {

        keys.s = false;

    }


    if (key === "d" || key === "arrowright") {

        keys.d = false;

    }

});


/*
 * ============================================================
 * MOVEMENT LOOP
 * ============================================================
 */

let lastMoveTime = 0;

const MOVE_INTERVAL = 16;


function movementLoop(timestamp) {

    if (
        socket &&
        socket.connected &&
        myPlayerId &&
        players[myPlayerId] &&
        !players[myPlayerId].dead &&
        !players[myPlayerId].spectating
    ) {

        if (
            timestamp - lastMoveTime >=
            MOVE_INTERVAL
        ) {

            let x = 0;
            let y = 0;


            if (keys.w) {
                y -= 1;
            }

            if (keys.s) {
                y += 1;
            }

            if (keys.a) {
                x -= 1;
            }

            if (keys.d) {
                x += 1;
            }


            /*
             * Normalize diagonal movement.
             */

            if (
                x !== 0 ||
                y !== 0
            ) {

                const length =
                    Math.sqrt(
                        x * x +
                        y * y
                    );

                x /= length;
                y /= length;


                socket.emit(
                    "move",
                    {
                        x: x * speed,
                        y: y * speed
                    }
                );

            }


            lastMoveTime =
                timestamp;

        }

    }


    requestAnimationFrame(
        movementLoop
    );

}


requestAnimationFrame(
    movementLoop
);


/*
 * ============================================================
 * ROUND COUNTDOWN
 * ============================================================
 */

function showRoundCountdown(roundEndAt) {

    if (!roundEndAt) {
        return;
    }


    roundCountdown.style.display =
        "block";


    function updateRoundCountdown() {

        if (
            currentGameState !== "roundEnd"
        ) {

            roundCountdown.style.display =
                "none";

            return;

        }


        const remaining =
            Math.max(
                0,
                Math.ceil(
                    (roundEndAt - Date.now()) /
                    1000
                )
            );


        roundCountdownNumber.textContent =
            remaining;


        if (remaining > 0) {

            setTimeout(
                updateRoundCountdown,
                100
            );

        }

    }


    updateRoundCountdown();

}


/*
 * ============================================================
 * HUD
 * ============================================================
 */

function updateHUD() {

    if (
        !myPlayerId ||
        !players[myPlayerId]
    ) {

        healthText.innerText =
            "❤️ --- HP";

        ammoText.innerText =
            "🔫 --- / 6";

        roundText.innerText =
            "ROUND ---";

        reloadText.style.display =
            "none";

        return;

    }


    const player =
        players[myPlayerId];


    /*
     * SPECTATOR HUD
     */

    if (player.spectating) {

        healthText.innerText =
            "👻 SPECTATING";

        ammoText.innerText =
            "👀 WATCHING";

        roundText.innerText =
            "SPECTATOR";

        reloadText.style.display =
            "none";

        return;

    }


    /*
     * NORMAL HUD
     */

    const health =
        player.health ?? 100;

    const ammo =
        player.ammo ?? 6;


    healthText.innerText =
        "❤️ " +
        health +
        " HP";


    ammoText.innerText =
        "🔫 " +
        ammo +
        " / 6";


    roundText.innerText =
        `Round: ${currentRound}/${totalRounds}`;


    if (player.reloading) {

        reloadText.style.display =
            "block";

    }

    else {

        reloadText.style.display =
            "none";

    }

}


/*
 * ============================================================
 * CONNECT BUTTON
 * ============================================================
 */

connectBtn.addEventListener(
    "click",
    connectToServer
);


/*
 * ============================================================
 * COPY ROOM CODE
 * ============================================================
 */

copyBttn.addEventListener("click", () => {

    const code =
        gameRoomCode.innerText;


    if (
        !code ||
        code === "---"
    ) {
        return;
    }


    navigator.clipboard.writeText(code);

});


/*
 * ============================================================
 * ESCAPE / PAUSE MENU
 * ============================================================
 */

window.addEventListener("keydown", (e) => {

    /*
     * Don't open pause menu
     * while typing.
     */

    if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA"
    ) {

        return;

    }


    if (e.key !== "Escape") {
        return;
    }


    /*
     * Only allow pause menu
     * while inside a room.
     */

    if (
        !myPlayerId ||
        !players[myPlayerId]
    ) {

        return;

    }


    if (
        pauseMenu.style.display ===
        "flex"
    ) {

        pauseMenu.style.display =
            "none";

    }

    else {

        pauseMenu.style.display =
            "flex";

    }

});


/*
 * ============================================================
 * DRAW GAME
 * ============================================================
 */

function drawGame() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    /*
     * ========================================================
     * BACKGROUND GRID
     * ========================================================
     */

    ctx.strokeStyle =
        "#292929";

    ctx.lineWidth =
        1;


    for (
        let x = 0;
        x <= canvas.width;
        x += 40
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x,
            0
        );

        ctx.lineTo(
            x,
            canvas.height
        );

        ctx.stroke();

    }


    for (
        let y = 0;
        y <= canvas.height;
        y += 40
    ) {

        ctx.beginPath();

        ctx.moveTo(
            0,
            y
        );

        ctx.lineTo(
            canvas.width,
            y
        );

        ctx.stroke();

    }


    /*
     * ========================================================
     * OBSTACLES
     * ========================================================
     */

    obstacles.forEach((obstacle) => {

        ctx.fillStyle =
            "#555";

        ctx.fillRect(
            obstacle.x,
            obstacle.y,
            obstacle.width,
            obstacle.height
        );

    });


    /*
     * ========================================================
     * PLAYERS
     * ========================================================
     */

    for (const id in players) {

        const player =
            players[id];


        if (!player) {
            continue;
        }


        /*
         * Spectators don't appear
         * on the battlefield.
         */

        if (player.spectating) {
            continue;
        }


        /*
         * DEAD / RELOADING ALPHA
         */

        if (player.dead) {

            ctx.globalAlpha =
                0.25;

        }

        else if (player.reloading) {

            ctx.globalAlpha =
                0.5;

        }

        else {

            ctx.globalAlpha =
                1;

        }


        /*
         * PLAYER BODY
         */

        ctx.fillStyle =
            player.color ||
            "green";


        ctx.beginPath();

        ctx.arc(
            player.x,
            player.y,
            20,
            0,
            Math.PI * 2
        );

        ctx.fill();


        /*
         * AIM / GUN
         */

        const angle =
            player.angle || 0;

        const gunLength =
            28;


        ctx.strokeStyle =
            "white";

        ctx.lineWidth =
            6;


        ctx.beginPath();

        ctx.moveTo(
            player.x,
            player.y
        );

        ctx.lineTo(
            player.x +
                Math.cos(angle) *
                gunLength,

            player.y +
                Math.sin(angle) *
                gunLength
        );

        ctx.stroke();


        /*
         * PLAYER OUTLINE
         */

        ctx.strokeStyle =
            id === myPlayerId
                ? "white"
                : "#777";

        ctx.lineWidth =
            2;


        ctx.beginPath();

        ctx.arc(
            player.x,
            player.y,
            20,
            0,
            Math.PI * 2
        );

        ctx.stroke();


        /*
         * DEAD PLAYER X
         */

        if (player.dead) {

            ctx.strokeStyle =
                "red";

            ctx.lineWidth =
                4;


            ctx.beginPath();

            ctx.moveTo(
                player.x - 12,
                player.y - 12
            );

            ctx.lineTo(
                player.x + 12,
                player.y + 12
            );

            ctx.moveTo(
                player.x + 12,
                player.y - 12
            );

            ctx.lineTo(
                player.x - 12,
                player.y + 12
            );

            ctx.stroke();

        }


        /*
         * USERNAME
         */

        ctx.globalAlpha =
            1;

        ctx.fillStyle =
            "white";

        ctx.font =
            "bold 14px Arial";

        ctx.textAlign =
            "center";

        ctx.textBaseline =
            "bottom";


        ctx.fillText(
            player.username,
            player.x,
            player.y - 25
        );


        ctx.globalAlpha =
            1;

    }


    /*
     * ========================================================
     * BULLETS
     * ========================================================
     */

    for (const id in bullets) {

        const bullet =
            bullets[id];


        if (!bullet) {
            continue;
        }


        ctx.globalAlpha =
            1;

        ctx.fillStyle =
            "white";


        ctx.beginPath();

        ctx.arc(
            bullet.x,
            bullet.y,
            5,
            0,
            Math.PI * 2
        );

        ctx.fill();

    }


    ctx.globalAlpha =
        1;

}


/*
 * ============================================================
 * GAME END SCREEN
 * ============================================================
 */

function showGameEnd(data) {

    gameEndScreen.style.display =
        "flex";


    let winner = null;


    for (const id in players) {

        const player =
            players[id];


        if (
            !player.dead &&
            !player.spectating
        ) {

            winner =
                player;

            break;

        }

    }


    gameWinner.textContent =
        winner
            ? `🏆 Winner: ${winner.username}`
            : "🏆 Winner: Draw!";


    let html = "";


    for (const id in players) {

        const player =
            players[id];


        html += `
            <div style="
                margin:10px 0;
                padding:8px;
                background:#333;
                border-radius:6px;
            ">
                <strong>${player.username}</strong><br>
                Kills: ${player.kills || 0} |
                Deaths: ${player.deaths || 0} |
                Round Wins: ${player.roundWins || 0}
            </div>
        `;

    }


    finalStats.innerHTML =
        html;


    const endTime =
        data.gameEndAt ||
        Date.now();


    function updateCountdown() {

        const remaining =
            Math.max(
                0,
                Math.ceil(
                    (endTime - Date.now()) /
                    1000
                )
            );


        gameEndCountdown.textContent =
            `Returning to lobby in ${remaining}...`;


        if (
            remaining > 0 &&
            currentGameState === "gameEnd"
        ) {

            setTimeout(
                updateCountdown,
                250
            );

        }

    }


    updateCountdown();

}


/*
 * ============================================================
 * FPS COUNTER
 * ============================================================
 */

let fps = 0;
let fpsFrames = 0;
let fpsLastTime = performance.now();


function updateFPS(timestamp) {

    fpsFrames++;


    if (
        timestamp - fpsLastTime >=
        1000
    ) {

        fps =
            fpsFrames;

        fpsFrames =
            0;

        fpsLastTime =
            timestamp;


        const fpsDisplay =
            document.getElementById("fpsDisplay");


        if (fpsDisplay) {

            fpsDisplay.textContent =
                fps;

        }

    }


    requestAnimationFrame(
        updateFPS
    );

}


requestAnimationFrame(
    updateFPS
);


/*
 * ============================================================
 * PING
 * ============================================================
 */

setInterval(() => {

    if (
        !socket ||
        !socket.connected
    ) {

        return;

    }


    const start =
        performance.now();


    socket.emit(
        "pingCheck"
    );


    socket.once(
        "pongCheck",
        () => {

            const ping =
                Math.round(
                    performance.now() -
                    start
                );


            const pingDisplay =
                document.getElementById(
                    "pingDisplay"
                );


            if (pingDisplay) {

                pingDisplay.textContent =
                    ping;

            }

        }
    );

}, 1000);


/*
 * ============================================================
 * RENDER LOOP
 * ============================================================
 */

function renderLoop() {

    drawGame();

    requestAnimationFrame(
        renderLoop
    );

}


requestAnimationFrame(
    renderLoop
);


/*
 * ============================================================
 * START
 * ============================================================
 */

connectToServer();
