import { CategoryNav, NavBar } from "../_components/navigation";

export const metadata = {
  title: "За нас | VIBES",
  description: "Дознајте повеќе за Vibes и нашата мисија.",
};

const whyPoints = [
  "вести што носат вредност,",
  "содржина што информира без да оптоварува,",
  "платформа што почитува како се чувствувате додека читате.",
];

const whatPoints = [
  "Позитивни вести и теми што инспирираат.",
  "Технологија, наука, иновации и трендови.",
  "Култура, музика, филм, изложби и настани.",
  "Спортски вести со фокус на енергијата, не на драмата.",
  "Локални и глобални случувања што вреди да ги прочиташ.",
  "Блогови и креативни текстови од различни автори.",
];

const values = [
  "Персонализација – секој читател заслужува сопствен информативен систем",
  "Позитивност, но реалност – не бегаме од важни теми, ги третираме со мера.",
  "Квалитет – секогаш избрани вести.",
  "Младешки дух и свеж пристап – професионално, но не здодевно.",
  "Доверба и транспарентност – без сензации, без клик-бејт.",
  "Заедница – медиум создаден за и со читателите.",
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#FDFBF7] text-neutral-900 pb-20">
      <NavBar />
      <CategoryNav activeCategory="About" />

      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-10 space-y-12">
        <header className="border-b border-black pb-8 space-y-4">
          <h1 className="font-serif text-4xl md:text-5xl font-black leading-tight">
            ЗА НАС
          </h1>
          <p className="font-serif text-lg text-neutral-700 leading-relaxed">
            Добредојде на vibes.mk - вашиот нов начин да останете информирани без врева, без непотребна тежина и без бесконечни негативни содржини. Простор креиран од двајца ко-основачи кои решени да изградат медиум што ќе ја филтрира хаосната реалност во смирен, корисен и кул дигитален простор.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="bg-white/80 border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-serif text-2xl font-black leading-tight">
              Зошто vibes.mk?
            </h2>
            <p className="font-serif text-base leading-relaxed text-neutral-700">
              Во време кога секојдневно сме преплавени од трагични вести, политички препукувања и информации што само ти ја трошат енергијата, ние решивме да понудиме нешто поразлично:
            </p>
            <ul className="space-y-3 list-none p-0">
              {whyPoints.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-lg leading-6">•</span>
                  <span className="font-serif text-base leading-relaxed text-neutral-800">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            <p className="font-serif text-base leading-relaxed text-neutral-700">
              Селектираме квалитет, не квантитет. Објавуваме позитивни вести, инспиративни приказни, иновации, култура, спорт, наука, технологија - и сè што има здраво влијание.
            </p>
          </div>

          <div className="bg-white/80 border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-serif text-2xl font-black leading-tight">
              Што можеш да најдеш кај нас?
            </h2>
            <ul className="grid gap-3 md:grid-cols-2 list-none p-0">
              {whatPoints.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-xl border border-neutral-200 bg-[#FDFBF7] px-4 py-3"
                >
                  <span className="text-lg leading-6">•</span>
                  <span className="font-serif text-sm leading-relaxed text-neutral-800">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="bg-white border border-neutral-200 shadow-[6px_6px_0_#00000010] rounded-2xl p-8 space-y-3">
            <h3 className="font-serif text-3xl font-black leading-tight">
              Нашата мисија
            </h3>
            <div className="space-y-3 font-serif text-base leading-relaxed text-neutral-800">
              <p>Да создадеме дигитално место каде информирањето не исцрпува, туку е корисно и пријатно.</p>
              <p>Да понудиме платформа што ве разбира.</p>
              <p>Да изградиме медиум што нема само да ги пренесува вестите - туку ќе помогне да го живееш денот подобро, со добри вибрации. </p>
            </div>
          </div>

          <div className="bg-white/90 border border-neutral-200 rounded-2xl p-8 space-y-3">
            <h3 className="font-serif text-3xl font-black leading-tight">
              Кој стои зад vibes.mk?
            </h3>
            <p className="font-serif text-base leading-relaxed text-neutral-800">
              Не сме голема редакција, но сме тим со визија, страст кон медиумите и желба за подобра информативна култура. Зад vibes.mk стоиме сите заедно и заедно создаваме нов начин на информирање, секогаш со позитивна нота. 
            </p>
          </div>
        </section>

        <section className="bg-white/80 border border-neutral-200 rounded-2xl p-8 space-y-6">
          <h4 className="font-serif text-2xl font-black leading-tight">
            Вредности
          </h4>
          <ul className="grid gap-3 md:grid-cols-2 list-none p-0">
            {values.map((item) => (
              <li
                key={item}
                className="flex gap-3 rounded-xl border border-neutral-200 bg-[#FDFBF7] px-4 py-4 shadow-[4px_4px_0_#0000000f]"
              >
                <span className="text-lg leading-6">•</span>
                <span className="font-serif text-sm leading-relaxed text-neutral-800">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-black text-white rounded-2xl px-6 py-10 shadow-[10px_10px_0_#00000020] space-y-3">
          <p className="font-serif text-lg leading-relaxed text-neutral-100">
            vibes.mk не е само место за вести.
          </p>
          <p className="font-serif text-lg leading-relaxed text-neutral-100">
            Тоа е дигитално искуство што расте заедно со тебе.
          </p>
          <p className="font-serif text-lg leading-relaxed text-neutral-100">
            Добродојдовте во медиумскиот простор каде добрите вибрации се новата нормала.
          </p>
        </section>
      </div>
    </main>
  );
}
