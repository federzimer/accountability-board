"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { nextColorKey } from "@/lib/goalColors";
import type { Idea } from "@/lib/types";

const STEPS = ["Brainstorm", "Pick your bet", "Make it measurable", "This week"];

export default function GoalWizard({
  memberId,
  cycleId,
  projectId,
  sprintEnd,
}: {
  memberId: string;
  cycleId: string | null; // current cycle, for per-person check-in cadence
  projectId: string; // the venture this goal belongs to
  sprintEnd: string; // YYYY-MM-DD, the venture's 90-day end (default goal deadline)
}) {
  const supabase = createClient();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Step 1 — ideas
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ideaInput, setIdeaInput] = useState("");

  // Step 2 — chosen bet
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [bet, setBet] = useState("");

  // Step 3 — measurable goal
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState("");
  const [target, setTarget] = useState("");
  const [endDate, setEndDate] = useState(sprintEnd);
  const [why, setWhy] = useState("");
  const [goalId, setGoalId] = useState<string | null>(null);

  // Step 4 — tactics
  const [tactics, setTactics] = useState<string[]>(["", "", ""]);

  // ---- AI coach ----
  type BetGroup = { title: string; groups: string[]; bet_sentence: string; why: string };
  const [focus, setFocus] = useState("");
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachNote, setCoachNote] = useState("");
  const [brainstormSummary, setBrainstormSummary] = useState<{ summary: string; directions: string[] } | null>(null);
  const [betGroups, setBetGroups] = useState<BetGroup[] | null>(null);
  const [betRec, setBetRec] = useState("");
  const [measurableAlts, setMeasurableAlts] = useState<string[]>([]);

  const callCoach = async (step: string, context: Record<string, unknown>) => {
    setCoachBusy(true);
    setCoachNote("");
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, context }),
      });
      const json = await res.json();
      if (!res.ok || json.available === false) {
        setCoachNote(
          json.available === false
            ? "Coach is unavailable — add an Anthropic API key to enable it."
            : json.error || "Coach had a hiccup. Try again."
        );
        return null;
      }
      return json.data as Record<string, unknown>;
    } catch {
      setCoachNote("Couldn't reach the coach. Try again.");
      return null;
    } finally {
      setCoachBusy(false);
    }
  };

  // ---- Step 1: add an idea (persists immediately) ----
  const insertIdea = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const { data, error } = await supabase
      .from("ideas")
      .insert({ member_id: memberId, cycle_id: cycleId, content: trimmed })
      .select()
      .single();
    if (error) setError(error.message);
    else setIdeas((prev) => [...prev, data as Idea]);
  };

  const addIdea = async () => {
    if (!ideaInput.trim()) return;
    const content = ideaInput;
    setIdeaInput("");
    await insertIdea(content);
  };

  const coachIdeas = async () => {
    const data = await callCoach("brainstorm", {
      focus,
      ideas_so_far: ideas.map((i) => i.content),
    });
    const suggestions = (data?.ideas as string[]) ?? [];
    for (const s of suggestions) await insertIdea(s);
  };

  // Step 1: summarize the dump + surface candidate directions.
  const coachSummarize = async () => {
    if (ideas.length === 0) {
      setCoachNote("Add a few ideas first, then I'll summarize them.");
      return;
    }
    const data = await callCoach("summarize", { ideas: ideas.map((i) => i.content) });
    if (!data) return;
    setBrainstormSummary({
      summary: (data.summary as string) ?? "",
      directions: (data.directions as string[]) ?? [],
    });
  };

  // Step 2: cluster the member's ideas into candidate bets.
  const coachBet = async () => {
    if (ideas.length === 0) {
      setCoachNote("Add some ideas in step 1 first.");
      return;
    }
    const data = await callCoach("bet", { ideas: ideas.map((i) => i.content) });
    if (!data) return;
    setBetGroups((data.bets as BetGroup[]) ?? []);
    setBetRec((data.recommendation as string) ?? "");
  };

  // Apply a coach bet: select a representative idea, then set the (richer) bet sentence.
  const pickBet = async (b: BetGroup) => {
    const match = ideas.find((i) =>
      b.groups.some((g) => g.toLowerCase().trim() === i.content.toLowerCase().trim())
    );
    if (match) await chooseIdea(match);
    // override after chooseIdea (which may default bet to the idea text)
    setBet(b.bet_sentence);
  };

  const coachMeasurable = async () => {
    const data = await callCoach("measurable", { bet, goal_title: title });
    if (!data) return;
    if (data.metric) setMetric(data.metric as string);
    if (data.target_value != null) setTarget(String(data.target_value));
    if (data.how_to_measure && !title.trim()) setTitle(String(data.metric));
    if (data.why) setWhy(data.why as string);
    setMeasurableAlts((data.alternatives as string[]) ?? []);
  };

  const coachTactics = async () => {
    const data = await callCoach("tactics", { goal_title: title, metric, target });
    const suggestions = (data?.tactics as string[]) ?? [];
    if (suggestions.length) {
      setTactics([suggestions[0] ?? "", suggestions[1] ?? "", suggestions[2] ?? ""]);
    }
  };

  const removeIdea = async (id: string) => {
    await supabase.from("ideas").delete().eq("id", id);
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    if (chosenId === id) setChosenId(null);
  };

  // ---- Step 2: choose the bet ----
  const chooseIdea = async (idea: Idea) => {
    setChosenId(idea.id);
    if (!bet) setBet(idea.content);
    // mark only this idea chosen for the cycle
    await supabase
      .from("ideas")
      .update({ is_chosen: false })
      .eq("member_id", memberId)
      .eq("cycle_id", cycleId);
    await supabase.from("ideas").update({ is_chosen: true }).eq("id", idea.id);
  };

  // ---- Step 3: create or update the goal ----
  const saveGoal = async (): Promise<boolean> => {
    if (!title.trim()) {
      setError("Give the goal an outcome title.");
      return false;
    }
    const row = {
      member_id: memberId,
      cycle_id: cycleId,
      project_id: projectId,
      title: title.trim(),
      why: why.trim(),
      target_metric: metric.trim(),
      target_value: target === "" ? null : Number(target),
      end_date: endDate || null,
      the_bet: bet.trim() || null,
      source_idea_id: chosenId,
    };
    if (goalId) {
      const { error } = await supabase.from("goals").update(row).eq("id", goalId);
      if (error) return fail(error.message);
    } else {
      // assign a color not already used by this venture's goals
      const { data: existing } = await supabase
        .from("goals")
        .select("color")
        .eq("project_id", projectId);
      const color = nextColorKey(
        ((existing as { color: string | null }[]) ?? []).map((g) => g.color)
      );
      const { data, error } = await supabase
        .from("goals")
        .insert({ ...row, color })
        .select()
        .single();
      if (error) return fail(error.message);
      setGoalId((data as { id: string }).id);
    }
    return true;
  };

  // ---- Step 4: create tactics and finish ----
  const finish = async () => {
    const titles = tactics.map((t) => t.trim()).filter(Boolean);
    setBusy(true);
    setError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return fail("Not signed in.");
    }
    if (titles.length) {
      const rows = titles.map((t, i) => ({
        user_id: user.id,
        member_id: memberId,
        project_id: projectId,
        goal_id: goalId,
        title: t,
        status: "committed" as const,
        position: i,
        week_number: 1,
      }));
      const { error } = await supabase.from("tactics").insert(rows);
      if (error) {
        setBusy(false);
        return fail(error.message);
      }
    }
    router.push(`/ventures/${projectId}`);
  };

  const fail = (msg: string) => {
    setError(msg);
    return false;
  };

  const next = async () => {
    setError("");
    if (step === 1 && ideas.length === 0) return fail("Add at least one idea.");
    if (step === 2 && !chosenId) return fail("Pick one idea to bet on.");
    if (step === 3) {
      setBusy(true);
      const ok = await saveGoal();
      setBusy(false);
      if (!ok) return false;
    }
    setStep((s) => Math.min(s + 1, 4));
  };
  const back = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  };

  return (
    <div className="bg-white border border-[#ddd2c8] rounded-2xl p-6 md:p-8 shadow-[0_4px_24px_rgba(61,28,28,0.06)]">
      <Stepper step={step} />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {/* ── AI coach action bar ── */}
      <div className="mb-4 bg-[#9b7a8f]/8 border border-[#9b7a8f]/25 rounded-lg p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-[1px] font-bold text-[#9b7a8f]">
            ✦ Coach
          </span>
          {step === 1 && (
            <>
              <input
                className="flex-1 min-w-[160px] px-3 py-1.5 bg-white border border-[#ddd2c8] rounded-lg text-sm text-[#3d1c1c] focus:outline-none focus:ring-2 focus:ring-[#9b7a8f]/30"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="Your focus this cycle (optional) — e.g. direct bookings"
              />
              <CoachButton busy={coachBusy} onClick={coachIdeas} label="Suggest ideas" />
              <CoachButton busy={coachBusy} onClick={coachSummarize} label="Summarize my dump" />
            </>
          )}
          {step === 2 && (
            <CoachButton busy={coachBusy} onClick={coachBet} label="Group my ideas into bets" />
          )}
          {step === 3 && (
            <CoachButton busy={coachBusy} onClick={coachMeasurable} label="Suggest metric & target" />
          )}
          {step === 4 && (
            <CoachButton busy={coachBusy} onClick={coachTactics} label="Suggest this week's tactics" />
          )}
        </div>
        {coachNote && <p className="text-[12px] text-[#8b6b6b] mt-2">{coachNote}</p>}

        {/* Step 1 — summary of the dump */}
        {step === 1 && brainstormSummary && (
          <div className="mt-3 text-[13px] text-[#3d1c1c] leading-relaxed">
            <p>
              <span className="font-semibold">Coach:</span> {brainstormSummary.summary}
            </p>
            {brainstormSummary.directions.length > 0 && (
              <div className="mt-1.5">
                <span className="text-[11px] uppercase tracking-[1px] text-[#8b7b7b] font-semibold">
                  Potential bets
                </span>
                <ul className="mt-1 space-y-0.5">
                  {brainstormSummary.directions.map((d, i) => (
                    <li key={i}>• {d}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Step 2 — grouped bet candidates */}
        {step === 2 && betGroups && (
          <div className="mt-3 space-y-2">
            {betRec && (
              <p className="text-[12px] text-[#8b6b6b]">
                <span className="font-semibold text-[#9b7a8f]">Recommended:</span> {betRec}
              </p>
            )}
            {betGroups.map((b, i) => (
              <div
                key={i}
                className="bg-white border border-[#ddd2c8] rounded-lg p-3 text-[13px]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-[#3d1c1c]">{b.title}</span>
                  <button
                    type="button"
                    onClick={() => pickBet(b)}
                    className="shrink-0 text-[11px] font-semibold text-white bg-[#9b7a8f] hover:bg-[#876a7c] rounded px-2 py-1 cursor-pointer"
                  >
                    Use this bet
                  </button>
                </div>
                <p className="text-[#8b6b6b] italic mt-0.5">“{b.bet_sentence}”</p>
                {b.groups.length > 0 && (
                  <p className="text-[12px] text-[#8b7b7b] mt-1">
                    Groups: {b.groups.join(" · ")}
                  </p>
                )}
                <p className="text-[12px] text-[#8b6b6b] mt-0.5">{b.why}</p>
              </div>
            ))}
          </div>
        )}

        {/* Step 3 — alternative metrics */}
        {step === 3 && measurableAlts.length > 0 && (
          <div className="mt-3 text-[12px] text-[#8b6b6b]">
            <span className="text-[11px] uppercase tracking-[1px] font-semibold">Other metrics</span>
            <ul className="mt-1 space-y-0.5">
              {measurableAlts.map((a, i) => (
                <li key={i}>• {a}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {step === 1 && (
        <StepBrainstorm
          ideas={ideas}
          ideaInput={ideaInput}
          setIdeaInput={setIdeaInput}
          addIdea={addIdea}
          removeIdea={removeIdea}
        />
      )}
      {step === 2 && (
        <StepBet
          ideas={ideas}
          chosenId={chosenId}
          chooseIdea={chooseIdea}
          bet={bet}
          setBet={setBet}
        />
      )}
      {step === 3 && (
        <StepMeasurable
          title={title}
          setTitle={setTitle}
          metric={metric}
          setMetric={setMetric}
          target={target}
          setTarget={setTarget}
          endDate={endDate}
          setEndDate={setEndDate}
          why={why}
          setWhy={setWhy}
          bet={bet}
        />
      )}
      {step === 4 && (
        <StepTactics tactics={tactics} setTactics={setTactics} goalTitle={title} />
      )}

      <div className="flex items-center justify-between mt-8 pt-5 border-t border-[#f0e8df]">
        <button
          onClick={back}
          disabled={step === 1 || busy}
          className="text-sm text-[#8b7b7b] hover:text-[#3d1c1c] disabled:opacity-40 disabled:cursor-default px-3 py-2 cursor-pointer"
        >
          ← Back
        </button>
        {step < 4 ? (
          <button
            onClick={next}
            disabled={busy}
            className="bg-[#3d1c1c] hover:bg-[#5a3535] disabled:opacity-50 text-white rounded-lg px-6 py-2.5 text-sm font-semibold tracking-[0.5px] transition-colors cursor-pointer"
          >
            {busy ? "Saving..." : "Continue →"}
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={busy}
            className="bg-[#3d1c1c] hover:bg-[#5a3535] disabled:opacity-50 text-white rounded-lg px-6 py-2.5 text-sm font-semibold tracking-[0.5px] transition-colors cursor-pointer"
          >
            {busy ? "Finishing..." : "Finish & open my board"}
          </button>
        )}
      </div>
    </div>
  );
}

function CoachButton({
  busy,
  onClick,
  label,
}: {
  busy: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="bg-[#9b7a8f] hover:bg-[#876a7c] disabled:opacity-50 text-white rounded-lg px-3 py-1.5 text-xs font-semibold tracking-[0.5px] transition-colors cursor-pointer whitespace-nowrap"
    >
      {busy ? "Thinking…" : label}
    </button>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  active
                    ? "bg-[#3d1c1c] text-white"
                    : done
                    ? "bg-[#9b7a8f] text-white"
                    : "bg-[#f5f0ea] text-[#8b7b7b] border border-[#ddd2c8]"
                }`}
              >
                {done ? "✓" : n}
              </span>
              <span
                className={`text-[11px] uppercase tracking-[1px] font-semibold hidden sm:inline ${
                  active ? "text-[#3d1c1c]" : "text-[#8b7b7b]"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px bg-[#ddd2c8] hidden sm:block" />
            )}
          </div>
        );
      })}
    </div>
  );
}

const field =
  "w-full px-3 py-2 bg-[#f5f0ea] border border-[#ddd2c8] rounded-lg text-sm text-[#3d1c1c] focus:outline-none focus:ring-2 focus:ring-[#9b7a8f]/30 focus:border-[#9b7a8f] transition-all";
const fieldLabel =
  "block text-[11px] font-semibold uppercase tracking-[1px] text-[#8b6b6b] mb-1";

function StepBrainstorm({
  ideas,
  ideaInput,
  setIdeaInput,
  addIdea,
  removeIdea,
}: {
  ideas: Idea[];
  ideaInput: string;
  setIdeaInput: (v: string) => void;
  addIdea: () => void;
  removeIdea: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#3d1c1c] font-[Playfair_Display,serif] mb-1">
        Brainstorm
      </h2>
      <p className="text-[13px] text-[#8b6b6b] mb-4">
        Dump every idea for this cycle — no filtering, no judging. Quantity first.
      </p>

      <Timer />

      <div className="flex gap-2 mb-4">
        <input
          className={field}
          value={ideaInput}
          onChange={(e) => setIdeaInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addIdea();
          }}
          placeholder="What could you build, test, or launch?"
          autoFocus
        />
        <button
          onClick={addIdea}
          className="bg-[#3d1c1c] hover:bg-[#5a3535] text-white rounded-lg px-4 text-sm font-semibold transition-colors cursor-pointer shrink-0"
        >
          Add
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ideas.map((idea) => (
          <div
            key={idea.id}
            className="bg-[#f5f0ea] border border-[#ddd2c8] rounded-lg px-3 py-2 text-sm text-[#3d1c1c] flex items-start justify-between gap-2 group"
          >
            <span className="leading-relaxed">{idea.content}</span>
            <button
              onClick={() => removeIdea(idea.id)}
              className="text-[#8b7b7b] hover:text-[#d4736c] text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
              title="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      {ideas.length === 0 && (
        <p className="text-[13px] text-[#8b7b7b] italic">No ideas yet — start dumping.</p>
      )}
    </div>
  );
}

function Timer() {
  const FIVE_MIN = 5 * 60;
  const [left, setLeft] = useState(FIVE_MIN);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && left > 0) {
      ref.current = setInterval(() => setLeft((l) => Math.max(l - 1, 0)), 1000);
      return () => {
        if (ref.current) clearInterval(ref.current);
      };
    }
  }, [running, left]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const done = left === 0;

  return (
    <div className="flex items-center gap-3 mb-4 bg-[#f5f0ea] border border-[#ddd2c8] rounded-lg px-3 py-2 w-fit">
      <span
        className={`font-[Playfair_Display,serif] font-bold text-lg tabular-nums ${
          done ? "text-[#d4736c]" : "text-[#3d1c1c]"
        }`}
      >
        {mm}:{ss}
      </span>
      <button
        onClick={() => setRunning((r) => !r)}
        disabled={done}
        className="text-xs uppercase tracking-[1px] font-semibold text-[#9b7a8f] hover:text-[#3d1c1c] disabled:opacity-40 cursor-pointer"
      >
        {done ? "Time!" : running ? "Pause" : "Start 5-min"}
      </button>
      {(running || left < FIVE_MIN) && !done && (
        <button
          onClick={() => {
            setRunning(false);
            setLeft(FIVE_MIN);
          }}
          className="text-xs text-[#8b7b7b] hover:text-[#3d1c1c] cursor-pointer"
        >
          Reset
        </button>
      )}
    </div>
  );
}

function StepBet({
  ideas,
  chosenId,
  chooseIdea,
  bet,
  setBet,
}: {
  ideas: Idea[];
  chosenId: string | null;
  chooseIdea: (idea: Idea) => void;
  bet: string;
  setBet: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#3d1c1c] font-[Playfair_Display,serif] mb-1">
        Pick your bet
      </h2>
      <p className="text-[13px] text-[#8b6b6b] mb-4">
        Choose the one idea worth 90 days. Everything else can wait.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
        {ideas.map((idea) => {
          const sel = chosenId === idea.id;
          return (
            <button
              key={idea.id}
              onClick={() => chooseIdea(idea)}
              className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all cursor-pointer ${
                sel
                  ? "bg-[#9b7a8f]/10 border-[#9b7a8f] text-[#3d1c1c]"
                  : "bg-[#f5f0ea] border-[#ddd2c8] text-[#4a3a3a] hover:border-[#c4a8b8]"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] shrink-0 ${
                    sel ? "bg-[#9b7a8f] border-[#9b7a8f] text-white" : "border-[#c4a8b8]"
                  }`}
                >
                  {sel ? "✓" : ""}
                </span>
                {idea.content}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <label className={fieldLabel}>Your bet (one sentence)</label>
        <div className="flex items-start gap-2">
          <span className="text-[13px] text-[#8b6b6b] pt-2 shrink-0 hidden sm:inline">
            In the next 90 days I&apos;ll
          </span>
          <input
            className={field}
            value={bet}
            onChange={(e) => setBet(e.target.value)}
            placeholder="build / test / launch ___"
          />
        </div>
      </div>
    </div>
  );
}

function StepMeasurable({
  title,
  setTitle,
  metric,
  setMetric,
  target,
  setTarget,
  endDate,
  setEndDate,
  why,
  setWhy,
  bet,
}: {
  title: string;
  setTitle: (v: string) => void;
  metric: string;
  setMetric: (v: string) => void;
  target: string;
  setTarget: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  why: string;
  setWhy: (v: string) => void;
  bet: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-[#3d1c1c] font-[Playfair_Display,serif] mb-1">
          Make it measurable
        </h2>
        <p className="text-[13px] text-[#8b6b6b]">Turn the bet into a number you can track.</p>
      </div>

      {bet && (
        <div className="bg-[#9b7a8f]/8 border border-[#9b7a8f]/30 rounded-lg px-3 py-2 text-[13px] text-[#3d1c1c] italic">
          Your bet: &ldquo;{bet}&rdquo;
        </div>
      )}

      <div>
        <label className={fieldLabel}>Goal (the outcome)</label>
        <input
          className={field}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Reach $20k MRR"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={fieldLabel}>Metric</label>
          <input
            className={field}
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            placeholder="MRR ($)"
          />
        </div>
        <div>
          <label className={fieldLabel}>Target</label>
          <input
            className={field}
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="20000"
          />
        </div>
        <div>
          <label className={fieldLabel}>End date</label>
          <input
            className={field}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className={fieldLabel}>Why it matters</label>
        <textarea
          className={`${field} resize-none`}
          rows={2}
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          placeholder="Why this, why now?"
        />
      </div>
    </div>
  );
}

function StepTactics({
  tactics,
  setTactics,
  goalTitle,
}: {
  tactics: string[];
  setTactics: (v: string[]) => void;
  goalTitle: string;
}) {
  const setAt = (i: number, v: string) =>
    setTactics(tactics.map((t, idx) => (idx === i ? v : t)));

  return (
    <div>
      <h2 className="text-xl font-bold text-[#3d1c1c] font-[Playfair_Display,serif] mb-1">
        This week
      </h2>
      <p className="text-[13px] text-[#8b6b6b] mb-4">
        Add 1–3 tactics you&apos;ll commit to this week toward
        {goalTitle ? ` “${goalTitle}.”` : " your goal."} They land in{" "}
        <span className="font-semibold text-[#4a6fa5]">Committed</span> on your board.
      </p>

      <div className="space-y-2">
        {tactics.map((t, i) => (
          <input
            key={i}
            className={field}
            value={t}
            onChange={(e) => setAt(i, e.target.value)}
            placeholder={`Tactic ${i + 1}${i === 0 ? "" : " (optional)"}`}
            autoFocus={i === 0}
          />
        ))}
      </div>
    </div>
  );
}
