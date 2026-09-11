// ========================================
// FROKO.IO - MULTIPLAYER GAME SERVER
// ROOMS + ROUNDS + STATS + SUDDEN DEATH
// ========================================

const http = require("http");
const { Server } = require("socket.io");
const GunData = require("./gunData.js");

const server = http.createServer();

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const rooms = {};


// ========================================
// GAME SETTINGS
// ========================================

const BULLET_RADIUS = 5;
const BULLET_LIFETIME = 3000;

const PLAYER_RADIUS = 20;

const TOTAL_ROUNDS = 5;

const COUNTDOWN_TIME = 3000;
const ROUND_END_TIME = 3000;
const GAME_END_TIME = 10000;

const PLAYER_START_HEALTH = 100;

const SUDDEN_DEATH_HEALTH = 1;


// ========================================
// COLORS
// ========================================

const COLORS = [
    "#FF3366",
    "#33FF66",
    "#3366FF",
    "#FFFF33",
    "#FF9933",
    "#CC33FF",
    "#33FFFF"
];


function getRandomColor() {

    return COLORS[
        Math.floor(
            Math.random() * COLORS.length
        )
    ];

}

// ========================================
// TEAMS
// ========================================

const TEAMS = [
    "red",
    "blue"
];

function getRandomTeam(room) {

    const redCount =
        Object.values(room.players)
            .filter(player => player.team === "red")
            .length;

    const blueCount =
        Object.values(room.players)
            .filter(player => player.team === "blue")
            .length;

    // Put new players on the smaller team
    if (redCount <= blueCount) {
        return "red";
    }

    return "blue";
}


// ========================================
// ROOM CODE
// ========================================

function createRoomCode() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 8; i++) {

        code += characters[
            Math.floor(
                Math.random() * characters.length
            )
        ];

    }

    return code;

}


// ========================================
// OBSTACLES
// ========================================

function generateObstacles() {

    const obstacles = [];

    const obstacleCount = 8;

    for (let i = 0; i < obstacleCount; i++) {

        const width =
            40 +
            Math.random() * 70;

        const height =
            30 +
            Math.random() * 60;

        const x =
            30 +
            Math.random() *
            (600 - width - 60);

        const y =
            30 +
            Math.random() *
            (400 - height - 60);

        obstacles.push({

            x: x,
            y: y,

            width: width,
            height: height

        });

    }

    return obstacles;

}


// ========================================
// COLLISION HELPERS
// ========================================

function circleIntersectsRectangle(
    circleX,
    circleY,
    radius,
    rectangle
) {

    const closestX =
        Math.max(
            rectangle.x,
            Math.min(
                circleX,
                rectangle.x +
                rectangle.width
            )
        );

    const closestY =
        Math.max(
            rectangle.y,
            Math.min(
                circleY,
                rectangle.y +
                rectangle.height
            )
        );

    const dx =
        circleX -
        closestX;

    const dy =
        circleY -
        closestY;

    return (
        dx * dx +
        dy * dy
        <=
        radius * radius
    );

}


function bulletIntersectsRectangle(
    bullet,
    rectangle
) {

    const closestX =
        Math.max(
            rectangle.x,
            Math.min(
                bullet.x,
                rectangle.x +
                rectangle.width
            )
        );

    const closestY =
        Math.max(
            rectangle.y,
            Math.min(
                bullet.y,
                rectangle.y +
                rectangle.height
            )
        );

    const dx =
        bullet.x -
        closestX;

    const dy =
        bullet.y -
        closestY;

    return (
        dx * dx +
        dy * dy
        <=
        BULLET_RADIUS *
        BULLET_RADIUS
    );

}


// ========================================
// PLAYER CREATION
// ========================================

function createPlayer(
    socket,
    username,
    participatedThisRound,
) {

    return {

        x:
            50 +
            Math.random() *
            500,

        y:
            50 +
            Math.random() *
            300,

        angle: 0,

        color:
            getRandomColor(),

        team: null,

        username:
            username,

        health:
            PLAYER_START_HEALTH,

        gun:
    "Pistol",

ammo:
    GunData.Pistol.ammo,

        reloading:
            false,

        dead:
            false,

        spectating:
            false,

        round:
            1,

        // ================================
        // STATS
        // ================================

        kills:
            0,

        deaths:
            0,

        roundWins:
            0,

        survivalTime:
            0,

        roundsParticipated:
            0,

        currentRoundStart:
            null,

        // Used when joining during a game
        joinedDuringGame:
            false,

        participatedThisRound: false,

    };

}


// ========================================
// CREATE ROOM
// ========================================

function createRoom() {

    let roomCode =
        createRoomCode();

    while (rooms[roomCode]) {

        roomCode =
            createRoomCode();

    }

    rooms[roomCode] = {

        players: {},

        bullets: {},

        nextBulletId: 1,

        host: null,

        settings: {

            maxPlayers: 8,

            rounds: TOTAL_ROUNDS

        },

        // ================================
        // GAME STATE
        // ================================

        gameState:
            "lobby",

        gameMode:
            "ffa",

        currentRound:
            0,

        roundStartTime:
            null,

        countdownEndsAt:
            null,

        roundEndAt:
            null,

        gameEndAt:
            null,

        obstacles:
            [],

        gameToken:
            0

    };

    return roomCode;

}


// ========================================
// SEND COMPLETE ROOM STATE
// ========================================

function sendGameState(roomCode) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }

    io.to(roomCode).emit(
    "updatePlayers",
    room.players
);

    io.to(roomCode).emit(
        "updateBullets",
        room.bullets
    );

    io.to(roomCode).emit(
        "gameState",
        {

            state:
                room.gameState,

            currentRound:
                room.currentRound,

            gameMode:
                room.gameMode,

            totalRounds:
                room.settings.rounds,

            host:
                room.host,

            countdownEndsAt:
                room.countdownEndsAt,

            roundEndAt:
                room.roundEndAt,

            gameEndAt:
                room.gameEndAt,

            winner:
                room.winner,

            winningTeam:
                room.winningTeam,

            obstacles:
                room.obstacles

        }
    );

}


// ========================================
// SEND GAME STATE ONLY
// ========================================

function sendRoomState(roomCode) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }

    io.to(roomCode).emit(
        "gameState",
        {

            state:
                room.gameState,

            currentRound:
                room.currentRound,

            gameMode:
                room.gameMode,

            totalRounds:
                room.settings.rounds,

            host:
                room.host,

            countdownEndsAt:
                room.countdownEndsAt,

            roundEndAt:
                room.roundEndAt,

            gameEndAt:
                room.gameEndAt,

            obstacles:
                room.obstacles

        }
    );

}

    function getSafeSpawn(room) {
    for (let attempt = 0; attempt < 100; attempt++) {
        const x = 40 + Math.random() * 520;
        const y = 40 + Math.random() * 320;

        let blocked = false;

        for (const obstacle of room.obstacles) {
            if (
                x + PLAYER_RADIUS > obstacle.x &&
                x - PLAYER_RADIUS < obstacle.x + obstacle.width &&
                y + PLAYER_RADIUS > obstacle.y &&
                y - PLAYER_RADIUS < obstacle.y + obstacle.height
            ) {
                blocked = true;
                break;
            }
        }

        if (!blocked) {
            return { x, y };
        }
    }

    // Fallback if somehow no safe position was found
    return {
        x: 50,
        y: 50
    };
}



// ========================================
// RESET PLAYER FOR ROUND
// ========================================

function resetPlayerForRound(
    room,
    player
) {

    const spawn =
        getSafeSpawn(room);

    player.x =
        spawn.x;

    player.y =
        spawn.y;
    
    player.angle =
        0;

    player.health =
        PLAYER_START_HEALTH;

    player.ammo =
    getPlayerGun(player).ammo;

    player.reloading =
        false;

    player.dead =
        false;

    player.currentRoundStart =
        Date.now();

}


// ========================================
// GET ACTIVE PLAYERS
// ========================================

function getActivePlayers(room) {

    return Object.keys(
        room.players
    )
        .map(
            id =>
                room.players[id]
        )
        .filter(
            player =>
                player &&
                !player.spectating
        );

}


// ========================================
// GET ALIVE PLAYERS
// ========================================

function getAlivePlayers(room) {

    return getActivePlayers(room)
        .filter(
            player =>
                !player.dead
        );

}


// ========================================
// RECORD SURVIVAL TIME
// ========================================

function recordSurvivalTime(
    player
) {

    if (
        player.currentRoundStart ===
        null
    ) {

        return;

    }

    const elapsed =
        Date.now() -
        player.currentRoundStart;

    player.survivalTime +=
        Math.max(
            0,
            elapsed
        );

    player.currentRoundStart =
        null;

}


// ========================================
// START COUNTDOWN
// ========================================

function startCountdown(
    roomCode,
    nextRound
) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }

    room.gameToken++;

    const token =
        room.gameToken;

    room.gameState =
        "countdown";

    room.currentRound =
        nextRound;

    room.countdownEndsAt =
        Date.now() +
        COUNTDOWN_TIME;

    room.roundEndAt =
        null;

    room.obstacles =
        generateObstacles();

    room.bullets =
        {};

   // ====================================
// Prepare players
// ====================================

for (
    const playerId in room.players
) {

    const player =
        room.players[playerId];

    if (!player) {
        continue;
    }

    // Players who were already in the room
    // participate in the new round.

    // Players who joined during the previous
    // active round now become eligible.

    player.joinedDuringGame =
        false;

    player.participatedThisRound =
        false;

    resetPlayerForRound(
        room,
        player
    );

    player.dead =
        false;

}
    
    console.log(
        `Room ${roomCode}: Round ${nextRound} countdown`
    );

    sendGameState(roomCode);

    setTimeout(() => {

        const currentRoom =
            rooms[roomCode];

        if (!currentRoom) {
            return;
        }

        if (
            currentRoom.gameToken !==
            token
        ) {
            return;
        }

        if (
            currentRoom.gameState !==
            "countdown"
        ) {
            return;
        }

        beginRound(
            roomCode,
            token
        );

    }, COUNTDOWN_TIME);

}


// ========================================
// BEGIN ROUND
// ========================================

function beginRound(
    roomCode,
    token
) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }

    if (
        room.gameToken !==
        token
    ) {
        return;
    }

    room.gameState =
        "playing";

    room.roundStartTime =
        Date.now();

    room.countdownEndsAt =
        null;

    room.roundEndAt =
        null;

    // ====================================
    // Count participants
    // ====================================

    for (
        const playerId in room.players
    ) {

        const player =
            room.players[playerId];

        if (!player) {
            continue;
        }

        if (
            !player.spectating
        ) {

            player.roundsParticipated++;

            player.currentRoundStart =
                Date.now();

             player.participatedThisRound = true;

        }

    }

    console.log(
        `Room ${roomCode}: Round ${room.currentRound} started`
    );

    sendGameState(roomCode);

    checkRoundEnd(
        roomCode
    );

}

function getAliveTeams(room) {

    const aliveTeams = new Set();

    for (const playerId in room.players) {

        const player =
            room.players[playerId];

        if (!player) continue;

        if (player.dead) continue;

        if (player.spectating) continue;

        if (!player.team) continue;

        aliveTeams.add(player.team);
    }

    return aliveTeams;
}


// ========================================
// CHECK ROUND END
// ========================================

function checkRoundEnd(
    roomCode
) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }

    if (
        room.gameState !==
        "playing" &&
        room.gameState !==
        "suddenDeath"
    ) {

        return;

    }

    // ====================================
// TEAM MODE
// ====================================

if (room.gameMode === "team") {

    const aliveTeams =
        getAliveTeams(room);

    if (aliveTeams.size === 1) {

        const winningTeam =
            [...aliveTeams][0];

        finishRound(
            roomCode,
            null,
            winningTeam
        );

        return;

    }

    if (aliveTeams.size === 0) {

        finishRound(
            roomCode,
            null,
            null
        );

        return;

    }

    return;
}

    const activePlayers =
        getActivePlayers(room);

    const alivePlayers =
        getAlivePlayers(room);

    // ====================================
    // No players
    // ====================================

    if (
        activePlayers.length === 0
    ) {

        return;

    }

    // ====================================
    // One player alive
    // ====================================

    if (
        alivePlayers.length === 1
    ) {

        finishRound(
            roomCode,
            alivePlayers[0]
        );

        return;

    }

    // ====================================
    // Everyone died
    // ====================================

    if (
        alivePlayers.length === 0
    ) {

        finishRound(
            roomCode,
            null
        );

    }

}


// ========================================
// FINISH ROUND
// ========================================

function finishRound(
    roomCode,
    winner,
    winningTeam = null
) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }

    if (
        room.gameState !==
        "playing" &&
        room.gameState !==
        "suddenDeath"
    ) {

        return;

    }

    room.gameToken++;

    const token =
        room.gameToken;

    room.gameState =
        "roundEnd";

    room.roundEndAt =
        Date.now() +
        ROUND_END_TIME;

    room.countdownEndsAt =
        null;

    // ====================================
    // Record survival times
    // ====================================

    for (
        const playerId in room.players
    ) {

        const player =
            room.players[playerId];

        if (!player) {
            continue;
        }

        if (
            !player.spectating
        ) {

            if (
                player.currentRoundStart !==
                null
            ) {

                recordSurvivalTime(
                    player
                );

            }

        }

    }

    // ====================================
    // Award round winner
    // ====================================

    if (winner) {

        winner.roundWins++;

        console.log(
            `${winner.username} won round ${room.currentRound}`
        );

    }

if (
    winningTeam &&
    room.gameMode === "team"
) {

    for (
        const playerId in room.players
    ) {

        const player =
            room.players[playerId];

        if (!player) continue;

        if (
            player.team === winningTeam
        ) {

            player.roundWins++;

        }

    }

    console.log(
        `${winningTeam.toUpperCase()} team won round ${room.currentRound}`
    );

}

    console.log(
        `Room ${roomCode}: Round ${room.currentRound} ended`
    );

    sendGameState(roomCode);

    setTimeout(() => {

        const currentRoom =
            rooms[roomCode];

        if (!currentRoom) {
            return;
        }

        if (
            currentRoom.gameToken !==
            token
        ) {
            return;
        }

        continueAfterRound(
            roomCode
        );

    }, ROUND_END_TIME);

}


// ========================================
// CONTINUE AFTER ROUND
// ========================================

function continueAfterRound(
    roomCode
) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }

    // ====================================
    // MORE ROUNDS
    // ====================================

    if (
        room.currentRound <
        room.settings.rounds
    ) {

        startCountdown(
            roomCode,
            room.currentRound + 1
        );

        return;

    }

// ====================================
// FINAL ROUND
// ====================================

if (room.gameMode === "team") {

    let redWins = 0;
    let blueWins = 0;

    for (const playerId in room.players) {

        const player =
            room.players[playerId];

        if (!player) {
            continue;
        }

        if (player.team === "red") {

            redWins += player.roundWins;

        } else if (
            player.team === "blue"
        ) {

            blueWins += player.roundWins;

        }

    }

    let winningTeam =
        null;

    if (redWins > blueWins) {

        winningTeam =
            "red";

    } else if (blueWins > redWins) {

        winningTeam =
            "blue";

    }

    console.log(
        `Final team scores - RED: ${redWins}, BLUE: ${blueWins}`
    );

    finishGame(
        roomCode,
        null,
        winningTeam
    );

    return;

}

// ====================================
// FINAL ROUND - FREE FOR ALL
// ====================================

const tiedPlayers =
    getFinalTiedPlayers(room);

if (
    tiedPlayers.length > 1
) {

    startSuddenDeath(
        roomCode,
        tiedPlayers
    );

    return;

}

// ====================================
// GAME COMPLETE
// ====================================

const finalWinner =
    getFinalTiedPlayers(room)[0] || null;

finishGame(
    roomCode,
    finalWinner
);
}


// ========================================
// GET FINAL TIED PLAYERS
// ========================================

function getFinalTiedPlayers(room) {

    const activePlayers =
        getActivePlayers(room)
            .filter(
                player =>
                    player.roundsParticipated > 0
            );

    if (
        activePlayers.length === 0
    ) {

        return [];

    }

    let highestScore = -1;

    for (
        const player of activePlayers
    ) {

        highestScore =
            Math.max(
                highestScore,
                player.roundWins
            );

    }

    return activePlayers.filter(
        player =>
            player.roundWins ===
            highestScore
    );

}

// ========================================
// SUDDEN DEATH
// ========================================

function startSuddenDeath(
    roomCode,
    tiedPlayers
) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }

    room.gameToken++;

    room.gameState =
        "suddenDeath";

    room.currentRound =
        room.settings.rounds;

    room.roundStartTime =
        Date.now();

    room.countdownEndsAt =
        Date.now() +
        COUNTDOWN_TIME;

    room.roundEndAt =
        null;

    room.obstacles =
        generateObstacles();

    room.bullets =
        {};

    const tiedIds =
        new Set(
            tiedPlayers.map(
                player =>
                    Object.keys(
                        room.players
                    ).find(
                        id =>
                            room.players[id] ===
                            player
                    )
            )
        );

    // ====================================
    // Prepare all players
    // ====================================

    for (
        const playerId in room.players
    ) {

        const player =
            room.players[playerId];

        if (!player) {
            continue;
        }

        player.currentRoundStart =
            null;

        player.reloading =
            false;

        player.ammo =
    getPlayerGun(player).ammo;

        if (
            tiedIds.has(playerId)
        ) {

            player.spectating =
                false;

            player.dead =
                false;

            player.health =
                SUDDEN_DEATH_HEALTH;

            const spawn =
    getSafeSpawn(room);

player.x =
    spawn.x;

player.y =
    spawn.y;

            player.currentRoundStart =
                Date.now();

        } else {

            player.dead =
                true;

            player.spectating =
                true;

        }

    }

    console.log(
        `Room ${roomCode}: SUDDEN DEATH`
    );

    sendGameState(roomCode);

    const token =
        room.gameToken;

    setTimeout(() => {

        const currentRoom =
            rooms[roomCode];

        if (!currentRoom) {
            return;
        }

        if (
            currentRoom.gameToken !==
            token
        ) {
            return;
        }

        if (
            currentRoom.gameState !==
            "suddenDeath"
        ) {
            return;
        }

        room.countdownEndsAt =
            null;

        room.roundStartTime =
            Date.now();

        for (
            const playerId of tiedIds
        ) {

            const player =
                room.players[playerId];

            if (!player) {
                continue;
            }

            player.currentRoundStart =
                Date.now();

        }

        sendGameState(roomCode);

        checkRoundEnd(
            roomCode
        );

    }, COUNTDOWN_TIME);

}


// ========================================
// FINISH GAME
// ========================================

function finishGame(
    roomCode,
    winner = null,
    winningTeam = null
) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }

    room.gameToken++;

    room.gameState =
        "gameEnd";

    room.gameEndAt =
        Date.now() +
        GAME_END_TIME;

    room.winner =
    winner;

room.winningTeam =
    winningTeam;

    room.countdownEndsAt =
        null;

    room.roundEndAt =
        null;

    room.obstacles =
        [];

    room.bullets =
        {};

    // Record any remaining survival time
    for (
        const playerId in room.players
    ) {

        const player =
            room.players[playerId];

        if (!player) {
            continue;
        }

        if (
            player.currentRoundStart !==
            null
        ) {

            recordSurvivalTime(
                player
            );

        }

    }

    console.log(
        `Room ${roomCode}: GAME END`
    );

    sendGameState(roomCode);

    setTimeout(() => {

        const currentRoom =
            rooms[roomCode];

        if (!currentRoom) {
            return;
        }

        resetToLobby(
            roomCode
        );

    }, GAME_END_TIME);

}


// ========================================
// RESET ROOM TO LOBBY
// ========================================

function resetToLobby(
    roomCode
) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }

    room.gameToken++;

    room.gameState =
        "lobby";

    room.currentRound =
        0;

    room.roundStartTime =
        null;

    room.countdownEndsAt =
        null;

    room.roundEndAt =
        null;

    room.gameEndAt =
        null;

    room.obstacles =
        [];

    room.bullets =
        {};

    // ====================================
    // Reset player combat state
    // ====================================

    for (
        const playerId in room.players
    ) {

        const player =
            room.players[playerId];

        if (!player) {
            continue;
        }

        player.health =
            PLAYER_START_HEALTH;

        player.ammo =
    getPlayerGun(player).ammo;

        player.reloading =
            false;

        player.dead =
            true;

        player.spectating =
            false;

        player.currentRoundStart =
            null;

        player.joinedDuringGame =
            false;

    }

    console.log(
        `Room ${roomCode}: returned to lobby`
    );

    sendGameState(roomCode);

}


// ========================================
// REMOVE PLAYER FROM ROOM
// ========================================

function removePlayerFromRoom(
    socket
) {

    const roomCode =
        socket.roomCode;

    if (!roomCode) {
        return;
    }

    const room =
        rooms[roomCode];

    if (!room) {

        socket.roomCode =
            null;

        return;

    }

    const player =
        room.players[socket.id];

    if (!player) {

        socket.roomCode =
            null;

        return;

    }

    console.log(
        `${player.username} left room ${roomCode}`
    );

    // ====================================
    // Remove bullets
    // ====================================

    for (
        const bulletId in room.bullets
    ) {

        if (
            room.bullets[bulletId].owner ===
            socket.id
        ) {

            delete room.bullets[
                bulletId
            ];

        }

    }

    const wasAlive =
        !player.dead &&
        !player.spectating;

    if (wasAlive) {

        recordSurvivalTime(
            player
        );

    }

    delete room.players[
        socket.id
    ];

    socket.leave(
        roomCode
    );

    socket.roomCode =
        null;

    // ====================================
    // Empty room
    // ====================================

    if (
        Object.keys(room.players).length ===
        0
    ) {

        delete rooms[roomCode];

        console.log(
            `Room ${roomCode} deleted`
        );

        return;

    }

    // ====================================
    // Host transfer
    // ====================================

    if (
        room.host ===
        socket.id
    ) {

        room.host =
            Object.keys(
                room.players
            )[0];

        const newHost =
            room.players[
                room.host
            ];

        if (newHost) {

            console.log(
                `${newHost.username} is now host of ${roomCode}`
            );

        }

    }

    sendGameState(
        roomCode
    );

    // ====================================
    // Leaving can end a round
    // ====================================

    if (
        room.gameState ===
        "playing" ||
        room.gameState ===
        "suddenDeath"
    ) {

        checkRoundEnd(
            roomCode
        );

    }

}

function getPlayerGun(player) {

    if (
        !player ||
        !GunData[player.gun]
    ) {
        return GunData.Pistol;
    }

    return GunData[player.gun];

}


// ========================================
// RELOAD
// ========================================

function startReload(
    roomCode,
    playerId
) {

    const room =
        rooms[roomCode];

    if (!room) return;

    const player =
        room.players[playerId];

    if (!player) return;

    if (
        room.gameState !==
        "playing" &&
        room.gameState !==
        "suddenDeath"
    ) {
        return;
    }

    if (player.dead) return;

    if (player.spectating) return;

    if (player.reloading) return;

   const gun =
    getPlayerGun(player);

if (player.ammo >= gun.ammo) return;

    player.reloading =
        true;

    sendGameState(
        roomCode
    );

    const token =
        room.gameToken;

    setTimeout(() => {

        const currentRoom =
            rooms[roomCode];

        if (!currentRoom) {
            return;
        }

        const currentPlayer =
            currentRoom.players[playerId];

        if (!currentPlayer) {
            return;
        }

        if (
            currentRoom.gameToken !==
            token
        ) {

            currentPlayer.reloading =
                false;

            sendGameState(
                roomCode
            );

            return;

        }

        if (
            currentPlayer.dead ||
            currentPlayer.spectating
        ) {

            currentPlayer.reloading =
                false;

            sendGameState(
                roomCode
            );

            return;

        }

        currentPlayer.ammo =
            gun.ammo;

        currentPlayer.reloading =
            false;

        sendGameState(
            roomCode
        );

    }, gun.reloadTime);

}


// ========================================
// SOCKET CONNECTION
// ========================================

io.on(
    "connection",
    (socket) => {

        console.log(
            `Player connected: ${socket.id}`
        );

        socket.on("pingCheck", () => {
            socket.emit("pongCheck");
        });

        socket.on("setGameMode", (mode) => {
    const roomCode = socket.roomCode;
    const room = rooms[roomCode];

    if (!room) return;
    if (room.host !== socket.id) return;
    if (room.gameState !== "lobby") return;

    if (mode !== "ffa" && mode !== "team") {
        return;
    }

    room.gameMode = mode;
            console.log(
                "GAME MODE CHANGED:",
                 roomCode,
                 mode
            );

    if (mode === "ffa") {

        for (const playerId in room.players) {
            room.players[playerId].team = null;
        }

    }

    if (mode === "team") {

        let redCount = 0;
        let blueCount = 0;

        for (const playerId in room.players) {

            const player =
                room.players[playerId];

            if (!player) continue;

            if (redCount <= blueCount) {
                player.team = "red";
                redCount++;
            } else {
                player.team = "blue";
                blueCount++;
            }

        }

    }

    sendGameState(roomCode);
});

socket.on("command", (command) => {

    const roomCode = socket.roomCode;
    const room = rooms[roomCode];

    if (!room) return;

    const player = room.players[socket.id];

    if (!player) return;

    if (typeof command !== "string") return;

    const parts = command.trim().split(/\s+/);

    const commandName = parts[0].toLowerCase();
    const gunCode = (parts[1] || "").toUpperCase();

    if (commandName !== "/gun") return;

    if (gunCode === "P") {

        player.gun = "Pistol";

    } else if (gunCode === "JF") {

        player.gun = "JackerRifle";

    } else {

        return;

    }

    const gun = getPlayerGun(player);

    player.ammo = gun.ammo;
    player.reloading = false;

    sendGameState(roomCode);

});
        // ====================================
        // CREATE ROOM
        // ====================================

        socket.on(
            "createRoom",
            (username) => {

                if (
                    typeof username !==
                    "string"
                ) {
                    return;
                }

                username =
                    username.trim();

                if (!username) {
                    return;
                }

                username =
                    username.substring(
                        0,
                        16
                    );

                // Leave existing room first
                if (socket.roomCode) {

                    removePlayerFromRoom(
                        socket
                    );

                }

                const roomCode =
                    createRoom();

                const room =
                    rooms[roomCode];

                room.host =
                    socket.id;

                socket.join(
                    roomCode
                );

                socket.roomCode =
                    roomCode;

                socket.username =
                    username;

                const player =
                    createPlayer(
                        socket,
                        username
                    );
                
                player.team = "red";

                room.players[
                    socket.id
                ] =
                    player;

                console.log(
                    `${username} created room ${roomCode}`
                );

                socket.emit(
                    "roomJoined",
                    {

                        roomCode:
                            roomCode,

                        username:
                            username

                    }
                );

                sendGameState(
                    roomCode
                );

            }
        );


        // ====================================
        // JOIN ROOM
        // ====================================

        socket.on(
            "joinRoom",
            (data) => {

                if (
                    !data ||
                    typeof data !==
                    "object"
                ) {
                    return;
                }

                let roomCode =
                    data.roomCode;

                let username =
                    data.username;

                if (
                    typeof roomCode !==
                    "string" ||
                    typeof username !==
                    "string"
                ) {
                    return;
                }

                roomCode =
                    roomCode
                        .trim()
                        .toUpperCase();

                username =
                    username.trim();

                if (
                    !roomCode ||
                    !username
                ) {

                    socket.emit(
                        "roomError",
                        "Enter a username and room code."
                    );

                    return;

                }

                username =
                    username.substring(
                        0,
                        16
                    );

                const room =
                    rooms[roomCode];

                if (!room) {

                    socket.emit(
                        "roomError",
                        "That room does not exist."
                    );

                    return;

                }

                if (
                    Object.keys(
                        room.players
                    ).length >=
                    room.settings.maxPlayers
                ) {

                    socket.emit(
                        "roomError",
                        "That room is full."
                    );

                    return;

                }

                // Leave current room first
                if (socket.roomCode) {

                    removePlayerFromRoom(
                        socket
                    );

                }

                socket.join(
                    roomCode
                );

                socket.roomCode =
                    roomCode;

                socket.username =
                    username;

                const player =
                    createPlayer(
                        socket,
                        username
                    );

                if (room.gameMode === "team") {
                    player.team = getRandomTeam(room);
                }

                // ====================================
                // Mid-game join
                // ====================================

                if (
                    room.gameState !==
                    "lobby"
                ) {

                    player.dead =
                        true;

                    player.joinedDuringGame =
                        true;

                    player.spectating =
                        true;

                }

                room.players[
                    socket.id
                ] =
                    player;

                console.log(
                    `${username} joined room ${roomCode}`
                );

                socket.emit(
                    "roomJoined",
                    {

                        roomCode:
                            roomCode,

                        username:
                            username

                    }
                );

                sendGameState(
                    roomCode
                );

            }
        );


        // ====================================
        // START GAME
        // ====================================

        socket.on(
            "startGame",
            () => {

                const roomCode =
                    socket.roomCode;

                const room =
                    rooms[roomCode];

                if (!room) return;

                // Only host
                if (
                    room.host !==
                    socket.id
                ) {

                    return;

                }

                // Only from lobby
                if (
                    room.gameState !==
                    "lobby"
                ) {

                    return;

                }

                const playerCount =
                    Object.keys(
                        room.players
                    ).length;

                if (
                    playerCount < 1
                ) {

                    return;

                }

                // Reset game stats
                for (
                    const playerId in
                    room.players
                ) {

                    const player =
                        room.players[
                            playerId
                        ];

                    player.kills =
                        0;

                    player.deaths =
                        0;

                    player.roundWins =
                        0;

                    player.survivalTime =
                        0;

                    player.roundsParticipated =
                        0;

                    player.currentRoundStart =
                        null;

                    player.joinedDuringGame =
                        false;

                    player.spectating =
                        false;

                }

                if (room.gameMode === "team") {

    for (
        const playerId in room.players
    ) {

        const player =
            room.players[playerId];

        if (!player.team) {
            player.team =
                getRandomTeam(room);
        }

    }

}

                console.log(
                    `${room.players[socket.id].username} started game in ${roomCode}`
                );

                startCountdown(
                    roomCode,
                    1
                );

            }
        );
        
// ====================================
// SWITCH TEAM
// ====================================

socket.on(
    "switchTeam",
    () => {

        const roomCode =
            socket.roomCode;

        const room =
            rooms[roomCode];

        if (!room) return;

        const player =
            room.players[
                socket.id
            ];

        if (!player) return;

        // Only Team Mode
        if (
            room.gameMode !== "team"
        ) {
            return;
        }

        // Teams can only be changed
        // while in the lobby
        if (
            room.gameState !== "lobby"
        ) {
            return;
        }

        player.team =
            player.team === "red"
                ? "blue"
                : "red";

        sendGameState(
            roomCode
        );

    }
);


        // ====================================
        // SPECTATE
        // ====================================

        socket.on(
            "spectate",
            () => {

                const roomCode =
                    socket.roomCode;

                const room =
                    rooms[roomCode];

                if (!room) return;

                const player =
                    room.players[
                        socket.id
                    ];

                if (!player) return;

                // Spectating is only allowed
                // while dead or waiting
                if (
                    !player.dead &&
                    !player.joinedDuringGame
                ) {

                    return;

                }

                player.spectating =
                    true;

                console.log(
                    `${player.username} is spectating in ${roomCode}`
                );

                sendGameState(
                    roomCode
                );

            }
        );


        // ====================================
        // CHANGE COLOR
        // ====================================

        socket.on(
            "changeColor",
            () => {

                const roomCode =
                    socket.roomCode;

                const room =
                    rooms[roomCode];

                if (!room) return;

                const player =
                    room.players[
                        socket.id
                    ];

                if (!player) return;

                const currentIndex =
                    COLORS.indexOf(
                        player.color
                    );

                const nextIndex =
                    currentIndex === -1
                        ? 0
                        : (
                            currentIndex + 1
                        ) %
                        COLORS.length;

                player.color =
                    COLORS[
                        nextIndex
                    ];

                sendGameState(
                    roomCode
                );

            }
        );


        // ====================================
        // LEAVE ROOM
        // ====================================

        socket.on(
            "leaveRoom",
            () => {

                removePlayerFromRoom(
                    socket
                );

                socket.emit(
                    "leftRoom"
                );

            }
        );


        // ====================================
        // MOVE
        // ====================================

        socket.on(
            "move",
            (data) => {

                const roomCode =
                    socket.roomCode;

                const room =
                    rooms[roomCode];

                if (!room) return;

                const player =
                    room.players[
                        socket.id
                    ];

                if (!player) return;

                if (
                    room.gameState !==
                    "playing" &&
                    room.gameState !==
                    "suddenDeath"
                ) {

                    return;

                }

                if (player.dead) return;

                if (player.spectating) return;

                if (
                    typeof data !==
                    "object" ||
                    data === null ||
                    typeof data.x !==
                    "number" ||
                    typeof data.y !==
                    "number" ||
                    !Number.isFinite(data.x) ||
                    !Number.isFinite(data.y)
                ) {

                    return;

                }

                const moveX =
                    Math.max(
                        -20,
                        Math.min(
                            20,
                            data.x
                        )
                    );

                const moveY =
                    Math.max(
                        -20,
                        Math.min(
                            20,
                            data.y
                        )
                    );

                const newX =
                    Math.max(
                        20,
                        Math.min(
                            580,
                            player.x +
                            moveX
                        )
                    );

                const newY =
                    Math.max(
                        20,
                        Math.min(
                            380,
                            player.y +
                            moveY
                        )
                    );

                // ====================================
                // Obstacle collision
                // ====================================

                let blocked =
                    false;

                for (
                    const obstacle of
                    room.obstacles
                ) {

                    if (
                        circleIntersectsRectangle(
                            newX,
                            newY,
                            PLAYER_RADIUS,
                            obstacle
                        )
                    ) {

                        blocked =
                            true;

                        break;

                    }

                }

                if (!blocked) {

                    player.x =
                        newX;

                    player.y =
                        newY;

                }

            }
        );


        // ====================================
        // AIM
        // ====================================

        socket.on(
            "aim",
            (data) => {

                const roomCode =
                    socket.roomCode;

                const room =
                    rooms[roomCode];

                if (!room) return;

                const player =
                    room.players[
                        socket.id
                    ];

                if (!player) return;

                if (
                    room.gameState !==
                    "playing" &&
                    room.gameState !==
                    "suddenDeath"
                ) {

                    return;

                }

                if (player.dead) return;

                if (player.spectating) return;

                if (
                    !data ||
                    typeof data.angle !==
                    "number" ||
                    !Number.isFinite(
                        data.angle
                    )
                ) {

                    return;

                }

                player.angle =
                    data.angle;

            }
        );


        // ====================================
        // SHOOT
        // ====================================

        socket.on(
            "shoot",
            () => {

                const roomCode =
                    socket.roomCode;

                const room =
                    rooms[roomCode];

                if (!room) return;

                const player =
                    room.players[
                        socket.id
                    ];

                if (!player) return;

                if (
                    room.gameState !==
                    "playing" &&
                    room.gameState !==
                    "suddenDeath"
                ) {

                    return;

                }

                if (player.dead) return;

                if (player.spectating) return;

                if (player.reloading) return;

                if (player.ammo <= 0) return;

                const gun =
                    getPlayerGun(player);

                player.ammo--;

                const bulletId =
                    String(
                        room.nextBulletId++
                    );

                const angle =
                    player.angle || 0;

                const startDistance =
                    25;

                      room.bullets[
            bulletId
        ] = {

            id:
                bulletId,

            x:
                player.x +
                Math.cos(angle) *
                startDistance,

            y:
                player.y +
                Math.sin(angle) *
                startDistance,

            previousX:
                player.x +
                Math.cos(angle) *
                startDistance,

            previousY:
                player.y +
                Math.sin(angle) *
                startDistance,

            angle:
                angle,

            owner:
                socket.id,

            createdAt:
                Date.now(),

            damage:
                gun.damage,

            speed:
                gun.bulletSpeed,

            maxBounces:
                gun.maxBounces || 0,

            bounces:
                0,

            bounceDamageReduction:
                gun.bounceDamageReduction || 0,

            length:
                player.gun === "JackerRifle"
                    ? 22
                    : 10

        };

        if (player.ammo === 0) {

            startReload(
                roomCode,
                socket.id
            );

        }

        sendGameState(
            roomCode
        );

    }
);
        // ====================================
        // RELOAD
        // ====================================

        socket.on(
            "reload",
            () => {

                const roomCode =
                    socket.roomCode;

                const room =
                    rooms[roomCode];

                if (!room) return;

                const player =
                    room.players[
                        socket.id
                    ];

                if (!player) return;

                if (
                    room.gameState !==
                    "playing" &&
                    room.gameState !==
                    "suddenDeath"
                ) {

                    return;

                }

                if (player.dead) return;

                if (player.spectating) return;

                startReload(
                    roomCode,
                    socket.id
                );

            }
        );


        // ====================================
        // DISCONNECT
        // ====================================

        socket.on(
            "disconnect",
            () => {

                console.log(
                    `Player disconnected: ${socket.id}`
                );

                removePlayerFromRoom(
                    socket
                );

            }
        );

    }
);

setInterval(() => {
    for (const roomCode in rooms) {
        const room = rooms[roomCode];

        if (
            room.gameState === "playing" ||
            room.gameState === "suddenDeath"
        ) {
            io.to(roomCode).emit("updatePlayers", room.players);
        }
    }
}, 16);

setInterval(() => {

    for (const roomCode in rooms) {

        const room = rooms[roomCode];

        if (
            room.gameState === "playing" ||
            room.gameState === "suddenDeath"
        ) {
            io.to(roomCode).emit(
                "updateBullets",
                room.bullets
            );
        }

    }

}, 16);

// ========================================
// BULLET LOOP
// ========================================

setInterval(
    () => {

        const now =
            Date.now();

        for (
            const roomCode in rooms
        ) {

            const room =
                rooms[roomCode];

            if (
                room.gameState !==
                "playing" &&
                room.gameState !==
                "suddenDeath"
            ) {

                // Make sure bullets cannot
                // remain during non-game states.

                room.bullets =
                    {};

                continue;

            }

            for (
                const bulletId in
                room.bullets
            ) {

                const bullet =
                    room.bullets[
                        bulletId
                    ];

                if (!bullet) {
                    continue;
                }

                bullet.previousX =
                    bullet.x;

                bullet.previousY =
                    bullet.y;

              bullet.x +=
    Math.cos(
        bullet.angle
    ) *
    bullet.speed;

bullet.y +=
    Math.sin(
        bullet.angle
    ) *
    bullet.speed;

                // ====================================
                // Lifetime
                // ====================================

                if (
                    now -
                    bullet.createdAt >
                    BULLET_LIFETIME
                ) {

                    delete room.bullets[
                        bulletId
                    ];

                    continue;

                }

                // ====================================
                // Bounds
                // ====================================

                if (
                    bullet.x <
                    -BULLET_RADIUS ||

                    bullet.x >
                    600 +
                    BULLET_RADIUS ||

                    bullet.y <
                    -BULLET_RADIUS ||

                    bullet.y >
                    400 +
                    BULLET_RADIUS
                ) {

                    delete room.bullets[
                        bulletId
                    ];

                    continue;

                }

                // ====================================
                // Obstacle collision
                // ====================================

            let hitObstacle = false;

for (
    const obstacle of room.obstacles
) {

    if (
        !bulletIntersectsRectangle(
            bullet,
            obstacle
        )
    ) {

        continue;

    }

    /*
     * Pistol-style bullets disappear
     * when they hit an obstacle.
     */

    if (
        bullet.maxBounces <=
        bullet.bounces
    ) {

        hitObstacle = true;
        break;

    }


    /*
     * Determine which side of the
     * obstacle was hit.
     */

    const hitVerticalSide =
        bullet.previousX <
            obstacle.x ||
        bullet.previousX >
            obstacle.x +
            obstacle.width;

    const hitHorizontalSide =
        bullet.previousY <
            obstacle.y ||
        bullet.previousY >
            obstacle.y +
            obstacle.height;


    /*
     * Reflect the bullet.
     *
     * Vertical wall:
     * reverse X direction.
     *
     * Horizontal wall:
     * reverse Y direction.
     */

    if (
        hitVerticalSide &&
        !hitHorizontalSide
    ) {

        bullet.angle =
            Math.PI -
            bullet.angle;

    } else if (
        hitHorizontalSide &&
        !hitVerticalSide
    ) {

        bullet.angle =
            -bullet.angle;

    } else {

        /*
         * Corner hit:
         * reflect both directions.
         */

        bullet.angle =
            bullet.angle +
            Math.PI;

    }


    bullet.bounces++;

    bullet.damage =
        Math.max(
            0,
            bullet.damage -
            bullet.bounceDamageReduction
        );


    /*
     * Move the bullet slightly away
     * from the obstacle so it doesn't
     * immediately collide again.
     */

    bullet.x =
        bullet.previousX +
        Math.cos(bullet.angle) * 2;

    bullet.y =
        bullet.previousY +
        Math.sin(bullet.angle) * 2;


    break;

}


if (hitObstacle) {

    delete room.bullets[
        bulletId
    ];

    continue;

}
            
                // ====================================
                // Player collision
                // ====================================

                for (
                    const playerId in
                    room.players
                ) {

                    const player =
                        room.players[playerId];

                    if (!player) {
                        continue;
                    }

                    if (
                        playerId ===
                        bullet.owner
                    ) {
                        continue;
                    }

                    // No friendly fire in Team Mode
                    if (
                        room.gameMode === "team" &&
                        room.players[bullet.owner] &&
                        room.players[bullet.owner].team === player.team
                        ) {
                        continue;
                        }

                    if (player.dead) {
                        continue;
                    }

                    if (player.spectating) {
                        continue;
                    }

                    const dx =
                        bullet.x -
                        bullet.previousX;

                    const dy =
                        bullet.y -
                        bullet.previousY;

                    const lengthSquared =
                        dx * dx +
                        dy * dy;

                    let t = 0;

                    if (lengthSquared > 0) {

                        t =
                            (
                                (
                                    player.x -
                                    bullet.previousX
                                ) * dx +

                                (
                                    player.y -
                                    bullet.previousY
                                ) * dy
                            ) /
                            lengthSquared;

                        t =
                            Math.max(
                                0,
                                Math.min(
                                    1,
                                    t
                                )
                            );

                    }

                    const closestX =
                        bullet.previousX +
                        t * dx;

                    const closestY =
                        bullet.previousY +
                        t * dy;

                    const distanceX =
                        player.x -
                        closestX;

                    const distanceY =
                        player.y -
                        closestY;

                    const distance =
                        Math.sqrt(
                            distanceX * distanceX +
                            distanceY * distanceY
                        );

                    if (
                        distance <=
                        PLAYER_RADIUS +
                        BULLET_RADIUS
                    ) {

                        // ================================
                        // DAMAGE
                        // ================================

                      player.health -=
                        room.gameState === "suddenDeath"
                        ? SUDDEN_DEATH_HEALTH
                        : bullet.damage;

                        // Immediately tell clients about damage
                        sendGameState(roomCode);

                        // ================================
                        // DEATH
                        // ================================

                        if (
                            player.health <= 0
                        ) {

                            player.health = 0;
                            player.dead = true;
                            player.reloading = false;

                            recordSurvivalTime(
                                player
                            );

                            player.deaths++;

                            const killer =
                                room.players[
                                    bullet.owner
                                ];

                            if (
                                killer &&
                                killer !== player
                            ) {

                                killer.kills++;

                            }

                            console.log(
                                `${player.username} died`
                            );

                            delete room.bullets[
                                bulletId
                            ];

                            checkRoundEnd(
                                roomCode
                            );

                            break;

                        }

                        // Bullet disappears after hitting
                        // a player, even if they survive.

                        delete room.bullets[
                            bulletId
                        ];

                        break;

                    }

                }

            }

        }

    },
    1000 / 60
);

// ========================================
// SERVER
// ========================================

const PORT =
    process.env.PORT || 3000;

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "--------------------------------"
        );

        console.log(
            "FROKO.IO MULTIPLAYER SERVER"
        );

        console.log(
            "--------------------------------"
        );

        console.log(
            "Server running on port " +
            PORT
        );

        console.log(
            "Rooms + rounds + stats enabled"
        );

        console.log(
            "--------------------------------"
        );

    }
);
