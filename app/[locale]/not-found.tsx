import { Link } from '@/i18n';

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/40">System notice</p>
      <div className="mt-6">
        <div className="text-[clamp(6rem,18vw,12rem)] font-black leading-none text-white/5">404</div>
        <div className="mt-[-4rem] text-3xl font-semibold uppercase tracking-[0.3em] text-white">Signal lost</div>
      </div>

      <p className="mx-auto mt-6 max-w-2xl text-base text-white/70">
        The route you requested no longer maps to an active module.
      </p>

      <div className="mt-10 flex w-full flex-col gap-4 text-sm font-semibold uppercase tracking-[0.3em] text-black sm:w-auto sm:flex-row">
        <Link href="/" className="w-full sm:w-auto">
          <span className="inline-flex w-full items-center justify-center rounded-full bg-white px-8 py-3 text-xs text-black transition-transform hover:-translate-y-0.5">
            Return home
          </span>
        </Link>
        <Link href="/news" className="w-full sm:w-auto">
          <span className="inline-flex w-full items-center justify-center rounded-full border border-white/20 px-8 py-3 text-xs text-white transition-all hover:border-white/60">
            Latest reports
          </span>
        </Link>
      </div>

      <p className="mt-10 text-xs text-white/40">
        If you expected this page to exist, check the URL or return to the main navigation.
      </p>
    </div>
  );
}
