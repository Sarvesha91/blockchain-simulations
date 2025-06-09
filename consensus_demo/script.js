// Utility: generate random integer in range inclusive
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Create mock data for three consensus mechanisms
function createMockValidators() {
  return {
    pow: [
      { id: 'Miner A', power: randInt(20, 100) },
      { id: 'Miner B', power: randInt(20, 100) },
      { id: 'Miner C', power: randInt(20, 100) },
    ],
    pos: [
      { id: 'Staker X', stake: randInt(50, 200) },
      { id: 'Staker Y', stake: randInt(50, 200) },
      { id: 'Staker Z', stake: randInt(50, 200) },
    ],
    dpos: [
      { id: 'Delegate 1', votes: randInt(5, 20) },
      { id: 'Delegate 2', votes: randInt(5, 20) },
      { id: 'Delegate 3', votes: randInt(5, 20) },
    ],
  };
}

// PoW: Select validator with highest power
function selectPoW(powValidators) {
  const selected = powValidators.reduce((max, v) => v.power > max.power ? v : max, powValidators[0]);
  console.log(`PoW selection: Validator with highest power wins (${selected.id} with power ${selected.power})`);
  return selected;
}

// PoS: Select validator with highest stake
function selectPoS(posValidators) {
  const selected = posValidators.reduce((max, v) => v.stake > max.stake ? v : max, posValidators[0]);
  console.log(`PoS selection: Validator with highest stake wins (${selected.id} with stake ${selected.stake})`);
  return selected;
}

// DPoS: Randomly choose a delegate based on votes (weighted random)
function selectDPoS(dposValidators) {
  const totalVotes = dposValidators.reduce((sum, v) => sum + v.votes, 0);
  const rand = Math.random() * totalVotes;
  let cumulative = 0;
  for (const validator of dposValidators) {
    cumulative += validator.votes;
    if (rand < cumulative) {
      console.log(`DPoS selection: Delegate selected by weighted random (${validator.id} with votes ${validator.votes})`);
      return validator;
    }
  }
  // fallback return last (should not occur)
  return dposValidators[dposValidators.length - 1];
}

// Render helpers
function renderValidators(listId, validators, label) {
  const ul = document.getElementById(listId);
  ul.innerHTML = '';
  for (const v of validators) {
    const li = document.createElement('li');
    if (label === 'power') {
      li.textContent = `${v.id} - Power: ${v.power}`;
    } else if (label === 'stake') {
      li.textContent = `${v.id} - Stake: ${v.stake}`;
    } else if (label === 'votes') {
      li.textContent = `${v.id} - Votes: ${v.votes}`;
    }
    ul.appendChild(li);
  }
}

// Update selected display and explanation
function updateSelection(idSelected, idExplanation, validator, consensus) {
  const selectedDiv = document.getElementById(idSelected);
  const explanationP = document.getElementById(idExplanation);

  selectedDiv.textContent = `Selected Validator: ${validator.id}`;
  let explanationText = '';

  if (consensus === 'PoW') {
    explanationText = `In Proof-of-Work, the validator (miner) with the highest computational power is selected to add the next block. Here, ${validator.id} has the greatest power of ${validator.power}, so they are chosen.`;
  } else if (consensus === 'PoS') {
    explanationText = `In Proof-of-Stake, the validator with the largest stake is chosen to validate the next block. Here, ${validator.id} holds the highest stake of ${validator.stake}, so they get selected.`;
  } else if (consensus === 'DPoS') {
    explanationText = `Delegated Proof-of-Stake selects a delegate based on votes weighted by stake or community support. ${validator.id} was randomly selected from delegates weighted by votes (${validator.votes} votes).`;
  }

  explanationP.textContent = explanationText;
}

// Main simulation function triggered by button click
function runSimulation() {
  // Generate mocks
  const mocks = createMockValidators();

  // Render all validators
  renderValidators('powValidators', mocks.pow, 'power');
  renderValidators('posValidators', mocks.pos, 'stake');
  renderValidators('dposValidators', mocks.dpos, 'votes');

  // Select validators per consensus
  const powWinner = selectPoW(mocks.pow);
  const posWinner = selectPoS(mocks.pos);
  const dposWinner = selectDPoS(mocks.dpos);

  // Update UI with selection and explanation
  updateSelection('powSelected', 'powExplanation', powWinner, 'PoW');
  updateSelection('posSelected', 'posExplanation', posWinner, 'PoS');
  updateSelection('dposSelected', 'dposExplanation', dposWinner, 'DPoS');
}

document.getElementById('runSim').addEventListener('click', () => {
  console.clear();
  runSimulation();
});
