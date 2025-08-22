const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif'
};

const server = http.createServer((req, res) => {
    console.log(`Received request for: ${req.url}`);

    // Special case for the cheat sheet file which might have spaces in the name
    if (req.url.includes('Fantasy%20Football%20Cheat%20Sheet_%202025.html') ||
        req.url.includes('Fantasy Football Cheat Sheet_ 2025.html')) {
        const cheatSheetPath = path.join(__dirname, 'assets', 'sheet', 'Fantasy Football Cheat Sheet_ 2025.html');
        console.log(`Special handling for cheat sheet: ${cheatSheetPath}`);

        fs.readFile(cheatSheetPath, (err, content) => {
            if (err) {
                console.error(`Error reading cheat sheet: ${err}`);
                res.writeHead(500);
                res.end(`Server Error: Could not read cheat sheet file`);
            } else {
                console.log(`Successfully served cheat sheet`);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content, 'utf8');
            }
        });
        return;
    }

    // If the request is for root, serve index.html
    let filePath = req.url === '/'
        ? path.join(__dirname, 'index.html')
        : path.join(__dirname, req.url);

    // Get the file extension
    const ext = path.extname(filePath);
    let contentType = MIME_TYPES[ext] || 'application/octet-stream';

    console.log(`Attempting to serve: ${filePath}`);

    // Check if file exists before trying to read it
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.log(`File not found: ${filePath}`);

            // Page not found
            fs.readFile(path.join(__dirname, '404.html'), (err, content) => {
                if (err) {
                    console.error(`Error serving 404 page: ${err}`);
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<h1>404 - Page Not Found</h1>', 'utf8');
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end(content, 'utf8');
                }
            });
            return;
        }

        // File exists, read it
        fs.readFile(filePath, (err, content) => {
            if (err) {
                console.error(`Error reading file: ${err}`);
                // Server error
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            } else {
                // Success
                console.log(`Successfully served: ${filePath}`);
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf8');
            }
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Press Ctrl+C to stop the server`);
});
