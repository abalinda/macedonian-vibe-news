import { Suspense } from "react";
import { CategoryNav, NavBar } from "../_components/navigation";
import Link from "next/link";

export const metadata = {
  title: "За нас | VIBES",
  description: "Дознајте повеќе за Vibes и нашата мисија",
};

const NavFallback = () => (
  <div className="sticky top-0 z-40 border-b border-black bg-[#FDFBF7] py-3 px-4 md:px-8">
    <div className="w-full max-w-[1400px] mx-auto h-11" />
  </div>
);

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#FDFBF7] text-neutral-900 pb-20 selection:bg-yellow-200">
      <Suspense fallback={<NavFallback />}>
        <NavBar />
      </Suspense>
      <CategoryNav activeCategory="About" />

      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-12 md:pt-20 space-y-16">
        
        {/* HEADER */}
        <header className="space-y-6 border-b border-neutral-900 pb-10">
          <h1 className="font-serif text-5xl md:text-6xl font-black tracking-tight text-neutral-900 uppercase">
            За нас
          </h1>
          <p className="font-serif text-xl md:text-2xl leading-relaxed text-neutral-800">
            Добредојде на vibes.mk - вашиот нов начин да останете информирани без врева, без непотребна тежина и без бесконечни негативни содржини. Простор креиран од двајца ко-основачи кои решени да изградат медиум што ќе ја филтрира хаосната реалност во смирен, корисен и кул дигитален простор.
          </p>
        </header>

        {/* SECTION 1: ZOŠTO & ŠTO */}
        <section className="grid md:grid-cols-2 gap-12 md:gap-16">
          <div className="space-y-4">
            <h2 className="font-serif text-3xl font-bold mb-4">
              Зошто vibes.mk?
            </h2>
            <p className="font-sans text-lg text-neutral-700 leading-relaxed">
              Во време кога секојдневно сме преплавени од трагични вести, политички препукувања и информации што само ти ја трошат енергијата, ние решивме да понудиме нешто поразлично:
            </p>
            <ul className="list-disc pl-5 space-y-2 font-serif text-lg text-neutral-800 marker:text-neutral-400">
              <li>вести што носат вредност,</li>
              <li>содржина што информира без да оптоварува,</li>
              <li>платформа што почитува како се чувствувате додека читате.</li>
            </ul>
            <p className="font-sans text-lg text-neutral-700 leading-relaxed pt-2">
              Селектираме квалитет, не квантитет. Објавуваме позитивни вести, инспиративни приказни, иновации, култура, спорт, наука, технологија - и сè што има здраво влијание.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-3xl font-bold mb-4">
              Што можеш да најдеш кај нас?
            </h2>
            <ul className="space-y-3 font-sans text-lg text-neutral-800">
              {[
                "Позитивни вести и теми што инспирираат.",
                "Технологија, наука, иновации и трендови.",
                "Култура, музика, филм, изложби и настани.",
                "Спортски вести со фокус на енергијата, не на драмата.",
                "Локални и глобални случувања што вреди да ги прочиташ.",
                "Блогови и креативни текстови од различни автори."
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-neutral-400 mt-1.5 text-[10px]">●</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <hr className="border-neutral-200" />

        {/* SECTION 2: MISIJA & TIM - UPDATED */}
        <section className="space-y-12">
          {/* Fixed Mission Element */}
          <div className="max-w-3xl">
            <h3 className="font-serif text-3xl font-bold mb-4">
              Нашата мисија
            </h3>
            <div className="space-y-4 font-sans text-lg text-neutral-700 leading-relaxed">
              <p>Да создадеме дигитално место каде информирањето не исцрпува, туку е корисно и пријатно.</p>
              <p>Да понудиме платформа што ве разбира.</p>
              <p>Да изградиме медиум што нема само да ги пренесува вестите - туку ќе помогне да го живееш денот подобро, со добри вибрации.</p>
            </div>
          </div>

          <div className="max-w-3xl">
            <h3 className="font-serif text-3xl font-bold mb-4">
              Кој стои зад vibes.mk?
            </h3>
            <p className="font-sans text-lg text-neutral-700 leading-relaxed">
              Не сме голема редакција, но сме тим со визија, страст кон медиумите и желба за подобра информативна култура. Зад vibes.mk стоиме сите заедно и заедно создаваме нов начин на информирање, секогаш со позитивна нота.
            </p>
          </div>
        </section>

        {/* VALUES SECTION */}
        <section className="bg-white border border-neutral-200 p-8 md:p-12 rounded-xl">
          <h3 className="font-serif text-3xl font-bold mb-8 text-center uppercase tracking-widest">
            Вредности
          </h3>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
            {[
              "Персонализација – секој читател заслужува сопствен информативен систем",
              "Позитивност, но реалност – не бегаме од важни теми, ги третираме со мера.",
              "Квалитет – секогаш избрани вести.",
              "Младешки дух и свеж пристап – професионално, но не здодевно.",
              "Доверба и транспарентност – без сензации, без клик-бејт.",
              "Заедница – медиум создаден за и со читателите."
            ].map((val, i) => (
              <div key={i} className="flex gap-4">
                <span className="font-serif text-2xl text-neutral-300 font-bold">{i + 1}.</span>
                <p className="font-sans text-lg text-neutral-800">{val}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER QUOTE */}
        <section className="text-center py-1 space-y-2">
          <p className="font-serif text-2xl md:text-3xl font-bold text-neutral-900">
            vibes.mk не е само место за вести.
          </p>
          <p className="font-serif text-xl md:text-2xl text-neutral-700">
            Тоа е дигитално искуство што расте заедно со тебе.
          </p>
          <p className="font-sans text-lg text-neutral-500 pt-1">
            Добродојдовте во медиумскиот простор каде добрите вибрации се новата нормала.
          </p>
        </section>

        {/* NEW CONTACT SECTION */}
        <section className="border-t-2 border-black pt-12 pb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <p className="font-serif text-2xl md:text-3xl text-neutral-900 font-bold max-w-lg">
                        Имате прашање, предлог или сакате да соработуваме?
                    </p>
                </div>
                <Link 
                    href="mailto:contact@vibes.mk" 
                    className="group flex items-center gap-2 font-sans text-lg font-bold border-2 border-black rounded-full px-12 py-4 hover:bg-black hover:text-white transition-all"
                >
                    contact@vibes.mk
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
            </div>
        </section>

      </div>
    </main>
  );
}
