#!/usr/bin/env tsx
/**
 * Generate embeddings for existing content
 * Processes articles, entities, and courses
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '../lib/ai/embeddings';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateArticleEmbeddings(limit: number = 20) {
  console.log('\n📰 Generating article embeddings...');
  
  const { data: articles, error } = await supabase
    .from('news_articles')
    .select('id, title_en, content_en, summary_en')
    .limit(limit);
  
  if (error || !articles) {
    console.error('❌ Failed to fetch articles:', error?.message);
    return 0;
  }
  
  let processed = 0;
  
  for (const article of articles) {
    // Combine title and content for better embedding
    const text = `${article.title_en}\n\n${article.summary_en || article.content_en?.slice(0, 1000)}`;
    
    const embedding = await generateEmbedding(text);
    
    if (!embedding) {
      console.log(`   ⚠️  Skipped ${article.title_en?.slice(0, 50)}...`);
      continue;
    }
    
    // Check if embedding already exists
    const { data: existing } = await supabase
      .from('content_embeddings')
      .select('id')
      .eq('content_id', article.id)
      .eq('content_type', 'article')
      .single();
    
    const { error: insertError } = existing
      ? await supabase
          .from('content_embeddings')
          .update({
            embedding,
            metadata: {
              title: article.title_en,
              generated_at: new Date().toISOString()
            }
          })
          .eq('content_id', article.id)
          .eq('content_type', 'article')
      : await supabase
          .from('content_embeddings')
          .insert({
            content_id: article.id,
            content_type: 'article',
            embedding,
            metadata: {
              title: article.title_en,
              generated_at: new Date().toISOString()
            }
          });
    
    if (insertError) {
      console.log(`   ❌ Failed to store: ${insertError.message}`);
    } else {
      processed++;
      console.log(`   ✅ ${processed}/${articles.length} - ${article.title_en?.slice(0, 60)}...`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return processed;
}

async function generateEntityEmbeddings(limit: number = 20) {
  console.log('\n🧠 Generating entity embeddings...');
  
  const { data: entities, error } = await supabase
    .from('entities')
    .select('id, name, type, description')
    .limit(limit);
  
  if (error || !entities) {
    console.error('❌ Failed to fetch entities:', error?.message);
    return 0;
  }
  
  console.log(`   Found ${entities.length} entities to process`);
  
  if (entities.length === 0) {
    console.log('   ℹ️  No entities in database yet');
    return 0;
  }
  
  let processed = 0;
  
  for (const entity of entities) {
    const text = `${entity.name} (${entity.type}): ${entity.description || ''}`;
    
    const embedding = await generateEmbedding(text);
    
    if (!embedding) {
      console.log(`   ⚠️  Skipped ${entity.name}`);
      continue;
    }
    
    const { data: existing } = await supabase
      .from('content_embeddings')
      .select('id')
      .eq('content_id', entity.id)
      .eq('content_type', 'entity')
      .single();
    
    const { error: insertError } = existing
      ? await supabase
          .from('content_embeddings')
          .update({
            embedding,
            metadata: {
              name: entity.name,
              type: entity.type,
              generated_at: new Date().toISOString()
            }
          })
          .eq('content_id', entity.id)
          .eq('content_type', 'entity')
      : await supabase
          .from('content_embeddings')
          .insert({
            content_id: entity.id,
            content_type: 'entity',
            embedding,
            metadata: {
              name: entity.name,
              type: entity.type,
              generated_at: new Date().toISOString()
            }
          });
    
    if (insertError) {
      console.log(`   ❌ Failed to store: ${insertError.message}`);
    } else {
      processed++;
      console.log(`   ✅ ${processed}/${entities.length} - ${entity.name} (${entity.type})`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return processed;
}

async function generateCourseEmbeddings(limit: number = 10) {
  console.log('\n🎓 Generating course embeddings...');
  
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title_en, title_es, description_en, description_es')
    .limit(limit);
  
  if (error || !courses) {
    console.error('❌ Failed to fetch courses:', error?.message);
    return 0;
  }
  
  console.log(`   Found ${courses.length} courses to process`);
  
  if (courses.length === 0) {
    console.log('   ℹ️  No courses in database yet');
    return 0;
  }
  
  let processed = 0;
  
  for (const course of courses) {
    const text = `${course.title_en}: ${course.description_en || ''}`;
    
    const embedding = await generateEmbedding(text);
    
    if (!embedding) {
      console.log(`   ⚠️  Skipped ${course.title_en}`);
      continue;
    }
    
    const { data: existing } = await supabase
      .from('content_embeddings')
      .select('id')
      .eq('content_id', course.id)
      .eq('content_type', 'course')
      .single();
    
    const { error: insertError } = existing
      ? await supabase
          .from('content_embeddings')
          .update({
            embedding,
            metadata: {
              title: course.title_en,
              generated_at: new Date().toISOString()
            }
          })
          .eq('content_id', course.id)
          .eq('content_type', 'course')
      : await supabase
          .from('content_embeddings')
          .insert({
            content_id: course.id,
            content_type: 'course',
            embedding,
            metadata: {
              title: course.title_en,
              generated_at: new Date().toISOString()
            }
          });
    
    if (insertError) {
      console.log(`   ❌ Failed to store: ${insertError.message}`);
    } else {
      processed++;
      console.log(`   ✅ ${processed}/${courses.length} - ${course.title_en?.slice(0, 60)}...`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return processed;
}

async function main() {
  console.log('🚀 Generating Embeddings for Existing Content');
  console.log('=============================================');
  
  try {
    const articlesProcessed = await generateArticleEmbeddings(20);
    const entitiesProcessed = await generateEntityEmbeddings(20);
    const coursesProcessed = await generateCourseEmbeddings(10);
    
    console.log('\n✅ Embedding generation complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Articles: ${articlesProcessed} processed`);
    console.log(`   - Entities: ${entitiesProcessed} processed`);
    console.log(`   - Courses: ${coursesProcessed} processed`);
    console.log(`   - Total: ${articlesProcessed + entitiesProcessed + coursesProcessed} embeddings`);
    
  } catch (error) {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  }
}

main();
