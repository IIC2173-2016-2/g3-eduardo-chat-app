const a = [{hola: "Chao", Oscarito: "oscar"}, {hola: "hola", Oscarito: "cony"}];

let filtered = a.filter((x) => (x.hola === "Chao"));

console.log(filtered);
console.log(filtered[0]);
