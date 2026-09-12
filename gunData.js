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

if (typeof module !== "undefined") {
    module.exports = GunData;
}
