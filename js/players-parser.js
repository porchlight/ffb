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
            const response = await fetch('assets/sheet/Fantasy Football Cheat Sheet_ 2025.html');
            const html = await response.text();

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

            // Parse each position section first
            this.parsePositionSection(doc, 'Quarterbacks', 'qb');
            this.parsePositionSection(doc, 'Running Backs', 'rb');
            this.parsePositionSection(doc, 'Wide Receivers', 'wr');
            this.parsePositionSection(doc, 'Tight Ends', 'te');
            this.parsePositionSection(doc, 'Kickers', 'k');
            this.parsePositionSection(doc, 'Defenses/Special Teams', 'dst');

            // Parse overall section last so we can determine positions
            this.parsePositionSection(doc, 'Overall', 'overall');

            // Update positions in the overall list
            this.updateOverallPositions();

            this.loaded = true;
            return true;
        } catch (error) {
            console.error('Error loading default data:', error);
            return false;
        }
    }

    /**
     * Update positions in the overall list by cross-referencing with position-specific lists
     */
    updateOverallPositions() {
        this.players.overall.forEach(player => {
            // Try to find this player in a position-specific list
            for (const posKey of ['qb', 'rb', 'wr', 'te', 'k', 'dst']) {
                const posPlayer = this.players[posKey].find(p =>
                    p.name === player.name && p.team === player.team
                );

                if (posPlayer) {
                    player.position = posPlayer.position;
                    break;
                }
            }
        });
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
}

// Create a global instance
const playersParser = new PlayersParser();
