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
    updateDoc
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

            createdAt: new Date()
        });

        return user;
    },


    async login(email, password) {

        const result = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        return result.user;
    },


    async logout() {

        await signOut(auth);

    },


    getUser() {

        return auth.currentUser;

    },


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


    async saveData(data) {

        const user = auth.currentUser;

        if (!user) {
            throw new Error("You are not logged in.");
        }

        const playerRef = doc(db, "players", user.uid);

        await updateDoc(playerRef, data);

    },


    onAuthStateChanged(callback) {

        return onAuthStateChanged(auth, callback);

    }

};

window.dispatchEvent(new Event("frokoFirebaseReady"));
