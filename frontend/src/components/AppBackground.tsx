type AppBackgroundProps = {
  variant?: "default" | "immersive";
  accent?: string;
};

/** Obsidian ground: flat warm near-black. The old animated signal/particle atmosphere was removed. */
export default function AppBackground(_props: AppBackgroundProps) {
  return <div className="fixed inset-0 z-0 pointer-events-none bg-[#0d0d0c]" aria-hidden="true" />;
}
