-- ============================================
-- KNOWLEDGE GRAPH: ENTITY RELATIONS
-- ============================================
-- Relaciones entre entidades del knowledge graph

CREATE TABLE IF NOT EXISTS entity_relations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Entidades relacionadas
  source_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  
  -- Tipo de relación
  relation_type TEXT NOT NULL, -- 'launched', 'acquired', 'funded', 'published', 'collaborated', 'competed'
  
  -- Metadata
  weight NUMERIC(3,2) DEFAULT 1.0, -- Fuerza de la relación (0.0-1.0)
  evidence JSONB DEFAULT '{}', -- Fuentes, artículos, fechas
  
  -- Timestamps
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: no duplicados
  UNIQUE(source_id, target_id, relation_type)
);

-- Índices para performance
CREATE INDEX idx_entity_relations_source ON entity_relations(source_id);
CREATE INDEX idx_entity_relations_target ON entity_relations(target_id);
CREATE INDEX idx_entity_relations_type ON entity_relations(relation_type);
CREATE INDEX idx_entity_relations_weight ON entity_relations(weight DESC);

-- ============================================
-- CITATIONS TABLE
-- ============================================
-- Citas y evidencias que respaldan entidades y relaciones

CREATE TABLE IF NOT EXISTS citations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Referencia (puede ser entidad, relación o artículo)
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  relation_id UUID REFERENCES entity_relations(id) ON DELETE CASCADE,
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  
  -- Citation data
  quote TEXT NOT NULL, -- Cita textual
  source_url TEXT NOT NULL, -- URL del artículo original
  published_at TIMESTAMPTZ,
  
  -- Metadata
  confidence NUMERIC(3,2) DEFAULT 1.0, -- Confianza en la cita (0.0-1.0)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_citations_entity ON citations(entity_id);
CREATE INDEX idx_citations_relation ON citations(relation_id);
CREATE INDEX idx_citations_article ON citations(article_id);

-- ============================================
-- VIEWS: Queries comunes
-- ============================================

-- Vista: Entidades con su número de relaciones
CREATE OR REPLACE VIEW entity_stats AS
SELECT 
  e.id,
  e.name,
  e.type,
  COUNT(DISTINCT r1.id) + COUNT(DISTINCT r2.id) as total_relations,
  COUNT(DISTINCT r1.id) as outgoing_relations,
  COUNT(DISTINCT r2.id) as incoming_relations,
  COUNT(DISTINCT c.id) as citations_count
FROM entities e
LEFT JOIN entity_relations r1 ON e.id = r1.source_id
LEFT JOIN entity_relations r2 ON e.id = r2.target_id
LEFT JOIN citations c ON e.id = c.entity_id
GROUP BY e.id, e.name, e.type;

-- Vista: Relaciones más fuertes
CREATE OR REPLACE VIEW top_relations AS
SELECT 
  er.id,
  er.relation_type,
  e1.name as source_name,
  e1.type as source_type,
  e2.name as target_name,
  e2.type as target_type,
  er.weight,
  COUNT(c.id) as evidence_count
FROM entity_relations er
JOIN entities e1 ON er.source_id = e1.id
JOIN entities e2 ON er.target_id = e2.id
LEFT JOIN citations c ON er.id = c.relation_id
GROUP BY er.id, er.relation_type, e1.name, e1.type, e2.name, e2.type, er.weight
ORDER BY er.weight DESC, evidence_count DESC;
