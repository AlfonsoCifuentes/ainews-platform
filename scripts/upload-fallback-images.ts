#!/usr/bin/env npx tsx
/**
 * Convert fallback images to WebP and upload to Supabase Storage
 * Usage: npx tsx scripts/upload-fallback-images.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const FALLBACK_DIR = path.join(process.cwd(), 'app', 'images_fallback');
const BUCKET_NAME = 'news-fallback-images';
const WEBP_QUALITY = 85; // Good balance between quality and compression

async function ensureBucketExists() {
	const { data: buckets } = await supabase.storage.listBuckets();
	const exists = buckets?.some((b) => b.name === BUCKET_NAME);

	if (!exists) {
		console.log(`📦 Creating bucket: ${BUCKET_NAME}`);
		const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
			public: true,
			fileSizeLimit: 5 * 1024 * 1024, // 5MB
			allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
		});
		if (error) {
			console.error('Error creating bucket:', error.message);
			// Try to continue anyway - bucket might exist with different permissions
		}
	} else {
		console.log(`✅ Bucket ${BUCKET_NAME} already exists`);
	}
}

async function convertAndUpload() {
	const files = fs.readdirSync(FALLBACK_DIR).filter((f) => 
		f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
	);

	console.log(`\n🖼️  Found ${files.length} images to process\n`);

	const uploaded: string[] = [];
	const skipped: string[] = [];

	for (const file of files) {
		const inputPath = path.join(FALLBACK_DIR, file);
		const baseName = path.parse(file).name;
		
		// Create a clean filename (remove special chars, spaces)
		const cleanName = baseName
			.replace(/[^a-zA-Z0-9_-]/g, '_')
			.replace(/_+/g, '_')
			.toLowerCase();
		
		const outputName = `fallback_${cleanName}.webp`;

		try {
			// Check if already uploaded
			const { data: existing } = await supabase.storage
				.from(BUCKET_NAME)
				.list('', { search: outputName });

			if (existing && existing.length > 0) {
				console.log(`⏭️  Skipping ${file} (already uploaded)`);
				skipped.push(outputName);
				continue;
			}

			// Convert to WebP with sharp
			const webpBuffer = await sharp(inputPath)
				.webp({ quality: WEBP_QUALITY })
				.resize(1200, 675, { // 16:9 aspect ratio, good for news cards
					fit: 'cover',
					position: 'center',
				})
				.toBuffer();

			const originalSize = fs.statSync(inputPath).size;
			const newSize = webpBuffer.length;
			const savings = ((1 - newSize / originalSize) * 100).toFixed(1);

			// Upload to Supabase
			const { error } = await supabase.storage
				.from(BUCKET_NAME)
				.upload(outputName, webpBuffer, {
					contentType: 'image/webp',
					upsert: true,
				});

			if (error) {
				console.error(`❌ Error uploading ${file}:`, error.message);
				continue;
			}

			console.log(`✅ ${file} → ${outputName} (${savings}% smaller)`);
			uploaded.push(outputName);
		} catch (err) {
			console.error(`❌ Error processing ${file}:`, err);
		}
	}

	console.log(`\n📊 Summary:`);
	console.log(`   Uploaded: ${uploaded.length}`);
	console.log(`   Skipped: ${skipped.length}`);
	console.log(`   Total available: ${uploaded.length + skipped.length}`);

	// List all files in bucket
	const { data: allFiles } = await supabase.storage
		.from(BUCKET_NAME)
		.list('');

	if (allFiles && allFiles.length > 0) {
		console.log(`\n🔗 Public URLs:`);
		const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}`;
		
		// Save list to a file for reference
		const urlList = allFiles
			.filter(f => f.name.endsWith('.webp'))
			.map((f) => `${baseUrl}/${f.name}`);
		
		fs.writeFileSync(
			path.join(process.cwd(), 'lib', 'fallback-images-list.json'),
			JSON.stringify(urlList, null, 2)
		);
		console.log(`   Saved ${urlList.length} URLs to lib/fallback-images-list.json`);
	}
}

async function main() {
	console.log('🚀 Fallback Images Upload Tool\n');
	
	await ensureBucketExists();
	await convertAndUpload();
	
	console.log('\n✅ Done!');
}

main().catch(console.error);
