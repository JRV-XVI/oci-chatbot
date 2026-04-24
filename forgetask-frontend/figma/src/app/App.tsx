import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ProjectBoard } from './components/project-board';

export default function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="size-full bg-background">
        <ProjectBoard />
      </div>
    </DndProvider>
  );
}