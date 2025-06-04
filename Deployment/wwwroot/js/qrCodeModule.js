// Updated qrCodeModule.js with fallback support
let wasmModule;
let wasmInitialized = false;
let wasmAvailable = false;

// Try to import WASM module, but provide fallback if not available
async function tryInitWasm() {
    try {
        const wasmModule = await import('../wasm/qr_code_generator');
        await wasmModule.default(); // Initialize WASM
        wasmInitialized = true;
        wasmAvailable = true;
        console.log("WASM QR module initialized successfully");
        return wasmModule;
    } catch (error) {
        console.warn("WASM QR module not available, using fallback:", error.message);
        wasmAvailable = false;
        return null;
    }
}

export async function initWasm() {
    if (!wasmInitialized && !wasmAvailable) {
        wasmModule = await tryInitWasm();
    }
    return wasmInitialized;
}

// Fallback QR code generation using a simple library approach
function generateFallbackQRCode(text, size, darkColor, lightColor) {
    // Create a simple SVG-based QR code placeholder
    // This is a basic implementation - you might want to use a library like qrcode-generator
    const svg = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="${lightColor}"/>
            <rect x="10%" y="10%" width="80%" height="80%" fill="${darkColor}"/>
            <rect x="15%" y="15%" width="70%" height="70%" fill="${lightColor}"/>
            <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="12" fill="${darkColor}">
                QR Code
            </text>
            <text x="50%" y="65%" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="8" fill="${darkColor}">
                ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}
            </text>
        </svg>
    `;
    return svg;
}

export async function generateQrCode(text, size, darkColor, lightColor) {
    try {
        await initWasm();

        if (wasmAvailable && wasmModule) {
            return wasmModule.generate_qr_code(text, size, darkColor, lightColor);
        } else {
            console.log("Using fallback QR code generation");
            return generateFallbackQRCode(text, size, darkColor, lightColor);
        }
    } catch (error) {
        console.error("Error generating QR code, using fallback:", error);
        return generateFallbackQRCode(text, size, darkColor, lightColor);
    }
}

export async function generateEnhancedQrCode(text, size, darkColor, lightColor, options = {}) {
    try {
        await initWasm();

        // Generate base QR code (either WASM or fallback)
        let baseSvg;
        if (wasmAvailable && wasmModule) {
            baseSvg = wasmModule.generate_qr_code(text, size, darkColor, lightColor);
        } else {
            baseSvg = generateFallbackQRCode(text, size, darkColor, lightColor);
        }

        // Parse the SVG to a DOM object to manipulate it properly
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(baseSvg, "image/svg+xml");
        const svgElement = svgDoc.documentElement;

        // Check for parsing errors
        const parserError = svgDoc.querySelector('parsererror');
        if (parserError) {
            console.error('SVG parsing error:', parserError.textContent);
            return baseSvg; // Return original if parsing fails
        }

        // If we want to use gradient
        if (options.useGradient) {
            const gradId = `qrGradient_${Math.random().toString(36).substring(2, 9)}`;
            const gradientDirection = options.gradientDirection || "linear-x";
            const gradColor1 = options.gradientColor1 || darkColor;
            const gradColor2 = options.gradientColor2 || darkColor;

            // Create defs element
            const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

            // Create gradient element
            let gradient;
            if (gradientDirection === "radial") {
                gradient = document.createElementNS("http://www.w3.org/2000/svg", "radialGradient");
                gradient.setAttribute("cx", "50%");
                gradient.setAttribute("cy", "50%");
                gradient.setAttribute("r", "50%");
            } else {
                gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");

                if (gradientDirection === "linear-x") {
                    gradient.setAttribute("x1", "0%");
                    gradient.setAttribute("y1", "50%");
                    gradient.setAttribute("x2", "100%");
                    gradient.setAttribute("y2", "50%");
                } else if (gradientDirection === "linear-y") {
                    gradient.setAttribute("x1", "50%");
                    gradient.setAttribute("y1", "0%");
                    gradient.setAttribute("x2", "50%");
                    gradient.setAttribute("y2", "100%");
                } else if (gradientDirection === "diagonal") {
                    gradient.setAttribute("x1", "0%");
                    gradient.setAttribute("y1", "0%");
                    gradient.setAttribute("x2", "100%");
                    gradient.setAttribute("y2", "100%");
                }
            }

            gradient.setAttribute("id", gradId);

            // Create stops
            const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            stop1.setAttribute("offset", "0%");
            stop1.setAttribute("stop-color", gradColor1);

            const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            stop2.setAttribute("offset", "100%");
            stop2.setAttribute("stop-color", gradColor2);

            // Add stops to gradient
            gradient.appendChild(stop1);
            gradient.appendChild(stop2);

            // Add gradient to defs
            defs.appendChild(gradient);

            // Add defs to SVG
            svgElement.insertBefore(defs, svgElement.firstChild);

            // Replace all dark color fills with gradient
            const paths = svgElement.querySelectorAll('path, rect');
            paths.forEach(path => {
                if (path.getAttribute('fill') === darkColor) {
                    path.setAttribute('fill', `url(#${gradId})`);
                }
            });
        }

        // If we want to add a logo
        if (options.logoUrl) {
            const logoSizeRatio = options.logoSizeRatio || 0.25;
            const logoSize = Math.floor(size * logoSizeRatio);
            const logoX = Math.floor((size - logoSize) / 2);
            const logoY = Math.floor((size - logoSize) / 2);

            // Create image element
            const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
            image.setAttribute("href", options.logoUrl);
            image.setAttribute("x", logoX);
            image.setAttribute("y", logoY);
            image.setAttribute("width", logoSize);
            image.setAttribute("height", logoSize);
            image.setAttribute("preserveAspectRatio", "xMidYMid slice");

            // Add image to SVG
            svgElement.appendChild(image);

            // Add border around logo if requested
            if (options.addLogoBorder) {
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", logoX);
                rect.setAttribute("y", logoY);
                rect.setAttribute("width", logoSize);
                rect.setAttribute("height", logoSize);
                rect.setAttribute("fill", "none");
                rect.setAttribute("stroke", options.logoBorderColor || "white");
                rect.setAttribute("stroke-width", options.logoBorderWidth || "2");

                // Add border radius if specified
                if (options.logoBorderRadius) {
                    rect.setAttribute("rx", options.logoBorderRadius);
                    rect.setAttribute("ry", options.logoBorderRadius);
                }

                // Add border to SVG
                svgElement.appendChild(rect);
            }
        }

        // Serialize SVG back to string
        const serializer = new XMLSerializer();
        return serializer.serializeToString(svgDoc);
    } catch (error) {
        console.error("Error generating enhanced QR code:", error);
        // Return basic QR code as fallback
        return await generateQrCode(text, size, darkColor, lightColor);
    }
}

export function setSvgContent(elementId, svgContent) {
    const element = document.getElementById(elementId);
    if (element) {
        console.log(`Setting SVG content for element: ${elementId}`);
        console.log("SVG content length:", svgContent.length);
        element.innerHTML = svgContent;
    } else {
        console.error(`Element with ID '${elementId}' not found`);
    }
}

// Debug function to check module status
export function getModuleStatus() {
    return {
        wasmInitialized,
        wasmAvailable,
        hasWasmModule: !!wasmModule
    };
}