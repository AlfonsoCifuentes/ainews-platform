import { getTranslations } from 'next-intl/server';
import { CreateEntityForm } from '@/components/kg/CreateEntityForm';
import { CreateRelationForm } from '@/components/kg/CreateRelationForm';
import { Link } from '@/i18n';

export const dynamic = 'force-dynamic';

export default async function AdminKGPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'kg' });
  
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/kg" className="text-sm text-muted-foreground hover:underline">
          ← {t('back')}
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-8">Admin: Knowledge Graph Management</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Create Entity</h2>
          <CreateEntityForm />
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-4">Create Relation</h2>
          <CreateRelationForm />
        </section>
      </div>
      
      <div className="mt-12 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <p className="font-medium mb-2">🔒 Admin Access Required</p>
        <p>
          You need an admin token (set in <code className="px-1 py-0.5 rounded bg-background">ADMIN_TOKEN</code> env var) 
          to create entities and relations. This protects write operations while keeping read access public.
        </p>
      </div>
    </main>
  );
}
