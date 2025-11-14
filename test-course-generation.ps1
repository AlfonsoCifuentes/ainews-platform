#!/usr/bin/env pwsh

# Test script for complete course generation

$baseUrl = "http://localhost:3000"

Write-Host "=== Complete Course Generation Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Generate English course
Write-Host "Test 1: Generate English Course (Beginner, Short)" -ForegroundColor Green
$payload = @{
    topic = "Machine Learning Fundamentals"
    difficulty = "beginner"
    duration = "short"
    locale = "en"
} | ConvertTo-Json

Write-Host "Payload: $payload"
Write-Host "Sending POST to /api/courses/generate-full..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/courses/generate-full" `
        -Method POST `
        -ContentType "application/json" `
        -Body $payload `
        -TimeoutSec 120

    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        
        Write-Host "✅ Success! Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Generated Course:" -ForegroundColor Cyan
        Write-Host "  Title: $($data.data.title)"
        Write-Host "  Description: $($data.data.description)"
        Write-Host "  Modules: $($data.data.modules_count)"
        Write-Host "  Total Duration: $($data.data.estimated_total_minutes) minutes"
        Write-Host "  Course ID: $($data.data.course_id)"
        Write-Host ""
        
        Write-Host "Learning Objectives:" -ForegroundColor Cyan
        $data.data.objectives | ForEach-Object {
            Write-Host "  • $_"
        }
        Write-Host ""
        
        Write-Host "Module Structure:" -ForegroundColor Cyan
        $data.data.content.modules | ForEach-Object {
            Write-Host "  • $($_.title) ($($_.estimatedMinutes) min)"
            Write-Host "    └─ $($_.description)"
        }
        Write-Host ""
        
        Write-Host "Full Response (JSON):" -ForegroundColor Yellow
        Write-Host ($data | ConvertTo-Json -Depth 10)
    } else {
        Write-Host "❌ Unexpected status: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Request failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $error = $_.Exception.Response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        Write-Host "Error details: $($error.error)"
    }
}

Write-Host ""
Write-Host "=== Test 2: Generate Spanish Course ===" -ForegroundColor Cyan
$payload2 = @{
    topic = "Deep Learning avanzado"
    difficulty = "advanced"
    duration = "long"
    locale = "es"
} | ConvertTo-Json

try {
    $response2 = Invoke-WebRequest -Uri "$baseUrl/api/courses/generate-full" `
        -Method POST `
        -ContentType "application/json" `
        -Body $payload2 `
        -TimeoutSec 120

    if ($response2.StatusCode -eq 200) {
        $data2 = $response2.Content | ConvertFrom-Json
        Write-Host "✅ Spanish course generated successfully!" -ForegroundColor Green
        Write-Host "  Title: $($data2.data.title)"
        Write-Host "  Modules: $($data2.data.modules_count)"
        Write-Host "  Duration: $($data2.data.estimated_total_minutes) min"
    } else {
        Write-Host "❌ Unexpected status: $($response2.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Request failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Tests Complete ===" -ForegroundColor Cyan
