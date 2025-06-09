class Block {
  constructor(index, timestamp, data = '', previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = '';
    this.mined = false;
    this.miningTime = null; // milliseconds
    this.nonceAttempts = 0;
  }

  async calculateHash() {
    const str = `${this.index}${this.timestamp}${this.previousHash}${this.data}${this.nonce}`;
    return await sha256(str);
  }

  async mineBlock(difficulty) {
    const target = '0'.repeat(difficulty);
    this.nonce = 0;
    this.nonceAttempts = 0;

    const start = performance.now();

    while (true) {
      this.hash = await this.calculateHash();
      this.nonceAttempts++;
      if (this.hash.startsWith(target)) {
        this.mined = true;
        break;
      }
      this.nonce++;
    }

    const end = performance.now();
    this.miningTime = (end - start).toFixed(2);
  }

  async updateHash() {
    this.hash = await this.calculateHash();
  }

  
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
    this.difficulty = difficulty;
    this.blocks = [];
  }

  async createGenesisBlock() {
    const timestamp = new Date().toISOString();
    const genesis = new Block(0, timestamp, '', '0');  
    await genesis.mineBlock(this.difficulty);
    this.blocks.push(genesis);
  }

  async addBlock(data = '') {
    const prev = this.blocks[this.blocks.length - 1];
    const newBlock = new Block(
      prev.index + 1,
      new Date().toISOString(),
      data,
      prev.hash
    );
    await newBlock.mineBlock(this.difficulty);
    this.blocks.push(newBlock);
  }

  async updateBlockData(index, newData) {
    if (index < 0 || index >= this.blocks.length) return;
    const block = this.blocks[index];
    block.data = newData;
    block.markUnmined();  

    await block.updateHash();

    
    for (let i = index + 1; i < this.blocks.length; i++) {
      this.blocks[i].previousHash = this.blocks[i - 1].hash;
      this.blocks[i].markUnmined();
      await this.blocks[i].updateHash();
    }
  }

  validateChain() {
    for (let i = 0; i < this.blocks.length; i++) {
      const block = this.blocks[i];
      if (!block.hash.startsWith('0'.repeat(this.difficulty))) return false;
      if (!block.mined) return false;
      if (i > 0 && block.previousHash !== this.blocks[i - 1].hash) return false;
    }
    return true;
  }

  async mineBlockAt(index) {
    if (index < 0 || index >= this.blocks.length) return;
    await this.blocks[index].mineBlock(this.difficulty);

    // Update following blocks
    for (let i = index + 1; i < this.blocks.length; i++) {
      this.blocks[i].previousHash = this.blocks[i - 1].hash;
      this.blocks[i].markUnmined();
      await this.blocks[i].updateHash();
    }
  }
}

// UI and interaction code
const blockchainContainer = document.getElementById('blockchain');
const myBlockchain = new Blockchain(4);

async function render() {
  blockchainContainer.innerHTML = '';

  myBlockchain.blocks.forEach((block, idx) => {
    const blockEl = document.createElement('div');
    blockEl.className = 'block';
    if (!block.mined) blockEl.classList.add('invalid');

    blockEl.innerHTML = `
      <label>Index:</label>
      <input type="text" value="${block.index}" readonly />

      <label>Timestamp:</label>
      <input type="text" value="${block.timestamp}" readonly />

      <label>Previous Hash:</label>
      <textarea readonly>${block.previousHash}</textarea>

      <label>Data:</label>
      <textarea id="data-${idx}">${block.data}</textarea>

      <label>Nonce:</label>
      <input type="text" value="${block.nonce}" readonly />

      <label>Hash:</label>
      <textarea readonly>${block.hash}</textarea>

      <div class="info">
        Nonce Attempts: <span id="attempts-${idx}">${block.nonceAttempts}</span><br/>
        Mining Time (ms): <span id="time-${idx}">${block.miningTime || '-'}</span>
      </div>

      <button class="mine-btn" id="mine-${idx}">Mine</button>
    `;

    blockchainContainer.appendChild(blockEl);

    // Event listeners:
    const dataInput = blockEl.querySelector(`#data-${idx}`);
    const mineBtn = blockEl.querySelector(`#mine-${idx}`);

    dataInput.addEventListener('input', async (e) => {
      const newData = e.target.value;
      await myBlockchain.updateBlockData(idx, newData);
      // Re-render but nonceAttempts and miningTime remain same since markUnmined() no longer resets them
      render();
    });

    mineBtn.addEventListener('click', async () => {
      mineBtn.disabled = true;
      await myBlockchain.mineBlockAt(idx);
      render();
      mineBtn.disabled = false;
    });
  });
}

async function init() {
  await myBlockchain.createGenesisBlock();
  await myBlockchain.addBlock('');
  await myBlockchain.addBlock('');
 
  render();
}

init();
