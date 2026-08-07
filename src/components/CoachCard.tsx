import { SparkIcon } from "./icons";

type CoachCardProps = {
  title: string;
  message: string;
  detail?: string;
  loading?: boolean;
  tone?: "neutral" | "success" | "tip";
};

export function CoachCard({ title, message, detail, loading, tone = "neutral" }: CoachCardProps) {
  return (
    <section className="coach-card" data-tone={tone} aria-live="polite" aria-busy={loading}>
      <div className="coach-icon"><SparkIcon /></div>
      <div>
        <p className="eyebrow">COACH PROBABILISTE</p>
        <h2>{title}</h2>
        <p>{message}</p>
        {detail ? <p className="coach-detail">{detail}</p> : null}
      </div>
    </section>
  );
}
