import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/db/supabase';

const graphSchema = z.object({
  limit: z.coerce.number().min(1).max(500).default(100),
  minWeight: z.coerce.number().min(0).max(1).default(0.3),
});

export async function GET(req: NextRequest) {
  try {
    const params = graphSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    const db = getSupabaseServerClient();

    // Fetch top relations with source and target entities
    const { data: relations, error } = await db
      .from('entity_relations')
      .select(`
        source_id,
        target_id,
        relation_type,
        weight,
        evidence,
        source:entities!entity_relations_source_id_fkey(id, name, type),
        target:entities!entity_relations_target_id_fkey(id, name, type)
      `)
      .gte('weight', params.minWeight)
      .order('weight', { ascending: false })
      .limit(params.limit);

    if (error) throw error;

    // Extract unique entities
    const entitiesMap = new Map();
    const formattedRelations = relations?.map((rel) => {
      const source = Array.isArray(rel.source) ? rel.source[0] : rel.source;
      const target = Array.isArray(rel.target) ? rel.target[0] : rel.target;
      
      if (source) entitiesMap.set(source.id, source);
      if (target) entitiesMap.set(target.id, target);

      return {
        sourceId: rel.source_id,
        targetId: rel.target_id,
        type: rel.relation_type,
        weight: rel.weight,
        evidence: rel.evidence,
      };
    }) || [];

    const entities = Array.from(entitiesMap.values());

    return NextResponse.json({ 
      data: {
        entities,
        relations: formattedRelations,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
