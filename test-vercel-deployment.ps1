# PowerShell script to test Vercel deployment

Write-Host "Testing Vercel Deployment Status..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Test 1: Demo endpoint
Write-Host ""
Write-Host "[1] Testing /api/courses/demo endpoint..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "https://ainews-platform.vercel.app/api/courses/demo" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body (ConvertTo-Json @{
            topic = "AI"
            difficulty = "beginner"
            duration = "short"
            locale = "en"
        }) `
        -SkipHttpErrorCheck
    
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
    if ($response.StatusCode -eq 200) {
        $response.Content | ConvertFrom-Json | ConvertTo-Json | Write-Host
    }
} catch {
    Write-Host "   Error: $_" -ForegroundColor Red
}

# Test 2: Provider diagnostics
Write-Host ""
Write-Host "[2] Testing /api/courses/diagnose-providers endpoint..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "https://ainews-platform.vercel.app/api/courses/diagnose-providers" `
        -SkipHttpErrorCheck
    
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
    if ($response.StatusCode -eq 200) {
        $response.Content | ConvertFrom-Json | ConvertTo-Json | Write-Host
    }
} catch {
    Write-Host "   Error: $_" -ForegroundColor Red
}

# Test 3: OpenAI diagnostics
Write-Host ""
Write-Host "[3] Testing /api/openai/diagnose endpoint..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "https://ainews-platform.vercel.app/api/openai/diagnose" `
        -SkipHttpErrorCheck
    
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
    if ($response.StatusCode -eq 200) {
        $response.Content | ConvertFrom-Json | ConvertTo-Json | Write-Host
    }
} catch {
    Write-Host "   Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Test complete" -ForegroundColor Green
