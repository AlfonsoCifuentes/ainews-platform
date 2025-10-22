"use client";

import { motion } from 'framer-motion';
import { Link } from '@/i18n';
import { Badge } from '@/components/shared/Badges';

interface Entity {
  id: string;
  name: string;
  type: string;
  description?: string | null;
}

interface EntityGridProps {
  entities: Entity[];
  noResults: string;
}

const typeEmojis: Record<string, string> = {
  person: '👤',
  organization: '🏢',
  model: '🤖',
  company: '🏭',
  paper: '📄',
  concept: '💡',
};

const typeColors: Record<string, 'primary' | 'success' | 'warning' | 'error' | 'gradient'> = {
  person: 'primary',
  organization: 'success',
  model: 'warning',
  company: 'error',
  paper: 'primary',
  concept: 'gradient',
};

export function EntityGrid({ entities, noResults }: EntityGridProps) {
  if (entities.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl border border-white/10 p-12 text-center"
      >
        <div className="mb-4 text-6xl">🔍</div>
        <p className="text-lg text-muted-foreground">{noResults}</p>
      </motion.div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {entities.map((entity, index) => (
        <motion.li
          key={entity.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.4 }}
          whileHover={{ scale: 1.03, y: -5 }}
          className="group glass cursor-pointer rounded-3xl border border-white/10 p-6 transition-all hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10"
        >
          <div className="mb-3 flex items-center justify-between">
            <Badge 
              variant={typeColors[entity.type] || 'primary'} 
              size="sm"
            >
              {typeEmojis[entity.type] || '📌'} {entity.type}
            </Badge>
            <motion.div
              initial={{ rotate: 0 }}
              whileHover={{ rotate: 15 }}
              className="text-2xl"
            >
              →
            </motion.div>
          </div>
          
          <Link 
            href={`/kg/${entity.id}`} 
            className="block"
          >
            <h3 className="mb-2 text-xl font-bold transition-colors group-hover:text-primary">
              {entity.name}
            </h3>
            {entity.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {entity.description}
              </p>
            )}
          </Link>
        </motion.li>
      ))}
    </ul>
  );
}
