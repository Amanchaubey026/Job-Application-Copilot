import { useState } from "react";
import type {
  Education,
  Project,
  UserProfile,
  WorkExperience
} from "~types/profile";
import { createId } from "~utils/id";
import { TextField } from "./TextField";

type Props = {
  profile: UserProfile;
  busy: boolean;
  onSave: (profile: UserProfile) => Promise<void>;
  onReplaceResume: () => void;
  onDelete?: () => void;
};

export function ProfileEditor({
  profile,
  busy,
  onSave,
  onReplaceResume,
  onDelete
}: Props) {
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [skillDraft, setSkillDraft] = useState("");
  const [saved, setSaved] = useState(false);

  const personal = draft.personal;
  const address = personal.address ?? {};
  const links = draft.links;

  function updatePersonal(patch: Partial<UserProfile["personal"]>) {
    setDraft((current) => ({
      ...current,
      personal: { ...current.personal, ...patch }
    }));
    setSaved(false);
  }

  function updateAddress(patch: Partial<NonNullable<UserProfile["personal"]["address"]>>) {
    setDraft((current) => ({
      ...current,
      personal: {
        ...current.personal,
        address: { ...current.personal.address, ...patch }
      }
    }));
    setSaved(false);
  }

  function updateLinks(patch: Partial<UserProfile["links"]>) {
    setDraft((current) => ({
      ...current,
      links: { ...current.links, ...patch }
    }));
    setSaved(false);
  }

  function addSkill() {
    const value = skillDraft.trim();
    if (!value) return;
    if (draft.skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) {
      setSkillDraft("");
      return;
    }
    setDraft((current) => ({ ...current, skills: [...current.skills, value] }));
    setSkillDraft("");
    setSaved(false);
  }

  return (
    <form
      className="stack"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSave(draft);
        setSaved(true);
      }}
    >
      <section className="card">
        <h2 className="section-title">Personal Information</h2>
        <div className="row">
          <TextField
            label="First Name"
            value={personal.firstName ?? ""}
            onChange={(firstName) => updatePersonal({ firstName })}
          />
          <TextField
            label="Last Name"
            value={personal.lastName ?? ""}
            onChange={(lastName) => updatePersonal({ lastName })}
          />
        </div>
        <TextField
          label="Full Name"
          value={personal.fullName ?? ""}
          onChange={(fullName) => updatePersonal({ fullName })}
        />
        <TextField
          label="Email"
          type="email"
          value={personal.email ?? ""}
          onChange={(email) => updatePersonal({ email })}
        />
        <TextField
          label="Phone"
          type="tel"
          value={personal.phone ?? ""}
          onChange={(phone) => updatePersonal({ phone })}
        />
        <TextField
          label="Location"
          value={personal.location ?? ""}
          onChange={(location) => updatePersonal({ location })}
        />
        <TextField
          label="City"
          value={address.city ?? ""}
          onChange={(city) => updateAddress({ city })}
        />
        <div className="row">
          <TextField
            label="State"
            value={address.state ?? ""}
            onChange={(state) => updateAddress({ state })}
          />
          <TextField
            label="Postal Code"
            value={address.postalCode ?? ""}
            onChange={(postalCode) => updateAddress({ postalCode })}
          />
        </div>
        <TextField
          label="Country"
          value={address.country ?? ""}
          onChange={(country) => updateAddress({ country })}
        />
      </section>

      <section className="card">
        <h2 className="section-title">Links</h2>
        <TextField
          label="LinkedIn"
          value={links.linkedin ?? ""}
          onChange={(linkedin) => updateLinks({ linkedin })}
        />
        <TextField
          label="GitHub"
          value={links.github ?? ""}
          onChange={(github) => updateLinks({ github })}
        />
        <TextField
          label="Portfolio"
          value={links.portfolio ?? ""}
          onChange={(portfolio) => updateLinks({ portfolio })}
        />
        <TextField
          label="Website"
          value={links.website ?? ""}
          onChange={(website) => updateLinks({ website })}
        />
      </section>

      <section className="card">
        <h2 className="section-title">Experience</h2>
        {draft.experience.map((item, index) => (
          <ExperienceCard
            key={item.id}
            item={item}
            onChange={(next) => {
              setDraft((current) => ({
                ...current,
                experience: current.experience.map((row, i) => (i === index ? next : row))
              }));
              setSaved(false);
            }}
            onRemove={() => {
              setDraft((current) => ({
                ...current,
                experience: current.experience.filter((_, i) => i !== index)
              }));
              setSaved(false);
            }}
          />
        ))}
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => {
            setDraft((current) => ({
              ...current,
              experience: [
                ...current.experience,
                { id: createId(), company: "", title: "" }
              ]
            }));
            setSaved(false);
          }}
        >
          + Add Experience
        </button>
      </section>

      <section className="card">
        <h2 className="section-title">Education</h2>
        {draft.education.map((item, index) => (
          <EducationCard
            key={item.id}
            item={item}
            onChange={(next) => {
              setDraft((current) => ({
                ...current,
                education: current.education.map((row, i) => (i === index ? next : row))
              }));
              setSaved(false);
            }}
            onRemove={() => {
              setDraft((current) => ({
                ...current,
                education: current.education.filter((_, i) => i !== index)
              }));
              setSaved(false);
            }}
          />
        ))}
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => {
            setDraft((current) => ({
              ...current,
              education: [...current.education, { id: createId(), institution: "", degree: "" }]
            }));
            setSaved(false);
          }}
        >
          + Add Education
        </button>
      </section>

      <section className="card">
        <h2 className="section-title">Skills</h2>
        <div className="chips" style={{ marginBottom: 8 }}>
          {draft.skills.map((skill) => (
            <span className="chip" key={skill}>
              {skill}
              <button
                type="button"
                aria-label={`Remove ${skill}`}
                onClick={() => {
                  setDraft((current) => ({
                    ...current,
                    skills: current.skills.filter((item) => item !== skill)
                  }));
                  setSaved(false);
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="row">
          <TextField
            label="Add skill"
            value={skillDraft}
            onChange={setSkillDraft}
            placeholder="Type a skill and add"
          />
        </div>
        <button className="btn btn-secondary" type="button" onClick={addSkill}>
          + Add Skill
        </button>
      </section>

      <section className="card">
        <h2 className="section-title">Projects</h2>
        {draft.projects.map((item, index) => (
          <ProjectCard
            key={item.id}
            item={item}
            onChange={(next) => {
              setDraft((current) => ({
                ...current,
                projects: current.projects.map((row, i) => (i === index ? next : row))
              }));
              setSaved(false);
            }}
            onRemove={() => {
              setDraft((current) => ({
                ...current,
                projects: current.projects.filter((_, i) => i !== index)
              }));
              setSaved(false);
            }}
          />
        ))}
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => {
            setDraft((current) => ({
              ...current,
              projects: [...current.projects, { id: createId(), name: "" }]
            }));
            setSaved(false);
          }}
        >
          + Add Project
        </button>
      </section>

      {saved ? (
        <div className="banner banner-success" role="status">
          Profile saved locally. Use Fill this page on a job application tab.
        </div>
      ) : null}

      <div className="btn-row">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save Profile"}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onReplaceResume}>
          Replace resume
        </button>
        {onDelete ? (
          <button className="btn btn-danger" type="button" onClick={onDelete}>
            Delete profile
          </button>
        ) : null}
      </div>
    </form>
  );
}

function ExperienceCard({
  item,
  onChange,
  onRemove
}: {
  item: WorkExperience;
  onChange: (item: WorkExperience) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(!item.company && !item.title);
  return (
    <div className="item-card">
      <div className="meta" style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h3>{item.company || "Untitled company"}</h3>
          <div className="muted">{item.title || "No title"}</div>
        </div>
        <div className="btn-row">
          <button className="btn btn-ghost" type="button" onClick={() => setOpen((v) => !v)}>
            {open ? "Close" : "Edit"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
      {open ? (
        <div style={{ marginTop: 8 }}>
          <TextField
            label="Company"
            value={item.company ?? ""}
            onChange={(company) => onChange({ ...item, company })}
          />
          <TextField
            label="Job title"
            value={item.title ?? ""}
            onChange={(title) => onChange({ ...item, title })}
          />
          <div className="row">
            <TextField
              label="Start date"
              value={item.startDate ?? ""}
              onChange={(startDate) => onChange({ ...item, startDate })}
            />
            <TextField
              label="End date"
              value={item.endDate ?? ""}
              onChange={(endDate) => onChange({ ...item, endDate })}
            />
          </div>
          <TextField
            label="Description"
            multiline
            value={item.description ?? ""}
            onChange={(description) => onChange({ ...item, description })}
          />
        </div>
      ) : null}
    </div>
  );
}

function EducationCard({
  item,
  onChange,
  onRemove
}: {
  item: Education;
  onChange: (item: Education) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(!item.institution && !item.degree);
  return (
    <div className="item-card">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h3>{item.degree || "Untitled degree"}</h3>
          <div className="muted">{item.institution || "No institution"}</div>
        </div>
        <div className="btn-row">
          <button className="btn btn-ghost" type="button" onClick={() => setOpen((v) => !v)}>
            {open ? "Close" : "Edit"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
      {open ? (
        <div style={{ marginTop: 8 }}>
          <TextField
            label="Institution"
            value={item.institution ?? ""}
            onChange={(institution) => onChange({ ...item, institution })}
          />
          <TextField
            label="Degree"
            value={item.degree ?? ""}
            onChange={(degree) => onChange({ ...item, degree })}
          />
          <TextField
            label="Field"
            value={item.field ?? ""}
            onChange={(field) => onChange({ ...item, field })}
          />
          <div className="row">
            <TextField
              label="Start date"
              value={item.startDate ?? ""}
              onChange={(startDate) => onChange({ ...item, startDate })}
            />
            <TextField
              label="End date"
              value={item.endDate ?? ""}
              onChange={(endDate) => onChange({ ...item, endDate })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProjectCard({
  item,
  onChange,
  onRemove
}: {
  item: Project;
  onChange: (item: Project) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(!item.name);
  return (
    <div className="item-card">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h3>{item.name || "Untitled project"}</h3>
        </div>
        <div className="btn-row">
          <button className="btn btn-ghost" type="button" onClick={() => setOpen((v) => !v)}>
            {open ? "Close" : "Edit"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
      {open ? (
        <div style={{ marginTop: 8 }}>
          <TextField
            label="Name"
            value={item.name ?? ""}
            onChange={(name) => onChange({ ...item, name })}
          />
          <TextField
            label="Description"
            multiline
            value={item.description ?? ""}
            onChange={(description) => onChange({ ...item, description })}
          />
          <TextField
            label="URL"
            value={item.url ?? ""}
            onChange={(url) => onChange({ ...item, url })}
          />
        </div>
      ) : null}
    </div>
  );
}
