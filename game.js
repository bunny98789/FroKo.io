/*
 * =========================
 * ELEMENTS
 * =========================
 */

const canvas =
    document.getElementById("gameCanvas");

const ctx =
    canvas.getContext("2d");

const connectBtn =
    document.getElementById("connect-btn");

const serverUrlInput =
    document.getElementById("server-url");

const statusText =
    document.getElementById("status");

const healthText =
    document.getElementById("health");

const ammoText =
    document.getElementById("ammo");

const roundText =
    document.getElementById("round");

const reloadText =
    document.getElementById("reload");


const usernameInput =
    document.getElementById("usernameInput");

const createRoomButton =
    document.getElementById("createRoomButton");

const joinRoomButton =
    document.getElementById("joinRoomButton");

const roomInput =
    document.getElementById("roomInput");

const roomDisplay =
    document.getElementById("roomDisplay");

const roomError =
    document.getElementById("roomError");

const roomMenu =
    document.getElementById("roomMenu");

const gameRoomCode =
    document.getElementById("gameRoomCode");

const panelRoomCode =
    document.getElementById("panelRoomCode");

const copyBttn =
    document.getElementById("copyBttn");


/*
 * PAUSE MENU
 */

const pauseMenu =
    document.getElementById("pauseMenu");

const colorButton =
    document.getElementById("colorButton");

const leaveRoomButton =
    document.getElementById("leaveRoomButton");

const playerList =
    document.getElementById("playerList");

const startGameButton =
    document.getElementById("startGameButton");

const waitingForHost =
    document.getElementById("waitingForHost");


const gameEndScreen = document.getElementById("gameEndScreen");
const gameWinner = document.getElementById("gameWinner");
const finalStats = document.getElementById("finalStats");
const gameEndCountdown = document.getElementById("gameEndCountdown");


/*
 * =========================
 * GAME VARIABLES
 * =========================
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

let mouseX =
    canvas.width / 2;

let mouseY =
    canvas.height / 2;

let myAngle = 0;

const speed = 8;

let shooting = false;


/*
 * =========================
 * ROOM BUTTONS
 * =========================
 */

createRoomButton.addEventListener(
    "click",
    () => {

        if (
            !socket ||
            !socket.connected
        ) {
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

    }
);


joinRoomButton.addEventListener(
    "click",
    () => {

        if (
            !socket ||
            !socket.connected
        ) {
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
                username:
                    username,

                roomCode:
                    roomCode
            }
        );

    }
);


/*
 * =========================
 * PAUSE MENU BUTTONS
 * =========================
 */

/*
 * CHANGE COLOR
 */

colorButton.addEventListener(
    "click",
    () => {

        if (
            !socket ||
            !socket.connected ||
            !myPlayerId ||
            !players[myPlayerId]
        ) {
            return;
        }


        socket.emit(
            "changeColor"
        );

    }
);


/*
 * LEAVE ROOM
 */

leaveRoomButton.addEventListener(
    "click",
    () => {

        if (
            !socket ||
            !socket.connected
        ) {
            return;
        }


        socket.emit(
            "leaveRoom"
        );

    }
);

/*
 * =========================
 * START GAME
 * =========================
 */

startGameButton.addEventListener(
    "click",
    () => {

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

        socket.emit(
            "startGame"
        );

    }
);

/*
 * =========================
 * LOBBY PLAYER LIST
 * =========================
 */

function updatePlayerList() {

    if (!playerList) {
        return;
    }

    playerList.innerHTML = "";

    const playerIds =
        Object.keys(players);

    if (
        playerIds.length === 0
    ) {

        playerList.innerText =
            "No players yet.";

        return;

    }

    playerIds.forEach(
        (id) => {

            const player =
                players[id];

            if (!player) {
                return;
            }

            const entry =
                document.createElement(
                    "div"
                );

            entry.className =
                "playerListEntry";

            /*
             * HOST CROWN
             */

            const crown =
                document.createElement(
                    "span"
                );

            crown.className =
                "playerHostCrown";

            if (
                id === currentHost
            ) {

                crown.innerText =
                    "👑";

            }

            /*
             * COLOR DOT
             */

            const colorDot =
                document.createElement(
                    "span"
                );

            colorDot.className =
                "playerColorDot";

            colorDot.style.backgroundColor =
                player.color ||
                "green";

            /*
             * NAME
             */

            const name =
                document.createElement(
                    "span"
                );

            name.className =
                "playerName";

            name.innerText =
                player.username ||
                "Unknown";

            if (
                id === myPlayerId
            ) {

                name.innerText +=
                    " (You)";

            }

            entry.appendChild(
                crown
            );

            entry.appendChild(
                colorDot
            );

            entry.appendChild(
                name
            );

            playerList.appendChild(
                entry
            );

        }
    );

}

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
     * Only show lobby controls
     * while actually in the lobby.
     */

    if (currentGameState !== "lobby") {

        startGameButton.style.display =
            "none";

        waitingForHost.style.display =
            "none";

        return;

    }

    if (
        currentHost === myPlayerId
    ) {

        startGameButton.style.display =
            "block";

        waitingForHost.style.display =
            "none";

    } else {

        startGameButton.style.display =
            "none";

        waitingForHost.style.display =
            "block";

    }

}
/*
 * =========================
 * CONNECTION
 * =========================
 */

function connectToServer() {

    if (
        typeof io ===
        "undefined"
    ) {

    if (!location.online) {
         statusText.innerText =
            "Internet Down: Reconnect to play";

        statusText.style.color =
            "red";
    }

        console.error(
            "Socket.io failed to load."
        );


        statusText.innerText =
            "ERROR: Socket.io library failed to load.";

        statusText.style.color =
            "red";

        return;
    }


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


    socket =
        io(url);


    /*
     * =========================
     * CONNECTED
     * =========================
     */

    socket.on(
        "connect",
        () => {

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

        }
    );


    /*
     * =========================
     * DISCONNECTED
     * =========================
     */

    socket.on(
        "disconnect",
        (reason) => {

            console.log(
                "Disconnected:",
                reason
            );


            myPlayerId =
                null;

            currentHost =
                null;


            players = {};

            bullets = {};


            connectBtn.innerText =
                "Connect to Server";

            connectBtn.style.backgroundColor =
                "#007bff";


            statusText.innerText =
                "Disconnected: " +
                reason;

            statusText.style.color =
                "orange";


            pauseMenu.style.display =
                "none";


            roomMenu.style.display =
                "block";


            gameRoomCode.innerText =
                "---";


            reloadText.style.display =
                "none";

            updatePlayerList();

            updateLobbyControls();


            drawGame();

        }
    );


    /*
     * =========================
     * CONNECTION ERROR
     * =========================
     */

    socket.on(
        "connect_error",
        (error) => {

            console.error(
                "Connection error:",
                error
            );


            connectBtn.innerText =
                "Connection Failed";

            connectBtn.style.backgroundColor =
                "red";


            statusText.innerText =
                "Connection error: " +
                error.message;

            statusText.style.color =
                "red";

        }
    );


    /*
     * =========================
     * ROOM JOINED
     * =========================
     */

    socket.on(
    "roomJoined",
    (data) => {

        gameRoomCode.innerText =
            data.roomCode;

        panelRoomCode.innerText =
            data.roomCode;

        roomError.innerText =
            "";

        /*
         * Keep the room menu available
         * so players can see the lobby.
         */

        roomMenu.style.display =
            "block";

        console.log(
            "Joined room:",
            data.roomCode
        );

    }
);

    /*
     * =========================
     * ROOM ERROR
     * =========================
     */

    socket.on(
        "roomError",
        (message) => {

            roomError.innerText =
                message;

        }
    );


    /*
     * =========================
     * LEFT ROOM
     * =========================
     */

    socket.on(
        "leftRoom",
        () => {

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

            currentHost =
            null;

            updatePlayerList();

            updateLobbyControls();


            /*
             * Close pause menu.
             */

            pauseMenu.style.display =
                "none";


            /*
             * Show lobby again.
             */

            roomMenu.style.display =
                "block";


            /*
             * Clear room code.
             */

            gameRoomCode.innerText =
                "---";


            roomDisplay.innerText =
                "";

            roomError.innerText =
                "";


            /*
             * Clear reload message.
             */

            reloadText.style.display =
                "none";


            /*
             * Redraw empty game.
             */

            drawGame();

            updateHUD();

        }
    );


    /*
     * =========================
     * PLAYER / GAME STATE
     * =========================
     */

   socket.on("updatePlayers", (newPlayers) => {
       
    players = newPlayers;

    // Only update the lobby UI while actually in the lobby
    if (currentGameState === "lobby") {
        updatePlayerList();
        updateLobbyControls();
    }

    updateHUD();
});

    socket.on(
        "updateBullets",
        (newBullets) => {

            bullets =
                newBullets;

        }
    );

    /*
 * GAME STATE
 */

socket.on(
    "gameState",
    (data) => {

        if (!data) {
            return;
        }

        currentGameState =
            data.state || "lobby";

        if (currentGameState === "roundEnd") {
            showRoundCountdown(data.roundEndAt);
        } else {
            roundCountdown.style.display = "none";
        }

        currentHost =
            data.host || null;

        obstacles = data.obstacles || [];

        currentRound = data.currentRound || 0;
        totalRounds = data.totalRounds || 5;

        /*
         * Hide the room lobby once
         * the game has actually started.
         */

        if (
            currentGameState !== "lobby"
        ) {

            roomMenu.style.display =
                "none";

        } else {

            roomMenu.style.display =
                "block";

        }

        if (currentGameState === "gameEnd") {
            showGameEnd(data);
        } else {
            gameEndScreen.style.display = "none";
        }

        updatePlayerList();

        updateLobbyControls();

    }
);

/*
 * =========================
 * MOUSE AIMING
 * =========================
 */

canvas.addEventListener(
    "mousemove",
    (e) => {

        const rect =
            canvas.getBoundingClientRect();


        mouseX =
            e.clientX -
            rect.left;


        mouseY =
            e.clientY -
            rect.top;


        updateAim();

    }
);


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

    if (
        player.spectating
    ) {
        return;
    }


    myAngle =
        Math.atan2(
            mouseY - player.y,
            mouseX - player.x
        );


    /*
     * Update our local player
     * immediately.
     */

    player.angle =
        myAngle;


    /*
     * Tell server too.
     */

    if (
        socket &&
        socket.connected
    ) {

        socket.emit(
            "aim",
            {
                angle:
                    myAngle
            }
        );

    }


    drawGame();

}


/*
 * =========================
 * SHOOTING
 * =========================
 */

canvas.addEventListener(
    "mousedown",
    (e) => {

        if (
            e.button !== 0
        ) {
            return;
        }


        /*
         * Don't shoot while
         * spectating.
         */

        if (
            myPlayerId &&
            players[myPlayerId] &&
            players[myPlayerId].spectating
        ) {

            return;

        }


        shooting =
            true;


        shoot();

    }
);


window.addEventListener(
    "mouseup",
    (e) => {

        if (
            e.button === 0
        ) {

            shooting =
                false;

        }

    }
);


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


    socket.emit(
        "shoot"
    );

}


/*
 * =========================
 * RELOADING
 * =========================
 */

window.addEventListener(
    "keydown",
    (e) => {

        /*
         * Don't control the game
         * while typing in inputs.
         */

        if (
            e.target.tagName ===
                "INPUT" ||
            e.target.tagName ===
                "TEXTAREA"
        ) {

            return;

        }


        if (
            e.key &&
            e.key.toLowerCase() ===
                "r"
        ) {

            if (
                socket &&
                socket.connected &&
                myPlayerId &&
                players[myPlayerId] &&
                !players[myPlayerId].spectating
            ) {

                socket.emit(
                    "reload"
                );

            }


            return;

        }

    }
);

/*
 * =========================
 * ENTER TO START GAME
 * =========================
 */

window.addEventListener(
    "keydown",
    (e) => {

        if (
            e.target.tagName ===
                "INPUT" ||
            e.target.tagName ===
                "TEXTAREA"
        ) {

            return;

        }

        if (
            e.key !==
            "Enter"
        ) {

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
            currentHost !==
            myPlayerId
        ) {

            return;

        }

        socket.emit(
            "startGame"
        );

    }
);


/*
 * =========================
 * MOVEMENT
 * =========================
 */

const keys = {};

document.addEventListener("keydown", (e) => {
    if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;

   const key = (e.key || "").toLowerCase();

    if (key === "w" || e.key === "arrowup") {
        keys.w = true;
        e.preventDefault();
    }

    if (key === "a" || e.key === "arrowleft") {
        keys.a = true;
        e.preventDefault();
    }

    if (key === "s" || e.key === "arrowdown") {
        keys.s = true;
        e.preventDefault();
    }

    if (key === "d" || e.key === "arrowright") {
        keys.d = true;
        e.preventDefault();
    }
});

document.addEventListener("keyup", (e) => {
    const key = (e.key || "").toLowerCase();
    
    if (key === "w" || e.key === "arrowup") keys.w = false;
    if (key === "a" || e.key === "arrowleft") keys.a = false;
    if (key === "s" || e.key === "arrowdown") keys.s = false;
    if (key === "d" || e.key === "arrowright") keys.d = false;
});

let lastMoveTime = 0;
const MOVE_INTERVAL = 16; // 60 movement updates per second

function movementLoop(timestamp) {

    if (
        socket &&
        socket.connected &&
        myPlayerId &&
        players[myPlayerId] &&
        !players[myPlayerId].dead &&
        !players[myPlayerId].spectating
    ) {

        if (timestamp - lastMoveTime >= MOVE_INTERVAL) {

            let x = 0;
            let y = 0;

            if (keys.w) y -= 1;
            if (keys.s) y += 1;
            if (keys.a) x -= 1;
            if (keys.d) x += 1;

            if (x !== 0 || y !== 0) {

                const length =
                    Math.sqrt(x * x + y * y);

                x /= length;
                y /= length;

                socket.emit("move", {
                    x: x * speed,
                    y: y * speed
                });

            }

            lastMoveTime = timestamp;
        }
    }

    requestAnimationFrame(movementLoop);
}

requestAnimationFrame(movementLoop);

function showRoundCountdown(roundEndAt) {
    if (!roundEndAt) return;

    roundCountdown.style.display = "block";

    function updateRoundCountdown() {
        if (currentGameState !== "roundEnd") {
            roundCountdown.style.display = "none";
            return;
        }

        const remaining = Math.max(
            0,
            Math.ceil((roundEndAt - Date.now()) / 1000)
        );

        roundCountdownNumber.textContent = remaining;

        if (remaining > 0) {
            setTimeout(updateRoundCountdown, 100);
        }
    }

    updateRoundCountdown();
}

/*
 * =========================
 * HUD
 * =========================
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

    if (
        player.spectating
    ) {

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
        player.health ??
        100;


    const ammo =
        player.ammo ??
        6;


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


    if (
        player.reloading
    ) {

        reloadText.style.display =
            "block";

    } else {

        reloadText.style.display =
            "none";

    }

}


/*
 * =========================
 * CONNECT BUTTON
 * =========================
 */

connectBtn.addEventListener(
    "click",
    connectToServer
);

/*
* ==========================
* COPY BUTTON
* ==========================
*/

    copyBttn.addEventListener("click", () => {
        navigator.clipboard.writeText(gameRoomCode.innerText);
    });


/*
 * =========================
 * ESCAPE KEY
 * =========================
 */

window.addEventListener(
    "keydown",
    (e) => {

        /*
         * Don't open pause menu
         * while typing.
         */

        if (
            e.target.tagName ===
                "INPUT" ||
            e.target.tagName ===
                "TEXTAREA"
        ) {

            return;

        }


        if (
            e.key &&
            e.key === "Escape"
        ) {

            /*
             * Only allow pause menu
             * when actually inside a room.
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

            } else {

                pauseMenu.style.display =
                    "flex";

            }

        }

    }
);

}

/*
 * =========================
 * DRAW GAME
 * =========================
 */

function drawGame() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    /*
     * BACKGROUND GRID
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

       // Draw obstacles
obstacles.forEach(obstacle => {
    ctx.fillStyle = "#555";
    ctx.fillRect(
        obstacle.x,
        obstacle.y,
        obstacle.width,
        obstacle.height
    );
});



    /*
     * =========================
     * DRAW PLAYERS
     * =========================
     */

    for (
        let id in players
    ) {

        const player =
            players[id];


        if (!player) {
            continue;
        }

        /*
         * Spectators disappear
         * from the battlefield.
         */

        if (
            player.spectating
        ) {

            continue;

        }


        /*
         * DEAD / RELOADING ALPHA
         */

        if (
            player.dead
        ) {

            ctx.globalAlpha =
                0.25;

        } else if (
            player.reloading
        ) {

            ctx.globalAlpha =
                0.5;

        } else {

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
            player.angle ||
            0;


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

        if (
            player.dead
        ) {

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
     * =========================
     * DRAW BULLETS
     * =========================
     */

    for (
        const id in bullets
    ) {

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

function showGameEnd(data) {
    gameEndScreen.style.display = "flex";

    let winner = null;

    for (const id in players) {
        const player = players[id];

        if (!player.dead && !player.spectating) {
            winner = player;
            break;
        }
    }

    gameWinner.textContent = winner
        ? `🏆 Winner: ${winner.username}`
        : "🏆 Winner: Draw!";

    let html = "";

    for (const id in players) {
        const player = players[id];

        html += `
            <div style="margin:10px 0; padding:8px; background:#333; border-radius:6px;">
                <strong>${player.username}</strong><br>
                Kills: ${player.kills || 0} |
                Deaths: ${player.deaths || 0} |
                Round Wins: ${player.roundWins || 0}
            </div>
        `;
    }

    finalStats.innerHTML = html;

    const endTime = data.gameEndAt || Date.now();

    function updateCountdown() {
        const remaining = Math.max(
            0,
            Math.ceil((endTime - Date.now()) / 1000)
        );

        gameEndCountdown.textContent =
            `Returning to lobby in ${remaining}...`;

        if (remaining > 0 && currentGameState === "gameEnd") {
            setTimeout(updateCountdown, 250);
        }
    }

    updateCountdown();
}

let fps = 0;
let fpsFrames = 0;
let fpsLastTime = performance.now();

function updateFPS(timestamp) {

    fpsFrames++;

    if (timestamp - fpsLastTime >= 1000) {

        fps = fpsFrames;
        fpsFrames = 0;
        fpsLastTime = timestamp;

        const fpsDisplay =
            document.getElementById("fpsDisplay");

        if (fpsDisplay) {
            fpsDisplay.textContent = fps;
        }

    }

    requestAnimationFrame(updateFPS);
}

requestAnimationFrame(updateFPS);

setInterval(() => {

    if (!socket || !socket.connected) {
        return;
    }

    const start = performance.now();

    socket.emit("pingCheck");

    socket.once("pongCheck", () => {

        const ping =
            Math.round(
                performance.now() - start
            );

        const pingDisplay =
            document.getElementById("pingDisplay");

        if (pingDisplay) {
            pingDisplay.textContent = ping;
        }

    });

}, 1000);

function renderLoop() {
    drawGame();
    requestAnimationFrame(renderLoop);
}

requestAnimationFrame(renderLoop);

/*
 * =========================
 * START
 * =========================
 */

connectToServer();

