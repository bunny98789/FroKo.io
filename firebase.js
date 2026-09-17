// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// ================================
// Firebase configuration
// ================================

const firebaseConfig = {
    apiKey: "AIzaSyAUMZvQK2U9bz0DHVv3Y5qetdnDHlEkD48",
    authDomain: "froko-ce1cb.firebaseapp.com",
    projectId: "froko-ce1cb",
    storageBucket: "froko-ce1cb.firebasestorage.app",
    messagingSenderId: "513996767445",
    appId: "1:513996767445:web:de9d0e01bfe33dee09225c"
};


// ================================
// Initialize Firebase
// ================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


// ================================
// FroKo Account API
// ================================

window.FroKoAccount = {

    // ================================
    // SIGN UP
    // ================================

    async signUp(email, password, username) {

        const result = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = result.user;

        await setDoc(doc(db, "players", user.uid), {

            username: username,

            frokoins: 1000,
            kokash: 50,

            ownedWeapons: ["Pistol"],
            equippedWeapon: "Pistol",

            ownedFighters: [],
            equippedFighter: null,

            banned: false,

            mailbox: [],

            redeemedPromoCodes: [],

            createdAt: new Date()
        });

        return user;
    },


    // ================================
    // LOGIN
    // ================================

    async login(email, password) {

        const result = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        return result.user;
    },


    // ================================
    // LOGOUT
    // ================================

    async logout() {

        await signOut(auth);

    },


    // ================================
    // GET CURRENT USER
    // ================================

    getUser() {

        return auth.currentUser;

    },


    // ================================
    // GET PLAYER DATA
    // ================================

    async getData() {

        const user = auth.currentUser;

        if (!user) {
            throw new Error("You are not logged in.");
        }

        const playerRef = doc(db, "players", user.uid);

        const snapshot = await getDoc(playerRef);

        if (!snapshot.exists()) {
            throw new Error("Player data does not exist.");
        }

        return snapshot.data();

    },


    // ================================
    // SAVE PLAYER DATA
    // ================================

    async saveData(data) {

        const user = auth.currentUser;

        if (!user) {
            throw new Error("You are not logged in.");
        }

        const playerRef = doc(db, "players", user.uid);

        await updateDoc(playerRef, data);

    },


    // ================================
    // AUTH STATE
    // ================================

    onAuthStateChanged(callback) {

        return onAuthStateChanged(auth, callback);

    },


    // ================================
    // PURCHASE WEAPON
    // ================================

    async purchaseWeapon(gunName, gunData) {

        const user = auth.currentUser;

        if (!user) {
            throw new Error("You are not logged in.");
        }

        const playerRef = doc(db, "players", user.uid);

        const snapshot = await getDoc(playerRef);

        if (!snapshot.exists()) {
            throw new Error("Player data does not exist.");
        }

        const data = snapshot.data();


        // Already owned
        if (data.ownedWeapons?.includes(gunName)) {
            throw new Error("You already own this weapon.");
        }


        const price = gunData.price;
        const priceType = gunData.priceType;


        // ================================
        // FroKoins
        // ================================

        if (priceType === "FroKoins") {

            if ((data.frokoins ?? 0) < price) {
                throw new Error("Not enough FroKoins.");
            }

            data.frokoins -= price;

        }


        // ================================
        // KoKash
        // ================================

        else if (priceType === "KoKash") {

            if ((data.kokash ?? 0) < price) {
                throw new Error("Not enough KoKash.");
            }

            data.kokash -= price;

        }


        // ================================
        // Invalid currency
        // ================================

        else {

            throw new Error("Invalid currency type.");

        }


        // ================================
        // Add weapon
        // ================================

        data.ownedWeapons = [
            ...(data.ownedWeapons || []),
            gunName
        ];


        await updateDoc(playerRef, {

            frokoins: data.frokoins,
            kokash: data.kokash,
            ownedWeapons: data.ownedWeapons

        });


        return data;

    },


    // ================================
    // MAILBOX
    // ================================

    async getMailbox() {

        const user = auth.currentUser;

        if (!user) {
            throw new Error("You are not logged in.");
        }

        const playerRef = doc(db, "players", user.uid);

        const snapshot = await getDoc(playerRef);

        if (!snapshot.exists()) {
            throw new Error("Player data does not exist.");
        }

        const data = snapshot.data();

        return data.mailbox || [];

    },


    // ================================
    // CLAIM MAILBOX REWARD
    // ================================

    async claimMailboxReward(messageId) {

        const user = auth.currentUser;

        if (!user) {
            throw new Error("You are not logged in.");
        }

        const playerRef = doc(db, "players", user.uid);

        const snapshot = await getDoc(playerRef);

        if (!snapshot.exists()) {
            throw new Error("Player data does not exist.");
        }

        const data = snapshot.data();

        const mailbox = data.mailbox || [];


        // Find message
        const messageIndex = mailbox.findIndex(
            message => message.id === messageId
        );

        if (messageIndex === -1) {
            throw new Error("Mailbox message not found.");
        }


        const message = mailbox[messageIndex];


        // Already claimed
        if (message.claimed) {
            throw new Error("This reward has already been claimed.");
        }


        // ================================
        // Add rewards
        // ================================

        const frokoinsReward = Number(message.frokoins || 0);
        const kokashReward = Number(message.kokash || 0);


        const newFroKoins =
            Number(data.frokoins || 0) + frokoinsReward;

        const newKoKash =
            Number(data.kokash || 0) + kokashReward;
         
        const weapons = message.weapons || [];



        // Mark message as claimed
        mailbox[messageIndex] = {
            ...message,
            claimed: true
        };

        const updateData = {
            frokoins: newFroKoins,
            kokash: newKoKash,
            mailbox: mailbox
          };

        if (weapons.length > 0) {
            updateData.ownedWeapons = arrayUnion(...weapons)
        }

        await updateDoc(playerRef, updateData);


        return {

            frokoins: newFroKoins,
            kokash: newKoKash,
            message: mailbox[messageIndex]

        };

    },


    // ================================
    // PROMO CODE
    // ================================

    async redeemPromoCode(code) {

        const user = auth.currentUser;

        if (!user) {
            throw new Error("You are not logged in.");
        }


        // Clean code
        const cleanCode = String(code || "")
            .trim()
            .toUpperCase();


        if (!cleanCode) {
            throw new Error("Enter a promo code.");
        }


        // ================================
        // Get player
        // ================================

        const playerRef = doc(db, "players", user.uid);

        const playerSnapshot = await getDoc(playerRef);

        if (!playerSnapshot.exists()) {
            throw new Error("Player data does not exist.");
        }

        const playerData = playerSnapshot.data();


        // ================================
        // Check whether already redeemed
        // ================================

        const redeemedCodes =
            playerData.redeemedPromoCodes || [];


        if (redeemedCodes.includes(cleanCode)) {

            throw new Error(
                "You have already redeemed this promo code."
            );

        }


        // ================================
        // Get promo code
        // ================================

        const promoRef =
            doc(db, "promoCodes", cleanCode);

        const promoSnapshot =
            await getDoc(promoRef);


        if (!promoSnapshot.exists()) {

            throw new Error(
                "Invalid or expired promo code."
            );

        }


        const promoData = promoSnapshot.data();


        // ================================
        // Check enabled status
        // ================================

        if (promoData.enabled === false) {

            throw new Error(
                "Invalid or expired promo code."
            );

        }


        // ================================
        // Check expiration
        // ================================

        if (promoData.expiresAt) {

            const expiration =
                promoData.expiresAt.toDate
                    ? promoData.expiresAt.toDate()
                    : new Date(promoData.expiresAt);

            if (new Date() > expiration) {

                throw new Error(
                    "This promo code has expired."
                );

            }

        }


        // ================================
        // Rewards
        // ================================

        const frokoinsReward =
            Number(promoData.frokoins || 0);

        const kokashReward =
            Number(promoData.kokash || 0);


        const newFroKoins =
            Number(playerData.frokoins || 0)
            + frokoinsReward;

        const newKoKash =
            Number(playerData.kokash || 0)
            + kokashReward;

        const weapons = promoData.weapons || [];

        // ================================
        // Save redemption
        // ================================

        const updatedRedeemedCodes = [
            ...redeemedCodes,
            cleanCode
        ];

         const updateData = {
            frokoins: newFroKoins,
            kokash: newKoKash,
            redeemedPromoCodes: updatedRedeemedCodes
          };

        if (weapons.length > 0) {
            updateData.ownedWeapons = arrayUnion(...weapons)
        }

        await updateDoc(playerRef, updateData);


        return {

            frokoins: newFroKoins,
            kokash: newKoKash,
            code: cleanCode,
            reward: {
                frokoins: frokoinsReward,
                kokash: kokashReward,
                weapons: weapons
            }

        };

    },


    // ================================
    // REAL-TIME PLAYER DATA
    // ================================

    onDataChanged(callback) {

        const user = auth.currentUser;

        if (!user) {
            throw new Error("You are not logged in.");
        }

        const playerRef =
            doc(db, "players", user.uid);


        return onSnapshot(
            playerRef,
            (snapshot) => {

                if (!snapshot.exists()) {

                    console.error(
                        "Player data does not exist."
                    );

                    return;

                }


                callback(snapshot.data());

            }
        );

    }

};


// ================================
// Firebase ready event
// ================================

window.dispatchEvent(
    new Event("frokoFirebaseReady")
);
