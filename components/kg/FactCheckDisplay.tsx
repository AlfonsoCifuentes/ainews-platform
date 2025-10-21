'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';

interface FactCheck {
  id: string;
  claim: string;
  verdict: 'true' | 'false' | 'misleading' | 'unverified' | 'needs-context';
  confidence: number;
  evidence: {
    citations: string[];
    reasoning: string;
  };
  checked_at: string;
}

interface FactCheckDisplayProps {
  entityId?: string;
  relationId?: string;
}

const verdictColors = {
  true: 'success',
  false: 'destructive',
  misleading: 'warning',
  unverified: 'secondary',
  'needs-context': 'outline',
} as const;

const verdictLabels = {
  true: 'Verified True',
  false: 'False',
  misleading: 'Misleading',
  unverified: 'Unverified',
  'needs-context': 'Needs Context',
};

export function FactCheckDisplay({ entityId, relationId }: FactCheckDisplayProps) {
  const [factChecks, setFactChecks] = useState<FactCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFactChecks = async () => {
      try {
        const params = new URLSearchParams();
        if (entityId) params.set('entity_id', entityId);
        if (relationId) params.set('relation_id', relationId);

        const res = await fetch(`/api/fact-checks?${params}`);
        if (res.ok) {
          const data = await res.json();
          setFactChecks(data.data || []);
        }
      } catch (error) {
        console.error('Failed to load fact checks:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadFactChecks();
  }, [entityId, relationId]);

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading fact checks...
      </div>
    );
  }

  if (factChecks.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No fact checks available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {factChecks.map((check) => {
        const borderColor = 
          check.verdict === 'true' ? 'border-l-green-500' :
          check.verdict === 'false' ? 'border-l-red-500' :
          check.verdict === 'misleading' ? 'border-l-yellow-500' : 'border-l-gray-500';
        
        return (
          <Card key={check.id} className={`border-l-4 ${borderColor}`}>
            <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm">{check.claim}</p>
              <Badge variant={verdictColors[check.verdict]}>
                {verdictLabels[check.verdict]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">Confidence:</span>{' '}
                <span className={
                  check.confidence >= 0.8 ? 'text-green-600' :
                  check.confidence >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                }>
                  {(check.confidence * 100).toFixed(0)}%
                </span>
              </div>
              {check.evidence?.reasoning && (
                <div>
                  <span className="font-semibold">Reasoning:</span>
                  <p className="mt-1 text-muted-foreground">
                    {check.evidence.reasoning}
                  </p>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Checked: {new Date(check.checked_at).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    })}
    </div>
  );
}
