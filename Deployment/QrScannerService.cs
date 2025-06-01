namespace Deployment;
using Microsoft.JSInterop;

public class QrScannerService : IAsyncDisposable
{
    private readonly IJSRuntime _jsRuntime;
    private IJSObjectReference? _moduleReference;
    private bool _isInitialized;

    public QrScannerService(IJSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
    }

    public async Task<bool> InitializeAsync()
    {
        if (_isInitialized) return true;

        try
        {
            _moduleReference = await _jsRuntime.InvokeAsync<IJSObjectReference>(
                "import", "./qr-scanner-interop.js");
            
            _isInitialized = await _jsRuntime.InvokeAsync<bool>(
                "qrScannerInterop.initialize");
            
            return _isInitialized;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"QR Scanner initialization error: {ex.Message}");
            return false;
        }
    }

    public async Task<string?> ScanFromCanvasAsync(string canvasId)
    {
        if (!_isInitialized) return null;
        
        return await _jsRuntime.InvokeAsync<string?>(
            "qrScannerInterop.scanFromCanvas", canvasId);
    }

    public async Task<string?> ScanFromImageDataAsync(int width, int height, byte[] rgbaData)
    {
        if (!_isInitialized) return null;
        
        return await _jsRuntime.InvokeAsync<string?>(
            "qrScannerInterop.scanFromImageData", width, height, rgbaData);
    }

    public async ValueTask DisposeAsync()
    {
        if (_moduleReference != null)
        {
            await _moduleReference.DisposeAsync();
        }
    }
}