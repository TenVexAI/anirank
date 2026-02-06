function Footer() {
  return (
    <footer className="bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] px-6 py-4 mt-auto">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
        <span>&copy; {new Date().getFullYear()} AniRank</span>
        <span>
          Powered by{' '}
          <a
            href="https://anilist.co"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent-cyan)] hover:underline"
          >
            AniList
          </a>
        </span>
      </div>
    </footer>
  );
}

export default Footer;
