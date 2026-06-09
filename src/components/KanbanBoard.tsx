"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { createClient } from "@/lib/supabase-browser";
import type { Goal, TacticStatus } from "@/lib/types";
import { STATUS_META } from "@/lib/tactics";
import { colorForKey } from "@/lib/goalColors";
import TacticModal, { type TacticDraft } from "./TacticModal";

type Card = {
  id: string;
  title: string;
  description: string;
  status: TacticStatus;
  position: number;
  created_at: string;
  goal_id: string | null;
  project_id: string | null;
  notes: string;
  deadline: string | null;
};

// Minimal venture info for the consolidated (global) board's venture chips.
export type BoardProject = { id: string; name: string; color: string | null };

export default function KanbanBoard({
  goals = [],
  projectId = null,
  projects = [],
}: {
  goals?: Goal[];
  projectId?: string | null;
  projects?: BoardProject[];
}) {
  const [cards, setCards] = useState<Card[]>([]);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const supabase = createClient();

  const goalById = (id: string | null) => goals.find((g) => g.id === id) ?? null;
  const projectById = (id: string | null) => projects.find((p) => p.id === id) ?? null;
  // Global board = not scoped to one venture; show a venture chip per card.
  const isGlobal = !projectId;

  const fetchCards = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    let query = supabase
      .from("tactics")
      .select("*")
      .eq("user_id", user.id)
      .order("position", { ascending: true });
    // Scope to a venture's board when one is provided.
    if (projectId) query = query.eq("project_id", projectId);
    const { data } = await query;
    if (data) setCards(data as Card[]);
  }, [supabase, projectId]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const addCard = async (status: string) => {
    if (!newCardTitle.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const position = cards.filter((c) => c.status === status).length;
    const { error } = await supabase
      .from("tactics")
      .insert({ title: newCardTitle.trim(), status, position, user_id: user.id, project_id: projectId });
    if (!error) {
      setNewCardTitle("");
      setAddingToColumn(null);
      fetchCards();
    }
  };

  const updateTactic = async (id: string, patch: Omit<TacticDraft, "id">) => {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    await supabase
      .from("tactics")
      .update({
        title: patch.title,
        notes: patch.notes,
        deadline: patch.deadline,
        status: patch.status,
        goal_id: patch.goal_id,
      })
      .eq("id", id);
  };

  const deleteTactic = async (id: string) => {
    setCards((cs) => cs.filter((c) => c.id !== id));
    setOpenId(null);
    await supabase.from("tactics").delete().eq("id", id);
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const updated = [...cards];
    const cardIndex = updated.findIndex((c) => c.id === draggableId);
    if (cardIndex === -1) return;

    const card = { ...updated[cardIndex] };
    card.status = destination.droppableId as TacticStatus;
    card.position = destination.index;
    updated.splice(cardIndex, 1);

    const destCards = updated
      .filter((c) => c.status === destination.droppableId)
      .sort((a, b) => a.position - b.position);
    destCards.splice(destination.index, 0, card);
    destCards.forEach((c, i) => (c.position = i));

    if (source.droppableId !== destination.droppableId) {
      const srcCards = updated
        .filter((c) => c.status === source.droppableId)
        .sort((a, b) => a.position - b.position);
      srcCards.forEach((c, i) => (c.position = i));
    }

    setCards([
      ...updated.filter(
        (c) =>
          c.status !== destination.droppableId && c.status !== source.droppableId
      ),
      ...destCards,
      ...(source.droppableId !== destination.droppableId
        ? updated
            .filter((c) => c.status === source.droppableId)
            .sort((a, b) => a.position - b.position)
        : []),
    ]);

    await supabase
      .from("tactics")
      .update({ status: destination.droppableId, position: destination.index })
      .eq("id", draggableId);

    const allUpdated = [...destCards];
    if (source.droppableId !== destination.droppableId) {
      const srcReordered = cards
        .filter((c) => c.status === source.droppableId && c.id !== draggableId)
        .sort((a, b) => a.position - b.position);
      srcReordered.forEach((c, i) => (c.position = i));
      allUpdated.push(...srcReordered);
    }
    for (const c of allUpdated) {
      await supabase.from("tactics").update({ position: c.position }).eq("id", c.id);
    }
  };

  const getColumnCards = (columnId: string) =>
    cards.filter((c) => c.status === columnId).sort((a, b) => a.position - b.position);

  const openCard = cards.find((c) => c.id === openId) ?? null;

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_META.map((column) => (
            <div
              key={column.id}
              className="bg-white border border-[#ddd2c8] rounded-xl p-4 min-h-[300px] flex flex-col"
            >
              <div className={`mb-4 pb-3 border-b-2 ${column.borderAccent}`}>
                <div className="flex items-center justify-between">
                  <h2
                    className={`font-bold text-[15px] font-[Playfair_Display,serif] ${column.titleColor} flex items-center gap-2`}
                  >
                    <span className={`w-2 h-2 rounded-full ${column.dotColor}`}></span>
                    {column.title}
                  </h2>
                  <span className="text-[11px] font-semibold text-[#8b7b7b] bg-[#f5f0ea] px-2.5 py-0.5 rounded-full">
                    {getColumnCards(column.id).length}
                  </span>
                </div>
                <p className="text-[11px] text-[#8b7b7b] mt-1 leading-snug">
                  {column.desc}
                </p>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 min-h-[80px] flex-1 rounded-lg transition-colors ${
                      snapshot.isDraggingOver ? "bg-[#9b7a8f]/5" : ""
                    }`}
                  >
                    {getColumnCards(column.id).map((card, index) => {
                      const goal = goalById(card.goal_id);
                      const gc = colorForKey(goal?.color);
                      // On the global board, tag each card with its venture and
                      // fall back to the venture's color for the left stripe.
                      const venture = isGlobal ? projectById(card.project_id) : null;
                      const vc = colorForKey(venture?.color);
                      const stripe = gc?.stripe ?? vc?.stripe ?? "border-l-[#ddd2c8]";
                      const overdue =
                        card.deadline &&
                        card.status !== "completed" &&
                        card.deadline < todayISO();
                      return (
                        <Draggable key={card.id} draggableId={card.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setOpenId(card.id)}
                              className={`bg-[#f5f0ea] border border-[#ddd2c8] rounded-lg p-3 cursor-pointer transition-all border-l-4 ${
                                stripe
                              } ${
                                snapshot.isDragging
                                  ? "shadow-lg shadow-[#3d1c1c]/10 rotate-2"
                                  : "hover:border-[#c4a8b8] hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#3d1c1c]/5"
                              }`}
                            >
                              <p className="text-sm text-[#3d1c1c] leading-relaxed">
                                {card.title}
                              </p>
                              {(venture || goal || card.deadline || card.notes) && (
                                <div className="flex items-center flex-wrap gap-1.5 mt-2">
                                  {venture && (
                                    <span
                                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                        vc?.chipBg ?? "bg-[#f0e8df]"
                                      } ${vc?.chipText ?? "text-[#8b6b6b]"}`}
                                    >
                                      {venture.name}
                                    </span>
                                  )}
                                  {goal && (
                                    <span
                                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                        gc?.chipBg ?? "bg-[#f0e8df]"
                                      } ${gc?.chipText ?? "text-[#8b6b6b]"}`}
                                    >
                                      {goal.title}
                                    </span>
                                  )}
                                  {card.deadline && (
                                    <span
                                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                        overdue
                                          ? "bg-[#f5dad7] text-[#9c4a44]"
                                          : "bg-[#f0e8df] text-[#8b6b6b]"
                                      }`}
                                    >
                                      ⏰ {formatDeadline(card.deadline)}
                                    </span>
                                  )}
                                  {card.notes && (
                                    <span className="text-[10px] text-[#8b7b7b]" title="Has notes">
                                      📝
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {addingToColumn === column.id ? (
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addCard(column.id);
                      if (e.key === "Escape") setAddingToColumn(null);
                    }}
                    placeholder="What are you committing to?"
                    className="w-full bg-white border border-[#ddd2c8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9b7a8f]/20 focus:border-[#9b7a8f] text-[#3d1c1c] placeholder-[#8b7b7b]"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => addCard(column.id)}
                      className="flex-1 bg-[#3d1c1c] hover:bg-[#5a3535] text-white rounded-lg py-1.5 text-sm font-semibold transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setAddingToColumn(null);
                        setNewCardTitle("");
                      }}
                      className="px-3 text-[#8b7b7b] hover:text-[#d4736c] text-sm cursor-pointer border border-[#ddd2c8] hover:border-[#d4736c] rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingToColumn(column.id)}
                  className="mt-3 w-full py-2 text-sm text-[#8b7b7b] hover:text-[#9b7a8f] border border-dashed border-[#ddd2c8] hover:border-[#c4a8b8] rounded-lg transition-all cursor-pointer hover:bg-[#9b7a8f]/5"
                >
                  + Add card
                </button>
              )}
            </div>
          ))}
        </div>
      </DragDropContext>

      {openCard && (
        <TacticModal
          tactic={{
            id: openCard.id,
            title: openCard.title,
            notes: openCard.notes ?? "",
            deadline: openCard.deadline,
            status: openCard.status,
            goal_id: openCard.goal_id,
          }}
          goals={goals}
          onSave={(patch) => updateTactic(openCard.id, patch)}
          onDelete={() => deleteTactic(openCard.id)}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDeadline(d: string): string {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
