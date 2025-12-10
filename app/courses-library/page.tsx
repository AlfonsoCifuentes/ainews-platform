import { redirect } from 'next/navigation';
import { defaultLocale } from '@/i18n';

export default function CoursesLibraryRedirect() {
  return redirect(`/${defaultLocale}/courses-library`);
}
