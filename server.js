// ========================================
// FROKO.IO - MULTIPLAYER GAME SERVER
// ROOMS + ROUNDS + STATS + SUDDEN DEATH
// ========================================

const http = require("http");
const { Server } = require("socket.io");
const GunData = require("./gunData.js");

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

initializeApp({
    credential: cert(serviceAccount)
});

const adminDb = getFirestore();
const adminAuth = getAuth();

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

     gun: "Pistol",

ammo: GunData.Pistol.ammo,

reloading: false,

nextShotAt: 0,

beamActive: false,
beamTargets: {},
beamLength: 600,
beamSlowed: false,
        
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

        nextVortexId: 1,

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
    "updateVortices",
    room.vortices
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


    player.reloading = false;

    player.nextShotAt = 0;

player.beamActive = false;
player.beamTargets = {};
player.beamSlowed = false;



    player.dead = false;

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

    room.vortices =
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

    room.vortices =
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

        player.beamActive = false;
player.beamTargets = {};
player.beamSlowed = false;

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

    room.vortices =
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

         player.beamActive = false;
         player.beamTargets = {};
         player.beamSlowed = false;


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

              console.log("BULLET DELETED:", {
    gun: bullet.gun,
    id: bullet.id,
    x: bullet.x,
    y: bullet.y,
    speed: bullet.speed
});
            

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
// FOFROBEAM
// ========================================

function stopBeam(roomCode, playerId) {

    const room =
        rooms[roomCode];

    if (!room) return;

    const player =
        room.players[playerId];

    if (!player) return;

    player.beamActive = false;
    player.beamTargets = {};

    sendGameState(roomCode);
}

// ========================================
// CHECK IF BEAM HITS OBSTACLE
// ========================================

function beamHitsObstacle(
    room,
    startX,
    startY,
    endX,
    endY
) {

    const steps = 50;

    for (let i = 0; i <= steps; i++) {

        const t = i / steps;

        const x =
            startX +
            (endX - startX) * t;

        const y =
            startY +
            (endY - startY) * t;

        for (const obstacle of room.obstacles) {

            if (
                x >= obstacle.x &&
                x <= obstacle.x + obstacle.width &&
                y >= obstacle.y &&
                y <= obstacle.y + obstacle.height
            ) {
                return true;
            }

        }

        // Map edges
        if (
            x < 0 ||
            x > 600 ||
            y < 0 ||
            y > 400
        ) {
            return true;
        }

    }

    return false;
}


function getBeamLength(
    room,
    startX,
    startY,
    angle,
    maxLength = 600
) {
    const endX =
        startX +
        Math.cos(angle) *
        maxLength;

    const endY =
        startY +
        Math.sin(angle) *
        maxLength;

    let closestDistance =
        maxLength;

    for (const obstacle of room.obstacles) {

        const minX =
            obstacle.x;

        const maxX =
            obstacle.x +
            obstacle.width;

        const minY =
            obstacle.y;

        const maxY =
            obstacle.y +
            obstacle.height;

        const dx =
            Math.cos(angle);

        const dy =
            Math.sin(angle);

        let tMin = 0;
        let tMax = maxLength;


        /*
         * X axis
         */

        if (Math.abs(dx) < 0.000001) {

            if (
                startX < minX ||
                startX > maxX
            ) {
                continue;
            }

        } else {

            let tx1 =
                (minX - startX) / dx;

            let tx2 =
                (maxX - startX) / dx;

            if (tx1 > tx2) {

                const temp =
                    tx1;

                tx1 =
                    tx2;

                tx2 =
                    temp;

            }

            tMin =
                Math.max(
                    tMin,
                    tx1
                );

            tMax =
                Math.min(
                    tMax,
                    tx2
                );

        }


        /*
         * Y axis
         */

        if (Math.abs(dy) < 0.000001) {

            if (
                startY < minY ||
                startY > maxY
            ) {
                continue;
            }

        } else {

            let ty1 =
                (minY - startY) / dy;

            let ty2 =
                (maxY - startY) / dy;

            if (ty1 > ty2) {

                const temp =
                    ty1;

                ty1 =
                    ty2;

                ty2 =
                    temp;

            }

            tMin =
                Math.max(
                    tMin,
                    ty1
                );

            tMax =
                Math.min(
                    tMax,
                    ty2
                );

        }


        /*
         * We hit this obstacle.
         */

        if (
            tMin <= tMax &&
            tMax >= 0 &&
            tMin <= maxLength
        ) {

            const hitDistance =
                Math.max(
                    0,
                    tMin
                );

            closestDistance =
                Math.min(
                    closestDistance,
                    hitDistance
                );

        }

    }

    return closestDistance;
}

// ========================================
// PROCESS FOFROBEAM
// ========================================

function processFoFroBeam(
    roomCode,
    playerId
) {

    const room =
        rooms[roomCode];

    if (!room) return;

    const player =
        room.players[playerId];

    if (!player) return;

    // ====================================
    // Validate shooter
    // ====================================

    if (
        !player.beamActive ||
        player.gun !== "FoFroBeam" ||
        player.dead ||
        player.spectating ||
        player.reloading
    ) {

        player.beamActive = false;

        return;

    }

    const gun =
        getPlayerGun(player);


    // ====================================
    // Ammo check
    // ====================================

    if (player.ammo <= 0) {

        player.beamActive = false;
        player.beamTargets = {};

        startReload(
            roomCode,
            playerId
        );

        return;

    }

    // ====================================
    // Beam position
    // ====================================

 const startX =
    player.x +
    Math.cos(player.angle) * 25;

const startY =
    player.y +
    Math.sin(player.angle) * 25;

const beamLength =
    getBeamLength(
        room,
        startX,
        startY,
        player.angle,
        600
    );

player.beamLength =
    beamLength;

const endX =
    startX +
    Math.cos(player.angle) *
    beamLength;

const endY =
    startY +
    Math.sin(player.angle) *
    beamLength;

    const currentlyHit = {};

    // ====================================
    // Check every player
    // ====================================

    for (
        const targetId in room.players
    ) {

        // Don't hit yourself
        if (
            targetId === playerId
        ) {
            continue;
        }

        const target =
            room.players[targetId];

        if (!target) {
            continue;
        }

        // Dead players can't be hit
        if (target.dead) {
            continue;
        }

        // Spectators can't be hit
        if (target.spectating) {
            continue;
        }

        // ====================================
        // Friendly fire
        // ====================================

        if (
            room.gameMode === "team" &&
            target.team === player.team
        ) {
            continue;
        }

        // ====================================
        // Point-to-line distance
        // ====================================

        const dx =
            endX - startX;

        const dy =
            endY - startY;

        const lengthSquared =
            dx * dx +
            dy * dy;

        let t =
            (
                (
                    target.x - startX
                ) * dx +

                (
                    target.y - startY
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

        const closestX =
            startX +
            t * dx;

        const closestY =
            startY +
            t * dy;

        const distanceX =
            target.x -
            closestX;

        const distanceY =
            target.y -
            closestY;

        const distance =
            Math.sqrt(
                distanceX * distanceX +
                distanceY * distanceY
            );

        // ====================================
        // Beam width
        // ====================================

        if (
            distance >
            PLAYER_RADIUS + 8
        ) {
            continue;
        }

        // ====================================
        // Obstacle blocks beam
        // ====================================

        if (
            beamHitsObstacle(
                room,
                startX,
                startY,
                target.x,
                target.y
            )
        ) {
            continue;
        }

        currentlyHit[targetId] =
            true;

        // ====================================
        // Track continuous beam time
        // ====================================

     player.beamTargets[targetId] = true;

     target.beamSlowed =
         true;

       
        // ====================================
        // Damage
        // ====================================

        target.health -=
            room.gameState === "suddenDeath"
                ? SUDDEN_DEATH_HEALTH
                : gun.damage;

        // ====================================
        // Death
        // ====================================

        if (
            target.health <= 0
        ) {

            target.health =
                0;

            target.dead =
                true;

            target.reloading =
                false;

            target.beamSlowed =
                false;

            recordSurvivalTime(
                target
            );

            target.deaths++;

            player.kills++;

            delete player.beamTargets[
                targetId
            ];

            console.log(
                `${target.username} died to FoFroBeam`
            );

            checkRoundEnd(
                roomCode
            );

        }

    }

    // ====================================
    // Remove targets no longer hit
    // ====================================

    for (const targetId in player.beamTargets) {

    if (currentlyHit[targetId]) {
        continue;
    }

    const target =
        room.players[targetId];

    if (target) {
        target.beamSlowed =
            false;
    }

    delete player.beamTargets[targetId];
}

    // ====================================
    // Consume ammo
    // ====================================

    player.ammo--;

    if (
        player.ammo <= 0
    ) {

        player.ammo =
            0;

        player.beamActive =
            false;

        player.beamTargets =
            {};

        startReload(
            roomCode,
            playerId
        );

    }

    sendGameState(
        roomCode
    );

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


io.on(
    "connection",
    (socket) => {

        console.log(
            `Player connected: ${socket.id}`
        );

        socket.firebaseUid = null;

        socket.on("authenticate", async ({ idToken }, callback) => {

            try {

                if (!idToken) {
                    throw new Error("Missing Firebase ID token.");
                }

                const decodedToken =
                    await adminAuth.verifyIdToken(idToken);

                socket.firebaseUid = decodedToken.uid;

                console.log(
                    `Firebase authenticated: ${socket.id} → ${socket.firebaseUid}`
                );

                if (callback) {
                    callback({
                        success: true
                    });
                }

            } catch (error) {

                console.error(
                    "Firebase authentication failed:",
                    error.message
                );

                socket.firebaseUid = null;

                if (callback) {
                    callback?.({
                        success: false,
                        error: "Authentication failed."
                    });
                }

            }

        });

        socket.on("pingCheck", () => {
            socket.emit("pongCheck");
        });

    socket.on("claimMailboxReward", async ({ messageId }, callback) => {
    try {
        if (!socket.firebaseUid) {
            return callback?.({ success: false, error: "You are not authenticated." });
        }

        if (typeof messageId !== "string" || !messageId.trim()) {
            return callback?.({ success: false, error: "Invalid mailbox message." });
        }

        const cleanMessageId = messageId.trim();
        const playerRef = adminDb.collection("players").doc(socket.firebaseUid);

        let claimedFroKoins = 0;
        let claimedKoKash = 0;
        let claimedWeapons = [];

        await adminDb.runTransaction(async (transaction) => {
            const playerSnapshot = await transaction.get(playerRef);

            if (!playerSnapshot.exists) {
                throw new Error("Player account not found.");
            }

            const playerData = playerSnapshot.data();

            const mailbox = Array.isArray(playerData.mailbox) ? playerData.mailbox : [];
            const message = mailbox.find((item) => item && item.id === cleanMessageId);

            if (!message) {
                throw new Error("Mailbox message not found.");
            }

            if (message.claimed) {
                throw new Error("Reward already claimed.");
            }

            const frokoinsReward = Number(message.frokoins || 0);
            const kokashReward = Number(message.kokash || 0);
            const weaponsReward = Array.isArray(message.weapons) ? message.weapons : [];

            if (
                !Number.isFinite(frokoinsReward) || frokoinsReward < 0 ||
                !Number.isFinite(kokashReward) || kokashReward < 0
            ) {
                throw new Error("Invalid mailbox reward.");
            }

            const currentFroKoins = Number(playerData.frokoins || 0);
            const currentKoKash = Number(playerData.kokash || 0);

            if (!Number.isFinite(currentFroKoins) || !Number.isFinite(currentKoKash)) {
                throw new Error("Invalid account balance.");
            }

            // Merge weapons, avoiding duplicates
            const currentOwnedWeapons = Array.isArray(playerData.ownedWeapons)
                ? playerData.ownedWeapons
                : [];

            const newOwnedWeapons = Array.from(
                new Set([...currentOwnedWeapons, ...weaponsReward])
            );

            const updatedMailbox = mailbox.map((item) => {
                if (!item || item.id !== cleanMessageId) {
                    return item;
                }
                return { ...item, claimed: true };
            });

            transaction.update(playerRef, {
                mailbox: updatedMailbox,
                frokoins: currentFroKoins + frokoinsReward,
                kokash: currentKoKash + kokashReward,
                ownedWeapons: newOwnedWeapons
            });

            claimedFroKoins = frokoinsReward;
            claimedKoKash = kokashReward;
            claimedWeapons = weaponsReward;
        });

        return callback?.({
            success: true,
            frokoins: claimedFroKoins,
            kokash: claimedKoKash,
            weapons: claimedWeapons
        });

    } catch (error) {
        console.error("Mailbox claim error:", error);
        return callback?.({
            success: false,
            error: error.message || "Failed to claim mailbox reward."
        });
    }
});
    
    socket.on("redeemPromoCode", async ({ code }, callback) => {
    try {

        if (!socket.firebaseUid) {
            return callback?.({ success: false, error: "You are not authenticated." });
        }

        const cleanCode = String(code || "").trim().toUpperCase();

        if (!cleanCode) {
            return callback?.({ success: false, error: "Enter a promo code." });
        }

        const playerRef = adminDb.collection("players").doc(socket.firebaseUid);
        const promoRef = adminDb.collection("promoCodes").doc(cleanCode);

        let claimedFroKoins = 0;
        let claimedKoKash = 0;
        let claimedWeapons = [];          // ← was missing

        await adminDb.runTransaction(async (transaction) => {

            const playerSnapshot = await transaction.get(playerRef);
            if (!playerSnapshot.exists) {
                throw new Error("Player data does not exist.");
            }
            const playerData = playerSnapshot.data();

            const promoSnapshot = await transaction.get(promoRef);
            if (!promoSnapshot.exists) {
                throw new Error("Invalid or expired promo code.");
            }
            const promoData = promoSnapshot.data();

            if (promoData.enabled === false) {
                throw new Error("Invalid or expired promo code.");
            }

            if (promoData.expiresAt) {
                const expiration = promoData.expiresAt.toDate
                    ? promoData.expiresAt.toDate()
                    : new Date(promoData.expiresAt);

                if (Number.isNaN(expiration.getTime()) || new Date() > expiration) {
                    throw new Error("This promo code has expired.");
                }
            }

            const redeemedCodes = Array.isArray(playerData.redeemedPromoCodes)
                ? playerData.redeemedPromoCodes
                : [];

            if (redeemedCodes.includes(cleanCode)) {
                throw new Error("You have already redeemed this promo code.");
            }

            const frokoinsReward = Number(promoData.frokoins || 0);
            const kokashReward = Number(promoData.kokash || 0);
            const weaponsReward = Array.isArray(promoData.weapons) ? promoData.weapons : [];

            if (
                !Number.isFinite(frokoinsReward) || frokoinsReward < 0 ||
                !Number.isFinite(kokashReward) || kokashReward < 0
            ) {
                throw new Error("Invalid promo code reward.");
            }

            const currentFroKoins = Number(playerData.frokoins || 0);
            const currentKoKash = Number(playerData.kokash || 0);

            if (!Number.isFinite(currentFroKoins) || !Number.isFinite(currentKoKash)) {
                throw new Error("Invalid account balance.");
            }

            const currentOwnedWeapons = Array.isArray(playerData.ownedWeapons)
                ? playerData.ownedWeapons
                : [];

            const newOwnedWeapons = Array.from(
                new Set([...currentOwnedWeapons, ...weaponsReward])
            );

            transaction.update(playerRef, {
                frokoins: currentFroKoins + frokoinsReward,
                kokash: currentKoKash + kokashReward,
                ownedWeapons: newOwnedWeapons,
                redeemedPromoCodes: [...redeemedCodes, cleanCode]
            });

            claimedFroKoins = frokoinsReward;
            claimedKoKash = kokashReward;
            claimedWeapons = weaponsReward;
        });

        return callback?.({
            success: true,
            frokoins: claimedFroKoins,
            kokash: claimedKoKash,
            weapons: claimedWeapons,
            code: cleanCode
        });

    } catch (error) {
        console.error("Promo code error:", error);
        return callback?.({
            success: false,
            error: error.message || "Failed to redeem promo code."
        });
    }
});
        
        // PURCHASE ITEMS
       socket.on("purchaseItem", async ({ itemId }, callback) => {
    try {
        if (!socket.firebaseUid) {
            return callback?.({ success: false, error: "You are not authenticated." });
        }

        if (typeof itemId !== "string" || !itemId.trim()) {
            return callback?.({ success: false, error: "Invalid item." });
        }

        const cleanItemId = itemId.trim();
        const item = GunData[cleanItemId];

        if (!item) {
            return callback?.({ success: false, error: "Item does not exist." });
        }

        const playerRef = adminDb.collection("players").doc(socket.firebaseUid);

        let newFroKoins = 0;
        let newKoKash = 0;

        await adminDb.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(playerRef);

            if (!snapshot.exists) {
                throw new Error("Player account not found.");
            }

            const playerData = snapshot.data();

            const ownedWeapons = Array.isArray(playerData.ownedWeapons)
                ? playerData.ownedWeapons
                : [];

            if (ownedWeapons.includes(cleanItemId)) {
                throw new Error("Item already owned.");
            }

            const currentFroKoins = Number(playerData.frokoins || 0);
            const currentKoKash = Number(playerData.kokash || 0);

            if (!Number.isFinite(currentFroKoins) || !Number.isFinite(currentKoKash)) {
                throw new Error("Invalid account balance.");
            }

            if (item.priceType === "FroKoins") {

                if (item.price > currentFroKoins) {
                    throw new Error("Not enough FroKoins.");
                }

                newFroKoins = currentFroKoins - item.price;
                newKoKash = currentKoKash;

                transaction.update(playerRef, {
                    ownedWeapons: FieldValue.arrayUnion(cleanItemId),
                    frokoins: newFroKoins
                });

            } else if (item.priceType === "KoKash") {

                if (item.price > currentKoKash) {
                    throw new Error("Not enough KoKash.");
                }

                newKoKash = currentKoKash - item.price;
                newFroKoins = currentFroKoins;

                transaction.update(playerRef, {
                    ownedWeapons: FieldValue.arrayUnion(cleanItemId),
                    kokash: newKoKash
                });

            } else {
                throw new Error("Item has an invalid price type.");
            }
        });

        return callback?.({
            success: true,
            frokoins: newFroKoins,
            kokash: newKoKash
        });

    } catch (error) {
        console.error("Purchase request error:", error);
        return callback?.({
            success: false,
            error: error.message || "Purchase request failed."
        });
    }
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

} else if (gunCode === "FFB") {

    player.gun = "FoFroBeam";

} else {

        return;

    }

    

   const gun = getPlayerGun(player);

player.ammo = gun.ammo;
player.reloading = false;
player.beamActive = false;
player.beamTargets = {};

sendGameState(roomCode);

});

        /*
 * =========================
 * WEAPON SELECTION
 * =========================
 */

socket.on("selectWeapon", (gunName) => {

    const roomCode =
        socket.roomCode;

    const room =
        rooms[roomCode];

    if (!room) return;

    const player =
        room.players[socket.id];

    if (!player) return;


    /*
     * Only allow weapon changes
     * while in the lobby.
     */

    if (
        room.gameState !== "lobby"
    ) {
        return;
    }


    /*
     * Make sure the weapon exists.
     */

    if (
        typeof gunName !== "string" ||
        !GunData[gunName]
    ) {
        return;
    }


    /*
     * Equip weapon.
     */

    player.gun =
        gunName;


    /*
     * Reset weapon state.
     */

    const gun =
        getPlayerGun(player);

    player.ammo =
        gun.ammo;

    player.reloading =
        false;

    player.nextShotAt = 0;

    player.beamActive =
        false;

    player.beamTargets =
        {};


    /*
     * Send updated player state.
     */

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

              const movementSpeed =
    player.beamSlowed
        ? 6
        : 8;

const movementMultiplier =
    movementSpeed / 8;

const moveX =
    Math.max(
        -20,
        Math.min(
            20,
            data.x * movementMultiplier
        )
    );

const moveY =
    Math.max(
        -20,
        Math.min(
            20,
            data.y * movementMultiplier
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

 // ====================================
// FOFROBEAM
// ====================================

if (player.gun === "FoFroBeam") {

    if (player.ammo <= 0) {

        startReload(
            roomCode,
            socket.id
        );

        return;

    }

   player.beamActive = true;

if (!player.beamTargets) {
    player.beamTargets = {};
}

return;
}

                if (player.ammo <= 0) return;

                const gun =
                    getPlayerGun(player);

                 const now = Date.now();

                if (now < player.nextShotAt) {
                    return;
                }

               player.nextShotAt =
    now + gun.fireRate;

player.ammo--;

const angle =
    player.angle || 0;

const startDistance =
    25;

// ========================================
// VORTEX CANNON
// ========================================

if (player.gun === "VortexCannon") {

    const vortexId =
        String(
            room.nextVortexId++
        );

    room.vortices[
        vortexId
    ] = {

        id:
            vortexId,

        x:
            player.x +
            Math.cos(angle) *
            startDistance,

        y:
            player.y +
            Math.sin(angle) *
            startDistance,

        angle:
            angle,

        rotation:
            0,

        owner:
            socket.id,

        createdAt:
            now,

        lastDamageAt:
            now,

        speed:
            gun.bulletSpeed || 4,

        radius:
            gun.vortexRadius || 100,

        pullRadius:
            gun.vortexPullRadius || 75,

        duration:
            gun.vortexDuration || 2000,

        damage:
            gun.vortexDamage || 5,

        damageInterval:
            gun.vortexDamageInterval || 100,

        explosionRadius:
            gun.explosionRadius || 140,

        explosionDamage:
            gun.explosionDamage || 20,

        explosionForce:
            gun.explosionForce || 12

    };

    if (player.ammo === 0) {

        startReload(
            roomCode,
            socket.id
        );

    }

    sendGameState(roomCode);

    return;
}

// ========================================
// NORMAL BULLET
// ========================================

const bulletId =
    String(
        room.nextBulletId++
    );

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

    gun:
        player.gun,

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

        // ========================================
// STOP SHOOTING
// ========================================

socket.on(
    "stopShooting",
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
            player.gun !==
            "FoFroBeam"
        ) {
            return;
        }

        stopBeam(
            roomCode,
            socket.id
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
// FOFROBEAM LOOP
// ========================================

setInterval(
    () => {

        const now = Date.now();

        for (const roomCode in rooms) {

            const room =
                rooms[roomCode];

            if (
                room.gameState !== "playing" &&
                room.gameState !== "suddenDeath"
            ) {
                continue;
            }

            // ====================================
            // Process active FoFroBeams
            // ====================================

            for (const playerId in room.players) {

                const player =
                    room.players[playerId];

                if (!player) continue;

                if (
                    player.beamActive &&
                    player.gun === "FoFroBeam"
                ) {

                    processFoFroBeam(
                        roomCode,
                        playerId
                    );

                }

            }

        }

    },
    100
);
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
// Map edge collision
// ====================================

let hitWall = false;
let wallHorizontal = false;
let wallVertical = false;

if (bullet.x <= BULLET_RADIUS) {
    bullet.x = BULLET_RADIUS;
    wallVertical = true;
    hitWall = true;
} else if (bullet.x >= 600 - BULLET_RADIUS) {
    bullet.x = 600 - BULLET_RADIUS;
    wallVertical = true;
    hitWall = true;
}

if (bullet.y <= BULLET_RADIUS) {
    bullet.y = BULLET_RADIUS;
    wallHorizontal = true;
    hitWall = true;
} else if (bullet.y >= 400 - BULLET_RADIUS) {
    bullet.y = 400 - BULLET_RADIUS;
    wallHorizontal = true;
    hitWall = true;
}

if (hitWall) {

    // No bounces remaining
    if (bullet.maxBounces <= bullet.bounces) {
        delete room.bullets[bulletId];
        continue;
    }

    // Reflect off the wall
    if (wallVertical) {
        bullet.angle = Math.PI - bullet.angle;
    }

    if (wallHorizontal) {
        bullet.angle = -bullet.angle;
    }

    bullet.bounces++;

    bullet.damage = Math.max(
        0,
        bullet.damage -
        bullet.bounceDamageReduction
    );
}
// obstacle collision
let hitObstacle = false;
for (const obstacle of room.obstacles) {

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
// VORTEX LOOP
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

            // ====================================
            // Vortices only exist during combat
            // ====================================

            if (
                room.gameState !== "playing" &&
                room.gameState !== "suddenDeath"
            ) {

                room.vortices =
                    {};

                continue;

            }

            let changed =
                false;

            // ====================================
            // Process every vortex
            // ====================================

            for (
                const vortexId in room.vortices
            ) {

                const vortex =
                    room.vortices[vortexId];

                if (!vortex) {
                    continue;
                }

                changed = true;

                // ====================================
                // Move vortex
                // ====================================

                vortex.x +=
                    Math.cos(vortex.angle) *
                    vortex.speed;

                vortex.y +=
                    Math.sin(vortex.angle) *
                    vortex.speed;

                // ====================================
                // Slowly rotate
                // ====================================

                vortex.rotation +=
                    0.035;

                // ====================================
                // Keep vortex inside map
                // ====================================

                if (vortex.x < 0) {

                    vortex.x = 0;
                    vortex.angle =
                        Math.PI - vortex.angle;

                } else if (vortex.x > 600) {

                    vortex.x = 600;
                    vortex.angle =
                        Math.PI - vortex.angle;

                }

                if (vortex.y < 0) {

                    vortex.y = 0;
                    vortex.angle =
                        -vortex.angle;

                } else if (vortex.y > 400) {

                    vortex.y = 400;
                    vortex.angle =
                        -vortex.angle;

                }

                // ====================================
                // PULL PLAYERS
                // ====================================
                for (
                    const playerId in room.players
                ) {

                    const player =
                        room.players[playerId];

                    if (!player) continue;

                    if (player.dead) continue;

                    if (player.spectating) continue;

                    const dx =
                        vortex.x -
                        player.x;

                    const dy =
                        vortex.y -
                        player.y;

                    const distance =
                        Math.sqrt(
                            dx * dx +
                            dy * dy
                        );

                    if (
                        distance >
                        vortex.pullRadius
                    ) {
                        continue;
                    }

                    if (distance < 0.1) {
                        continue;
                    }

                    // Stronger pull closer to center
                    const strength =
                        6.0 +
                        (
                            1 -
                            distance /
                            vortex.pullRadius
                        ) *
                        10.0;

                    player.x +=
                        (
                            dx /
                            distance
                        ) *
                        strength;

                    player.y +=
                        (
                            dy /
                            distance
                        ) *
                        strength;

                    // Keep player inside map
                    player.x =
                        Math.max(
                            PLAYER_RADIUS,
                            Math.min(
                                600 - PLAYER_RADIUS,
                                player.x
                            )
                        );

                    player.y =
                        Math.max(
                            PLAYER_RADIUS,
                            Math.min(
                                400 - PLAYER_RADIUS,
                                player.y
                            )
                        );

                }

                // ====================================
                // PULL BULLETS
                // ====================================

                for (
                    const bulletId in room.bullets
                ) {

                    const bullet =
                        room.bullets[bulletId];

                    if (!bullet) continue;

                    const dx =
                        vortex.x -
                        bullet.x;

                    const dy =
                        vortex.y -
                        bullet.y;

                    const distance =
                        Math.sqrt(
                            dx * dx +
                            dy * dy
                        );

                    if (
                        distance >
                        vortex.pullRadius
                    ) {
                        continue;
                    }

                    if (distance < 0.1) {
                        continue;
                    }

                    const strength =
                        8.0 +
                        (
                            1 -
                            distance /
                            vortex.pullRadius
                        ) *
                        15.0;

                    bullet.x +=
                        (
                            dx /
                            distance
                        ) *
                        strength;

                    bullet.y +=
                        (
                            dy /
                            distance
                        ) *
                        strength;

                }

                // ====================================
                // VORTEX DAMAGE
                // 5 damage every 100ms
                // ====================================

                if (
                    now -
                    vortex.lastDamageAt >=
                    vortex.damageInterval
                ) {

                    vortex.lastDamageAt =
                        now;

                    for (
                        const playerId in room.players
                    ) {

                        const player =
                            room.players[playerId];

                        if (!player) continue;

                        if (player.dead) continue;

                        if (player.spectating) continue;

                        const dx =
                            vortex.x -
                            player.x;

                        const dy =
                            vortex.y -
                            player.y;

                        const distance =
                            Math.sqrt(
                                dx * dx +
                                dy * dy
                            );

                        if (
                            distance >
                            vortex.radius
                        ) {
                            continue;
                        }

                        player.health -=
                            room.gameState === "suddenDeath"
                                ? SUDDEN_DEATH_HEALTH
                                : vortex.damage;

                        if (
                            player.health <= 0
                        ) {

                            player.health =
                                0;

                            player.dead =
                                true;

                            player.reloading =
                                false;

                            recordSurvivalTime(
                                player
                            );

                            player.deaths++;

                            const owner =
                                room.players[
                                    vortex.owner
                                ];

                            if (
                                owner &&
                                owner !== player
                            ) {

                                owner.kills++;

                            }

                            console.log(
                                `${player.username} died to Vortex Cannon`
                            );

                            checkRoundEnd(
                                roomCode
                            );

                        }

                    }

                }

                // ====================================
                // EXPLOSION AFTER 2 SECONDS
                // ====================================

                if (
                    now -
                    vortex.createdAt >=
                    vortex.duration
                ) {

                    // ====================================
                    // Damage + knockback players
                    // ====================================

                    for (
                        const playerId in room.players
                    ) {

                        const player =
                            room.players[playerId];

                        if (!player) continue;

                        if (player.dead) continue;

                        if (player.spectating) continue;

                        const dx =
                            player.x -
                            vortex.x;

                        const dy =
                            player.y -
                            vortex.y;

                        const distance =
                            Math.sqrt(
                                dx * dx +
                                dy * dy
                            );

                        if (
                            distance >
                            vortex.explosionRadius
                        ) {
                            continue;
                        }

                        // ====================================
                        // Explosion damage
                        // ====================================

                        player.health -=
                            room.gameState === "suddenDeath"
                                ? SUDDEN_DEATH_HEALTH
                                : vortex.explosionDamage;

                        // ====================================
                        // Random knockback direction
                        // ====================================

                        const randomAngle =
                            Math.random() *
                            Math.PI *
                            2;

                        player.x +=
                            Math.cos(randomAngle) *
                            vortex.explosionForce;

                        player.y +=
                            Math.sin(randomAngle) *
                            vortex.explosionForce;

                        player.x =
                            Math.max(
                                PLAYER_RADIUS,
                                Math.min(
                                    600 - PLAYER_RADIUS,
                                    player.x
                                )
                            );

                        player.y =
                            Math.max(
                                PLAYER_RADIUS,
                                Math.min(
                                    400 - PLAYER_RADIUS,
                                    player.y
                                )
                            );

                        // ====================================
                        // Death
                        // ====================================

                        if (
                            player.health <= 0
                        ) {

                            player.health =
                                0;

                            player.dead =
                                true;

                            player.reloading =
                                false;

                            recordSurvivalTime(
                                player
                            );

                            player.deaths++;

                            const owner =
                                room.players[
                                    vortex.owner
                                ];

                            if (
                                owner &&
                                owner !== player
                            ) {

                                owner.kills++;

                            }

                            console.log(
                                `${player.username} died in Vortex explosion`
                            );

                        }

                    }

                    // ====================================
                    // Launch all nearby bullets randomly
                    // ====================================

                    for (
                        const bulletId in room.bullets
                    ) {

                        const bullet =
                            room.bullets[bulletId];

                        if (!bullet) continue;

                        const dx =
                            bullet.x -
                            vortex.x;

                        const dy =
                            bullet.y -
                            vortex.y;

                        const distance =
                            Math.sqrt(
                                dx * dx +
                                dy * dy
                            );

                        if (
                            distance >
                            vortex.explosionRadius
                        ) {
                            continue;
                        }

                        // Random direction
                        bullet.angle =
                            Math.random() *
                            Math.PI *
                            2;

                        // Make them fly outward quickly
                        bullet.speed =
                            Math.max(
                                bullet.speed,
                                12
                            );

                        // Prevent the vortex movement from
                        // creating a giant collision segment.
                        bullet.previousX =
                            bullet.x;

                        bullet.previousY =
                            bullet.y;

                        // Give launched bullets a fresh lifetime
                        bullet.createdAt =
                            now;

                    }

                    console.log(
                        `Vortex ${vortexId} exploded in room ${roomCode}`
                    );

                    delete room.vortices[
                        vortexId
                    ];

                    checkRoundEnd(
                        roomCode
                    );

                }

            }

            // ====================================
            // Broadcast vortex movement
            // ====================================

            if (changed) {

                io.to(roomCode).emit(
                    "updateVortices",
                    room.vortices
                );

            }

        }

    },
    1000 / 30
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
