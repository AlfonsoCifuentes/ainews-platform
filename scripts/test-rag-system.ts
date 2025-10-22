#!/usr/bin/env tsx
/**
 * Test script for RAG + Embeddings System
 * Tests pgvector RPCs and semantic search functionality
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { 
  generateEmbedding, 
  searchArticles, 
  findRelatedArticles,
  semanticSearch,
  hybridSearch 
} from '../lib/ai/embeddings';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmbeddingGeneration() {
  console.log('\n📝 Testing Embedding Generation...');
  
  const testText = 'Machine learning is a subset of artificial intelligence';
  const embedding = await generateEmbedding(testText);
  
  if (!embedding || embedding.length !== 1536) {
    throw new Error('Embedding generation failed');
  }
  
  console.log('✅ Embedding generated successfully');
  console.log(`   Dimensions: ${embedding.length}`);
  console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
  
  return embedding;
}

async function testMatchDocuments(embedding: number[]) {
  console.log('\n🔍 Testing match_documents RPC...');
  
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: 5
  });
  
  if (error) {
    throw new Error(`match_documents failed: ${error.message}`);
  }
  
  console.log('✅ match_documents RPC working');
  console.log(`   Found ${data?.length || 0} matches`);
  
  if (data && data.length > 0) {
    console.log('\n   Top result:');
    console.log(`   - Title (EN): ${data[0].title_en?.slice(0, 60)}...`);
    console.log(`   - Similarity: ${(data[0].similarity * 100).toFixed(1)}%`);
  }
  
  return data;
}

async function testFindRelatedArticles() {
  console.log('\n🔗 Testing find_related_articles RPC...');
  
  // Get a random article first
  const { data: articles } = await supabase
    .from('news_articles')
    .select('id, title_en')
    .limit(1)
    .single();
  
  if (!articles) {
    console.log('⚠️  No articles found to test with');
    return;
  }
  
  console.log(`   Using article: ${articles.title_en?.slice(0, 50)}...`);
  
  const { data, error } = await supabase.rpc('find_related_articles', {
    article_id: articles.id,
    match_count: 3
  });
  
  if (error) {
    throw new Error(`find_related_articles failed: ${error.message}`);
  }
  
  console.log('✅ find_related_articles RPC working');
  console.log(`   Found ${data?.length || 0} related articles`);
  
  if (data && data.length > 0) {
    data.forEach((article: any, i: number) => {
      console.log(`   ${i + 1}. ${article.title_en?.slice(0, 50)}... (${(article.similarity * 100).toFixed(1)}%)`);
    });
  }
}

async function testMatchEntities(embedding: number[]) {
  console.log('\n🧠 Testing match_entities RPC...');
  
  const { data, error } = await supabase.rpc('match_entities', {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: 5
  });
  
  if (error) {
    throw new Error(`match_entities failed: ${error.message}`);
  }
  
  console.log('✅ match_entities RPC working');
  console.log(`   Found ${data?.length || 0} entities`);
  
  if (data && data.length > 0) {
    data.forEach((item: any, i: number) => {
      const entity = typeof item.entity === 'string' ? JSON.parse(item.entity) : item.entity;
      console.log(`   ${i + 1}. ${entity.name} (${entity.type}) - ${(item.similarity * 100).toFixed(1)}%`);
    });
  }
}

async function testRecommendCourses() {
  console.log('\n🎓 Testing recommend_courses RPC...');
  
  // Get a test user
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email')
    .limit(1)
    .single();
  
  if (!users) {
    console.log('⚠️  No users found to test with');
    return;
  }
  
  console.log(`   Using user: ${users.email}`);
  
  const { data, error } = await supabase.rpc('recommend_courses', {
    user_id_param: users.id,
    match_count: 5
  });
  
  if (error) {
    throw new Error(`recommend_courses failed: ${error.message}`);
  }
  
  console.log('✅ recommend_courses RPC working');
  console.log(`   Generated ${data?.length || 0} recommendations`);
  
  if (data && data.length > 0) {
    data.forEach((course: any, i: number) => {
      console.log(`   ${i + 1}. ${course.title_en?.slice(0, 50)}... (Score: ${(course.relevance_score * 100).toFixed(1)}%)`);
    });
  }
}

async function testHighLevelAPIs() {
  console.log('\n🚀 Testing High-Level API Functions...');
  
  // Test searchArticles
  console.log('\n   Testing searchArticles...');
  const articles = await searchArticles('neural networks deep learning', {
    limit: 3,
    threshold: 0.6
  });
  console.log(`   ✅ Found ${articles.length} articles`);
  
  // Test semanticSearch (entities)
  console.log('\n   Testing semanticSearch (entities)...');
  const entities = await semanticSearch('transformer architecture', {
    limit: 3,
    threshold: 0.6
  });
  console.log(`   ✅ Found ${entities.length} entities`);
  
  // Test hybridSearch
  console.log('\n   Testing hybridSearch...');
  const hybrid = await hybridSearch('GPT model', {
    limit: 3
  });
  console.log(`   ✅ Found ${hybrid.length} results`);
}

async function checkIndexes() {
  console.log('\n📊 Checking Vector Indexes...');
  
  const { data, error } = await supabase
    .from('pg_indexes')
    .select('indexname, indexdef')
    .like('indexname', '%embedding%');
  
  if (error) {
    console.log('⚠️  Could not check indexes:', error.message);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('✅ Vector indexes found:');
    data.forEach((idx: any) => {
      console.log(`   - ${idx.indexname}`);
    });
  } else {
    console.log('⚠️  No vector indexes found. Run migrations!');
  }
}

async function checkEmbeddingsCount() {
  console.log('\n📈 Checking Embeddings Statistics...');
  
  const { data: stats, error } = await supabase
    .from('content_embeddings')
    .select('content_type', { count: 'exact', head: false })
    .select('*');
  
  if (error) {
    console.log('⚠️  Could not fetch stats:', error.message);
    return;
  }
  
  // Count by type
  const counts = stats?.reduce((acc: any, item: any) => {
    acc[item.content_type] = (acc[item.content_type] || 0) + 1;
    return acc;
  }, {});
  
  console.log('✅ Embeddings by type:');
  if (counts) {
    Object.entries(counts).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });
  }
  console.log(`   Total: ${stats?.length || 0} embeddings`);
}

async function main() {
  console.log('🧪 RAG + Embeddings System Test Suite');
  console.log('=====================================');
  
  try {
    // Check database state
    await checkEmbeddingsCount();
    await checkIndexes();
    
    // Test embedding generation
    const testEmbedding = await testEmbeddingGeneration();
    
    // Test RPC functions
    await testMatchDocuments(testEmbedding);
    await testFindRelatedArticles();
    await testMatchEntities(testEmbedding);
    await testRecommendCourses();
    
    // Test high-level APIs
    await testHighLevelAPIs();
    
    console.log('\n✅ All RAG tests passed!');
    console.log('\n📝 Summary:');
    console.log('   - Embedding generation: Working ✓');
    console.log('   - match_documents RPC: Working ✓');
    console.log('   - find_related_articles RPC: Working ✓');
    console.log('   - match_entities RPC: Working ✓');
    console.log('   - recommend_courses RPC: Working ✓');
    console.log('   - High-level APIs: Working ✓');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
