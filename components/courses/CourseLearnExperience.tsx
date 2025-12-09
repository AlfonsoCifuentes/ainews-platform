"use client";

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, BookOpenCheck, ListTree, Lock, X, FlaskConical } from 'lucide-react';
import type { NormalizedModule } from '@/lib/courses/normalize';
import { ModulePlayer } from '@/components/courses/ModulePlayer';
import { ModuleHeaderIllustration } from '@/components/courses/ModuleHeaderIllustration';
import { useBookMode } from '@/lib/hooks/useBookMode';
import { BookModuleView } from '@/components/courses/BookModuleView';
import { useToast } from '@/components/shared/ToastProvider';

// Brutalist design tokens
const BRUTALIST = {
	bg: '#020309',
	bgCard: '#0A0A0A',
	text: '#EAEAEA',
	textMuted: '#888888',
	border: '#1F1F1F',
	accent: '#EAEAEA',
};

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
	const [hydrated, setHydrated] = useState(false);
	const [bookMode, setBookMode] = useState(false);
	const [indexOpen, setIndexOpen] = useState(false);
	const [bookContent, setBookContent] = useState(() => (locale === 'en' ? currentModule.content_en : currentModule.content_es) || '');
	const [isGeneratingBookContent, setIsGeneratingBookContent] = useState(false);
	const [isCompletingBook, setIsCompletingBook] = useState(false);
	const [localCompletion, setLocalCompletion] = useState<Record<string, boolean>>({});
	const router = useRouter();
	const { setBookMode: setGlobalBookMode } = useBookMode();
	const { showToast } = useToast();

	useEffect(() => {
		setHydrated(true);
	}, []);

	// Sync local bookMode with global context (controls header/footer visibility)
	useEffect(() => {
		setGlobalBookMode(bookMode);
		return () => setGlobalBookMode(false);
	}, [bookMode, setGlobalBookMode]);

	// Keep localized content in sync when switching modules/locales
	useEffect(() => {
		setBookContent((locale === 'en' ? currentModule.content_en : currentModule.content_es) || '');
	}, [currentModule.id, currentModule.content_en, currentModule.content_es, locale]);

	const isPlaceholderContent = useCallback((text?: string | null) => {
		const placeholderRegex = /(coming soon|próximamente|en preparación|contenido en desarrollo|content coming soon|coming-soon)/i;
		if (!text) return true;
		const trimmed = text.trim();
		if (!trimmed) return true;
		if (trimmed.length < 60 && placeholderRegex.test(trimmed)) return true;
		return false;
	}, []);

	// Auto-generate longform content when book mode is active and module text is missing/placeholder
	useEffect(() => {
		if (!bookMode) return;
		if (isGeneratingBookContent) return;
		if (!isPlaceholderContent(bookContent)) return;

		const generateContent = async () => {
			setIsGeneratingBookContent(true);
			try {
				const response = await fetch('/api/courses/modules/generate-content', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ moduleId: currentModule.id, courseId, locale }),
				});

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(errorText || 'Failed to generate content');
				}

				const data = await response.json();
				if (data?.success && data?.data?.content) {
					setBookContent(data.data.content);
					showToast(locale === 'en' ? 'Module content generated' : 'Contenido del módulo generado', 'success');
				}
			} catch (error) {
				console.error('[CourseLearnExperience] Failed to generate book content', error);
				showToast(locale === 'en' ? 'Failed to generate content' : 'Error al generar contenido', 'error');
			} finally {
				setIsGeneratingBookContent(false);
			}
		};

		generateContent();
	}, [bookContent, bookMode, courseId, currentModule.id, isGeneratingBookContent, locale, showToast, isPlaceholderContent]);

	const navigationState = useMemo(() => {
		const completionMap: Record<string, boolean> = {};
		userProgress.forEach((progress) => {
			if (progress.completed) {
				completionMap[progress.module_id] = true;
			}
		});
		Object.entries(localCompletion).forEach(([moduleId, done]) => {
			if (done) completionMap[moduleId] = true;
		});

		const currentIndex = modules.findIndex((m) => m.id === currentModule.id);
		const prevModule = currentIndex > 0 ? modules[currentIndex - 1] : null;
		const nextModule = currentIndex < modules.length - 1 ? modules[currentIndex + 1] : null;
		const completedCount = modules.filter((module) => completionMap[module.id]).length;
		const isNextLocked = nextModule ? (!nextModule.is_free && !completionMap[currentModule.id]) : false;

		return { completionMap, currentIndex, prevModule, nextModule, completedCount, isNextLocked };
	}, [currentModule.id, modules, userProgress, localCompletion]);

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
	const localizedBookContent = bookContent || '';

	const handleBookComplete = async () => {
		if (currentProgress?.completed || isCompletingBook) {
			return;
		}

		setIsCompletingBook(true);
		try {
			const res = await fetch('/api/courses/progress', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ courseId, moduleId: currentModule.id, completed: true, timeSpent: 0 }),
				credentials: 'include',
			});

			if (!res.ok) {
				const errorText = await res.text();
				throw new Error(errorText || 'Failed to save progress');
			}

			setLocalCompletion((prev) => ({ ...prev, [currentModule.id]: true }));
			showToast(locale === 'en' ? 'Module completed! +100 XP' : '¡Módulo completado! +100 XP', 'success');
			if (nextModule) {
				handleNavigate(nextModule);
			} else {
				router.refresh();
			}
		} catch (error) {
			console.error('[CourseLearnExperience] Failed to complete module from book view', error);
			showToast(locale === 'en' ? 'Failed to save progress' : 'Error al guardar progreso', 'error');
		} finally {
			setIsCompletingBook(false);
		}
	};

	const handleBookNavigate = (direction: 'prev' | 'next') => {
		if (direction === 'next') {
			if (isNextLocked) return;
			return handleNavigate(nextModule);
		}
		return handleNavigate(prevModule);
	};

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

	// Mirror server completion into local state to unlock navigation immediately
	useEffect(() => {
		if (currentProgress?.completed) {
			setLocalCompletion((prev) => ({ ...prev, [currentModule.id]: true }));
		}
	}, [currentModule.id, currentProgress?.completed]);

	// If server says module already completed, mirror it locally to avoid lock flickers
	useEffect(() => {
		if (currentProgress?.completed) {
			setLocalCompletion((prev) => ({ ...prev, [currentModule.id]: true }));
		}
	}, [currentModule.id, currentProgress?.completed]);

	const BookModeHUD = (
		<div className="fixed bottom-6 right-4 sm:right-6 z-[95] flex flex-col items-end gap-3 px-4">
			<button
				onClick={() => setBookMode((value) => !value)}
				className="flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-xs uppercase tracking-wider shadow-lg transition-colors"
				style={{
					backgroundColor: bookMode ? BRUTALIST.bgCard : BRUTALIST.bg,
					borderColor: BRUTALIST.border,
					color: BRUTALIST.text,
				}}
			>
				<BookOpenCheck className="h-4 w-4" />
				{bookMode ? localization.exitBook : localization.enterBook}
			</button>

			{bookMode && (
				<button
					onClick={() => setIndexOpen((open) => !open)}
					className="flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-xs uppercase tracking-wider shadow-lg transition-colors"
					style={{
						backgroundColor: BRUTALIST.bgCard,
						borderColor: BRUTALIST.border,
						color: BRUTALIST.text,
					}}
				>
					<ListTree className="h-4 w-4" />
					{indexOpen ? localization.hideIndex : localization.showIndex}
				</button>
			)}
		</div>
	);

	const MiniIndex = indexOpen ? (
		<div 
			className="fixed top-28 right-6 z-50 w-80 overflow-hidden border shadow-2xl"
			style={{
				backgroundColor: BRUTALIST.bg,
				borderColor: BRUTALIST.border,
			}}
		>
			<div 
				className="flex items-center justify-between border-b px-5 py-4 font-mono text-xs uppercase tracking-[0.3em]"
				style={{
					borderColor: BRUTALIST.border,
					color: BRUTALIST.textMuted,
				}}
			>
				<span>{localization.quickIndex}</span>
				<button 
					onClick={() => setIndexOpen(false)} 
					aria-label={localization.hideIndex} 
					className="transition hover:opacity-70"
					style={{ color: BRUTALIST.textMuted }}
				>
					<X className="h-4 w-4" />
				</button>
			</div>
			<div className="max-h-[60vh] space-y-2 overflow-y-auto p-4">
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
							className="w-full border p-3 text-left font-mono transition-colors"
							style={{
								backgroundColor: isCurrent ? BRUTALIST.bgCard : 'transparent',
								borderColor: isCurrent ? BRUTALIST.text : BRUTALIST.border,
								color: accessible ? BRUTALIST.text : BRUTALIST.textMuted,
								opacity: accessible ? 1 : 0.4,
								cursor: accessible ? 'pointer' : 'not-allowed',
							}}
						>
							<div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em]" style={{ color: BRUTALIST.textMuted }}>
								<span>
									{localization.chapter} {index + 1}
								</span>
								{!accessible && <Lock className="h-3 w-3" />}
							</div>
							<p className="mt-1 text-sm" style={{ color: BRUTALIST.text }}>{moduleTitle}</p>
							<p className="text-xs" style={{ color: BRUTALIST.textMuted }}>
								{completed ? '✓' : '•'} {localization.miniIndexCta}
							</p>
						</button>
					);
				})}
			</div>
		</div>
	) : null;

	const resolvedBookContent = localizedBookContent.trim()
		? localizedBookContent
		: isGeneratingBookContent
			? (locale === 'en' ? 'Generating module content...' : 'Generando contenido del módulo...')
			: (locale === 'en'
				? 'Module content is being prepared. Please check back soon.'
				: 'El contenido del módulo se está preparando. Por favor, vuelve pronto.');

	const BookSpread = (
		<section className="relative z-10 pb-24" style={{ backgroundColor: BRUTALIST.bg }}>
			{/* Hero header with illustration */}
			<div className="relative h-[320px] sm:h-[380px]">
				{/* Plain black background - only shows if no image loads */}
				<div className="absolute inset-0 bg-[#020309]" aria-hidden />
				{/* Module illustration as background */}
				<div className="absolute inset-0">
					<ModuleHeaderIllustration
						moduleId={currentModule.id}
						courseTitle={localizedCourseTitle}
						moduleTitle={localizedModuleTitle}
						locale={locale}
						frameless
						fallbackImageUrl={course.thumbnail_url}
						className="h-full w-full"
					/>
				</div>
				{/* Dark gradient overlay for text readability */}
				<div className="absolute inset-0 bg-gradient-to-b from-[#010203]/60 via-[#010203]/80 to-[#010203]" aria-hidden />
				<div className="relative z-10 mx-auto flex h-full max-w-[1600px] flex-col justify-end px-4 pb-8 sm:px-6 lg:px-8">
					<div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: BRUTALIST.textMuted }}>
						<FlaskConical className="h-4 w-4 text-white" strokeWidth={1.5} />
						<span>{localization.courseLabel}</span>
						<div className="h-px flex-1" style={{ backgroundColor: BRUTALIST.border }} />
						<span>{localizedCourseTitle}</span>
					</div>
					<div className="mt-4">
						<p className="font-mono text-xs uppercase tracking-[0.3em]" style={{ color: BRUTALIST.textMuted }}>
							{localization.chapter} {currentIndex + 1}
						</p>
						<h1 className="mt-2 font-mono text-2xl font-bold uppercase tracking-tight sm:text-3xl lg:text-4xl" style={{ color: BRUTALIST.text }}>
							{localizedModuleTitle}
						</h1>
					</div>
				</div>
			</div>

			{/* Stats row - separated from header to avoid overlap */}
			<div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
				<div className="grid gap-4 sm:grid-cols-3">
					<div className="border p-4" style={{ backgroundColor: BRUTALIST.bgCard, borderColor: BRUTALIST.border }}>
						<p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: BRUTALIST.textMuted }}>{localization.progress}</p>
						<p className="mt-2 font-mono text-2xl font-bold" style={{ color: BRUTALIST.text }}>{progressPercent}%</p>
						<div className="mt-3 h-1" style={{ backgroundColor: BRUTALIST.border }}>
							<div className="h-full" style={{ width: `${progressPercent}%`, backgroundColor: BRUTALIST.text }} />
						</div>
					</div>
					<div className="border p-4" style={{ backgroundColor: BRUTALIST.bgCard, borderColor: BRUTALIST.border }}>
						<p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: BRUTALIST.textMuted }}>{localization.readingTime}</p>
						<p className="mt-2 font-mono text-2xl font-bold" style={{ color: BRUTALIST.text }}>{readingMinutes} min</p>
						<p className="font-mono text-xs" style={{ color: BRUTALIST.textMuted }}>{locale === 'en' ? 'Estimated time' : 'Tiempo estimado'}</p>
					</div>
					<div className="border p-4" style={{ backgroundColor: BRUTALIST.bgCard, borderColor: BRUTALIST.border }}>
						<p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: BRUTALIST.textMuted }}>{localization.xpEarned}</p>
						<p className="mt-2 font-mono text-2xl font-bold" style={{ color: BRUTALIST.text }}>{currentProgress?.completed ? '100 XP' : '0 XP'}</p>
						<p className="font-mono text-xs" style={{ color: BRUTALIST.textMuted }}>{locale === 'en' ? 'Per chapter' : 'Por capítulo'}</p>
					</div>
				</div>
			</div>

			{/* Main content grid */}
			<div className="px-4 sm:px-6 lg:px-8">
				<div className="mx-auto grid max-w-[1600px] gap-6 lg:grid-cols-[300px_1fr]">
					{/* Sidebar */}
					<aside className="border p-6" style={{ backgroundColor: BRUTALIST.bgCard, borderColor: BRUTALIST.border }}>
						<div className="space-y-6">
							<div>
								<p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: BRUTALIST.textMuted }}>{localization.courseLabel}</p>
								<p className="mt-2 font-mono text-lg font-bold" style={{ color: BRUTALIST.text }}>{localizedCourseTitle}</p>
								<p className="font-mono text-sm" style={{ color: BRUTALIST.textMuted }}>{locale === 'en' ? 'Learning mode' : 'Modo aprendizaje'}</p>
							</div>
							<div className="border p-4 space-y-3" style={{ backgroundColor: BRUTALIST.bg, borderColor: BRUTALIST.border }}>
								<div className="flex items-center justify-between font-mono text-sm">
									<span style={{ color: BRUTALIST.textMuted }}>{localization.progress}</span>
									<span style={{ color: BRUTALIST.text }}>{progressPercent}%</span>
								</div>
								<div className="h-1" style={{ backgroundColor: BRUTALIST.border }}>
									<div className="h-full" style={{ width: `${progressPercent}%`, backgroundColor: BRUTALIST.text }} />
								</div>
								<div className="flex items-center justify-between font-mono text-sm">
									<span style={{ color: BRUTALIST.textMuted }}>{localization.readingTime}</span>
									<span style={{ color: BRUTALIST.text }}>{readingMinutes} min</span>
								</div>
								<div className="flex items-center justify-between font-mono text-sm">
									<span style={{ color: BRUTALIST.textMuted }}>{localization.xpEarned}</span>
									<span style={{ color: BRUTALIST.text }}>{currentProgress?.completed ? '100 XP' : locale === 'en' ? 'Finish to claim' : 'Completa'}</span>
								</div>
							</div>
							<div className="space-y-3">
								<p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: BRUTALIST.textMuted }}>{locale === 'en' ? 'Navigate' : 'Navegar'}</p>
								<div className="flex gap-3">
									<button
										onClick={() => handleNavigate(prevModule)}
										disabled={!prevModule}
										className="group flex flex-1 items-center justify-center gap-2 border py-3 font-mono text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
										style={{ backgroundColor: BRUTALIST.bg, borderColor: BRUTALIST.border, color: BRUTALIST.text }}
										aria-label={`${localization.turnPage} ${localization.chapter} ${currentIndex}`}
									>
										<ChevronLeft className="h-4 w-4" />
										{locale === 'en' ? 'Prev' : 'Ant'}
									</button>
									<button
										onClick={() => handleNavigate(nextModule)}
										disabled={!nextModule || isNextLocked}
										className="group flex flex-1 items-center justify-center gap-2 border py-3 font-mono text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
										style={{ backgroundColor: BRUTALIST.text, borderColor: BRUTALIST.text, color: BRUTALIST.bg }}
										aria-label={`${localization.turnPage} ${localization.chapter} ${currentIndex + 2}`}
										title={isNextLocked ? localization.nextLocked : undefined}
									>
										{isNextLocked ? <Lock className="h-4 w-4" /> : null}
										{locale === 'en' ? 'Next' : 'Sig'}
										{!isNextLocked && <ChevronRight className="h-4 w-4" />}
									</button>
								</div>
							</div>
						</div>
					</aside>
					{/* Content area */}
					<div className="border p-4 sm:p-6 lg:p-8" style={{ backgroundColor: BRUTALIST.bgCard, borderColor: BRUTALIST.border }}>
						<ModulePlayer
							locale={locale}
							module={currentModule}
							courseId={courseId}
							enrollmentId={enrollmentId}
							currentProgress={currentProgress}
						/>
					</div>
				</div>
				{/* Bottom navigation */}
				<div className="mx-auto mt-8 flex max-w-[1600px] items-center justify-between">
					<button
						onClick={() => handleNavigate(prevModule)}
						disabled={!prevModule}
						className="group flex h-12 w-12 items-center justify-center border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
						style={{ backgroundColor: BRUTALIST.bgCard, borderColor: BRUTALIST.border, color: BRUTALIST.text }}
						aria-label={`${localization.turnPage} ${localization.chapter} ${currentIndex}`}
					>
						<ChevronLeft className="h-5 w-5" />
					</button>
					<div className="font-mono text-xs uppercase tracking-[0.3em]" style={{ color: BRUTALIST.textMuted }}>
						{localization.chapter} {currentIndex + 1} / {modules.length}
					</div>
					<button
						onClick={() => handleNavigate(nextModule)}
						disabled={!nextModule || isNextLocked}
						className="group flex h-12 w-12 items-center justify-center border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
						style={{ backgroundColor: BRUTALIST.bgCard, borderColor: BRUTALIST.border, color: BRUTALIST.text }}
						aria-label={`${localization.turnPage} ${localization.chapter} ${currentIndex + 2}`}
						title={isNextLocked ? localization.nextLocked : undefined}
					>
						{isNextLocked ? <Lock className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
					</button>
				</div>
			</div>
		</section>
	);

	const FullBookOverlay = bookMode ? (
		<div className="fixed inset-0 z-[120] bg-black">
			<div className="absolute inset-0 overflow-auto">
				<div className="sticky top-0 z-10 flex justify-end bg-gradient-to-b from-black via-black/70 to-transparent px-4 py-3">
					<button
						onClick={() => setBookMode(false)}
						className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white hover:bg-white/10 transition-colors"
					>
						{locale === 'en' ? 'Exit book mode' : 'Salir de modo libro'}
					</button>
				</div>
				<div className="w-full pb-16">
					<BookModuleView
						content={resolvedBookContent}
						title={localizedModuleTitle}
						moduleNumber={currentIndex + 1}
						totalModules={modules.length}
						moduleId={currentModule.id}
						onComplete={handleBookComplete}
						onNavigate={handleBookNavigate}
						locale={locale}
					/>
				</div>
			</div>
		</div>
	) : null;

	return (
		!hydrated ? null :
		<div
			className="relative min-h-screen overflow-x-hidden"
			style={{ backgroundColor: BRUTALIST.bg, color: BRUTALIST.text }}
		>
			<div className="relative z-10">
				{BookModeHUD}
				{BookSpread}
				{MiniIndex}
				{FullBookOverlay}
			</div>
		</div>
	);
}