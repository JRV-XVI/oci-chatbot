"use client";

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ProjectBoard } from "./project-board";

// Root kanban application wrapper.
// Provides the DnD backend context for all draggable task cards.
export function KanbanApp() {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen bg-background">
        <ProjectBoard />
      </div>
    </DndProvider>
  );
}
