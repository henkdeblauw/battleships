const GRID_SIZE = 14;
const SHIPS = [
    { name: 'Vliegdekschip', size: 5, count: 1 },
    { name: 'Slagschip', size: 4, count: 2 },
    { name: 'Onderzeeër', size: 3, count: 2 },
    { name: 'Kruiser', size: 3, count: 1 },
    { name: 'Torpedobootjager', size: 2, count: 3 }
];

let gameState = {
    grid: [],
    ships: []
};

// Initialiseer grid
function initializeGrid() {
    gameState.grid = Array(GRID_SIZE).fill(null).map(() => 
        Array(GRID_SIZE).fill(null)
    );
}

// Plaats schepen random
function placeShips() {
    gameState.ships = [];
    
    for (let shipType of SHIPS) {
        // Loop voor het aantal schepen van dit type
        for (let shipCount = 0; shipCount < shipType.count; shipCount++) {
            let placed = false;
            let attempts = 0;
            
            while (!placed && attempts < 100) {
                const horizontal = Math.random() < 0.5;
                const row = Math.floor(Math.random() * GRID_SIZE);
                const col = Math.floor(Math.random() * GRID_SIZE);
                
                if (canPlaceShip(row, col, shipType.size, horizontal)) {
                    const shipData = {
                        name: shipType.name,
                        size: shipType.size,
                        hits: 0,
                        positions: []
                    };
                    
                    for (let i = 0; i < shipType.size; i++) {
                        const r = horizontal ? row : row + i;
                        const c = horizontal ? col + i : col;
                        gameState.grid[r][c] = gameState.ships.length;
                        shipData.positions.push({row: r, col: c, hit: false});
                    }
                    
                    gameState.ships.push(shipData);
                    placed = true;
                }
                attempts++;
            }
        }
    }
}

// Check of schip geplaatst kan worden
function canPlaceShip(row, col, size, horizontal) {
    if (horizontal) {
        if (col + size > GRID_SIZE) return false;
        for (let i = 0; i < size; i++) {
            if (gameState.grid[row][col + i] !== null) return false;
        }
    } else {
        if (row + size > GRID_SIZE) return false;
        for (let i = 0; i < size; i++) {
            if (gameState.grid[row + i][col] !== null) return false;
        }
    }
    return true;
}

// Render grid met labels
function renderGrid() {
    const gridElement = document.getElementById('grid');
    gridElement.innerHTML = '';
    
    // Lege hoek cel
    const corner = document.createElement('div');
    corner.className = 'cell label';
    gridElement.appendChild(corner);
    
    // Letter labels (A-N)
    for (let i = 0; i < GRID_SIZE; i++) {
        const label = document.createElement('div');
        label.className = 'cell label';
        label.textContent = String.fromCharCode(65 + i);
        gridElement.appendChild(label);
    }
    
    // Rijen met nummer labels en speelvelden
    for (let row = 0; row < GRID_SIZE; row++) {
        // Nummer label
        const rowLabel = document.createElement('div');
        rowLabel.className = 'cell label';
        rowLabel.textContent = row + 1;
        gridElement.appendChild(rowLabel);
        
        // Speelvelden
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell water';
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.onclick = () => handleClick(row, col);
            gridElement.appendChild(cell);
        }
    }
}

// Handle klik op cel
function handleClick(row, col) {
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (cell.classList.contains('hit') || cell.classList.contains('miss')) {
        return;
    }
    
    const shipIndex = gameState.grid[row][col];
    
    if (shipIndex !== null) {
        // Raak!
        cell.classList.add('hit');
        cell.classList.remove('water');
        cell.textContent = '💣';
        
        // Update schip
        const ship = gameState.ships[shipIndex];
        const position = ship.positions.find(p => p.row === row && p.col === col);
        position.hit = true;
        ship.hits++;
        
        // Check of schip is gezonken
        if (ship.hits === ship.size) {
            // Markeer alle posities van het gezonken schip
            ship.positions.forEach(pos => {
                const shipCell = document.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
                shipCell.classList.remove('hit');
                shipCell.classList.add('sunk');
                shipCell.textContent = '🔥';
            });
            
            updateStatus(`Je hebt een ${ship.name} tot zinken gebracht!`);
            
            // Check game over
            if (gameState.ships.every(s => s.hits === s.size)) {
                updateStatus(`Gefeliciteerd! Alle schepen zijn gezonken!`);
            }
        } else {
            updateStatus('RAAK!');
        }
    } else {
        // Mis
        cell.classList.add('miss');
        cell.classList.remove('water');
        cell.textContent = '🌊';
        updateStatus('MIS!');
    }
    
    updateStats();
}

// Update statistieken
function updateStats() {
    const shipsLeft = gameState.ships.filter(s => s.hits < s.size).length;
    document.getElementById('shipsLeft').textContent = shipsLeft;
}

// Update status
function updateStatus(message) {
    document.getElementById('status').textContent = message;
}

// Reset game
function resetGame() {
    initializeGrid();
    placeShips();
    renderGrid();
    updateStats();
    updateStatus('Klik op een veld om aan te vallen!');
}

// Start het spel
resetGame();