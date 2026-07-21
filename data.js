const manifest = await fetch("./creatures.json").then(r => r.json());
const creatures = await Promise.all(
  manifest.map(filename => fetch(`./${filename}`).then(r => r.json()))
);

export default creatures;
