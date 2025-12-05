import Link from "next/link";

export const NavBar = () => (
  <nav className="sticky top-0 z-50 border-b border-black bg-[#FDFBF7] py-3 px-4 md:px-8
   flex justify-between items-center">
    <div className="flex items-center gap-4">
      <button className="p-2 hover:bg-black hover:text-white transition-colors rounded-full">
        {/* Hamburger Icon */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
        </svg>
      </button>
      <span className="text-xs font-bold tracking-widest uppercase font-sans hidden md:block">
      </span>
    </div>

    {/* The Logo */}
    <h1 className="font-serif text-3xl md:text-5xl font-black tracking-tighter absolute left-1/2 -translate-x-1/2">
      VIBES.
    </h1>

    <div className="text-xs font-mono">
      {new Date().toLocaleDateString('mk-MK')}
    </div>
  </nav>
);

type CategoryNavProps = {
  activeCategory: string | null;
  isAllPage?: boolean;
};

export const CategoryNav = ({ activeCategory, isAllPage = false }: CategoryNavProps) => {
  const categories = [
    { name: "Почетна", value: null },
    { name: "Технологија", value: "Tech" },
    { name: "Култура", value: "Culture" },
    { name: "Животен стил", value: "Lifestyle" },
    { name: "Бизнис", value: "Business" },
    { name: "Спорт", value: "Sports" },
    { name: "Блог", value: "Blog" },
  ];

  return (
    <div className="bg-[#FDFBF7]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <nav className="flex items-center gap-4 md:gap-6 py-4 overflow-x-auto scrollbar-hide justify-start md:justify-center px-1 md:px-0">
          <div className="flex items-center gap-4 md:gap-6 flex-none md:flex-1 md:justify-center">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.value;
              const href = cat.value ? `/?category=${cat.value}` : "/";
              
              return (
                <Link
                  key={cat.name}
                  href={href}
                  className={`
                    text-sm md:text-base font-bold uppercase tracking-widest whitespace-nowrap
                    transition-colors hover:text-black
                    ${isActive 
                      ? "text-black border-b-2 border-black pb-1" 
                      : "text-neutral-500"
                    }
                  `}
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>

          <Link
            href="/all"
            className={`
              ml-auto flex-shrink-0 text-xs font-bold uppercase tracking-widest whitespace-nowrap
              border border-black px-3 py-1 rounded-full transition-all
              ${isAllPage 
                ? "bg-black text-white shadow-[4px_4px_0_#000]" 
                : "text-neutral-700 hover:bg-black hover:text-white"
              }
            `}
          >
            Сите
          </Link>
        </nav>
      </div>
    </div>
  );
};
