"use client";

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, BookOpenCheck, ListTree, Lock, X } from 'lucide-react';
import type { NormalizedModule } from '@/lib/courses/normalize';
import { ModuleSidebar } from '@/components/courses/ModuleSidebar';
import { ModuleNavigation } from '@/components/courses/ModuleNavigation';
import { ModulePlayer } from '@/components/courses/ModulePlayer';
import { ModuleHeaderIllustration } from '@/components/courses/ModuleHeaderIllustration';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useBookMode } from '@/lib/hooks/useBookMode';

interface CourseSummary {
	title_en: string;
	title_es: string;
	thumbnail_url?: string | null;
}

interface ProgressRecord {
	module_id: string;
	completed: boolean;
	completed_at?: string | null;
}

interface CurrentProgress extends ProgressRecord {
	id: string;
}

interface CourseLearnExperienceProps {
	locale: 'en' | 'es';
	courseId: string;
	course: CourseSummary;
	modules: NormalizedModule[];
	currentModule: NormalizedModule;
	userProgress: ProgressRecord[];
	enrollmentId: string;
	currentProgress?: CurrentProgress;
}

export function CourseLearnExperience({
	locale,
	courseId,
	course,
	modules,
	currentModule,
	userProgress,
	enrollmentId,
	currentProgress,
}: CourseLearnExperienceProps) {
	const [bookMode, setBookMode] = useState(true);
	const [indexOpen, setIndexOpen] = useState(false);
	const router = useRouter();
	const { setBookMode: setGlobalBookMode } = useBookMode();

	// Sync local bookMode with global context (for hiding header/footer)
	useEffect(() => {
		setGlobalBookMode(bookMode);
		return () => setGlobalBookMode(false);
	}, [bookMode, setGlobalBookMode]);

	const navigationState = useMemo(() => {
		const completionMap: Record<string, boolean> = {};
		userProgress.forEach((progress) => {
			if (progress.completed) {
				completionMap[progress.module_id] = true;
			}
		});

		const currentIndex = modules.findIndex((m) => m.id === currentModule.id);
		const prevModule = currentIndex > 0 ? modules[currentIndex - 1] : null;
		const nextModule = currentIndex < modules.length - 1 ? modules[currentIndex + 1] : null;
		const completedCount = modules.filter((module) => completionMap[module.id]).length;
		const isNextLocked = nextModule ? (!nextModule.is_free && !completionMap[currentModule.id]) : false;

		return { completionMap, currentIndex, prevModule, nextModule, completedCount, isNextLocked };
	}, [currentModule.id, modules, userProgress]);

	const { completionMap, currentIndex, prevModule, nextModule, completedCount, isNextLocked } = navigationState;
	const progressPercent = modules.length ? Math.round((completedCount / modules.length) * 100) : 0;
	const localization = locale === 'en'
		? {
				enterBook: 'Immerse in book mode',
				exitBook: 'Exit book mode',
				showIndex: 'Open index',
				hideIndex: 'Hide index',
				quickIndex: 'Quick index',
				locked: 'Locked',
				chapter: 'Chapter',
				courseLabel: 'Course',
				readingTime: 'Estimated reading time',
				xpEarned: 'XP earned in chapter',
				progress: 'Global progress',
				nextLocked: 'Complete current spread to continue',
				turnPage: 'Turn page',
				metaTagline: 'A kinetic AI chronicle crafted for mindful learning.',
				miniIndexCta: 'Read module',
			}
		: {
				enterBook: 'Entrar en modo libro',
				exitBook: 'Salir del modo libro',
				showIndex: 'Abrir índice',
				hideIndex: 'Ocultar índice',
				quickIndex: 'Índice rápido',
				locked: 'Bloqueado',
				chapter: 'Capítulo',
				courseLabel: 'Curso',
				readingTime: 'Tiempo estimado de lectura',
				xpEarned: 'XP ganada en el capítulo',
				progress: 'Progreso global',
				nextLocked: 'Completa esta página para continuar',
				turnPage: 'Pasar página',
				metaTagline: 'Una crónica cinética de IA para un aprendizaje consciente.',
				miniIndexCta: 'Leer módulo',
			};

	const localizedCourseTitle = locale === 'en' ? course.title_en : course.title_es;
	const localizedModuleTitle = locale === 'en' ? currentModule.title_en : currentModule.title_es;
	const readingMinutes = currentModule.duration_minutes || 10;

	const isModuleAccessible = (module: NormalizedModule, index: number) => {
		if (module.is_free) return true;
		if (index === 0) return true;
		const prev = modules[index - 1];
		return !!completionMap[prev.id];
	};

	const handleNavigate = (target?: NormalizedModule | null) => {
		if (!target) return;
		setIndexOpen(false);
		router.push(`/${locale}/courses/${courseId}/learn?module=${target.id}`);
	};

	const handleDirectNavigation = (module: NormalizedModule, index: number) => {
		if (!isModuleAccessible(module, index)) return;
		handleNavigate(module);
	};

	const BookModeHUD = (
		<div className="sticky top-4 z-40 flex justify-end gap-3 px-4 pt-4">
			<Button
				variant="ghost"
				size="sm"
				onClick={() => setBookMode((value) => !value)}
				className={cn(
					'rounded-full border text-xs font-semibold tracking-wide transition-all duration-300 backdrop-blur',
					bookMode
						? 'border-white/25 bg-white/10 text-white hover:bg-white/20'
						: 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
				)}
			>
				<BookOpenCheck className="mr-2 h-4 w-4" />
				{bookMode ? localization.exitBook : localization.enterBook}
			</Button>

			{bookMode && (
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setIndexOpen((open) => !open)}
					className="rounded-full border border-white/25 bg-white/10 text-xs font-semibold text-white hover:bg-white/20"
				>
					<ListTree className="mr-2 h-4 w-4" />
					{indexOpen ? localization.hideIndex : localization.showIndex}
				</Button>
			)}
		</div>
	);

	const MiniIndex = indexOpen ? (
		<div className="fixed top-28 right-6 z-50 w-80 overflow-hidden rounded-3xl border border-white/10 bg-[rgba(2,8,23,0.95)] shadow-2xl backdrop-blur-xl">
			<div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-sm font-semibold uppercase tracking-[0.4em] text-white/70">
				<span>{localization.quickIndex}</span>
				<button onClick={() => setIndexOpen(false)} aria-label={localization.hideIndex} className="text-white/70 transition hover:text-white">
					<X className="h-4 w-4" />
				</button>
			</div>
			<div className="max-h-[60vh] space-y-2 overflow-y-auto px-4 py-4">
				{modules.map((module, index) => {
					const moduleTitle = locale === 'en' ? module.title_en : module.title_es;
					const completed = completionMap[module.id];
					const isCurrent = module.id === currentModule.id;
					const accessible = isModuleAccessible(module, index);
					return (
						<button
							key={module.id}
							disabled={!accessible}
							onClick={() => handleDirectNavigation(module, index)}
							className={cn(
								'w-full rounded-2xl border px-4 py-3 text-left transition-all duration-300',
								isCurrent
									? 'border-white/40 bg-white/15 text-white shadow-lg'
									: 'border-white/10 bg-transparent text-white/80 hover:border-white/30 hover:bg-white/5',
								!accessible && 'cursor-not-allowed opacity-40'
							)}
						>
							<div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
								<span>
									{localization.chapter} {index + 1}
								</span>
								{!accessible && <Lock className="h-3.5 w-3.5" />}
							</div>
							<p className="mt-1 text-sm font-semibold text-white">{moduleTitle}</p>
							<p className="text-xs text-white/60">
								{completed ? '✓' : '•'} {localization.miniIndexCta}
							</p>
						</button>
					);
				})}
			</div>
		</div>
	) : null;

	const BookSpread = (
		<section className="relative z-10 pb-24">
			<div className="relative h-[420px] sm:h-[520px]">
				<div className="absolute inset-0">
					<ModuleHeaderIllustration
						moduleId={currentModule.id}
						courseTitle={localizedCourseTitle}
						moduleTitle={localizedModuleTitle}
						locale={locale}
						frameless
						className="h-full w-full"
					/>
				</div>
				<div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-[#02030B]" aria-hidden />
				<div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-between px-4 py-10 sm:px-6 lg:px-8">
					<div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.5em] text-white/70">
						<span>{localization.courseLabel}</span>
						<div className="h-px flex-1 bg-white/30" />
						<span>{localizedCourseTitle}</span>
					</div>
					<div className="space-y-6">
						<div>
							<p className="text-xs uppercase tracking-[0.4em] text-white/70">
								{localization.chapter} {currentIndex + 1}
							</p>
							<h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl" style={{ fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif" }}>
								{localizedModuleTitle}
							</h1>
							<p className="mt-4 max-w-2xl text-sm text-white/80">{localization.metaTagline}</p>
						</div>
						<div className="grid gap-4 sm:grid-cols-3">
							<div className="rounded-2xl border border-white/15 bg-black/30 p-4 text-white">
								<p className="text-[10px] uppercase tracking-[0.4em] text-white/60">{localization.progress}</p>
								<p className="mt-2 text-2xl font-semibold">{progressPercent}%</p>
								<div className="mt-3 h-1.5 rounded-full bg-white/20">
									<div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500" style={{ width: `${progressPercent}%` }} />
								</div>
							</div>
							<div className="rounded-2xl border border-white/15 bg-black/30 p-4 text-white">
								<p className="text-[10px] uppercase tracking-[0.4em] text-white/60">{localization.readingTime}</p>
								<p className="mt-2 text-2xl font-semibold">{readingMinutes} min</p>
								<p className="text-xs text-white/70">{locale === 'en' ? 'Estimated immersion' : 'Inmersión estimada'}</p>
							</div>
							<div className="rounded-2xl border border-white/15 bg-black/30 p-4 text-white">
								<p className="text-[10px] uppercase tracking-[0.4em] text-white/60">{localization.xpEarned}</p>
								<p className="mt-2 text-2xl font-semibold">{currentProgress?.completed ? '100 XP' : '0 XP'}</p>
								<p className="text-xs text-white/70">{locale === 'en' ? 'Per completed chapter' : 'Por capítulo completado'}</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="relative -mt-24 px-4 sm:px-6 lg:px-8">
				<div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(280px,0.95fr)_minmax(600px,1.6fr)]">
					<aside className="rounded-3xl border border-white/10 bg-[rgba(4,8,23,0.92)] p-6 text-white shadow-[0_40px_120px_rgba(3,6,20,0.65)]">
						<div className="space-y-6">
							<div>
								<p className="text-[10px] uppercase tracking-[0.4em] text-white/50">{localization.courseLabel}</p>
								<p className="mt-2 text-xl font-semibold">{localizedCourseTitle}</p>
								<p className="text-sm text-white/70">{locale === 'en' ? 'Immersive AI textbook mode' : 'Modo libro inmersivo de IA'}</p>
							</div>
							<div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
								<div className="flex items-center justify-between text-sm">
									<span>{localization.progress}</span>
									<span>{progressPercent}%</span>
								</div>
								<div className="h-1.5 rounded-full bg-white/15">
									<div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500" style={{ width: `${progressPercent}%` }} />
								</div>
								<div className="flex items-center justify-between text-sm text-white/80">
									<span>{localization.readingTime}</span>
									<span>{readingMinutes} min</span>
								</div>
								<div className="flex items-center justify-between text-sm text-white/80">
									<span>{localization.xpEarned}</span>
									<span>{currentProgress?.completed ? '100 XP' : locale === 'en' ? 'Finish chapter to claim' : 'Completa para reclamar'}</span>
								</div>
							</div>
							<div className="space-y-3">
								<p className="text-xs uppercase tracking-[0.4em] text-white/60">{locale === 'en' ? 'Navigate chapters' : 'Navegar capítulos'}</p>
								<div className="flex gap-3">
									<button
										onClick={() => handleNavigate(prevModule)}
										disabled={!prevModule}
										className="group flex flex-1 items-center justify-center rounded-2xl border border-white/15 bg-white/5 py-3 text-white transition hover:-translate-y-0.5 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
										aria-label={`${localization.turnPage} ${localization.chapter} ${currentIndex}`}
									>
										<ChevronLeft className="mr-2 h-4 w-4 transition group-hover:-translate-x-1" />
										{locale === 'en' ? 'Previous' : 'Anterior'}
									</button>
									<button
										onClick={() => handleNavigate(nextModule)}
										disabled={!nextModule || isNextLocked}
										className="group flex flex-1 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-r from-sky-500/30 to-blue-600/40 py-3 text-white transition hover:translate-y-[-2px] disabled:cursor-not-allowed disabled:opacity-40"
										aria-label={`${localization.turnPage} ${localization.chapter} ${currentIndex + 2}`}
										title={isNextLocked ? localization.nextLocked : undefined}
									>
										{isNextLocked ? <Lock className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4 transition group-hover:translate-x-1" />}
										{locale === 'en' ? 'Next' : 'Siguiente'}
									</button>
								</div>
							</div>
						</div>
					</aside>
					<div className="rounded-[36px] border border-white/10 bg-[rgba(5,9,23,0.95)] p-4 sm:p-6 lg:p-8 shadow-2xl">
						<ModulePlayer
							locale={locale}
							module={currentModule}
							courseId={courseId}
							enrollmentId={enrollmentId}
							currentProgress={currentProgress}
						/>
					</div>
				</div>
				<div className="mx-auto mt-8 flex max-w-6xl flex-col items-center gap-4 text-white/80 sm:flex-row sm:justify-between">
					<button
						onClick={() => handleNavigate(prevModule)}
						disabled={!prevModule}
						className="group flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:-translate-x-1 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
						aria-label={`${localization.turnPage} ${localization.chapter} ${currentIndex}`}
					>
						<ChevronLeft className="h-5 w-5 transition group-hover:-translate-x-1" />
					</button>
					<div className="text-xs uppercase tracking-[0.5em] text-white/60">
						{localization.chapter} {currentIndex + 1} / {modules.length}
					</div>
					<button
						onClick={() => handleNavigate(nextModule)}
						disabled={!nextModule || isNextLocked}
						className="group flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:translate-x-1 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
						aria-label={`${localization.turnPage} ${localization.chapter} ${currentIndex + 2}`}
						title={isNextLocked ? localization.nextLocked : undefined}
					>
						{isNextLocked ? <Lock className="h-5 w-5" /> : <ChevronRight className="h-5 w-5 transition group-hover:translate-x-1" />}
					</button>
				</div>
			</div>
		</section>
	);

	const ClassicLayout = (
		<div className="flex">
			<ModuleSidebar
				locale={locale}
				courseId={courseId}
				course={course}
				modules={modules}
				currentModuleId={currentModule.id}
				userProgress={userProgress}
			/>

			<div className="flex-1 lg:ml-80">
				<div className="mx-auto max-w-5xl p-6">
					<ModulePlayer
						locale={locale}
						module={currentModule}
						courseId={courseId}
						enrollmentId={enrollmentId}
						currentProgress={currentProgress}
					/>
					<ModuleNavigation
						locale={locale}
						courseId={courseId}
						currentModule={currentModule}
						modules={modules}
						userProgress={userProgress}
					/>
				</div>
			</div>
		</div>
	);

	return (
		<div
			className={cn(
				'relative min-h-screen overflow-x-hidden',
				bookMode
					? 'bg-[radial-gradient(circle_at_top,_#091231,_#030615_65%)] text-white'
					: 'bg-background text-foreground'
			)}
		>
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(32,129,226,0.25),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.15),transparent_45%)]" aria-hidden />
			<div className="relative z-10">
				{BookModeHUD}
				{bookMode ? BookSpread : ClassicLayout}
				{MiniIndex}
			</div>
		</div>
	);
}