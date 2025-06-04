using AirCode.Services.Cryptography;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Deployment;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });
//ok starting off
builder.Services.AddScoped<QrScannerService>();
builder.Services.AddScoped<ICryptographyService,CryptographyService>();
await builder.Build().RunAsync();