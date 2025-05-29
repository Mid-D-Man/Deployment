let videoElem = null;
let canvasElem = null;
let stream = null;
let scanning = false;
let animationFrame;
let codeReader = null;

export async function startZXingScanner(dotNetHelper) {
    videoElem = document.getElementById("zxing-video");
    canvasElem = document.getElementById("zxing-canvas");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Camera API not supported.");
        return;
    }

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });
        videoElem.srcObject = stream;
        videoElem.setAttribute("playsinline", true);
        await videoElem.play();

        // Initialize the code reader once
        codeReader = new ZXing.BrowserQRCodeReader();
        scanning = true;
        tick(dotNetHelper);
    } catch (err) {
        console.error("Error accessing camera:", err);
    }
}

function tick(dotNetHelper) {
    if (!scanning || !codeReader) return;

    if (videoElem.readyState === videoElem.HAVE_ENOUGH_DATA) {
        canvasElem.width = videoElem.videoWidth;
        canvasElem.height = videoElem.videoHeight;
        let context = canvasElem.getContext("2d", { willReadFrequently: true });
        context.drawImage(videoElem, 0, 0, canvasElem.width, canvasElem.height);

        let imageData = context.getImageData(0, 0, canvasElem.width, canvasElem.height);

        try {
            // Use decodeFromCanvas or create ImageData compatible format
            const result = codeReader.decodeFromCanvas(canvasElem);
            if (result) {
                dotNetHelper.invokeMethodAsync("OnQRCodeDetected", result.text);
                return; // Stop scanning after successful decode
            }
        } catch (ex) {
            // No QR code found or other error, continue scanning
        }
    }
    animationFrame = requestAnimationFrame(() => tick(dotNetHelper));
}

export function stopZXingScanner() {
    scanning = false;
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    if (codeReader) {
        codeReader.reset();
    }
}