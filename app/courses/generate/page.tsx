import { redirect } from 'next/navigation';
import { defaultLocale } from '@/i18n';

export default function CoursesGenerateRedirect() {
  return redirect(`/${defaultLocale}/courses/generate`);
}
