const GunData = {
  Pistol:{
    shopImg: "Assets/pistol.svg",
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

    damage: 3,
    ammo: 50,

    reloadTime: 7500,

    price: 5000,
    priceType: "FroKoins",

    damageInterval: 100,
    ammoInterval: 100,

    slowAfter: 2000,
    slowRecoveryTime: 1000,
    speedReduction: 2
},    
};

if (typeof module !== "undefined") {
    module.exports = GunData;
}
