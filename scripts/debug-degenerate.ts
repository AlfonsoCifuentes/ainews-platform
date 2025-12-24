#!/usr/bin/env tsx

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const envLocal = resolve(process.cwd(), '.env.local');
if (existsSync(envLocal)) {
  loadEnv({ path: envLocal });
} else {
  loadEnv();
}

import { getSupabaseServerClient } from '../lib/db/supabase';

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripOutletSuffix(text: string): string {
  return text
    .replace(/\s*[-–—|]\s*[A-Z][A-Za-zÀ-ÿ\s.,']+$/u, '')
    .replace(/\s*[-–—|]\s*EL PAÍS.*$/i, '')
    .replace(/\s*[-–—|]\s*Euronews.*$/i, '')
    .replace(/\s*[-–—|]\s*El Español.*$/i, '')
    .trim();
}

function tokenSet(input: string): Set<string> {
  const tokens = normalizeText(input).split(' ').filter(Boolean);
  return new Set(tokens);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) {
    if (b.has(t)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

async function main() {
  const db = getSupabaseServerClient();
  
  const searches = [
    'Los mejores trabajos de periodismo',
    'Jesús en versión algoritmo',
    'Verdades, mentiras y dudas',
    'Noticias diarias de un minuto',
    'Andalucía usará Inteligencia Artificial'
  ];
  
  for (const search of searches) {
    console.log(`\n=== Searching: "${search}" ===`);
    
    const { data, error } = await db.from('news_articles')
      .select('id,title_es,summary_es,content_es,is_hidden')
      .ilike('title_es', `%${search}%`)
      .limit(1);
    
    if (error) {
      console.error('Error:', error);
      continue;
    }
    
    if (!data || data.length === 0) {
      console.log('Not found');
      continue;
    }
    
    const r = data[0];
    const title = r.title_es || '';
    const summary = r.summary_es || '';
    const content = r.content_es || '';
    
    console.log('ID:', r.id);
    console.log('is_hidden:', r.is_hidden);
    console.log('Title:', title.slice(0, 100));
    console.log('Summary:', summary.slice(0, 150));
    console.log('Content length:', content.length);
    
    const t = normalizeText(title);
    const s = normalizeText(summary);
    const c = normalizeText(content);
    
    console.log('\n-- Normalized --');
    console.log('t:', t.slice(0, 80));
    console.log('s:', s.slice(0, 100));
    console.log('c (first 120):', c.slice(0, 120));
    
    console.log('\n-- Checks --');
    console.log('s === t:', s === t);
    console.log('s.startsWith(t):', s.startsWith(t));
    console.log('c.startsWith(t):', c.startsWith(t));
    console.log('c.startsWith(s):', c.startsWith(s));
    
    const tStripped = normalizeText(stripOutletSuffix(title));
    const sStripped = normalizeText(stripOutletSuffix(summary));
    console.log('tStripped:', tStripped.slice(0, 80));
    console.log('sStripped:', sStripped.slice(0, 80));
    console.log('stripped match:', tStripped === sStripped || sStripped.startsWith(tStripped));
    
    const sim = jaccard(tokenSet(title), tokenSet(summary));
    console.log('Jaccard similarity:', sim.toFixed(3));
    
    console.log('s.includes(t):', s.includes(t));
    console.log('s.length < t.length + 60:', s.length, '<', t.length + 60, '=', s.length < t.length + 60);
  }
}

main().catch(console.error);
