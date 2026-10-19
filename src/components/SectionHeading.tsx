import { Flourish } from "./Ornaments";
import Reveal from "./Reveal";

export default function SectionHeading({
  numeral,
  kicker,
  title,
  children,
  tone = "ink",
}: {
  numeral: string;
  kicker: string;
  title: string;
  children?: React.ReactNode;
  tone?: "ink" | "paper";
}) {
  const dark = tone === "paper";
  return (
    <Reveal className="mx-auto mb-16 max-w-2xl text-center">
      <p className={`caps ${dark ? "text-gold" : "text-rose"}`}>
        {numeral} &nbsp;·&nbsp; {kicker}
      </p>
      <h2
        className={`font-display mt-4 text-5xl leading-[1.02] font-medium text-balance sm:text-6xl ${dark ? "text-paper" : "text-ink"}`}
      >
        {title}
      </h2>
      <Flourish className={`mx-auto mt-5 w-44 ${dark ? "text-gold/80" : "text-ink/50"}`} />
      {children && (
        <p className={`mt-5 text-xl italic text-pretty ${dark ? "text-paper/75" : "text-ink-soft"}`}>{children}</p>
      )}
    </Reveal>
  );
}
