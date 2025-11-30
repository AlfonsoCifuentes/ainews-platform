
import { sanitizeAndFixJSON, parseJSON } from '../lib/utils/json-fixer';

const testCases = [
  {
    name: "Brace wrapped string list",
    input: `
    {
      "title": "Test Course",
      "modules": [
        {
          "title": "Module 1",
          "content": {
            "Introduction": {
              "Why is this important?",
              "History of the topic",
              "Current relevance"
            }
          }
        }
      ]
    }`,
    expected: (parsed: any) => Array.isArray(parsed.modules[0].content.Introduction)
  },
  {
    name: "Mixed content with brace list",
    input: `
    {
      "key": "value",
      "list": { "item1", "item2", "item3" }
    }`,
    expected: (parsed: any) => Array.isArray(parsed.list) && parsed.list.length === 3
  },
  {
    name: "Normal object (should not change)",
    input: `
    {
      "key": "value",
      "obj": { "prop": "val" }
    }`,
    expected: (parsed: any) => !Array.isArray(parsed.obj) && parsed.obj.prop === "val"
  }
];

console.log("Running JSON Fixer Tests...\n");

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.name}`);
  try {
    console.log("Input snippet:", test.input.replace(/\s+/g, ' ').substring(0, 50) + "...");
    const fixed = sanitizeAndFixJSON(test.input);
    console.log("Fixed JSON:", fixed.replace(/\s+/g, ' ').substring(0, 50) + "...");
    
    const parsed = parseJSON(fixed, test.name);
    
    if (test.expected(parsed)) {
      console.log("✅ PASSED");
      passed++;
    } else {
      console.log("❌ FAILED: Parsed result did not match expectation");
      console.log("Parsed:", JSON.stringify(parsed, null, 2));
      failed++;
    }
  } catch (error) {
    console.log("❌ FAILED: Exception thrown");
    console.error(error);
    failed++;
  }
  console.log("-".repeat(40));
});

console.log(`\nSummary: ${passed} passed, ${failed} failed`);

if (failed > 0) process.exit(1);
