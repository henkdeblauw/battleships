const GRID_SIZE = 14;
const DEFAULT_SHIPS = [
    { name: 'Vliegdekschip', size: 6, count: 2 },
    { name: 'Slagschip', size: 5, count: 3 },
    { name: 'Onderzeeër', size: 4, count: 3 },
    { name: 'Kruiser', size: 3, count: 1 },
    { name: 'Torpedobootjager', size: 2, count: 3 }
];

let gameState = {
    grid: [],
    ships: []
};

let settings = {
    ships: [...DEFAULT_SHIPS],
    backgroundColor: '#0c1a3d',
    sidebarColor: '#ffffff',
    themeColor: '#0f3460'
};

// Cookie management functions
function setCookie(name, value, days = 365) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

// IMAGE STORAGE HELPERS
function setImageInStorage(dataUrl) {
    localStorage.setItem('battleships_custom_image', dataUrl);
}
function getImageFromStorage() {
    return localStorage.getItem('battleships_custom_image');
}
function deleteImageFromStorage() {
    localStorage.removeItem('battleships_custom_image');
}

function loadSidebarImage() {
    const img = document.getElementById('sidebar-image');
    const stored = getImageFromStorage();
    if (stored && stored.startsWith('data:image')) {
        img.src = stored;
    } else {
        img.src = 'logos/default.webp';
    }
}

// Load settings from cookies
function loadSettings() {
    const savedShips = getCookie('battleships_ships');
    const savedBackgroundColor = getCookie('battleships_background_color');
    const savedSidebarColor = getCookie('battleships_sidebar_color');
    const savedThemeColor = getCookie('battleships_theme_color');

    if (savedShips) {
        try {
            settings.ships = JSON.parse(savedShips);
        } catch (e) {
            console.error('Error loading ship settings:', e);
            settings.ships = [...DEFAULT_SHIPS];
        }
    }
    if (savedBackgroundColor) settings.backgroundColor = savedBackgroundColor;
    if (savedSidebarColor) settings.sidebarColor = savedSidebarColor;
    if (savedThemeColor) settings.themeColor = savedThemeColor;
    loadSidebarImage();
    applyTheme();
    updateResetImageButton();
}

// Save settings to cookies
function saveSettingsToCookies() {
    setCookie('battleships_ships', JSON.stringify(settings.ships));
    setCookie('battleships_background_color', settings.backgroundColor);
    setCookie('battleships_sidebar_color', settings.sidebarColor);
    setCookie('battleships_theme_color', settings.themeColor);
}

// Apply theme colors
function applyTheme() {
    const root = document.documentElement;
    document.body.style.backgroundColor = settings.backgroundColor;
    root.style.setProperty('--sidebar-color', settings.sidebarColor);
    root.style.setProperty('--theme-color', settings.themeColor);
    root.style.setProperty('--theme-color-light', adjustBrightness(settings.themeColor, 0.1));

    // Calculate sidebar text color based on sidebar background
    const sidebarBrightness = calculateBrightness(settings.sidebarColor);
    if (sidebarBrightness < 128) {
        // Dark sidebar: use light text
        root.style.setProperty('--sidebar-text-color', '#ffffff');
    } else {
        // Light sidebar: use dark text
        root.style.setProperty('--sidebar-text-color', '#000000');
    }

    const themeBrightness = calculateBrightness(settings.themeColor);
    if (themeBrightness < 128) {
        // Donkere kleur: hover/selectie lichter, border wit 20%
        root.style.setProperty('--theme-color-dark', adjustBrightness(settings.themeColor, 0.18));
        root.style.setProperty('--cell-hover-color', adjustBrightness(settings.themeColor, 0.22));
        root.style.setProperty('--border-color', 'rgba(255,255,255,0.2)');
    } else {
        // Lichte kleur: hover/selectie donkerder, border zwart 15%
        root.style.setProperty('--theme-color-dark', adjustBrightness(settings.themeColor, -0.1));
        root.style.setProperty('--cell-hover-color', adjustBrightness(settings.themeColor, -0.18));
        root.style.setProperty('--border-color', 'rgba(0,0,0,0.15)');
    }
}

// Color utility functions
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function calculateBrightness(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return 128; // Default to middle brightness

    // Calculate perceived brightness using standard formula
    return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
}

function adjustBrightness(hex, percent) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const adjust = (color) => {
        const newColor = Math.max(0, Math.min(255, color + (color * percent)));
        return Math.round(newColor);
    };

    const r = adjust(rgb.r);
    const g = adjust(rgb.g);
    const b = adjust(rgb.b);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Modal functions
function openSettings() {
    document.getElementById('settingsModal').style.display = 'block';
    populateShipSettings();
    populateColorSettings();
    updateResetImageButton();
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

function populateShipSettings() {
    const container = document.getElementById('shipSettings');
    container.innerHTML = '';

    settings.ships.forEach((ship, index) => {
        const shipControl = document.createElement('div');
        shipControl.className = 'ship-control';

        shipControl.innerHTML = `
            <div class="ship-info">
                <div class="ship-name">${ship.name}</div>
                <div class="ship-size">Grootte: ${ship.size}</div>
            </div>
            <div class="ship-count-controls">
                <button class="count-btn" onclick="changeShipCount(${index}, -1)">-</button>
                <div class="count-display">${ship.count}</div>
                <button class="count-btn" onclick="changeShipCount(${index}, 1)">+</button>
            </div>
        `;

        container.appendChild(shipControl);
    });
}

function populateColorSettings() {
    document.getElementById('backgroundColor').value = settings.backgroundColor;
    document.getElementById('sidebarColor').value = settings.sidebarColor;
    document.getElementById('themeColor').value = settings.themeColor;
}

function changeShipCount(index, change) {
    const newCount = settings.ships[index].count + change;
    if (newCount >= 1 && newCount <= 5) {
        settings.ships[index].count = newCount;
        populateShipSettings();
    }
}

// Pas handleImageUpload aan
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const imageData = e.target.result;
            setImageInStorage(imageData);
            loadSidebarImage();
        };
        reader.readAsDataURL(file);
    }
}

// Pas resetImage aan
function resetImage() {
    deleteImageFromStorage();
    loadSidebarImage();
    document.getElementById('imageUpload').value = '';
    updateResetImageButton();
}

function updateResetImageButton() {
    const resetBtn = document.querySelector('.reset-image-btn');
    const hasCustomImage = getImageFromStorage() !== null;

    if (resetBtn) {
        resetBtn.style.display = hasCustomImage ? 'block' : 'none';
    }
}

function saveSettings() {
    settings.backgroundColor = document.getElementById('backgroundColor').value;
    settings.sidebarColor = document.getElementById('sidebarColor').value;
    settings.themeColor = document.getElementById('themeColor').value;

    console.log('Saving settings:', settings);
    saveSettingsToCookies();
    applyTheme();
    closeSettings();
    resetGame();
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('settingsModal');
    if (event.target === modal) {
        closeSettings();
    }
}

// Initialise grid
function initializeGrid() {
    gameState.grid = Array(GRID_SIZE).fill(null).map(() =>
        Array(GRID_SIZE).fill(null)
    );
}

// Plaats schepen random
function placeShips() {
    gameState.ships = [];

    for (let shipType of settings.ships) {
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
                        shipData.positions.push({ row: r, col: c, hit: false });
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
loadSettings();
resetGame();

// Bij laden van de pagina
window.addEventListener('DOMContentLoaded', function () {
    loadSidebarImage();
});