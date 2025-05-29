let videoElem = null;
let canvasElem = null;
let stream = null;
let scanning = false;
let animationFrame;
let barcodeDetector = null;
let overlayElem = null;

export async function startBackupScanner(dotNetHelper) {
    videoElem = document.getElementById("backup-video");
    canvasElem = document.getElementById("backup-canvas");
    overlayElem = document.querySelector(".scan-overlay");

    // Check for native BarcodeDetector support
    if ('BarcodeDetector' in window) {
        try {
            barcodeDetector = new BarcodeDetector({
                formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8']
            });
        } catch (err) {
            console.warn("BarcodeDetector not supported:", err);
            return false;
        }
    } else {
        console.warn("BarcodeDetector not available in this browser");
        return false;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Camera API not supported.");
        return false;
    }

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });
        videoElem.srcObject = stream;
        videoElem.setAttribute("playsinline", true);
        await videoElem.play();

        scanning = true;
        tick(dotNetHelper);
        return true;
    } catch (err) {
        console.error("Error accessing camera:", err);
        return false;
    }
}

async function tick(dotNetHelper) {
    if (!scanning || !barcodeDetector) return;

    if (videoElem.readyState === videoElem.HAVE_ENOUGH_DATA) {
        try {
            const barcodes = await barcodeDetector.detect(videoElem);
            if (barcodes.length > 0) {
                showScanSuccess();
                await dotNetHelper.invokeMethodAsync("OnQRCodeDetected", barcodes[0].rawValue);
                return;
            }
        } catch (err) {
            console.warn("Barcode detection failed:", err);
        }
    }

    animationFrame = requestAnimationFrame(() => tick(dotNetHelper));
}

function showScanSuccess() {
    if (overlayElem) {
        overlayElem.classList.add("scan-success");
        setTimeout(() => {
            overlayElem.classList.remove("scan-success");
        }, 500);
    }
}

export function stopBackupScanner() {
    scanning = false;
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}