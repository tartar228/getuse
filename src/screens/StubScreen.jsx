export default function StubScreen({ title, stage, text }) {
  return (
    <div className="screen">
      <h2 className="h2">{title}</h2>
      <div className="card stub">
        <div className="stub-stage">Этап {stage}</div>
        <p>{text}</p>
      </div>
    </div>
  );
}
