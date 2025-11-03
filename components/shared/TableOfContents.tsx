'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { List } from 'lucide-react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  locale: 'en' | 'es';
}

export function TableOfContents({ locale }: TableOfContentsProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  const t = locale === 'en' ? {
    title: 'Table of Contents',
  } : {
    title: 'Tabla de Contenidos',
  };

  useEffect(() => {
    // Find all headings in the article
    const headings = document.querySelectorAll('article h2, article h3');
    const tocItems: TocItem[] = [];

    headings.forEach((heading, index) => {
      const id = heading.id || `heading-${index}`;
      if (!heading.id) {
        heading.id = id;
      }

      tocItems.push({
        id,
        text: heading.textContent || '',
        level: heading.tagName === 'H2' ? 2 : 3,
      });
    });

    setItems(tocItems);

    // Intersection Observer for active section
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -80% 0px' }
    );

    headings.forEach((heading) => observer.observe(heading));

    return () => {
      headings.forEach((heading) => observer.unobserve(heading));
    };
  }, []);

  if (items.length === 0) {
    return null;
  }

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Header height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="sticky top-24 p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <List className="h-5 w-5 text-primary" />
        <h3 className="font-bold">{t.title}</h3>
      </div>

      <nav className="space-y-2">
        {items.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => scrollToHeading(item.id)}
            whileHover={{ x: 4 }}
            className={`block w-full text-left text-sm transition-colors ${
              item.level === 3 ? 'pl-4' : ''
            } ${
              activeId === item.id
                ? 'text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className={`inline-block py-1 border-l-2 pl-3 ${
              activeId === item.id ? 'border-primary' : 'border-transparent'
            }`}>
              {item.text}
            </span>
          </motion.button>
        ))}
      </nav>
    </div>
  );
}
