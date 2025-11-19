const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openRouterKey = process.env.OPENROUTER_API_KEY;

if (!url || !serviceKey || !openRouterKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function callLLM(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'meta-llama/llama-2-70b-chat',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2500,
      temperature: 0.7
    });

    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${openRouterKey}`,
        'HTTP-Referer': 'https://ainews-platform.vercel.app'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.choices && json.choices[0] && json.choices[0].message) {
            resolve(json.choices[0].message.content);
          } else if (json.error) {
            reject(new Error(json.error.message));
          } else {
            reject(new Error('Invalid response format'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function generateModuleContent(moduleTitle, courseTitle, index, totalModules) {
  const prompt = `You are an expert Machine Learning educator. Generate comprehensive educational content for the following module.

Course: ${courseTitle}
Module ${index}/${totalModules}: ${moduleTitle}

Requirements:
- Write 3000+ characters of detailed, well-structured content
- Include practical examples and use cases
- Break content into clear sections with headers
- Use real-world applications
- Include key concepts, formulas, and theory
- Add practical tips and best practices
- Make it engaging and educational
- Format with proper markdown headers and lists
- Language: English

Start the content directly, no preamble.`;

  console.log(`Generating content for: ${moduleTitle}...`);
  const content = await callLLM(prompt);
  return content;
}

async function updateModuleContent(courseId, moduleId, contentEn) {
  const { error } = await supabase
    .from('course_modules')
    .update({ content_en: contentEn })
    .eq('id', moduleId)
    .eq('course_id', courseId);

  if (error) throw error;
}

async function generateCourseContent() {
  try {
    // Get the ML course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title_en, course_modules(id, title_en, order_index)')
      .eq('id', 'fee98e01-89fb-49b2-b0e7-adafe129069d')
      .single();

    if (courseError) throw courseError;

    console.log(`\nGenerating content for course: ${course.title_en}`);
    console.log(`Total modules: ${course.course_modules.length}\n`);

    const modules = course.course_modules.sort((a, b) => a.order_index - b.order_index);

    for (let i = 0; i < modules.length; i++) {
      const mod = modules[i];
      try {
        const content = await generateModuleContent(
          mod.title_en,
          course.title_en,
          i + 1,
          modules.length
        );

        await updateModuleContent(course.id, mod.id, content);
        console.log(`✅ Module ${i + 1}/${modules.length} updated (${content.length} chars)`);
        
        // Rate limiting
        if (i < modules.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch (error) {
        console.error(`❌ Error updating module ${i + 1}: ${error.message}`);
      }
    }

    console.log('\n✅ Course content generation complete!');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

generateCourseContent();
