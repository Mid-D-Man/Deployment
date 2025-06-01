let wasmModule = null;
let scannerInstance = null;

window.qrScannerInterop = {
    async initialize() {
        try {
            const { default: init, QrScanner } = await import('./js/mid_qr_scanner.js');
            await init();
            scannerInstance = new QrScanner();
            wasmModule = true;
            return true;
        } catch (error) {
            console.error('QR Scanner initialization failed:', error);
            return false;
        }
    },

    scanFromCanvas(canvasId) {
        if (!scannerInstance) return null;

        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        return scannerInstance.scan_rgba_image(
            canvas.width,
            canvas.height,
            imageData.data
        );
    },

    scanFromImageData(width, height, rgbaData) {
        if (!scannerInstance) return null;
        return scannerInstance.scan_rgba_image(width, height, rgbaData);
    }
};