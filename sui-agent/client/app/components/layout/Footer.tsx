export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 py-4 px-6">
      <div className="max-w-2xl mx-auto flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div>
          <span>© 2024 SuiSage</span>
        </div>
        <div className="flex gap-4">
          <a
            href="https://github.com/atoma-network"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://docs.sui.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            Sui Docs
          </a>
          <a
            href="/privacy"
            className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            Privacy
          </a>
          <a
            href="/terms"
            className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
}
