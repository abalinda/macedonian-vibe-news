import Link from "next/link";

export const NavBar = () => (
  <nav className="sticky top-0 z-50 border-b border-black bg-[#FDFBF7] py-3 px-4 md:px-8 flex justify-between items-center">
    <div className="flex items-center gap-4">
      <button className="p-2 hover:bg-black hover:text-white transition-colors rounded-full">
        {/* Hamburger Icon */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
        </svg>
      </button>
      <span className="text-xs font-bold tracking-widest uppercase font-sans hidden md:block">
        Macedonia / Curated
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
    { name: "Homepage", value: null },
    { name: "Tech", value: "Tech" },
    { name: "Culture", value: "Culture" },
    { name: "Lifestyle", value: "Lifestyle" },
    { name: "Business", value: "Business" },
  ];

  return (
    <div className="border-b border-neutral-300 bg-[#FDFBF7]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <nav className="flex items-center gap-6 py-4 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-6">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.value;
              const href = cat.value ? `/?category=${cat.value}` : "/";
              
              return (
                <Link
                  key={cat.name}
                  href={href}
                  className={`
                    text-xs font-bold uppercase tracking-widest whitespace-nowrap
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
              ml-auto text-xs font-bold uppercase tracking-widest whitespace-nowrap
              border border-black px-3 py-1 rounded-full transition-all
              ${isAllPage 
                ? "bg-black text-white shadow-[4px_4px_0_#000]" 
                : "text-neutral-700 hover:bg-black hover:text-white"
              }
            `}
          >
            All
          </Link>
        </nav>
      </div>
    </div>
  );
};
