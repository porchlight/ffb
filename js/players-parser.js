/**
 * Players parser - Extracts player data from the Fantasy Football Cheat Sheet HTML
 */
class PlayersParser {
    constructor() {
        this.players = {
            overall: [],
            qb: [],
            rb: [],
            wr: [],
            te: [],
            k: [],
            dst: []
        };
        this.loaded = false;
    }

    /**
     * Load and parse the default HTML cheat sheet
     */
    async loadDefaultData() {
        try {
            // Check if there's a custom cheat sheet in localStorage
            let html;
            if (localStorage.getItem('custom_cheat_sheet')) {
                console.log("Loading custom cheat sheet from localStorage");
                html = localStorage.getItem('custom_cheat_sheet');
            } else {
                console.log("Loading default cheat sheet from assets");
                try {
                    const paths = [
                        'assets/sheet/Fantasy Football Cheat Sheet_ 2026.html',
                        '/assets/sheet/Fantasy Football Cheat Sheet_ 2026.html'
                    ];

                    let fetchSuccess = false;
                    let lastError = null;

                    // Try each path until one works
                    for (const testPath of paths) {
                        try {
                            console.log(`Trying to fetch cheat sheet from: ${testPath}`);
                            const response = await fetch(testPath);

                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }

                            html = await response.text();
                            console.log(`Successfully loaded cheat sheet from: ${testPath}`);
                            fetchSuccess = true;
                            break;
                        } catch (e) {
                            console.log(`Failed to fetch from ${testPath}: ${e.message}`);
                            lastError = e;
                        }
                    }

                    if (!fetchSuccess) {
                        throw new Error(`Failed to load cheat sheet from any path: ${lastError?.message}`);
                    }
                } catch (e) {
                    console.error("All fetch attempts failed:", e);
                    throw e;
                }
            }

            // Create a temporary DOM element to parse the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Clear existing data
            this.players = {
                overall: [],
                qb: [],
                rb: [],
                wr: [],
                te: [],
                k: [],
                dst: []
            };

            console.log("Parsing position sections...");

            // Parse each position section first
            this.parsePositionSection(doc, 'Quarterbacks', 'qb');
            this.parsePositionSection(doc, 'Running Backs', 'rb');
            this.parsePositionSection(doc, 'Wide Receivers', 'wr');
            this.parsePositionSection(doc, 'Tight Ends', 'te');
            this.parsePositionSection(doc, 'Kickers', 'k');
            this.parsePositionSection(doc, 'Defenses/Special Teams', 'dst');

            // Parse overall section last so we can determine positions
            this.parsePositionSection(doc, 'Overall', 'overall');

            console.log("Finished parsing position sections. Position player counts:", {
                qb: this.players.qb.length,
                rb: this.players.rb.length,
                wr: this.players.wr.length,
                te: this.players.te.length,
                k: this.players.k.length,
                dst: this.players.dst.length,
                overall: this.players.overall.length
            });

            // Update positions in the overall list
            this.updateOverallPositions();

            // Make sure ranks match array order
            this.normalizeRanks();

            this.loaded = true;
            return true;
        } catch (error) {
            console.error('Error loading default data:', error);
            return false;
        }
    }

    /**
     * Normalize ranks to match array order
     */
    normalizeRanks() {
        // For each position category, make sure rank matches array index + 1
        for (const posKey of Object.keys(this.players)) {
            this.players[posKey].forEach((player, index) => {
                player.rank = index + 1;
                player.id = `${posKey}-${index + 1}`;
            });
        }

        console.log("Normalized ranks for all player lists");
    }

    /**
     * Update positions in the overall list by cross-referencing with position-specific lists
     */
    updateOverallPositions() {
        console.log("Updating positions in overall list...");
        console.log("Current overall player count:", this.players.overall.length);

        // Track position changes for debugging
        const changes = [];

        this.players.overall.forEach((player, index) => {
            const oldPosition = player.position;

            // Try to find this player in a position-specific list
            for (const posKey of ['qb', 'rb', 'wr', 'te', 'k', 'dst']) {
                const posPlayer = this.players[posKey].find(p =>
                    p.name === player.name && p.team === player.team
                );

                if (posPlayer) {
                    player.position = posPlayer.position;

                    // Track position changes for debugging
                    if (oldPosition !== player.position) {
                        changes.push({
                            index: index + 1,
                            name: player.name,
                            team: player.team,
                            oldPosition: oldPosition,
                            newPosition: player.position
                        });
                    }

                    break;
                }
            }
        });

        // Log the first few players and any position changes
        console.log("Updated positions in overall list. First 5 players:",
            this.players.overall.slice(0, 5).map(p => ({
                rank: p.rank,
                name: p.name,
                team: p.team,
                position: p.position
            }))
        );

        if (changes.length > 0) {
            console.log(`Position changes made (${changes.length}):`, changes);
        } else {
            console.log("No position changes were needed");
        }

        return changes.length; // Return the number of changes made
    }

    /**
     * Parse a position section from the HTML
     */
    parsePositionSection(doc, positionTitle, positionKey) {
        // Find the position header
        const headers = Array.from(doc.querySelectorAll('p.position-header strong'));
        const header = headers.find(h => h.textContent === positionTitle);

        if (!header) {
            console.warn(`Position section not found: ${positionTitle}`);
            return;
        }

        // Get the parent element containing the player list
        let currentElement = header.parentElement;

        // Find all player divs that are siblings of the header
        let playerDivs = [];

        // Navigate to the parent container
        while (currentElement &&
            !currentElement.classList.contains('span25') &&
            !currentElement.id.startsWith('playerlist-')) {
            currentElement = currentElement.parentElement;
        }

        if (!currentElement) {
            console.warn(`Player list container not found for: ${positionTitle}`);
            return;
        }

        // Get all direct div children that contain player data
        playerDivs = Array.from(currentElement.children).filter(el => {
            return el.tagName === 'DIV' &&
                !el.classList.contains('auction-value') &&
                el.textContent.trim().match(/^\d+\.\s+.+,\s+[A-Z]{1,4}\s*$/);
        });

        // If this is the "Overall" section, we need to check the next span25 elements too
        if (positionTitle === 'Overall') {
            let nextSpan = currentElement.nextElementSibling;
            while (nextSpan && nextSpan.classList.contains('span25')) {
                // Get player divs from this span
                const moreDivs = Array.from(nextSpan.children).filter(el => {
                    return el.tagName === 'DIV' &&
                        !el.classList.contains('auction-value') &&
                        el.textContent.trim().match(/^\d+\.\s+.+,\s+[A-Z]{1,4}\s*$/);
                });

                playerDivs = playerDivs.concat(moreDivs);
                nextSpan = nextSpan.nextElementSibling;
            }
        }

        // Parse each player element
        playerDivs.forEach(el => {
            const text = el.textContent.trim();
            const match = text.match(/^(\d+)\.\s+(.+),\s+([A-Z]{1,4})\s*$/);

            if (match) {
                const [, rank, name, team] = match;

                // Determine position based on the section
                let position = positionKey.toUpperCase();
                if (positionKey === 'overall') {
                    // For overall, we'll update positions after all lists are parsed
                    position = 'FLEX';
                } else if (positionKey === 'dst') {
                    position = 'DST';
                }

                this.players[positionKey].push({
                    id: `${positionKey}-${rank}`,
                    rank: parseInt(rank, 10),
                    name: name.trim(),
                    team: team.trim(),
                    position: position,
                    tag: ''
                });
            }
        });

        // Sort by rank
        this.players[positionKey].sort((a, b) => a.rank - b.rank);
    }

    /**
     * Try to determine a player's position by looking at the name/team combination
     */
    determinePosition(name, team) {
        // Check if the player exists in any of the position-specific lists
        for (const position of ['qb', 'rb', 'wr', 'te', 'k', 'dst']) {
            // We can't check the position-specific lists if they haven't been parsed yet
            if (!this.players[position] || this.players[position].length === 0) {
                continue;
            }

            // Look for the player in this position list
            const player = this.players[position].find(p =>
                p.name === name && p.team === team
            );

            if (player) {
                return player.position;
            }
        }

        // If not found, make a best guess based on naming patterns
        if (name.includes(' Defense') || name.includes('D/ST') || name.includes('DST')) {
            return 'DST';
        }

        // For team names that likely represent DST
        if (!name.includes(' ')) {
            return 'DST';
        }

        // Default to FLEX if we can't determine
        return "FLEX";
    }

    /**
     * Get players by position
     */
    getPlayersByPosition(position) {
        if (!this.loaded) {
            console.warn('Player data not loaded yet');
            return [];
        }

        return this.players[position] || [];
    }

    /**
     * Get all players
     */
    getAllPlayers() {
        if (!this.loaded) {
            console.warn('Player data not loaded yet');
            return {};
        }

        return this.players;
    }

    /**
     * Find a player by name and team across all position lists
     */
    findPlayerByNameAndTeam(name, team) {
        for (const posKey of Object.keys(this.players)) {
            const player = this.players[posKey].find(p =>
                p.name === name && p.team === team
            );

            if (player) {
                return {
                    player,
                    positionKey: posKey
                };
            }
        }

        return null;
    }

    /**
     * Get a player's position based on name and team
     * @param {string} name - Player name
     * @param {string} team - Player team
     * @returns {string} - Position string or "FLEX" if not found
     */
    getPlayerPosition(name, team) {
        // First check position-specific lists which have reliable position data
        const positionCategories = ['qb', 'rb', 'wr', 'te', 'k', 'dst'];
        for (const category of positionCategories) {
            const found = this.players[category].find(
                player => player.name === name && player.team === team
            );
            if (found) return found.position;
        }

        // If not found in position lists, check overall
        const overallPlayer = this.players.overall.find(
            player => player.name === name && player.team === team
        );
        return overallPlayer ? overallPlayer.position : "FLEX";
    }
}

// Create a global instance
const playersParser = new PlayersParser();
