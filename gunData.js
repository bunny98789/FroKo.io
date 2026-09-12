const GunData = {
  Pistol:{
    shopImg: "Assets/pistol.svg",
    description: "A trusty sidearm with a short reload time for quick comebacks.",
    damage: 25,
    ammo: 6,
    reloadTime: 2000, //in milliseconds
    fireRate: 250, // in ms
    bulletSpeed: 10,
    price: 0,
    priceType: "FroKoins"
  },

 JackerRifle: {
    shopImg: "Assets/jackerRifle.svg",
    description: "Bullets bounce off walls and obstacles, useful for trickshots.",
    damage: 75,
    ammo: 2,
    reloadTime: 3500,
    fireRate: 300,
    bulletSpeed: 15,
    price: 250,
    priceType: "KoKash",

    maxBounces: 2,
    bounceDamageReduction: 25
},

  FoFroBeam: {
    shopImg: "Assets/foFroBeam.svg",
    description: "Powerful beam that hits multiple enemies.",

    damage: 6,
    ammo: 25,

    reloadTime: 5000,

    price: 5000,
    priceType: "FroKoins",

    damageInterval: 100,
    ammoInterval: 100,
},    
};

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

    for (const gunName in GunData) {

        const gun =
            GunData[gunName];


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
            Damage: ${gun.damage}<br>
            Ammo: ${gun.ammo}<br>
            Reload: ${gun.reloadTime / 1000}s<br>
            Fire Rate: ${gun.fireRate ?? "N/A"}ms<br>
            Bullet Speed: ${gun.bulletSpeed ?? "N/A"}
        `;


        /*
         * SELECT BUTTON
         */

        const selectButton =
            document.createElement("button");

        selectButton.className =
            "weaponSelectButton";

        selectButton.innerText =
            "SELECT";


        /*
         * SELECT WEAPON
         */

        selectButton.addEventListener(
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

        if (
            currentGameState !== "lobby"
        ) {
            return;
        }

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
         * ADD CARD TO LIST
         */

        weaponList.appendChild(card);

    }

}


/*
 * CREATE CARDS
 */

createWeaponCards();

if (typeof module !== "undefined") {
    module.exports = GunData;
}
