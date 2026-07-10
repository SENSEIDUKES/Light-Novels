const { performance } = require('perf_hooks');

const nodes = Array.from({ length: 100000 }, (_, i) => ({
  status: i % 2 === 0 ? 'active' : 'resolved',
  type: ['Debt', 'Boon', 'Enmity', 'Destiny'][i % 4]
}));

function oldWay() {
  const activeNodes = nodes.filter(n => n.status === 'active');
  const resolvedNodes = nodes.filter(n => n.status === 'resolved');

  const debts = nodes.filter(n => n.type === 'Debt').length;
  const boons = nodes.filter(n => n.type === 'Boon').length;
  const enmities = nodes.filter(n => n.type === 'Enmity').length;
  const destinies = nodes.filter(n => n.type === 'Destiny').length;
  return { activeNodes, resolvedNodes, debts, boons, enmities, destinies };
}

function newWay() {
  const activeNodes = [];
  const resolvedNodes = [];
  let debts = 0;
  let boons = 0;
  let enmities = 0;
  let destinies = 0;

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.status === 'active') activeNodes.push(n);
    else if (n.status === 'resolved') resolvedNodes.push(n);

    if (n.type === 'Debt') debts++;
    else if (n.type === 'Boon') boons++;
    else if (n.type === 'Enmity') enmities++;
    else if (n.type === 'Destiny') destinies++;
  }
  return { activeNodes, resolvedNodes, debts, boons, enmities, destinies };
}

let start = performance.now();
for (let i = 0; i < 100; i++) {
  oldWay();
}
console.log('Old way:', performance.now() - start);

start = performance.now();
for (let i = 0; i < 100; i++) {
  newWay();
}
console.log('New way:', performance.now() - start);
