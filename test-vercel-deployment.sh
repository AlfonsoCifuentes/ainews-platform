#!/bin/bash
# Test script to verify Vercel deployment

echo "🔍 Testing Vercel Deployment Status..."
echo "================================================"

# Test 1: Demo endpoint
echo ""
echo "1️⃣ Testing /api/courses/demo endpoint..."
curl -X POST https://ainews-platform.vercel.app/api/courses/demo \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "AI",
    "difficulty": "beginner",
    "duration": "short",
    "locale": "en"
  }' \
  -w "\nHTTP Status: %{http_code}\n"

# Test 2: Provider diagnostics
echo ""
echo "2️⃣ Testing /api/courses/diagnose-providers endpoint..."
curl -X GET https://ainews-platform.vercel.app/api/courses/diagnose-providers \
  -w "\nHTTP Status: %{http_code}\n"

# Test 3: OpenAI diagnostics
echo ""
echo "3️⃣ Testing /api/openai/diagnose endpoint..."
curl -X GET https://ainews-platform.vercel.app/api/openai/diagnose \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "================================================"
echo "✅ Test complete"
