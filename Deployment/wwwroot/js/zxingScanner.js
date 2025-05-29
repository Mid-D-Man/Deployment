let videoElem = null;
let canvasElem = null;
let stream = null;
let scanning = false;
let animationFrame;

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
        scanning = true;
        tick(dotNetHelper);
    } catch (err) {
        console.error("Error accessing camera:", err);
    }
}

function tick(dotNetHelper) {
    if (!scanning) return;
    if (videoElem.readyState === videoElem.HAVE_ENOUGH_DATA) {
        canvasElem.width = videoElem.videoWidth;
        canvasElem.height = videoElem.videoHeight;
        let context = canvasElem.getContext("2d");
        context.drawImage(videoElem, 0, 0, canvasElem.width, canvasElem.height);

        let imageData = context.getImageData(0, 0, canvasElem.width, canvasElem.height);

        try {
            const codeReader = new ZXing.BrowserQRCodeReader();
            codeReader.decodeFromImageData(imageData)
                .then(result => {
                    dotNetHelper.invokeMethodAsync("OnQRCodeDetected", result.text);
                })
                .catch(err => {
                    // No QR code found, continue scanning
                });
        } catch (ex) {
            console.error("Error during ZXing scanning", ex);
        }
    }
    animationFrame = requestAnimationFrame(() => tick(dotNetHelper));
}

export function stopZXingScanner() {
    scanning = false;
    cancelAnimationFrame(animationFrame);
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}