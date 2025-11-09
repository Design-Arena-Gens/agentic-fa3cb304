/* eslint-disable react/no-array-index-key */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { generatePost, type SubjectProfile } from "@/lib/postGenerator";
import {
  storage,
  type AgentSettings,
  type StoredPost,
  type StoredSubject
} from "@/lib/storage";

const toneOptions: SubjectProfile["tone"][] = [
  "Inspiring",
  "Practical",
  "Thought Leadership",
  "Storytelling"
];

const formatDate = (iso: string) => {
  const [year, month, day] = iso.split("-");
  return `${year}-${month}-${day}`;
};

const normalizeDate = (value: Date) =>
  value.toLocaleDateString("en-CA", {
    timeZone: "UTC"
  });

const createNewSubject = (): StoredSubject => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  topic: "",
  tone: "Thought Leadership",
  audience: "",
  callToAction: "I'd love to trade notes—drop your perspective below",
  keyTakeaway: "Clarity beats complexity when momentum matters"
});

const bannerStyles: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: "12px",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  marginBottom: "24px",
  background: "linear-gradient(135deg, rgba(30,64,175,0.3), rgba(14,116,144,0.2))"
};

export default function Home() {
  const [subjects, setSubjects] = useState<StoredSubject[]>([]);
  const [posts, setPosts] = useState<StoredPost[]>([]);
  const [settings, setSettings] = useState<AgentSettings>({
    autoGenerate: true,
    preferredHour: 8
  });
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const today = useMemo(() => normalizeDate(new Date()), []);

  useEffect(() => {
    const storedSubjects = storage.readSubjects();
    const storedPosts = storage.readPosts();
    const storedSettings = storage.readSettings();
    setSubjects(
      storedSubjects.length > 0 ? storedSubjects : [createNewSubject()]
    );
    setPosts(storedPosts);
    setSettings(storedSettings);
    setActiveSubjectId(storedSubjects[0]?.id ?? null);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    storage.writeSubjects(subjects);
  }, [isReady, subjects]);

  useEffect(() => {
    if (!isReady) return;
    storage.writePosts(posts);
  }, [isReady, posts]);

  useEffect(() => {
    if (!isReady) return;
    storage.writeSettings(settings);
  }, [isReady, settings]);

  const activeSubject = useMemo(
    () => subjects.find((subject) => subject.id === activeSubjectId) ?? null,
    [subjects, activeSubjectId]
  );

  const todaysPost = useMemo(() => {
    if (!activeSubject) return null;
    return (
      posts.find(
        (post) =>
          post.subjectId === activeSubject.id && post.generatedFor === today
      ) ?? null
    );
  }, [activeSubject, posts, today]);

  const generateForSubject = useCallback(
    (subject: StoredSubject, date: string) => {
      const result = generatePost(subject, date);
      const newPost: StoredPost = {
        id: crypto.randomUUID(),
        subjectId: subject.id,
        generatedFor: date,
        headline: result.headline,
        body: result.body,
        hashtags: result.hashtags
      };
      setPosts((prev) => {
        const filtered = prev.filter(
          (post) =>
            !(
              post.subjectId === subject.id && post.generatedFor === newPost.generatedFor
            )
        );
        return [newPost, ...filtered].sort((a, b) =>
          a.generatedFor > b.generatedFor ? -1 : 1
        );
      });
    },
    []
  );

  useEffect(() => {
    if (!isReady || !activeSubject || !settings.autoGenerate) return;
    if (todaysPost) return;
    generateForSubject(activeSubject, today);
  }, [isReady, activeSubject, todaysPost, settings.autoGenerate, today, generateForSubject]);

  const updateSubject = (id: string, patch: Partial<StoredSubject>) => {
    setSubjects((prev) =>
      prev.map((subject) => (subject.id === id ? { ...subject, ...patch } : subject))
    );
  };

  const addSubject = () => {
    const nextSubject = createNewSubject();
    setSubjects((prev) => [nextSubject, ...prev]);
    setActiveSubjectId(nextSubject.id);
  };

  const removeSubject = (id: string) => {
    setSubjects((prev) => prev.filter((subject) => subject.id !== id));
    if (activeSubjectId === id) {
      setActiveSubjectId(null);
    }
  };

  const subjectHistory = useMemo(() => {
    if (!activeSubject) return [];
    return posts.filter((post) => post.subjectId === activeSubject.id);
  }, [posts, activeSubject]);

  if (!isReady) {
    return null;
  }

  return (
    <main
      style={{
        width: "100%",
        maxWidth: "1100px",
        background: "rgba(15, 23, 42, 0.8)",
        borderRadius: "24px",
        border: "1px solid rgba(148, 163, 184, 0.25)",
        boxShadow: "0 40px 100px rgba(15, 23, 42, 0.45)",
        padding: "40px",
        display: "grid",
        gridTemplateColumns: "360px 1fr",
        gap: "36px"
      }}
    >
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          borderRight: "1px solid rgba(148, 163, 184, 0.15)",
          paddingRight: "24px"
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 600,
              letterSpacing: "-0.02em"
            }}
          >
            Daily LinkedIn Agent
          </h1>
          <p style={{ marginTop: "8px", opacity: 0.7, fontSize: "15px" }}>
            Set the topics you want to champion. The agent drafts a ready-to-publish
            LinkedIn update every morning and keeps a ledger of your daily posts.
          </p>
        </div>

        <div style={bannerStyles}>
          <strong style={{ display: "block", fontSize: "14px", letterSpacing: "0.08em" }}>
            TODAY&apos;S CHECKPOINT
          </strong>
          <p style={{ margin: "4px 0 0", lineHeight: 1.6 }}>
            {todaysPost
              ? "Your post is ready. Review, tweak, and drop it on LinkedIn."
              : "No draft yet. Hit “Generate now” to ship today’s update."}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 600
              }}
            >
              Subjects
            </h2>
            <button
              type="button"
              onClick={addSubject}
              style={{
                background: "linear-gradient(135deg, #22d3ee, #3b82f6)",
                color: "#0f172a",
                border: "none",
                borderRadius: "999px",
                padding: "6px 14px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Add
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}
          >
            {subjects.map((subject) => (
              <button
                key={subject.id}
                type="button"
                onClick={() => setActiveSubjectId(subject.id)}
                style={{
                  background:
                    subject.id === activeSubjectId
                      ? "rgba(96, 165, 250, 0.2)"
                      : "rgba(148, 163, 184, 0.06)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  borderRadius: "16px",
                  padding: "16px",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  cursor: "pointer"
                }}
              >
                <span style={{ fontWeight: 600 }}>{subject.topic || "Untitled subject"}</span>
                <span style={{ fontSize: "12px", opacity: 0.6 }}>{subject.tone}</span>
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(148, 163, 184, 0.15)",
            paddingTop: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}
        >
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>Automation</h2>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "14px"
            }}
          >
            <input
              type="checkbox"
              checked={settings.autoGenerate}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, autoGenerate: event.target.checked }))
              }
            />
            Auto-generate each morning
          </label>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              fontSize: "14px"
            }}
          >
            Preferred hour
            <input
              type="number"
              min={4}
              max={20}
              value={settings.preferredHour}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  preferredHour: Math.min(20, Math.max(4, Number(event.target.value) || 8))
                }))
              }
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                borderRadius: "12px",
                padding: "10px 12px",
                color: "inherit",
                fontSize: "14px"
              }}
            />
          </label>
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        {activeSubject ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "16px",
                background: "rgba(15, 23, 42, 0.6)",
                padding: "24px",
                borderRadius: "20px",
                border: "1px solid rgba(148, 163, 184, 0.15)"
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <label style={{ fontSize: "14px" }}>
                  Topic
                  <input
                    type="text"
                    value={activeSubject.topic}
                    onChange={(event) =>
                      updateSubject(activeSubject.id, { topic: event.target.value })
                    }
                    placeholder="e.g. Leading remote-first product teams"
                    style={{
                      marginTop: "6px",
                      width: "100%",
                      padding: "12px",
                      borderRadius: "14px",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      background: "rgba(15, 23, 42, 0.65)",
                      color: "inherit"
                    }}
                  />
                </label>
                <label style={{ fontSize: "14px" }}>
                  Key takeaway
                  <input
                    type="text"
                    value={activeSubject.keyTakeaway}
                    onChange={(event) =>
                      updateSubject(activeSubject.id, { keyTakeaway: event.target.value })
                    }
                    placeholder="e.g. Consistency beats velocity for trust"
                    style={{
                      marginTop: "6px",
                      width: "100%",
                      padding: "12px",
                      borderRadius: "14px",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      background: "rgba(15, 23, 42, 0.65)",
                      color: "inherit"
                    }}
                  />
                </label>
                <label style={{ fontSize: "14px" }}>
                  Call to action
                  <input
                    type="text"
                    value={activeSubject.callToAction}
                    onChange={(event) =>
                      updateSubject(activeSubject.id, { callToAction: event.target.value })
                    }
                    placeholder="e.g. DM me for the framework"
                    style={{
                      marginTop: "6px",
                      width: "100%",
                      padding: "12px",
                      borderRadius: "14px",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      background: "rgba(15, 23, 42, 0.65)",
                      color: "inherit"
                    }}
                  />
                </label>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <label style={{ fontSize: "14px" }}>
                  Tone
                  <select
                    value={activeSubject.tone}
                    onChange={(event) =>
                      updateSubject(activeSubject.id, {
                        tone: event.target.value as SubjectProfile["tone"]
                      })
                    }
                    style={{
                      marginTop: "6px",
                      width: "100%",
                      padding: "12px",
                      borderRadius: "14px",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      background: "rgba(15, 23, 42, 0.65)",
                      color: "inherit"
                    }}
                  >
                    {toneOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ fontSize: "14px" }}>
                  Audience focus
                  <input
                    type="text"
                    value={activeSubject.audience}
                    onChange={(event) =>
                      updateSubject(activeSubject.id, { audience: event.target.value })
                    }
                    placeholder="e.g. product leaders"
                    style={{
                      marginTop: "6px",
                      width: "100%",
                      padding: "12px",
                      borderRadius: "14px",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      background: "rgba(15, 23, 42, 0.65)",
                      color: "inherit"
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeSubject(activeSubject.id)}
                  style={{
                    marginTop: "auto",
                    background: "rgba(239, 68, 68, 0.18)",
                    border: "1px solid rgba(248, 113, 113, 0.4)",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    color: "rgba(248, 250, 252, 0.9)",
                    cursor: "pointer"
                  }}
                >
                  Remove subject
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "22px" }}>Today&apos;s Draft</h2>
                <p style={{ margin: "8px 0 0", opacity: 0.6 }}>
                  {today} · {activeSubject.topic || "Untitled subject"}
                </p>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => generateForSubject(activeSubject, today)}
                  style={{
                    background: "linear-gradient(135deg, #22d3ee, #3b82f6)",
                    border: "none",
                    borderRadius: "999px",
                    padding: "12px 20px",
                    fontWeight: 600,
                    color: "#0f172a",
                    cursor: "pointer"
                  }}
                >
                  Generate now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextDate = normalizeDate(
                      new Date(Date.now() + 24 * 60 * 60 * 1000)
                    );
                    generateForSubject(activeSubject, nextDate);
                  }}
                  style={{
                    background: "rgba(148, 163, 184, 0.15)",
                    border: "1px solid rgba(148, 163, 184, 0.4)",
                    borderRadius: "999px",
                    padding: "12px 20px",
                    fontWeight: 600,
                    color: "inherit",
                    cursor: "pointer"
                  }}
                >
                  Prep tomorrow
                </button>
              </div>
            </div>

            <article
              style={{
                background: "rgba(15, 23, 42, 0.65)",
                borderRadius: "20px",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                gap: "16px"
              }}
            >
              {todaysPost ? (
                <>
                  <header>
                    <h3
                      style={{
                        margin: "0 0 8px",
                        fontSize: "20px",
                        fontWeight: 600
                      }}
                    >
                      {todaysPost.headline}
                    </h3>
                    <p style={{ margin: 0, opacity: 0.6 }}>
                      Auto-generated at {settings.preferredHour.toString().padStart(2, "0")}:00
                    </p>
                  </header>
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.6,
                      fontSize: "15px",
                      fontFamily: "inherit"
                    }}
                  >
                    {todaysPost.body}
                  </pre>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                      opacity: 0.8,
                      fontSize: "13px"
                    }}
                  >
                    {todaysPost.hashtags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          background: "rgba(30, 64, 175, 0.25)",
                          padding: "6px 10px",
                          borderRadius: "999px"
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const text = `${todaysPost.headline}\n\n${todaysPost.body}\n\n${todaysPost.hashtags.join(
                        " "
                      )}`;
                      navigator.clipboard.writeText(text);
                    }}
                    style={{
                      alignSelf: "flex-start",
                      background: "linear-gradient(135deg, #3b82f6, #22d3ee)",
                      color: "#0f172a",
                      border: "none",
                      borderRadius: "12px",
                      padding: "10px 16px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Copy for LinkedIn
                  </button>
                </>
              ) : (
                <p style={{ margin: 0, opacity: 0.7 }}>
                  No draft generated yet today. Hit “Generate now” to prepare your post.
                </p>
              )}
            </article>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px"
              }}
            >
              <h2 style={{ margin: 0, fontSize: "20px" }}>Daily Ledger</h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  maxHeight: "300px",
                  overflowY: "auto"
                }}
              >
                {subjectHistory.length === 0 ? (
                  <p style={{ opacity: 0.6, margin: 0 }}>No history yet.</p>
                ) : (
                  subjectHistory.map((post) => (
                    <details
                      key={post.id}
                      style={{
                        background: "rgba(30, 41, 59, 0.5)",
                        borderRadius: "16px",
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                        padding: "16px"
                      }}
                    >
                      <summary style={{ cursor: "pointer" }}>
                        {formatDate(post.generatedFor)} · {post.headline}
                      </summary>
                      <pre
                        style={{
                          marginTop: "12px",
                          whiteSpace: "pre-wrap",
                          fontFamily: "inherit",
                          lineHeight: 1.6,
                          fontSize: "14px"
                        }}
                      >
                        {post.body}
                      </pre>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                          marginTop: "8px",
                          fontSize: "12px",
                          opacity: 0.8
                        }}
                      >
                        {post.hashtags.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              background: "rgba(59, 130, 246, 0.18)",
                              padding: "4px 8px",
                              borderRadius: "999px"
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </details>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div
            style={{
              background: "rgba(15, 23, 42, 0.6)",
              borderRadius: "20px",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              padding: "36px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              alignItems: "flex-start"
            }}
          >
            <h2 style={{ margin: 0 }}>No subject selected</h2>
            <p style={{ margin: 0, opacity: 0.7 }}>
              Add a subject to start generating daily LinkedIn updates. The agent keeps your
              topics on rotation and drafts a fresh post every morning.
            </p>
            <button
              type="button"
              onClick={addSubject}
              style={{
                background: "linear-gradient(135deg, #22d3ee, #3b82f6)",
                border: "none",
                borderRadius: "999px",
                padding: "12px 20px",
                fontWeight: 600,
                color: "#0f172a",
                cursor: "pointer"
              }}
            >
              Create subject
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
