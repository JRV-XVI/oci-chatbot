"use client";

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ProjectBoard } from "./project-board";

export function KanbanApp() {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-background">
        <ProjectBoard />
      </div>
    </DndProvider>
  );
}
