'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface CreateEntityFormProps {
  onSuccess?: () => void;
}

export function CreateEntityForm({ onSuccess }: CreateEntityFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      type: formData.get('type') as string,
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      aliases: (formData.get('aliases') as string)
        ?.split(',')
        .map((a) => a.trim())
        .filter(Boolean) || [],
    };
    
    try {
      const adminToken = formData.get('adminToken') as string;
      const res = await fetch('/api/kg/entities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create entity');
      }
      
      const result = await res.json();
      startTransition(() => {
        router.push(`/kg/${result.data.id}`);
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
        <label htmlFor="type" className="block text-sm font-medium mb-1">
          Type *
        </label>
        <select
          id="type"
          name="type"
          required
          className="w-full rounded-md border px-3 py-2"
          defaultValue="concept"
        >
          <option value="person">Person</option>
          <option value="organization">Organization</option>
          <option value="model">Model</option>
          <option value="company">Company</option>
          <option value="paper">Paper</option>
          <option value="concept">Concept</option>
        </select>
      </div>
      
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          className="w-full rounded-md border px-3 py-2"
          placeholder="e.g., GPT-4, Sam Altman, Neural Networks"
        />
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="w-full rounded-md border px-3 py-2"
          placeholder="Brief description of this entity..."
        />
      </div>
      
      <div>
        <label htmlFor="aliases" className="block text-sm font-medium mb-1">
          Aliases (comma-separated)
        </label>
        <input
          type="text"
          id="aliases"
          name="aliases"
          className="w-full rounded-md border px-3 py-2"
          placeholder="e.g., GPT4, ChatGPT-4"
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
        {isPending ? 'Creating...' : 'Create Entity'}
      </button>
    </form>
  );
}
