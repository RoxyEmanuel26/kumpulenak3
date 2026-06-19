import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us - KumpulEnak",
  description: "Learn more about KumpulEnak video aggregation, synchronization, and streaming capabilities.",
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 md:px-8 py-10 max-w-3xl text-left text-white space-y-6">
      <h1 className="text-3xl font-extrabold bg-gradient-to-r from-red-600 to-purple-500 bg-clip-text text-transparent font-heading mb-4">
        About KumpulEnak
      </h1>
      
      <p className="text-sm text-foreground/80 leading-relaxed">
        KumpulEnak is a highly optimized, fully automated high-performance video aggregator. 
        It integrates advanced streaming, caching, and custom player solutions to deliver 
        unparalleled speed and reliability for automated content indexing.
      </p>

      <h2 className="text-xl font-bold mt-6 text-white/90">Our Capabilities</h2>
      <ul className="list-disc pl-5 text-sm text-foreground/70 space-y-2">
        <li>Real-time automated content synchronization with media feeds.</li>
        <li>Custom optimized inline-iframe streaming engine with low-latency responsiveness.</li>
      </ul>

      <h2 className="text-xl font-bold mt-6 text-white/90">Premium Aesthetics</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Our front-end utilizes curated dark mode themes, ambient glow borders, glassmorphism overlays, 
        and high-framerate hover thumbnail animations for an immersive user experience across all devices.
      </p>
    </div>
  );
}
