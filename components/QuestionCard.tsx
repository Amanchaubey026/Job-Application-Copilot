import { useState } from "react";
import type { AnswerLength, AnswerTone, GeneratedAnswer } from "~types/ai";
import type { ApplicationQuestion } from "~types/job";

type Props = {
  question: ApplicationQuestion;
  busy: boolean;
  error?: string | null;
  answer: GeneratedAnswer | null;
  draft: string;
  evidence?: string[];
  previous?: Array<{ question: string; answer: string; source: string }>;
  onDraftChange: (value: string) => void;
  onGenerate: (tone: AnswerTone, length: AnswerLength) => void;
  onUse: (replace: boolean) => void;
  onCancel: () => void;
  onUsePrevious?: (text: string) => void;
};

export function QuestionCard({
  question,
  busy,
  error,
  answer,
  draft,
  evidence,
  previous,
  onDraftChange,
  onGenerate,
  onUse,
  onCancel,
  onUsePrevious
}: Props) {
  const [tone, setTone] = useState<AnswerTone>("professional");
  const [length, setLength] = useState<AnswerLength>("medium");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const hasExisting = Boolean(question.currentValue?.trim());
  const max = question.maxLength ?? 800;

  return (
    <div className="item-card">
      <h3>{question.question}</h3>
      {question.maxLength ? (
        <div className="tiny">Maximum characters: {question.maxLength}</div>
      ) : null}
      {evidence?.length ? (
        <div style={{ marginTop: 8 }}>
          <div className="tiny">Relevant experience found</div>
          <ul className="found-list">
            {evidence.map((title) => (
              <li key={title}>• {title}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="tiny">No strong evidence found yet. Generate only if you want a draft anyway.</p>
      )}
      {previous?.length ? (
        <div className="banner" style={{ marginTop: 8 }}>
          Previous answer found
          {previous.map((item) => (
            <div key={item.question} style={{ marginTop: 6 }}>
              <div className="tiny">{item.question}</div>
              <p className="muted">{item.answer.slice(0, 180)}</p>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => onUsePrevious?.(item.answer)}
              >
                View Previous Answer
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {!answer ? (
        <div className="btn-row" style={{ marginTop: 8 }}>
          <button
            className="btn btn-primary"
            type="button"
            disabled={busy}
            onClick={() => onGenerate(tone, length)}
          >
            {busy ? "Generating answer…" : "Generate Answer"}
          </button>
        </div>
      ) : null}

      {error ? <div className="banner banner-error" style={{ marginTop: 8 }}>{error}</div> : null}

      {answer?.needsUserInput ? (
        <div className="banner banner-error" style={{ marginTop: 8 }}>
          Not enough profile information.
          {(answer.missingInformation ?? []).join(" ")}
        </div>
      ) : null}

      {answer && !answer.needsUserInput ? (
        <div style={{ marginTop: 8 }}>
          <div className="section-title">Suggested Answer</div>
          <textarea
            className="answer-box"
            maxLength={max}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value.slice(0, max))}
          />
          <div className="tiny">
            {draft.length}/{max} · confidence {Math.round(answer.confidence * 100)}%
          </div>
          {answer.citations?.length || answer.sources.length ? (
            <div>
              <div className="section-title">Sources used</div>
              <ul className="found-list">
                {(answer.citations?.map((item) => item.title) ?? answer.sources).map((title) => (
                  <li key={title}>• {title}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="row" style={{ marginTop: 8 }}>
            <div className="field">
              <label htmlFor={`tone-${question.id}`}>Tone</label>
              <select
                id={`tone-${question.id}`}
                value={tone}
                onChange={(event) => setTone(event.target.value as AnswerTone)}
              >
                <option value="professional">Professional</option>
                <option value="conversational">Conversational</option>
                <option value="concise">Concise</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor={`len-${question.id}`}>Length</label>
              <select
                id={`len-${question.id}`}
                value={length}
                onChange={(event) => setLength(event.target.value as AnswerLength)}
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>
          </div>
          {confirmReplace ? (
            <div className="banner" style={{ marginTop: 8 }}>
              Existing answer detected. Replace it with the generated answer?
              <div className="btn-row" style={{ marginTop: 8 }}>
                <button className="btn btn-secondary" type="button" onClick={() => setConfirmReplace(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" type="button" onClick={() => onUse(true)}>
                  Replace
                </button>
              </div>
            </div>
          ) : (
            <div className="btn-row" style={{ marginTop: 8 }}>
              <button
                className="btn btn-primary"
                type="button"
                disabled={busy || !draft.trim()}
                onClick={() => {
                  if (hasExisting) setConfirmReplace(true);
                  else onUse(false);
                }}
              >
                Use Answer
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={busy}
                onClick={() => onGenerate(tone, length)}
              >
                {busy ? "Generating answer…" : "Regenerate"}
              </button>
              <button className="btn btn-ghost" type="button" onClick={onCancel}>
                Cancel
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
