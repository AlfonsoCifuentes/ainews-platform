"use client";

import { motion } from 'framer-motion';
import { TextSplit } from '@/components/shared/TextAnimations';
import { ScrollAnimate } from '@/components/shared/ScrollEffects';
import { Badge } from '@/components/shared/Badges';

interface Course {
  id: number;
  title: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  icon: string;
}

interface CourseCatalogProps {
  title: string;
  beginner: string;
  intermediate: string;
  advanced: string;
}

export function CourseCatalog({ title, beginner, intermediate, advanced }: CourseCatalogProps) {
  const courses: Course[] = [
    { 
      id: 1, 
      title: 'Introduction to Machine Learning', 
      difficulty: 'beginner', 
      duration: '2h 30min', 
      icon: '🤖' 
    },
    { 
      id: 2, 
      title: 'Deep Learning Fundamentals', 
      difficulty: 'intermediate', 
      duration: '4h 15min', 
      icon: '🧠' 
    },
    { 
      id: 3, 
      title: 'Natural Language Processing', 
      difficulty: 'advanced', 
      duration: '6h 45min', 
      icon: '💬' 
    }
  ];

  const difficultyLabels = {
    beginner,
    intermediate,
    advanced
  };

  return (
    <ScrollAnimate direction="up" delay={0.2}>
      <section className="mt-16">
        <h2 className="mb-6 text-2xl font-bold">
          <TextSplit text={title} by="word" />
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              whileHover={{ scale: 1.03, y: -5 }}
              className="glass group cursor-pointer rounded-3xl border border-white/10 p-6 transition-all hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10"
            >
              <div className="mb-4 flex h-32 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20">
                <span className="text-6xl">{course.icon}</span>
              </div>
              <h3 className="mb-2 text-xl font-bold transition-colors group-hover:text-primary">
                {course.title}
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Comprehensive course covering key concepts and practical applications...
              </p>
              <div className="flex items-center justify-between">
                <Badge variant="primary" size="sm">
                  {difficultyLabels[course.difficulty]}
                </Badge>
                <span className="text-sm text-muted-foreground">{course.duration}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </ScrollAnimate>
  );
}
