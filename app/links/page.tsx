export default function LiciteraLinksPage() {
  const links = [
    {
      href: "https://licitera.hu",
      icon: "🌐",
      title: "Weboldal",
      sub: "Licitera böngészőből",
    },
    {
      href: "https://apps.apple.com/us/app/licitera/id6761125527",
      icon: "",
      title: "App Store",
      sub: "Töltsd le iOS-re",
    },
    {
      href: "https://play.google.com/store/apps/details?id=com.mateef.liciteramobile",
      icon: "▶",
      title: "Google Play",
      sub: "Töltsd le Androidra",
    },
    {
      href: "https://www.instagram.com/licitera.hu?igsh=MTQ4c242dXIwdnVjZA%3D%3D&utm_source=qr",
      icon: "◎",
      title: "Instagram",
      sub: "@licitera.hu",
    },
    {
      href: "https://www.facebook.com/profile.php?id=61572211163869",
      icon: "f",
      title: "Facebook",
      sub: "Kövess minket itt is",
    },
  ];

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-[linear-gradient(145deg,#0d0b2b,#1d0d4a_54%,#3b0f7d_74%,#ff2f92)] px-4 py-6 text-white">
      <div className="mx-auto flex min-h-full max-w-[460px] items-center">
        <section className="my-auto w-full rounded-[30px] border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-4 flex justify-center">
            <img
              src="/icon.png"
              alt="Licitera ikon"
              className="h-24 w-24 rounded-[28px] shadow-xl"
            />
          </div>

          <h1 className="text-center text-4xl font-bold tracking-tight">Licitera</h1>
          <p className="mt-3 text-center text-base leading-6 text-white/80">
            A licitálás új korszaka
            <br />
            Hirdess. Licitálj. Nyerj.
          </p>

          <div className="mx-auto mt-4 w-fit rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold">
            App • Web • Minden link egy helyen
          </div>

          <div className="mt-6 grid gap-3.5">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-4 transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 text-lg">
                    {link.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-bold">{link.title}</div>
                    <div className="text-sm text-white/75">{link.sub}</div>
                  </div>
                </div>
                <div className="shrink-0 text-xl opacity-80">›</div>
              </a>
            ))}
          </div>

          <div className="mt-5 text-center text-xs leading-5 text-white/70">
            © Licitera •{" "}
            <a
              href="https://licitera.hu"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white"
            >
              licitera.hu
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}