import { useState } from "react";
import type { GeneratedAnswer, JobAnalysis } from "~types/ai";
import type { ApplicationQuestion, JobContext } from "~types/job";
import { QuestionCard } from "./QuestionCard";
import type { AnswerLength, AnswerTone } from "~types/ai";

type QuestionState = {
  answer: GeneratedAnswer | null;
  draft: string;
  error: string | null;
};

type Props = {
  job: JobContext | null;
  questions: ApplicationQuestion[];
  analysis: JobAnalysis | null;
  analyzing: boolean;
  generatingId: string | null;
  ollamaReady: boolean;
  questionState: Record<string, QuestionState>;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  onAnalyze: () => void;
  onGenerate: (question: ApplicationQuestion, tone: AnswerTone, length: AnswerLength) => void;
  onDraftChange: (id: string, value: string) => void;
  onUse: (question: ApplicationQuestion, replace: boolean) => void;
  onCancelQuestion: (id: string) => void;
};

export function JobPanel({
  job,
  questions,
  analysis,
  analyzing,
  generatingId,
  ollamaReady,
  questionState,
  detailsOpen,
  onToggleDetails,
  onAnalyze,
  onGenerate,
  onDraftChange,
  onUse,
  onCancelQuestion
}: Props) {
  const [showMissing, setShowMissing] = useState(true);
  const detected = Boolean(job && (job.title || job.company) && job.confidence >= 0.5);

  return (
    <div className="stack">
      <div className="card">
        <h2 className="section-title">Job detected</h2>
        {detected ? (
          <>
            <div>
              <strong>{job?.title || "Untitled role"}</strong>
            </div>
            <div className="muted">{job?.company || "Unknown company"}</div>
            {job?.location ? <div className="muted">{job.location}</div> : null}
          </>
        ) : (
          <p className="muted">
            Could not confidently identify the job. You can still use basic autofill.
          </p>
        )}
      </div>

      <div className="btn-row">
        <button
          className="btn btn-primary"
          type="button"
          disabled={analyzing || !ollamaReady || !job}
          onClick={onAnalyze}
        >
          {analyzing ? "Analyzing job…" : "Analyze Job"}
        </button>
      </div>
      {!ollamaReady ? (
        <p className="muted">Start Ollama and select a model in AI Settings to analyze jobs.</p>
      ) : null}

      {analysis ? (
        <div className="card">
          <h2 className="section-title">Job Match</h2>
          <div className="score">{Math.round(analysis.matchScore * 100)}%</div>
          <div className="score-caption">
            Profile relevance (AI estimate, not a chance of being hired)
          </div>
          <h3 className="section-title" style={{ marginTop: 12 }}>
            Strong matches
          </h3>
          <ul className="found-list">
            {analysis.matchingSkills.length ? (
              analysis.matchingSkills.map((skill) => (
                <li key={skill}>
                  <span className="check">✓</span>
                  {skill}
                </li>
              ))
            ) : (
              <li className="muted">No overlapping skills found in your profile.</li>
            )}
          </ul>
          <h3 className="section-title" style={{ marginTop: 12 }}>
            Relevant experience
          </h3>
          <ul className="found-list">
            {analysis.matchingExperience.length ? (
              analysis.matchingExperience.map((item) => <li key={item}>• {item}</li>)
            ) : (
              <li className="muted">No overlapping experience titles were identified.</li>
            )}
          </ul>
          {analysis.relevantProjects.length ? (
            <>
              <h3 className="section-title" style={{ marginTop: 12 }}>
                Relevant projects
              </h3>
              <ul className="found-list">
                {analysis.relevantProjects.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </>
          ) : null}
          {showMissing && analysis.missingSkills.length ? (
            <>
              <h3 className="section-title" style={{ marginTop: 12 }}>
                Missing / unclear
              </h3>
              <ul className="found-list">
                {analysis.missingSkills.map((skill) => (
                  <li key={skill}>
                    <span className="miss">?</span>
                    {skill}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <button className="btn btn-ghost" type="button" onClick={onToggleDetails}>
            {detailsOpen ? "Hide details" : "View Details"}
          </button>
          {detailsOpen ? <p className="muted">{analysis.summary}</p> : null}
          <button className="btn btn-ghost" type="button" onClick={() => setShowMissing((v) => !v)}>
            {showMissing ? "Hide missing skills" : "Show missing skills"}
          </button>
        </div>
      ) : null}

      <div className="card">
        <h2 className="section-title">Application questions</h2>
        {questions.length === 0 ? (
          <p className="muted">No narrative application questions detected on this page.</p>
        ) : (
          questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              busy={generatingId === question.id}
              error={questionState[question.id]?.error}
              answer={questionState[question.id]?.answer ?? null}
              draft={questionState[question.id]?.draft ?? ""}
              onDraftChange={(value) => onDraftChange(question.id, value)}
              onGenerate={(tone, length) => onGenerate(question, tone, length)}
              onUse={(replace) => onUse(question, replace)}
              onCancel={() => onCancelQuestion(question.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
