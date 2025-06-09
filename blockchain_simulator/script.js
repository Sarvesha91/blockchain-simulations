class Block {
  constructor(index, timestamp, data = '', previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = '';
    this.mined = false;
  }

  async calculateHash() {
    return await sha256(
      `${this.index}${this.timestamp}${this.previousHash}${this.data}${this.nonce}`
    );
  }

  async mineBlock(difficulty) {
    const target = '0'.repeat(difficulty);
    this.nonce = 0;
    while (true) {
      this.hash = await this.calculateHash();
      if (this.hash.startsWith(target)) {
        this.mined = true;
        break;
      }
      this.nonce++;
    }
  }

  // When data changes: update hash continuously but keep nonce unchanged
  async updateHashWithCurrentNonce() {
    this.hash = await this.calculateHash();
  }

  // Mark block as not mined, without changing nonce (keep nonce)
  markUnmined() {
    this.mined = false;
  }
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

class Blockchain {
  constructor(difficulty = 4) {
    this.blocks = [];
    this.difficulty = difficulty;
  }

  async createGenesisBlock() {
    const timestamp = new Date().toISOString();
    const genesisBlock = new Block(0, timestamp, '', '0');
    await genesisBlock.mineBlock(this.difficulty);
    this.blocks.push(genesisBlock);
  }

  async addBlock(data = '') {
    const lastBlock = this.blocks[this.blocks.length - 1];
    const index = lastBlock.index + 1;
    const timestamp = new Date().toISOString();
    const previousHash = lastBlock.hash;
    const block = new Block(index, timestamp, data, previousHash);
    await block.mineBlock(this.difficulty);
    this.blocks.push(block);
  }

  // When a block's data changes, update its hash continuously with current nonce,
  // mark it unmined, and for downstream blocks update previousHash and mark them unmined,
  // but DO NOT change their nonce or hash (keep them as is until mined)
  async handleDataChangeAt(index) {
    if (index < 0 || index >= this.blocks.length) return;

    // Update hash continuously to reflect data edit on this block with current nonce
    await this.blocks[index].updateHashWithCurrentNonce();

    // Mark this block unmined (because data changed)
    this.blocks[index].markUnmined();

    // For following blocks: update previousHash, mark unmined, but keep nonce/hash unchanged
    for (let i = index + 1; i < this.blocks.length; i++) {
      const prevBlock = this.blocks[i - 1];
      const currBlock = this.blocks[i];
      currBlock.previousHash = prevBlock.hash;
      currBlock.markUnmined();
      // Do NOT recalc hash or reset nonce here, so displayed values stay
    }
  }

  validateChain() {
    return this.blocks.map((block, i) => {
      if (!block.hash.startsWith('0'.repeat(this.difficulty))) return false;
      if (!block.mined) return false;
      if (i === 0) return true;
      if (block.previousHash !== this.blocks[i - 1].hash) return false;
      return true;
    });
  }

  async mineBlockAt(index) {
    const block = this.blocks[index];
    if (!block) return;
    await block.mineBlock(this.difficulty);

    // Update subsequent blocks' previousHash and mark them unmined; keep their current hash/nonce until mined
    for (let i = index + 1; i < this.blocks.length; i++) {
      const prevBlock = this.blocks[i - 1];
      const currBlock = this.blocks[i];
      currBlock.previousHash = prevBlock.hash;
      currBlock.markUnmined();
    }
  }
}

const blockchainSection = document.getElementById('blockchain');
const myBlockchain = new Blockchain(4);

async function init() {
  await myBlockchain.createGenesisBlock();
  await myBlockchain.addBlock();
  await myBlockchain.addBlock();
  renderBlocks();
  updateUIValidity();
}

function createBlockElement(block, index) {
  const blockEl = document.createElement('article');
  blockEl.className = 'block valid';
  blockEl.setAttribute('data-index', index);
  blockEl.setAttribute('role', 'region');
  blockEl.setAttribute('aria-label', `Block number ${block.index}`);

  blockEl.innerHTML = `
    <label class="label" for="index-${index}">Index</label>
    <input type="text" id="index-${index}" readonly value="${block.index}" />
    
    <label class="label" for="timestamp-${index}" style="margin-top:1.5rem;">Timestamp</label>
    <input type="text" id="timestamp-${index}" readonly value="${block.timestamp}" />
    
    <label class="label" for="data-${index}" style="margin-top:1.5rem;">Data</label>
    <textarea id="data-${index}" class="data-input input-full" rows="3" aria-label="Data for block ${block.index}">${block.data}</textarea>
    
    <label class="label" for="prevhash-${index}" style="margin-top:1.5rem;">Previous Hash</label>
    <input type="text" id="prevhash-${index}" readonly value="${block.previousHash}" class="input-full monospace" />
    
    <label class="label" for="hash-${index}" style="margin-top:1.5rem;">Hash</label>
    <input type="text" id="hash-${index}" readonly value="${block.hash}" class="input-full monospace" />
    
    <label class="label" for="nonce-${index}" style="margin-top:1.5rem;">Nonce</label>
    <input type="text" id="nonce-${index}" readonly value="${block.nonce >= 0 ? block.nonce : ''}" />
    
    <button class="mine-btn" aria-label="Mine block ${block.index}">Mine</button>
  `;

  const dataTextarea = blockEl.querySelector(`#data-${index}`);
  dataTextarea.addEventListener('input', async () => {
    const newData = dataTextarea.value;
    const blk = myBlockchain.blocks[index];
    blk.data = newData;
    await myBlockchain.handleDataChangeAt(index);
    renderBlocks();
    updateUIValidity();
  });

  const mineBtn = blockEl.querySelector('.mine-btn');
  mineBtn.addEventListener('click', async () => {
    mineBtn.disabled = true;
    mineBtn.textContent = 'Mining...';
    await myBlockchain.mineBlockAt(index);
    renderBlocks();
    updateUIValidity();
    mineBtn.disabled = false;
    mineBtn.textContent = 'Mine';
  });

  return blockEl;
}

function renderBlocks() {
  blockchainSection.innerHTML = '';
  myBlockchain.blocks.forEach((block, index) => {
    blockchainSection.appendChild(createBlockElement(block, index));
  });
}

function updateUIValidity() {
  const validStates = myBlockchain.validateChain();
  const blocksEls = blockchainSection.querySelectorAll('.block');
  blocksEls.forEach((el, i) => {
    const block = myBlockchain.blocks[i];
    if (validStates[i]) {
      el.classList.add('valid');
      el.classList.remove('invalid');
    } else {
      el.classList.add('invalid');
      el.classList.remove('valid');
    }
    el.querySelector(`#hash-${i}`).value = block.hash;
    el.querySelector(`#nonce-${i}`).value = block.nonce >= 0 ? block.nonce : '';
    el.querySelector(`#prevhash-${i}`).value = block.previousHash;
  });
}

init();

