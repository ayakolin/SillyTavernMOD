/**
 * STC-MOD Script Injection Middleware
 * 
 * Injects STC-MOD scripts into HTML responses without modifying official code.
 * This middleware intercepts HTML responses and adds necessary script tags.
 */

/**
 * Middleware to inject STC-MOD heartbeat script into HTML pages
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 * @param {import('express').NextFunction} next 
 */
export function injectHeartbeatScript(req, res, next) {
    // Only inject for logged-in users
    if (!req.session?.handle) {
        return next();
    }

    // Intercept res.send to inject script
    const originalSend = res.send;
    
    res.send = function(data) {
        // Only process HTML responses
        const contentType = res.get('Content-Type') || '';
        if (contentType.includes('text/html') && typeof data === 'string') {
            // Inject heartbeat script before </body> tag
            const scriptTag = '<script src="/stc-assets/heartbeat.js"></script>';
            
            if (data.includes('</body>')) {
                data = data.replace('</body>', `${scriptTag}\n</body>`);
            } else if (data.includes('</html>')) {
                // Fallback: inject before </html> if no </body>
                data = data.replace('</html>', `${scriptTag}\n</html>`);
            }
        }
        
        // Call original send with modified data
        return originalSend.call(this, data);
    };
    
    next();
}
