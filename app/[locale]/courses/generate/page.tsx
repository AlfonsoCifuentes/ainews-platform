import { CourseGeneratorComplete } from '@/components/courses/CourseGeneratorComplete';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Generate AI Courses',
  description: 'Generate complete, followable AI courses on any topic'
};

export default function GenerateCoursePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 py-12">
      <CourseGeneratorComplete />
    </main>
  );
}
