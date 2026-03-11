"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { createClient } from "@/lib/supabase-browser";

type Card = {
  id: string;
  title: string;
  description: string;
  status: string;
  position: number;
  created_at: string;
};

type Column = {
  id: string;
  title: string;
  dotColor: string;
  titleColor: string;
  borderAccent: string;
  hoverBg: string;
};

const COLUMNS: Column[] = [
  {
    id: "committed",
    title: "Committed",
    dotColor: "bg-[#4a6fa5]",
    titleColor: "text-[#4a6fa5]",
    borderAccent: "border-b-[#d6e3f5]",
    hoverBg: "hover:bg-[#d6e3f5]/30",
  },
  {
    id: "working_on",
    title: "Working On",
    dotColor: "bg-[#c9a84c]",
    titleColor: "text-[#c9a84c]",
    borderAccent: "border-b-[#f5ecd0]",
    hoverBg: "hover:bg-[#f5ecd0]/30",
  },
  {
    id: "completed",
    title: "Completed",
    dotColor: "bg-[#8ba888]",
    titleColor: "text-[#8ba888]",
    borderAccent: "border-b-[#dbe8d5]",
    hoverBg: "hover:bg-[#dbe8d5]/30",
  },
  {
    id: "blocked",
    title: "Blocked",
    dotColor: "bg-[#d4736c]",
    titleColor: "text-[#d4736c]",
    borderAccent: "border-b-[#f5dad7]",
    hoverBg: "hover:bg-[#f5dad7]/30",
  },
];

export default function KanbanBoard() {
  const [cards, setCards] = useState<Card[]>([]);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const supabase = createClient();

  const fetchCards = useCallback(async () => {
    const { data } = await supabase
      .from("cards")
      .select("*")
      .order("position", { ascending: true });
    if (data) setCards(data);
  }, [supabase]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const addCard = async (status: string) => {
    if (!newCardTitle.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const colCards = cards.filter((c) => c.status === status);
    const position = colCards.length;

    const { error } = await supabase.from("cards").insert({
      title: newCardTitle.trim(),
      status,
      position,
      user_id: user.id,
    });

    if (!error) {
      setNewCardTitle("");
      setAddingToColumn(null);
      fetchCards();
    }
  };

  const deleteCard = async (id: string) => {
    await supabase.from("cards").delete().eq("id", id);
    fetchCards();
  };

  const startEdit = (card: Card) => {
    setEditingCard(card.id);
    setEditTitle(card.title);
  };

  const saveEdit = async (id: string) => {
    if (!editTitle.trim()) return;
    await supabase.from("cards").update({ title: editTitle.trim() }).eq("id", id);
    setEditingCard(null);
    fetchCards();
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
    card.status = destination.droppableId;
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
          c.status !== destination.droppableId &&
          c.status !== source.droppableId
      ),
      ...destCards,
      ...(source.droppableId !== destination.droppableId
        ? updated
            .filter((c) => c.status === source.droppableId)
            .sort((a, b) => a.position - b.position)
        : []),
    ]);

    await supabase
      .from("cards")
      .update({ status: destination.droppableId, position: destination.index })
      .eq("id", draggableId);

    const allUpdated = [...destCards];
    if (source.droppableId !== destination.droppableId) {
      const srcReordered = cards
        .filter(
          (c) => c.status === source.droppableId && c.id !== draggableId
        )
        .sort((a, b) => a.position - b.position);
      srcReordered.forEach((c, i) => (c.position = i));
      allUpdated.push(...srcReordered);
    }

    for (const c of allUpdated) {
      await supabase
        .from("cards")
        .update({ position: c.position })
        .eq("id", c.id);
    }
  };

  const getColumnCards = (columnId: string) =>
    cards.filter((c) => c.status === columnId).sort((a, b) => a.position - b.position);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((column) => (
          <div
            key={column.id}
            className="bg-white border border-[#ddd2c8] rounded-xl p-4 min-h-[300px] flex flex-col"
          >
            <div className={`flex items-center justify-between mb-4 pb-3 border-b-2 ${column.borderAccent}`}>
              <h2 className={`font-bold text-[15px] font-[Playfair_Display,serif] ${column.titleColor} flex items-center gap-2`}>
                <span className={`w-2 h-2 rounded-full ${column.dotColor}`}></span>
                {column.title}
              </h2>
              <span className="text-[11px] font-semibold text-[#8b7b7b] bg-[#f5f0ea] px-2.5 py-0.5 rounded-full">
                {getColumnCards(column.id).length}
              </span>
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
                  {getColumnCards(column.id).map((card, index) => (
                    <Draggable
                      key={card.id}
                      draggableId={card.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-[#f5f0ea] border border-[#ddd2c8] rounded-lg p-3 group transition-all ${
                            snapshot.isDragging
                              ? "shadow-lg shadow-[#3d1c1c]/10 rotate-2"
                              : "hover:border-[#c4a8b8] hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#3d1c1c]/5"
                          }`}
                        >
                          {editingCard === card.id ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit(card.id);
                                  if (e.key === "Escape") setEditingCard(null);
                                }}
                                className="flex-1 bg-white border border-[#c4a8b8] rounded px-2 py-1 text-sm text-[#3d1c1c] focus:outline-none focus:ring-2 focus:ring-[#9b7a8f]/20"
                                autoFocus
                              />
                              <button
                                onClick={() => saveEdit(card.id)}
                                className="text-[#8ba888] hover:text-[#6d8d6a] text-sm font-bold cursor-pointer bg-[#dbe8d5] rounded px-2"
                              >
                                \u2713
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between">
                              <p className="text-sm text-[#3d1c1c] flex-1 leading-relaxed">
                                {card.title}
                              </p>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                <button
                                  onClick={() => startEdit(card)}
                                  className="text-[#8b6b6b] hover:text-[#3d1c1c] text-xs cursor-pointer p-0.5 rounded hover:bg-[#3d1c1c]/5"
                                  title="Edit"
                                >
                                  \u270f\ufe0f
                                </button>
                                <button
                                  onClick={() => deleteCard(card.id)}
                                  className="text-[#8b6b6b] hover:text-[#d4736c] text-xs cursor-pointer p-0.5 rounded hover:bg-[#d4736c]/10"
                                  title="Delete"
                                >
                                  \u2715
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
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
  );
}
