import Link from "next/link";
import { CategoryNav, NavBar } from "../_components/navigation";

export const metadata = {
  title: "Vibes | Offline",
  description: "Офлајн порака на vibes.mk за момент без интернет.",
};

export const dynamic = "force-static";

const tips = [
  {
    title: "Провери го сигналот",
    body: "Вклучи/исклучи Wi‑Fi или мобилни податоци и почекај неколку секунди.",
  },
  {
    title: "Освежи ја страницата",
    body: "Штом има интернет, кликни „Освежи страната“ и ќе продолжиш таму каде што застана.",
  },
  {
    title: "Отвори друга секција",
    body: "Директните линкови подолу се подготвени – ќе се вчитаат веднаш штом се врати конекцијата.",
  },
];

const quickLinks = [
  { label: "Почетна", href: "/" },
  { label: "Најново", href: "/najnovo" },
  { label: "Технологија", href: "/?category=Tech" },
  { label: "Блог", href: "/?category=Blog" },
  { label: "Архива", href: "/all" },
];

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[#FDFBF7] text-neutral-900 pb-20 selection:bg-yellow-200">
      <NavBar />
      <CategoryNav activeCategory="Offline" />

      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-12 space-y-12">
        <header className="space-y-6 border-b border-black pb-10">
          <div className="inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-black bg-[#FFD300] px-4 py-1 text-[10px] font-black uppercase tracking-[0.3em] shadow-[4px_4px_0_#00000012]">
              Offline
              <span className="h-2 w-2 rounded-full bg-black animate-pulse" aria-hidden />
            </span>
            <span className="text-[11px] font-mono uppercase tracking-[0.3em] text-neutral-500">
              Конекцијата падна
            </span>
          </div>

          <h1 className="font-serif text-5xl md:text-6xl font-black leading-[0.95] uppercase">
            Моментално си офлајн.
          </h1>
          <p className="font-sans text-lg md:text-xl text-neutral-700 max-w-3xl">
            Сè уште сме тука. Кога ќе се врати интернетот, освежи ја страницата и продолжи да ги читаш внимателно селектираните вести од vibes.mk.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-black bg-black px-5 py-3 text-[11px] font-bold uppercase tracking-[0.28em] text-white transition-colors hover:bg-neutral-800"
            >
              Освежи страната
              <span aria-hidden>↻</span>
            </Link>
            <Link
              href="/all"
              className="inline-flex items-center gap-2 rounded-full border border-black bg-white px-5 py-3 text-[11px] font-bold uppercase tracking-[0.28em] text-neutral-900 transition-all hover:bg-[#FFD300] hover:shadow-[4px_4px_0_#00000010]"
            >
              Архива
              <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="text-[11px] font-mono uppercase tracking-[0.35em] text-neutral-500">
            Чекаме сигнал... ќе продолжиме со свежи вести веднаш штом се поврзеш.
          </div>
        </header>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-start">
          <section className="bg-white border border-neutral-200 rounded-xl p-6 md:p-8 shadow-[6px_6px_0_#e5e5e5] space-y-5">
            <h2 className="font-serif text-2xl md:text-3xl font-bold uppercase tracking-tight">
              Како да се вратиш online
            </h2>
            <p className="font-sans text-base md:text-lg text-neutral-700">
              Неколку брзи чекори што најчесто го решаваат проблемот:
            </p>
            <ul className="space-y-3">
              {tips.map((tip) => (
                <li key={tip.title} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-neutral-300" aria-hidden />
                  <div className="space-y-1">
                    <p className="font-serif text-lg font-bold text-neutral-900">
                      {tip.title}
                    </p>
                    <p className="font-sans text-sm text-neutral-600">{tip.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-mono uppercase tracking-[0.2em] text-neutral-600">
              Совет: ако користиш мобилен, исклучи/вклучи податоци и почекај неколку секунди.
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-black bg-[#FFD300] p-6 shadow-[6px_6px_0_#00000015] space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-black bg-[#FDFBF7] text-lg font-black">
                  V
                </div>
                <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-neutral-900">
                  Vibes mode: offline
                </div>
              </div>
              <p className="font-serif text-xl font-bold leading-tight text-neutral-900">
                Не губиш ништо – само момент без сигнал.
              </p>
              <p className="font-sans text-sm text-neutral-800">
                Кога повторно ќе имаме интернет, кликни на „Освежи“ или отвори некоја од секциите подолу.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-[6px_6px_0_#e5e5e5] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-xl font-bold uppercase tracking-tight">Брзи патеки</h3>
                <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-400">
                  подготвени кога ќе имаш сигнал
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex items-center gap-2 rounded-full border border-black px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-neutral-900 transition-all hover:bg-black hover:text-white"
                  >
                    {link.label}
                    <span aria-hidden>→</span>
                  </Link>
                ))}
              </div>
              <p className="text-sm text-neutral-600 font-sans">
                Откако ќе се врати конекцијата, ќе можеш да продолжиш таму каде што застана.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
