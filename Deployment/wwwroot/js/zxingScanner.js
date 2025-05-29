// zxingScanner.js
window.zxingScanner = (function() {
    let videoElem = null;
    let canvasElem = null;
    let stream = null;
    let scanning = false;
    let animationFrame;
    let codeReader = null;
    let overlayElem = null;

    async function startZXingScanner(dotNetHelper) {
        videoElem = document.getElementById("zxing-video");
        canvasElem = document.getElementById("zxing-canvas");
        overlayElem = document.querySelector(".scan-overlay");

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

            // Check if ZXing is available
            if (typeof ZXing === 'undefined') {
                console.error('ZXing library not loaded');
                return;
            }
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

            try {
                const result = codeReader.decodeFromCanvas(canvasElem);
                if (result) {
                    showScanSuccess();
                    dotNetHelper.invokeMethodAsync("OnQRCodeDetected", result.text);
                    return;
                }
            } catch (ex) {
                // No QR code found, continue scanning
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

    function stopZXingScanner() {
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

    // Public API
    return {
        startZXingScanner,
        stopZXingScanner
    };
})();