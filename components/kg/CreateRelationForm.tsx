'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface CreateRelationFormProps {
  sourceId?: string;
  onSuccess?: () => void;
}

export function CreateRelationForm({ sourceId, onSuccess }: CreateRelationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      source_id: formData.get('source_id') as string,
      target_id: formData.get('target_id') as string,
      rel_type: formData.get('rel_type') as string,
      weight: parseFloat(formData.get('weight') as string) || 1.0,
    };
    
    try {
      const adminToken = formData.get('adminToken') as string;
      const res = await fetch('/api/kg/relations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create relation');
      }
      
      startTransition(() => {
        router.push(`/kg/${data.source_id}`);
        router.refresh();
      });
      
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div>
        <label htmlFor="source_id" className="block text-sm font-medium mb-1">
          Source Entity ID *
        </label>
        <input
          type="text"
          id="source_id"
          name="source_id"
          required
          defaultValue={sourceId}
          className="w-full rounded-md border px-3 py-2 font-mono text-sm"
          placeholder="UUID of source entity"
        />
      </div>
      
      <div>
        <label htmlFor="target_id" className="block text-sm font-medium mb-1">
          Target Entity ID *
        </label>
        <input
          type="text"
          id="target_id"
          name="target_id"
          required
          className="w-full rounded-md border px-3 py-2 font-mono text-sm"
          placeholder="UUID of target entity"
        />
      </div>
      
      <div>
        <label htmlFor="rel_type" className="block text-sm font-medium mb-1">
          Relation Type *
        </label>
        <input
          type="text"
          id="rel_type"
          name="rel_type"
          required
          className="w-full rounded-md border px-3 py-2"
          placeholder="e.g., created_by, works_for, based_on"
        />
      </div>
      
      <div>
        <label htmlFor="weight" className="block text-sm font-medium mb-1">
          Weight (0-100)
        </label>
        <input
          type="number"
          id="weight"
          name="weight"
          min="0"
          max="100"
          step="0.1"
          defaultValue="1.0"
          className="w-full rounded-md border px-3 py-2"
        />
      </div>
      
      <div>
        <label htmlFor="adminToken" className="block text-sm font-medium mb-1">
          Admin Token *
        </label>
        <input
          type="password"
          id="adminToken"
          name="adminToken"
          required
          className="w-full rounded-md border px-3 py-2"
          placeholder="Enter admin token"
        />
      </div>
      
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/50 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? 'Creating...' : 'Create Relation'}
      </button>
    </form>
  );
}
