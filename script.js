const GRID_SIZE = 14;
const DEFAULT_SHIPS = [
    { name: 'Vliegdekschip', size: 6, count: 2 },
    { name: 'Slagschip', size: 5, count: 3 },
    { name: 'Onderzeeër', size: 4, count: 3 },
    { name: 'Kruiser', size: 3, count: 1 },
    { name: 'Torpedobootjager', size: 2, count: 3 }
];

// 20 unieke kleuren voor teams (zeer diverse kleuren met uitstekend contrast voor zwarte tekst)
const TEAM_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA726', '#AB47BC',
    '#26D0CE', '#FF7043', '#78909C', '#EC407A', '#26C6DA',
    '#66BB6A', '#FFB74D', '#8D6E63', '#90A4AE', '#EF5350',
    '#5C6BC0', '#26A69A', '#FFD54F', '#9CCC65', '#F06292'
];

let gameState = {
    grid: [],
    ships: [],
    currentTeam: null,
    attempts: 0
};

let teams = [];

// ANIMATIE SYSTEEM
let previousTeamPositions = new Map(); // teamId -> {rank, element}

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

// TEAM MANAGEMENT FUNCTIES
function addTeam(teamName) {
    if (!teamName || teamName.trim() === '') {
        alert('Voer een geldige teamnaam in!');
        return;
    }

    if (teams.length >= 20) {
        alert('Maximum aantal teams (20) bereikt!');
        return;
    }

    if (teams.some(team => team.name.toLowerCase() === teamName.toLowerCase())) {
        alert('Er bestaat al een team met deze naam!');
        return;
    }

    // Kies een kleur random uit de nog niet-gebruikte kleuren
    const usedColors = teams.map(team => team.color);
    const availableColors = TEAM_COLORS.filter(color => !usedColors.includes(color));
    let color;
    if (availableColors.length > 0) {
        color = availableColors[Math.floor(Math.random() * availableColors.length)];
    } else {
        color = TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)];
    }

    const newTeam = {
        id: Date.now(),
        name: teamName.trim(),
        color: color,
        points: 0,
        attempts: 0,
        gamesPlayed: 0
    };

    teams.push(newTeam);
    saveTeamsToStorage();
    renderTeamsList();

    // Selecteer het nieuwe team automatisch
    selectTeam(newTeam.id);
}

function removeTeam(teamId) {
    if (confirm('Weet je zeker dat je dit team wilt verwijderen?')) {
        teams = teams.filter(team => team.id !== teamId);
        saveTeamsToStorage();
        renderTeamsList();

        // Als het huidige team wordt verwijderd, selecteer dan geen team
        if (gameState.currentTeam && gameState.currentTeam.id === teamId) {
            gameState.currentTeam = null;
            updateTeamSelection();
        }
    }
}

function selectTeam(teamId) {
    if (teamId === null || teamId === undefined) {
        gameState.currentTeam = null;
    } else {
        gameState.currentTeam = teams.find(team => team.id === teamId) || null;
    }
    updateTeamSelection();
    updateStatus();
}

function updateTeamSelection() {
    // Update de teams lijst om de actieve status te tonen
    renderTeamsList();
}

function saveTeamsToStorage() {
    localStorage.setItem('battleships_teams', JSON.stringify(teams));
}

function loadTeamsFromStorage() {
    const savedTeams = localStorage.getItem('battleships_teams');
    if (savedTeams) {
        try {
            teams = JSON.parse(savedTeams);
        } catch (e) {
            console.error('Error loading teams:', e);
            teams = [];
        }
    }
}

function renderTeamsList() {
    const teamsList = document.getElementById('teamsList');
    if (!teamsList) return;

    // Toon "geen teams" bericht als er geen teams zijn
    if (teams.length === 0) {
        teamsList.innerHTML = '<div class="no-teams">Nog geen teams toegevoegd</div>';
        return;
    }

    // Sorteer teams op punten (hoogste eerst)
    const sortedTeams = [...teams].sort((a, b) => b.points - a.points);

    // FLIP: 1. Meet oude posities
    const itemRects = new Map();
    const existingElements = Array.from(teamsList.querySelectorAll('.team-list-item'));
    existingElements.forEach(el => {
        itemRects.set(parseInt(el.dataset.teamId), el.getBoundingClientRect());
    });

    // 2. DOM sorteren volgens punten
    // Maak een document fragment voor performance
    const fragment = document.createDocumentFragment();
    sortedTeams.forEach((team, index) => {
        let el = teamsList.querySelector(`.team-list-item[data-team-id="${team.id}"]`);
        if (!el) {
            el = createTeamElement(team, index);
        }
        // Update content (rank, teamnaam, punten, pogingen, active)
        const rankElement = el.querySelector('.team-rank');
        if (rankElement) {
            let rankText = `${index + 1}`;
            if (index === 0) rankText = '🥇';
            else if (index === 1) rankText = '🥈';
            else if (index === 2) rankText = '🥉';
            rankElement.textContent = rankText;
        }
        const teamNameElement = el.querySelector('.team-name');
        if (teamNameElement) teamNameElement.textContent = team.name;
        const pointsElement = el.querySelector('.points-value');
        if (pointsElement) pointsElement.textContent = team.points;
        const attemptsElement = el.querySelector('.team-attempts');
        if (attemptsElement) attemptsElement.textContent = `Pogingen: ${team.attempts}`;
        const teamElement = el.querySelector('.team-item');
        if (teamElement) {
            if (gameState.currentTeam && gameState.currentTeam.id === team.id) {
                teamElement.classList.add('active');
            } else {
                teamElement.classList.remove('active');
                teamElement.style.backgroundColor = team.color;
            }
        }
        fragment.appendChild(el);
    });
    // Verwijder oude nodes die niet meer bestaan
    existingElements.forEach(el => {
        const teamId = parseInt(el.dataset.teamId);
        if (!sortedTeams.find(team => team.id === teamId)) {
            el.remove();
        }
    });
    // Voeg gesorteerde fragment toe
    teamsList.innerHTML = '';
    teamsList.appendChild(fragment);

    // 3. Meet nieuwe posities
    const newElements = Array.from(teamsList.querySelectorAll('.team-list-item'));
    newElements.forEach(el => {
        const teamId = parseInt(el.dataset.teamId);
        const oldRect = itemRects.get(teamId);
        const newRect = el.getBoundingClientRect();
        if (oldRect) {
            const deltaY = oldRect.top - newRect.top;
            if (deltaY !== 0) {
                el.style.transform = `translateY(${deltaY}px)`;
                el.style.transition = 'transform 0s';
                // Force reflow
                el.getBoundingClientRect();
                // 4. Laat het element animeren naar zijn nieuwe plek
                requestAnimationFrame(() => {
                    el.style.transform = '';
                    el.style.transition = 'transform 0.5s cubic-bezier(0.4,0,0.2,1)';
                });
                // 5. Reset transition na animatie
                el.addEventListener('transitionend', function handler() {
                    el.style.transition = '';
                    el.removeEventListener('transitionend', handler);
                });
            }
        }
    });
}

function createTeamElement(team, index) {
    const listItem = document.createElement('div');
    listItem.className = 'team-list-item';
    listItem.dataset.teamId = team.id;
    listItem.dataset.rank = index;

    // Maak de rank element met emoji's voor top 3
    const rankElement = document.createElement('div');
    rankElement.className = 'team-rank';

    let rankText = `${index + 1}`;
    if (index === 0) rankText = '🥇';
    else if (index === 1) rankText = '🥈';
    else if (index === 2) rankText = '🥉';

    rankElement.textContent = rankText;

    // Maak het team item element
    const teamElement = document.createElement('div');
    teamElement.className = 'team-item';
    if (gameState.currentTeam && gameState.currentTeam.id === team.id) {
        teamElement.classList.add('active');
    } else {
        teamElement.style.backgroundColor = team.color;
    }

    teamElement.innerHTML = `
        <div class="team-content">
            <div class="team-info">
                <div class="team-name">${team.name}</div>
                <div class="team-attempts">Pogingen: ${team.attempts}</div>
            </div>
            <div class="team-points">
                <span class="points-value">${team.points}</span>
            </div>
        </div>
    `;

    teamElement.addEventListener('click', () => selectTeam(team.id));
    teamElement.addEventListener('contextmenu', (e) => showContextMenu(e, team.id));

    listItem.appendChild(rankElement);
    listItem.appendChild(teamElement);

    return listItem;
}

function animateTeamMovement(element, oldIndex, newIndex) {
    // Bereken afstand
    const itemHeight = element.offsetHeight + 6; // 6px gap
    const distance = (newIndex - oldIndex) * itemHeight;

    // Voeg animatie klasse toe
    element.classList.add('animating');

    // Force reflow voor soepele animatie
    element.offsetHeight;

    // Start animatie
    element.style.transform = `translateY(${distance}px)`;

    // Reset na animatie
    setTimeout(() => {
        element.classList.remove('animating');
        element.style.transform = '';
    }, 600);
}



function addPointsToCurrentTeam(points) {
    if (gameState.currentTeam) {
        gameState.currentTeam.points += points;
        saveTeamsToStorage();
        renderTeamsList();
    }
}

function incrementAttempts() {
    gameState.attempts++;
    if (gameState.currentTeam) {
        gameState.currentTeam.attempts++;
        saveTeamsToStorage();
        renderTeamsList();
    }
}

// CONTEXT MENU FUNCTIES
function showContextMenu(event, teamId) {
    event.preventDefault();

    // Verwijder bestaand context menu
    const existingMenu = document.getElementById('contextMenu');
    if (existingMenu) {
        existingMenu.remove();
    }

    // Maak nieuw context menu
    const contextMenu = document.createElement('div');
    contextMenu.id = 'contextMenu';
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `
        <div class="context-menu-item" onclick="editTeamName(${teamId}); hideContextMenu();">
            <span>Teamnaam wijzigen</span>
        </div>
        <div class="context-menu-item" onclick="removeTeam(${teamId}); hideContextMenu();">
            <span>Team verwijderen</span>
        </div>
    `;

    // Positioneer het menu
    contextMenu.style.left = event.pageX + 'px';
    contextMenu.style.top = event.pageY + 'px';

    document.body.appendChild(contextMenu);

    // Verberg menu bij klik buiten menu
    setTimeout(() => {
        document.addEventListener('click', hideContextMenu, { once: true });
    }, 0);
}

function hideContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    if (contextMenu) {
        contextMenu.remove();
    }
}

function editTeamName(teamId) {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    const newName = prompt('Voer een nieuwe teamnaam in:', team.name);

    if (newName && newName.trim() !== '') {
        const trimmedName = newName.trim();

        // Check of de naam al bestaat bij een ander team
        const existingTeam = teams.find(t => t.id !== teamId && t.name.toLowerCase() === trimmedName.toLowerCase());
        if (existingTeam) {
            alert('Er bestaat al een team met deze naam!');
            return;
        }

        team.name = trimmedName;
        saveTeamsToStorage();
        renderTeamsList();
        updateTeamSelection();
    }
}



// TEAM TOEVOEGING VIA PROMPT
function addTeamFromPrompt() {
    const teamName = prompt('Voer een teamnaam in:');

    if (teamName && teamName.trim() !== '') {
        addTeam(teamName.trim());
    }
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
    loadTeamsFromStorage();
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
    loadSettings();
    populateColorSettings();
    updateResetImageButton();
    document.getElementById('settingsModal').style.display = 'block';
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

function openNewGameModal() {
    populateShipSettings();
    document.getElementById('newGameModal').style.display = 'block';
}

function closeNewGameModal() {
    document.getElementById('newGameModal').style.display = 'none';
}

function startNewGame() {
    // Sla de huidige ship settings op
    saveSettingsToCookies();
    closeNewGameModal();
    resetGame();
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
    // Bewaar de huidige team selectie
    const currentTeamId = gameState.currentTeam ? gameState.currentTeam.id : null;

    settings.backgroundColor = document.getElementById('backgroundColor').value;
    settings.sidebarColor = document.getElementById('sidebarColor').value;
    settings.themeColor = document.getElementById('themeColor').value;

    console.log('Saving settings:', settings);
    saveSettingsToCookies();
    applyTheme();

    // Herstel de team selectie
    if (currentTeamId) {
        selectTeam(currentTeamId);
    }

    closeSettings();
    // GEEN resetGame() hier - alleen instellingen opslaan
}

function fullReset() {
    if (confirm('Weet je zeker dat je een volledige reset wilt uitvoeren?\n\nDit zal:\n• Alle teams verwijderen\n• Alle kleuren resetten naar standaard\n• Het logo resetten naar standaard\n• Alle instellingen resetten\n\nDeze actie kan niet ongedaan worden gemaakt!')) {
        // Reset teams
        teams = [];
        gameState.currentTeam = null;
        saveTeamsToStorage();

        // Reset settings naar standaard
        settings = {
            ships: [...DEFAULT_SHIPS],
            backgroundColor: '#0c1a3d',
            sidebarColor: '#ffffff',
            themeColor: '#0f3460'
        };

        // Reset logo
        deleteImageFromStorage();

        // Reset cookies
        deleteCookie('battleships_ships');
        deleteCookie('battleships_background_color');
        deleteCookie('battleships_sidebar_color');
        deleteCookie('battleships_theme_color');

        // Pas nieuwe instellingen toe
        applyTheme();
        loadSidebarImage();
        renderTeamsList();
        updateStatus('Selecteer een team om te beginnen!');

        // Reset het spel
        resetGame();

        // Sluit modal
        closeSettings();

        alert('Volledige reset voltooid! Alle instellingen en teams zijn verwijderd.');
    }
}

// Close modals when clicking outside
window.onclick = function (event) {
    const settingsModal = document.getElementById('settingsModal');
    const newGameModal = document.getElementById('newGameModal');

    if (event.target === settingsModal) {
        closeSettings();
    }
    if (event.target === newGameModal) {
        closeNewGameModal();
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
    if (!gameState.currentTeam) {
        alert('Selecteer eerst een team om te spelen!');
        return;
    }

    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (cell.classList.contains('hit') || cell.classList.contains('miss')) {
        return;
    }

    incrementAttempts();
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

        // Voeg 1 punt toe voor de hit
        addPointsToCurrentTeam(1);

        // Check of schip is gezonken
        if (ship.hits === ship.size) {
            // Markeer alle posities van het gezonken schip
            ship.positions.forEach(pos => {
                const shipCell = document.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
                shipCell.classList.remove('hit');
                shipCell.classList.add('sunk');
                shipCell.textContent = '🔥';
            });

            // Voeg bonus punten toe voor gezonken schip (gelijk aan grootte van schip)
            addPointsToCurrentTeam(ship.size);
            updateStatus(`Team ${gameState.currentTeam.name} heeft een ${ship.name} tot zinken gebracht! +${ship.size} bonus punten!`);

            // Check game over
            if (gameState.ships.every(s => s.hits === s.size)) {
                gameState.currentTeam.gamesPlayed++;
                saveTeamsToStorage();
                renderTeamsList();
                showGameEndScreen();
            }
        } else {
            updateStatus('RAAK! +1 punt');
        }
    } else {
        // Mis
        cell.classList.add('miss');
        cell.classList.remove('water');
        cell.textContent = '🌊';
        updateStatus('MIS!');
    }

    updateStats();

    // Schakel active state uit na een poging
    gameState.currentTeam = null;
    updateTeamSelection();
}

function showGameEndScreen() {
    const gridElement = document.getElementById('grid');

    // Sorteer teams op punten voor top 3
    const sortedTeams = [...teams].sort((a, b) => b.points - a.points);
    const top3 = sortedTeams.slice(0, 3);

    // Maak eindscherm HTML
    let endScreenHTML = `
        <div class="game-end-screen">
            <div class="game-end-title">Einde! 🎉</div>
            <div class="game-end-subtitle">Alle schepen zijn gezonken!</div>
            <div class="top3-container">
    `;

    // Voeg top 3 teams toe
    top3.forEach((team, index) => {
        const rankText = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';

        endScreenHTML += `
            <div class="top3-team">
                <div class="top3-rank">${rankText}</div>
                <div class="top3-team-item" style="background-color: ${team.color};">
                    <div class="top3-team-content">
                        <div class="top3-team-info">
                            <div class="top3-team-name">${team.name}</div>
                            <div class="top3-team-attempts">Pogingen: ${team.attempts}</div>
                        </div>
                        <div class="top3-team-points">
                            <span class="top3-points-value">${team.points}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    endScreenHTML += `
            </div>
        </div>
    `;

    // Voeg de overlay toe aan het grid in plaats van het te vervangen
    gridElement.insertAdjacentHTML('beforeend', endScreenHTML);
}

// Update statistieken
function updateStats() {
    const shipsLeft = gameState.ships.filter(s => s.hits < s.size).length;
    document.getElementById('shipsLeft').textContent = shipsLeft;
}

// Update status
function updateStatus(message) {
    if (message) {
        document.getElementById('status').textContent = message;
    } else {
        // Update status gebaseerd op huidige team
        if (gameState.currentTeam) {
            const shipsLeft = gameState.ships.filter(s => s.hits < s.size).length;
            if (shipsLeft === 0) {
                document.getElementById('status').textContent = `Spel voltooid! Alle schepen zijn gezonken!`;
            } else {
                document.getElementById('status').textContent = `Team ${gameState.currentTeam.name} is aan zet`;
            }
        } else {
            document.getElementById('status').textContent = 'Klik op een team in het klassement om te beginnen!';
        }
    }
}

// Reset game
function resetGame() {
    gameState.attempts = 0;
    initializeGrid();
    placeShips();
    renderGrid();
    updateStats();
    updateStatus();
}

// Start het spel
loadSettings();
renderTeamsList();
updateTeamSelection();
resetGame();

// Simple password protection
function checkAccess() {
    const password = document.getElementById('passwordField').value;
    const errorMsg = document.getElementById('errorMsg');
    
    if (password === 'Kleimoer9030') {
        setCookie('game_access', 'granted', 1); // 1 day
        document.getElementById('passwordOverlay').style.display = 'none';
        errorMsg.textContent = '';
    } else {
        errorMsg.textContent = 'Onjuist wachtwoord';
        document.getElementById('passwordField').value = '';
    }
}

// Check if already authenticated on page load
function checkAuthentication() {
    const access = getCookie('game_access');
    if (access === 'granted') {
        document.getElementById('passwordOverlay').style.display = 'none';
    }
}

// Fullscreen API functions
function enterFullscreen() {
    const elem = document.documentElement;
    
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { // Safari
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { // IE11
        elem.msRequestFullscreen();
    } else if (elem.mozRequestFullScreen) { // Firefox
        elem.mozRequestFullScreen();
    }
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { // Safari
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { // IE11
        document.msExitFullscreen();
    } else if (document.mozCancelFullScreen) { // Firefox
        document.mozCancelFullScreen();
    }
}

// Bij laden van de pagina
window.addEventListener('DOMContentLoaded', function () {
    checkAuthentication();
    loadSidebarImage();
    renderTeamsList();
    updateTeamSelection();
    
    // Add enter key support
    document.getElementById('passwordField').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkAccess();
        }
    });
});