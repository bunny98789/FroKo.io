const GunData = {
  Pistol:{
    shopImg: "Assets/pistol.svg",
    description: "A trusty sidearm with a short reload time for quick comebacks.",
    maker: "FroKo Defense",
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
    maker: "Énergie FroKo Systems",
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
    maker: "Énergie FroKo Systems",
    
    damage: 6,
    ammo: 25,

    reloadTime: 5000,

    price: 5000,
    priceType: "FroKoins",

    damageInterval: 100,
    ammoInterval: 100,
},   

  MachineGun: {
    shopImg: "Assets/mg.svg",
    description: "Shoots very fast, low damage, high ammo.",
    maker: "KernWerk Industries",
    
    damage: 2,
    ammo: 100,

    reloadTime: 10000,

    price: 450,
    priceType: "KoKash",

    fireRate: 75
  },
};

if (typeof module !== "undefined") {
    module.exports = GunData;
}
