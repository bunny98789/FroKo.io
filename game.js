/*
 * =========================
 * ELEMENTS
 * =========================
 */
// ================================
// ACCOUNT UI
// ================================

window.addEventListener("frokoFirebaseReady", () => {

    const accountScreen =
        document.getElementById("accountScreen");

    const gameApp =
        document.getElementById("gameApp");

    const loginForm =
        document.getElementById("loginForm");

    const signupForm =
        document.getElementById("signupForm");

    const accountTitle =
        document.getElementById("accountTitle");

    const accountStatus =
        document.getElementById("accountStatus");

    const loginEmail =
        document.getElementById("loginEmail");

    const loginPassword =
        document.getElementById("loginPassword");

    const signupUsername =
        document.getElementById("signupUsername");

    const signupEmail =
        document.getElementById("signupEmail");

    const signupPassword =
        document.getElementById("signupPassword");

    const signupPasswordConfirm =
        document.getElementById("signupPasswordConfirm");

    const forgotPasswordButton =
    document.getElementById("forgotPasswordButton");

const passwordResetStatus =
    document.getElementById("passwordResetStatus");


    // Start with the game hidden.
    // Firebase will decide whether the user can enter.
    gameApp.style.display = "none";


    // ================================
    // LOGIN / SIGNUP SWITCHING
    // ================================

    document
        .getElementById("showSignupButton")
        .addEventListener("click", () => {

            loginForm.style.display = "none";
            signupForm.style.display = "flex";

            accountTitle.innerText =
                "CREATE ACCOUNT";

            accountStatus.innerText = "";

        });


    document
        .getElementById("showLoginButton")
        .addEventListener("click", () => {

            signupForm.style.display = "none";
            loginForm.style.display = "flex";

            accountTitle.innerText =
                "LOGIN";

            accountStatus.innerText = "";

        });


    // ================================
    // LOGIN
    // ================================

    document
        .getElementById("loginButton")
        .addEventListener("click", async () => {

            const email =
                loginEmail.value.trim();

            const password =
                loginPassword.value;


            if (!email || !password) {

                accountStatus.innerText =
                    "Please enter your email and password.";

                return;

            }


            accountStatus.innerText =
                "Logging in...";


            try {

                 await FroKoAccount.login(
                    email,
                    password
                );

                const accountData =
                await FroKoAccount.getData();

                if (!accountData.banned) {
               

                accountStatus.innerText =
                    "Login successful!";

                } else {
                     accountStatus.innerHTML =
                    `<strong>🚫 ACCOUNT BANNED!</strong><br>
                    You have been administratively discharged from the war.`;
                }

            } catch (error) {

                console.error(error);

                accountStatus.innerText =
                    getFirebaseErrorMessage(error);

            }

        });

    forgotPasswordButton.addEventListener(
    "click",
    async () => {

        const email =
            loginEmail.value.trim();

        if (!email) {
            passwordResetStatus.innerText =
                "Enter your email address first.";
            return;
        }

        forgotPasswordButton.disabled = true;

        passwordResetStatus.innerText =
            "Sending password reset email...";

        try {

            await FroKoAccount.resetPassword(
                email
            );

            passwordResetStatus.innerText =
                "Password reset email sent! Check your inbox.";

        } catch (error) {

            console.error(
                "Password reset failed:",
                error
            );

            passwordResetStatus.innerText =
                getFirebaseErrorMessage(error);

        } finally {

            forgotPasswordButton.disabled = false;

        }
    }
);


    // ================================
    // SIGN UP
    // ================================

    document
        .getElementById("signupButton")
        .addEventListener("click", async () => {

            const username =
                signupUsername.value.trim();

            const email =
                signupEmail.value.trim();

            const password =
                signupPassword.value;

            const passwordConfirm =
                signupPasswordConfirm.value;


            if (
                !username ||
                !email ||
                !password ||
                !passwordConfirm
            ) {

                accountStatus.innerText =
                    "Please fill out every field.";

                return;

            }


            if (password !== passwordConfirm) {

                accountStatus.innerText =
                    "Passwords do not match.";

                return;

            }


            if (username.length > 16) {

                accountStatus.innerText =
                    "Username must be 16 characters or less.";

                return;

            }


            accountStatus.innerText =
                "Creating account...";


            try {

                await FroKoAccount.signUp(
                    email,
                    password,
                    username
                );

                accountStatus.innerText =
                    "Account created!";

                accountStatus.innerText = "Account created!";

                setTimeout(() => {
                    accountScreen.style.display = "none";
                    gameApp.style.display = "block";
                }, 2000);

            } catch (error) {

                console.error(error);

                accountStatus.innerText =
                    getFirebaseErrorMessage(error);

            }

        });


    // ================================
    // FIREBASE AUTH STATE
    // ================================

FroKoAccount.onAuthStateChanged(async (user) => {

    if (user) {

        console.log(
            "Logged in:",
            user.uid
        );

        try {

            // =========================
            // LOAD ACCOUNT DATA
            // =========================

            const accountData =
                await FroKoAccount.getData();

            window.frokoAccountData =
                accountData;


            // =========================
            // CHECK IF BANNED
            // =========================

            if (accountData.banned === true) {

                accountStatus.innerHTML =
                    `<strong>🚫 ACCOUNT BANNED!</strong><br>
                    You have been administratively discharged from the war.`;

                await FroKoAccount.logout();

                return;
            }


            console.log(
                "Loaded FroKo account:",
                accountData
            );


            // =========================
            // AUTHENTICATE WITH GAME SERVER
            // =========================

            if (socket && socket.connected) {

                try {

                    const idToken =
                        await FroKoAccount.getIdToken();

                    socket.emit(
                        "authenticate",
                        {
                            idToken: idToken
                        },
                        (response) => {

                            if (response?.success) {

                                console.log(
                                    "Server authentication successful!"
                                );

                            } else {

                                console.error(
                                    "Server authentication failed:",
                                    response?.error
                                );

                            }

                        }
                    );

                } catch (error) {

                    console.error(
                        "Could not authenticate with server:",
                        error
                    );

                }

            } else {

                console.log(
                    "Game server is not connected yet."
                );

            }


            // =========================
            // START LISTENING FOR DATA CHANGES
            // =========================

            FroKoAccount.onDataChanged((accountData) => {

                window.frokoAccountData =
                    accountData;

                document.getElementById(
                    "frokoinsAmount"
                ).innerText =
                    accountData.frokoins ?? 0;

                document.getElementById(
                    "kokashAmount"
                ).innerText =
                    accountData.kokash ?? 0;

                createWeaponCards();

            });


            // =========================
            // UPDATE UI IMMEDIATELY
            // =========================

            document.getElementById(
                "frokoinsAmount"
            ).innerText =
                accountData.frokoins ?? 0;

            document.getElementById(
                "kokashAmount"
            ).innerText =
                accountData.kokash ?? 0;


            // =========================
            // SUCCESS MESSAGE
            // =========================

            accountStatus.innerText =
                "Login successful!";


            // =========================
            // SHOW GAME AFTER 2 SECONDS
            // =========================

            setTimeout(() => {

                accountScreen.style.display =
                    "none";

                gameApp.style.display =
                    "block";

            }, 2000);

        } catch (error) {

            console.error(
                "Failed to load account data:",
                error
            );

            accountStatus.innerText =
                "Logged in, but failed to load account data.";

        }

    } else {

        console.log(
            "Not logged in."
        );

        accountScreen.style.display =
            "flex";

        gameApp.style.display =
            "none";

    }

});
    // ================================
    // FIREBASE ERROR MESSAGES
    // ================================

    function getFirebaseErrorMessage(error) {

        switch (error.code) {

            case "auth/invalid-email":
                return "That email address is invalid.";

            case "auth/user-not-found":
                return "No account exists with that email.";

            case "auth/wrong-password":
                return "Incorrect password.";

            case "auth/invalid-credential":
                return "Incorrect email or password.";

            case "auth/email-already-in-use":
                return "An account already uses that email.";

            case "auth/weak-password":
                return "Password must be at least 6 characters.";

            default:
                return (
                    error.message ||
                    "Something went wrong."
                );

        }

    }

});

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

const mainGameLayout =
    document.getElementById("main-game-layout");

const gameRoomCode =
    document.getElementById("gameRoomCode");

const panelRoomCode =
    document.getElementById("panelRoomCode");

const copyBttn =
    document.getElementById("copyBttn");

const gameModeControls =
    document.getElementById("gameModeControls");

const ffaModeButton =
    document.getElementById("ffaModeButton");

const teamModeButton =
    document.getElementById("teamModeButton");

const teamDisplay =
    document.getElementById("teamDisplay");

const switchTeamButton =
    document.getElementById("switchTeamButton");


/*
 * =========================
 * PAUSE MENU
 * =========================
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

const weaponSelectionButton =
    document.getElementById("weaponSelectionButton");

const weaponSelectionMenu =
    document.getElementById("weaponSelectionMenu");

const closeWeaponSelectionButton =
    document.getElementById("closeWeaponSelectionButton");

/*
 * =========================
 * MAILBOX / PROMO CODE
 * =========================
 */

const mailboxButton =
    document.getElementById("mailboxButton");

const mailboxMenu =
    document.getElementById("mailboxMenu");

const mailboxList =
    document.getElementById("mailboxList");

const closeMailboxButton =
    document.getElementById("closeMailboxButton");

const promoCodeButton =
    document.getElementById("promoCodeButton");

const promoCodeMenu =
    document.getElementById("promoCodeMenu");

const promoCodeInput =
    document.getElementById("promoCodeInput");

const redeemPromoCodeButton =
    document.getElementById("redeemPromoCodeButton");

const promoCodeStatus =
    document.getElementById("promoCodeStatus");

const closePromoCodeButton =
    document.getElementById("closePromoCodeButton");


/*
 * =========================
 * GAME END
 * =========================
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
let currentGameMode = "ffa";

let currentRound = 1;
let totalRounds = 5;

let mouseX =
    canvas.width / 2;

let mouseY =
    canvas.height / 2;

let myAngle = 0;

const speed = 8;


/*
 * =========================
 * INPUT VARIABLES
 * =========================
 */

const keys = {};

let shooting = false;
let shotLocked = false;

/*
 * =========================
 * WEAPON SELECTION
 * =========================
 */

const weaponList =
    document.getElementById("weaponList");


function createWeaponCards() {

    if (!weaponList) {
        return;
    }

    weaponList.innerHTML = "";

    const accountData = window.frokoAccountData;

    for (const gunName in GunData) {

        const gun = GunData[gunName];

        /*
         * CREATE CARD
         */

        const card =
            document.createElement("div");

        card.className =
            "weaponCard";


        /*
         * WEAPON NAME
         */

        const title =
            document.createElement("h3");

        title.innerText =
            gunName;


        /*
         * WEAPON IMAGE
         */

        const image =
            document.createElement("img");

        image.src =
            gun.shopImg;

        image.alt =
            gunName;


        /*
         * DESCRIPTION
         */

        const description =
            document.createElement("div");

        description.className =
            "weaponDescription";

        description.innerText =
            gun.description ||
            "No description available.";


        /*
         * STATS
         */

        const stats =
            document.createElement("div");

        stats.className =
            "weaponStats";

        stats.innerHTML = `
            manufacturer: ${gun.maker}<br>
            Damage: ${gun.damage}<br>
            Ammo: ${gun.ammo}<br>
            Reload: ${gun.reloadTime / 1000}s<br>
            Fire Rate: ${gun.fireRate ?? "N/A"}ms<br>
            Bullet Speed: ${gun.bulletSpeed ?? "N/A"}
        `;


        /*
         * OWNERSHIP
         */

        const ownedWeapons =
            accountData?.ownedWeapons || [];

        const isOwned =
            ownedWeapons.includes(gunName);

        const isEquipped =
            players[myPlayerId]?.gun === gunName;


        /*
         * BUTTON
         */

        const selectButton =
            document.createElement("button");

        selectButton.className =
            "weaponSelectButton";


        /*
         * FREE WEAPON
         */

        if (gun.price === 0 && !isOwned) {

            selectButton.innerText =
                "BUY — FREE";

        }


        /*
         * NOT OWNED
         */

        else if (!isOwned) {

            const currency =
                gun.priceType === "FroKoins"
                    ? "FK"
                    : "KK";

            selectButton.innerText =
                `BUY — ${gun.price.toLocaleString()} ${currency}`;

        }


        /*
         * EQUIPPED
         */

        else if (isEquipped) {

            selectButton.innerText =
                "SELECTED";

            selectButton.classList.add(
                "selected"
            );

        }


        /*
         * OWNED BUT NOT EQUIPPED
         */

        else {

            selectButton.innerText =
                "SELECT";

        }


        /*
         * BUTTON CLICK
         */

        selectButton.addEventListener(
            "click",
            async () => {

                /*
                 * NOT CONNECTED
                 */

                if (
                    !socket ||
                    !socket.connected
                ) {
                    return;
                }


                /*
                 * NO PLAYER
                 */

                if (
                    !myPlayerId ||
                    !players[myPlayerId]
                ) {
                    return;
                }


                /*
                 * ONLY IN LOBBY
                 */

                if (
                    currentGameState !== "lobby"
                ) {
                    return;
                }


                /*
                 * BUY
                 */

           if (!isOwned) {
    if (!socket || !socket.connected) {
        return;
    }

    socket.emit(
        "purchaseItem",
        {
            itemId: gunName
        },
        (response) => {
            if (!response?.success) {
                alert(
                    response?.error ||
                    "Purchase failed."
                );
                return;
            }

            console.log(
                "Purchase request successful."
            );

            createWeaponCards();
        }
    );

    return;
}                /*
                 * SELECT
                 */

                socket.emit(
                    "selectWeapon",
                    gunName
                );

            }
        );


        /*
         * BUILD CARD
         */

        card.appendChild(title);

        card.appendChild(image);

        card.appendChild(description);

        card.appendChild(stats);

        card.appendChild(selectButton);


        /*
         * ADD CARD
         */

        weaponList.appendChild(card);

    }

}


/*
 * CREATE CARDS
 */

createWeaponCards();


/*
 * =========================
 * WEAPON SELECTION
 * =========================
 */

weaponSelectionButton.addEventListener(
    "click",
    () => {

        if (
            !myPlayerId ||
            !players[myPlayerId]
        ) {
            return;
        }

        if (
            currentGameState !== "lobby"
        ) {
            return;
        }

        weaponSelectionMenu.style.display =
            "flex";

    }
);


closeWeaponSelectionButton.addEventListener(
    "click",
    () => {

        weaponSelectionMenu.style.display =
            "none";

    }
);

// ==============================
// REWARD POPUP
// ==============================

function showRewardPopup(frokoins = 0, kokash = 0, weapons=[]) {
    const popup = document.getElementById("rewardPopup");
    const rewards = document.getElementById("rewardPopupRewards");

    rewards.innerHTML = "";

    if (frokoins > 0) {
        rewards.innerHTML += `
            <div class="rewardCurrency">
                <img src="Assets/frokoins.png" alt="frokoins">
                <span>+${frokoins.toLocaleString()}</span>
            </div>
        `;
    }

    if (kokash > 0) {
        rewards.innerHTML += `
            <div class="rewardCurrency">
                <img src="Assets/kokash.png" alt="Kokash">
                <span>+${kokash.toLocaleString()}</span>
            </div>
        `;
    }

   if (weapons.length > 0) {
    weapons.forEach(weapon => {
        const weaponImage = GunData[weapon]?.shopImg;

        rewards.innerHTML += `
            <div class="rewardWeapon">
                <span>+</span>
                <img src="${weaponImage}" alt="${weapon}">
            </div>
        `;
    });
}

    if (frokoins <= 0 && kokash <= 0 && weapons.length === 0) {
        return;
    }

    popup.style.display = "flex";

    setTimeout(() => {
        popup.style.display = "none";
    }, 2500);
}

/*
 * =========================
 * MAILBOX
 * =========================
 */

mailboxButton.addEventListener(
    "click",
    async () => {

        if (!FroKoAccount.getUser()) {
            return;
        }

        try {

            await updateMailboxUI();

            mailboxMenu.style.display =
                "flex";

        } catch (error) {

            console.error(
                "Failed to open mailbox:",
                error
            );

            alert(
                error.message ||
                "Failed to load mailbox."
            );

        }

    }
);


closeMailboxButton.addEventListener(
    "click",
    () => {

        mailboxMenu.style.display =
            "none";

    }
);


async function updateMailboxUI() {

    const messages =
        await FroKoAccount.getMailbox();

    mailboxList.innerHTML = "";

    if (
        !messages ||
        messages.length === 0
    ) {

        mailboxList.innerHTML = `
            <p class="emptyMailbox">
                Your mailbox is empty.
            </p>
        `;

        return;

    }


    messages.forEach(
        (message) => {

            const item =
                document.createElement("div");

            item.className =
                "mailboxItem";


            const title =
                document.createElement("h3");

            title.innerText =
                message.title ||
                "Message";


            const text =
                document.createElement("p");

            text.innerText =
                message.message ||
                "";


            const reward =
                document.createElement("div");

            reward.className =
                "mailboxReward";


            const rewards = [];

if (message.frokoins) {

    rewards.push(
        `${message.frokoins.toLocaleString()} FroKoins`
    );

}

if (message.kokash) {

    rewards.push(
        `${message.kokash.toLocaleString()} KoKash`
    );

}

if (
    Array.isArray(message.weapons) &&
    message.weapons.length > 0
) {

    rewards.push(
        `🔫 ${message.weapons.join(", ")}`
    );

}

            reward.innerText =
                rewards.length > 0
                    ? `🎁 Reward: ${rewards.join(" + ")}`
                    : "No reward";


            const claimButton =
                document.createElement("button");

            claimButton.className =
                "mailboxClaimButton";


            if (message.claimed) {

                claimButton.innerText =
                    "CLAIMED";

                claimButton.classList.add(
                    "claimed"
                );

                claimButton.disabled =
                    true;

            } else {

                claimButton.innerText =
                    "CLAIM REWARD";


               claimButton.addEventListener(
    "click",
    () => {

        claimButton.disabled =
            true;

        claimButton.innerText =
            "CLAIMING...";

        if (
            !socket ||
            !socket.connected
        ) {

            alert(
                "Not connected to the server."
            );

            claimButton.disabled =
                false;

            claimButton.innerText =
                "CLAIM REWARD";

            return;

        }

        socket.emit(
            "claimMailboxReward",
            {
                messageId:
                    message.id
            },
            async (response) => {

                if (
                    !response?.success
                ) {

                    console.error(
                        "Mailbox claim failed:",
                        response?.error
                    );

                    alert(
                        response?.error ||
                        "Failed to claim reward."
                    );

                    claimButton.disabled =
                        false;

                    claimButton.innerText =
                        "CLAIM REWARD";

                    return;

                }

                showRewardPopup(
                    response.frokoins || 0,
                    response.kokash || 0,
                    response.weapons || []
                );

                await updateMailboxUI();

            }
        );

    }
);

            }


            item.appendChild(title);
            item.appendChild(text);
            item.appendChild(reward);
            item.appendChild(claimButton);

            mailboxList.appendChild(item);

        }
    );

}

/*
 * =========================
 * PROMO CODES
 * =========================
 */

promoCodeButton.addEventListener(
    "click",
    () => {

        if (!FroKoAccount.getUser()) {
            return;
        }

        promoCodeInput.value = "";
        promoCodeStatus.innerText = "";

        promoCodeMenu.style.display =
            "flex";

        promoCodeInput.focus();

    }
);


closePromoCodeButton.addEventListener(
    "click",
    () => {

        promoCodeMenu.style.display =
            "none";

    }
);


redeemPromoCodeButton.addEventListener(
    "click",
    async () => {

        const code =
            promoCodeInput.value.trim();

        if (!code) {

            promoCodeStatus.innerText =
                "Enter a promo code.";

            return;

        }


        promoCodeStatus.innerText =
            "Redeeming...";

        redeemPromoCodeButton.disabled =
            true;


        try {

            if (!socket || !socket.connected) {
                throw new Error("Not connected to the server.");
            }
            
          const reward = await new Promise((resolve, reject) => {
    socket.emit(
        "redeemPromoCode",
        { code },
        (response) => {
            if (!response?.success) {
                reject(
                    new Error(
                        response?.error ||
                        "Failed to redeem promo code."
                    )
                );
                return;
            }

            resolve(response);
        }
    );
});

            showRewardPopup(
                reward.frokoins,
                reward.kokash,
                reward.weapons
            );

            promoCodeStatus.innerText = "Promo code redeemed! 🎉";
            promoCodeInput.value = "";

        } catch (error) {

            console.error(
                "Promo code failed:",
                error
            );

            promoCodeStatus.innerText =
                error.message ||
                "Invalid promo code.";

        }


        redeemPromoCodeButton.disabled =
            false;

    }
);


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
 * ROOM UI
 * =========================
 */

function showRoomLobby() {

    roomMenu.style.display =
        "block";

    mainGameLayout.style.display =
        "none";

}


function showGameArea() {

    roomMenu.style.display =
        "none";

    mainGameLayout.style.display =
        "block";

}

showRoomLobby();


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
 * GAME MODE CONTROLS
 * =========================
 */

ffaModeButton.addEventListener(
    "click",
    () => {

        if (
            !socket ||
            !socket.connected
        ) {
            return;
        }

        if (
            currentHost !==
            myPlayerId
        ) {
            return;
        }

        if (
            currentGameState !==
            "lobby"
        ) {
            return;
        }

        socket.emit(
            "setGameMode",
            "ffa"
        );

    }
);


teamModeButton.addEventListener(
    "click",
    () => {

        if (
            !socket ||
            !socket.connected
        ) {
            return;
        }

        if (
            currentHost !==
            myPlayerId
        ) {
            return;
        }

        if (
            currentGameState !==
            "lobby"
        ) {
            return;
        }

        socket.emit(
            "setGameMode",
            "team"
        );

    }
);


switchTeamButton.addEventListener(
    "click",
    () => {

        if (
            !socket ||
            !socket.connected
        ) {
            return;
        }

        if (
            currentGameMode !==
            "team"
        ) {
            return;
        }

        if (
            currentGameState !==
            "lobby"
        ) {
            return;
        }

        socket.emit(
            "switchTeam"
        );

    }
);


/*
 * =========================
 * UPDATE GAME MODE UI
 * =========================
 */

function updateGameModeUI() {

    if (
        !gameModeControls
    ) {
        return;
    }


    /*
     * Hide everything outside
     * the lobby.
     */

    if (
        currentGameState !==
        "lobby"
    ) {

        gameModeControls.style.display =
            "none";

        return;

    }


    gameModeControls.style.display =
        "block";


    /*
     * Only host can change
     * the game mode.
     */

    const isHost =
        currentHost ===
        myPlayerId;


    ffaModeButton.disabled =
        !isHost;

    teamModeButton.disabled =
        !isHost;

    /*
     * Team controls.
     */

    if (
        currentGameMode ===
        "team"
    ) {

        teamDisplay.style.display =
            "block";

        switchTeamButton.style.display =
            "block";


        const myPlayer =
            players[myPlayerId];


        if (
            myPlayer &&
            myPlayer.team
        ) {

            teamDisplay.innerText =
                myPlayer.team === "red"
                    ? "Your Team: 🔴 RED"
                    : "Your Team: 🔵 BLUE";

        } else {

            teamDisplay.innerText =
                "Your Team: ---";

        }

    } else {

        teamDisplay.style.display =
            "none";

        switchTeamButton.style.display =
            "none";

    }

}


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


/*
 * TEAM NAME COLOR
 */

if (
    currentGameMode === "team" &&
    player.team
) {

    if (player.team === "red") {

        name.style.color =
            "red";

    } else if (
        player.team === "blue"
    ) {

        name.style.color =
            "blue";

    }

}


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


/*
 * =========================
 * LOBBY CONTROLS
 * =========================
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
     * Only show lobby controls
     * while actually in the lobby.
     */

    if (
        currentGameState !== "lobby"
    ) {

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
 * CONNECTION STATUS
 * =========================
 */

window.addEventListener(
    "offline",
    () => {

        statusText.innerText =
            "Internet Down: Reconnect to play";

        statusText.style.color =
            "red";

    }
);


window.addEventListener(
    "online",
    () => {

        if (
            socket &&
            socket.connected
        ) {

            statusText.innerText =
                "Connected as " +
                socket.id;

            statusText.style.color =
                "lightgreen";

        } else {

            statusText.innerText =
                "Reconnecting...";

            statusText.style.color =
                "yellow";

        }

    }
);


/*
 * =========================
 * CONNECT TO SERVER
 * =========================
 */

function connectToServer() {

    if (
        !navigator.onLine
    ) {

        statusText.innerText =
            "Internet Down: Reconnect to play";

        statusText.style.color =
            "red";

        return;

    }


    if (
        typeof io ===
        "undefined"
    ) {

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
    async () => {

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


            showRoomLobby();


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
             * Hide the room lobby and
             * show the room/game area.
             */

            showGameArea();

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
            shotLocked = false;

            currentHost =
                null;

            currentGameState =
                "lobby";


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

            showRoomLobby();


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
     * PLAYER STATE
     * =========================
     */

    socket.on(
        "updatePlayers",
        (newPlayers) => {

            players =
                newPlayers;


            /*
             * Only update the lobby UI
             * while actually in the lobby.
             */

            if (
                currentGameState === "lobby"
            ) {


                updateLobbyControls();

            }


            updateHUD();

            updatePlayerList();

            updateGameModeUI();

        }
    );


    /*
     * =========================
     * BULLETS
     * =========================
     */

    socket.on(
        "updateBullets",
        (newBullets) => {

            bullets =
                newBullets;

        }
    );


    /*
     * =========================
     * GAME STATE
     * =========================
     */

    socket.on(
        "gameState",
        (data) => {

            if (!data) {
                return;
            }


            currentGameState =
                data.state ||
                "lobby";

            currentGameMode =
                data.gameMode ||
                "ffa";

            currentHost =
                data.host ||
                null;


            obstacles =
                data.obstacles ||
                [];


            currentRound =
                data.currentRound ||
                0;


            totalRounds =
                data.totalRounds ||
                5;

            


                   /*
                 * Once we receive a game state,
                 * we are already inside a room.
                  */

                showGameArea();

            /*
             * GAME END
             */

            if (
                currentGameState ===
                "gameEnd"
            ) {

                showGameEnd(
                    data
                );

            } else {

                gameEndScreen.style.display =
                    "none";

            }

            /*
 * =========================
 * ROUND COUNTDOWNS
 * =========================
 */

if (
    currentGameState === "countdown"
) {

    showRoundCountdown(
        data.countdownEndsAt,
        "ROUND STARTING",
        true
    );

} else if (
    currentGameState === "roundEnd"
) {

    showRoundCountdown(
        data.roundEndAt,
        "ROUND OVER",
        false
    );

} else {

    if (roundCountdown) {

        roundCountdown.style.display =
            "none";

    }

}


            updatePlayerList();
            createWeaponCards();
            updateGameModeUI();
            updateLobbyControls();

            

        }
    );

}




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
         * Prevent multiple activations
         * from one click.
         */

        if (
            shotLocked
        ) {

            return;

        }


        if (
            myPlayerId &&
            players[myPlayerId] &&
            players[myPlayerId].spectating
        ) {

            return;

        }


        shotLocked =
            true;

        shooting =
            true;


        shoot();

    }
);


window.addEventListener(
    "mouseup",
    (e) => {

        if (e.button === 0) {

            shooting = false;
            shotLocked = false;

            if (
                socket &&
                socket.connected
            ) {

                socket.emit(
                    "stopShooting"
                );

            }

        }

    }
);

function shoot() {

    if (!socket || !socket.connected) return;

    if (!myPlayerId || !players[myPlayerId]) {
        return;
    }

    if (
        players[myPlayerId].spectating ||
        players[myPlayerId].dead
    ) {
        return;
    }

    socket.emit("shoot");
}

/*
 * =========================
 * KEYBOARD INPUT
 * =========================
 */

document.addEventListener(
    "keydown",
    (e) => {

        if (
            ["INPUT", "TEXTAREA"].includes(
                document.activeElement.tagName
            )
        ) {

            return;

        }


        const key =
            (e.key || "").toLowerCase();


        if (
            key === "w" ||
            key === "arrowup"
        ) {

            keys.w =
                true;

            e.preventDefault();

        }


        if (
            key === "a" ||
            key === "arrowleft"
        ) {

            keys.a =
                true;

            e.preventDefault();

        }


        if (
            key === "s" ||
            key === "arrowdown"
        ) {

            keys.s =
                true;

            e.preventDefault();

        }


        if (
            key === "d" ||
            key === "arrowright"
        ) {

            keys.d =
                true;

            e.preventDefault();

        }

    }
);


document.addEventListener(
    "keyup",
    (e) => {

        const key =
            (e.key || "").toLowerCase();


        if (
            key === "w" ||
            key === "arrowup"
        ) {

            keys.w =
                false;

        }


        if (
            key === "a" ||
            key === "arrowleft"
        ) {

            keys.a =
                false;

        }


        if (
            key === "s" ||
            key === "arrowdown"
        ) {

            keys.s =
                false;

        }


        if (
            key === "d" ||
            key === "arrowright"
        ) {

            keys.d =
                false;

        }

    }
);

/*
 * =========================
 * COMMAND KEY
 * =========================
 */

window.addEventListener(
    "keydown",
    (e) => {

        if (
            e.target.tagName === "INPUT" ||
            e.target.tagName === "TEXTAREA"
        ) {
            return;
        }

        if (e.key !== "/") {
            return;
        }

        if (
            !socket ||
            !socket.connected
        ) {
            return;
        }

        const command =
            prompt("Enter command:");

        if (!command) {
            return;
        }

        socket.emit(
            "command",
            command
        );

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


        if (
            currentGameState !==
            "lobby"
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

let lastMoveTime = 0;

const MOVE_INTERVAL =
    16;


/*
 * Send movement at roughly
 * 60 updates per second.
 */

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
            timestamp -
            lastMoveTime >=
            MOVE_INTERVAL
        ) {

            let x = 0;
            let y = 0;


            if (
                keys.w
            ) {

                y -= 1;

            }


            if (
                keys.s
            ) {

                y += 1;

            }


            if (
                keys.a
            ) {

                x -= 1;

            }


            if (
                keys.d
            ) {

                x += 1;

            }


            /*
             * Only send movement when
             * a direction is actually held.
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


                /*
                 * Normalize diagonal movement
                 * so it isn't faster.
                 */

                x /=
                    length;

                y /=
                    length;


                socket.emit(
                    "move",
                    {
                        x:
                            x * speed,

                        y:
                            y * speed
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
 * =========================
 * ROUND COUNTDOWN
 * =========================
 */

function showRoundCountdown(
    endAt,
    title = "ROUND STARTING",
    movementLocked = false
) {

    if (
        !endAt ||
        !roundCountdown ||
        !roundCountdownNumber
    ) {

        return;

    }


    roundCountdown.style.display =
        "block";


    /*
     * Find/create a title.
     */

    let countdownTitle =
        document.getElementById(
            "roundCountdownTitle"
        );


    if (!countdownTitle) {

        countdownTitle =
            document.createElement(
                "div"
            );

        countdownTitle.id =
            "roundCountdownTitle";

        roundCountdown.insertBefore(
            countdownTitle,
            roundCountdownNumber
        );

    }


    countdownTitle.textContent =
        title;


    /*
     * Movement lock message.
     */

    let movementText =
        document.getElementById(
            "movementLockedText"
        );


    if (!movementText) {

        movementText =
            document.createElement(
                "div"
            );

        movementText.id =
            "movementLockedText";

        roundCountdown.appendChild(
            movementText
        );

    }


    movementText.textContent =
        movementLocked
            ? "Movement locked"
            : "";


    function updateRoundCountdown() {

        if (
            currentGameState !==
            "countdown" &&
            currentGameState !==
            "roundEnd"
        ) {

            roundCountdown.style.display =
                "none";

            return;

        }


        const remaining =
            Math.max(
                0,
                Math.ceil(
                    (
                        endAt -
                        Date.now()
                    ) / 1000
                )
            );


        roundCountdownNumber.textContent =
            remaining;


        if (
            remaining > 0
        ) {

            setTimeout(
                updateRoundCountdown,
                100
            );

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
    0;

const gun =
    GunData[player.gun] ||
    GunData.Pistol;

const maxAmmo =
    gun.ammo;


    healthText.innerText =
        "❤️ " +
        health +
        " HP";


    ammoText.innerText =
        "🔫 " +
        ammo +
        " / " +
        maxAmmo;


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
 * =========================
 * COPY BUTTON
 * =========================
 */

copyBttn.addEventListener(
    "click",
    () => {

        navigator.clipboard.writeText(
            gameRoomCode.innerText
        );

    }
);


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
            e.key !==
            "Escape"
        ) {

            return;

        }


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
);


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
     * =========================
     * BACKGROUND GRID
     * =========================
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
     * =========================
     * DRAW OBSTACLES
     * =========================
     */

    obstacles.forEach(
        (obstacle) => {

            ctx.fillStyle =
                "#555";

            ctx.fillRect(
                obstacle.x,
                obstacle.y,
                obstacle.width,
                obstacle.height
            );

        }
    );

    // ====================================
// FOFROBEAM VISUAL
// ====================================

for (const playerId in players) {

    const player =
        players[playerId];

    if (!player) continue;

    if (
        player.gun !== "FoFroBeam" ||
        !player.beamActive
    ) {
        continue;
    }

    const angle =
        player.angle || 0;

    const startX =
        player.x +
        Math.cos(angle) * 25;

    const startY =
        player.y +
        Math.sin(angle) * 25;

    const beamLength =
    player.beamLength ?? 600;

    const endX =
        startX +
        Math.cos(angle) * beamLength;

    const endY =
        startY +
        Math.sin(angle) * beamLength;

    ctx.save();

    ctx.beginPath();

    ctx.moveTo(
        startX,
        startY
    );

    ctx.lineTo(
        endX,
        endY
    );

    ctx.strokeStyle =
        "#66FFFF";

    ctx.lineWidth =
        10;

    ctx.globalAlpha =
        0.35;

    ctx.shadowColor =
        "#66FFFF";

    ctx.shadowBlur =
        20;

    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(
        startX,
        startY
    );

    ctx.lineTo(
        endX,
        endY
    );

    ctx.strokeStyle =
        "white";

    ctx.lineWidth =
        3;

    ctx.globalAlpha =
        0.9;

    ctx.shadowBlur =
        5;

    ctx.stroke();

    ctx.restore();
}


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

    if (currentGameMode == "ffa") {
        ctx.fillStyle =
            "white";
    } else if (currentGameMode == "team") {
        ctx.fillStyle = player.team;
    }


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


        if (bullet.gun === "JackerRifle") {
    // Orange glowing JackerRifle projectile
    ctx.save();

    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(bullet.angle);

    ctx.shadowColor = "orange";
    ctx.shadowBlur = 12;

    ctx.fillStyle = "#ff8c00";

    ctx.beginPath();
    ctx.roundRect(
        -11,
        -4,
        22,
        8,
        4
    );
    ctx.fill();

    ctx.restore();
} else {
    // Normal bullet
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
    ctx.fill();
}
    }


    ctx.globalAlpha =
        1;

}


/*
 * =========================
 * GAME END
 * =========================
 */

function showGameEnd(data) {

    gameEndScreen.style.display =
        "flex";


    let winner = data.winner || null;

   if (
    currentGameMode === "team" &&
    data.winningTeam
) {

    const teamName =
        data.winningTeam === "red"
            ? "Red"
            : "Blue";

    gameWinner.textContent =
        `🏆 ${teamName} Team Wins!!`;

} else {

    gameWinner.textContent =
        winner
            ? `🏆 Winner: ${winner.username}`
            : "🏆 Winner: Draw!";

}


    let html =
        "";


    for (
        const id in players
    ) {

        const player =
            players[id];


        html += `
            <div style="margin:10px 0; padding:8px; background:#333; border-radius:6px;">
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
                    (
                        endTime -
                        Date.now()
                    ) / 1000
                )
            );


        gameEndCountdown.textContent =
            `Returning to lobby in ${remaining}...`;


        if (
            remaining > 0 &&
            currentGameState ===
            "gameEnd"
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
 * =========================
 * FPS
 * =========================
 */

let fps = 0;

let fpsFrames = 0;

let fpsLastTime =
    performance.now();


function updateFPS(timestamp) {

    fpsFrames++;


    if (
        timestamp -
        fpsLastTime >=
        1000
    ) {

        fps =
            fpsFrames;

        fpsFrames =
            0;

        fpsLastTime =
            timestamp;


        const fpsDisplay =
            document.getElementById(
                "fpsDisplay"
            );


        if (
            fpsDisplay
        ) {

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
 * =========================
 * PING
 * =========================
 */

setInterval(
    () => {

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


                if (
                    pingDisplay
                ) {

                    pingDisplay.textContent =
                        ping;

                }

            }
        );

    },
    1000
);


/*
 * =========================
 * RENDER LOOP
 * =========================
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
 * =========================
 * START
 * =========================
 */

connectToServer();
