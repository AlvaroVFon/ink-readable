import { Route, Routes } from 'react-router'

import { NotesLayout } from '@/components/layout/notes-layout'
import { PlannerLayout } from '@/components/layout/planner-layout'
import { NotesWorkspace } from '@/features/notes/notes-workspace'
import { PlannerBoard, PlannerEmpty } from '@/features/planner/planner-board'
import { NotFound } from '@/routes/not-found'

function App() {
  return (
    <Routes>
      <Route
        element={<NotesLayout />}
        path='/'
      >
        <Route
          index
          element={<NotesWorkspace />}
        />
        <Route
          path='notes/:documentId'
          element={<NotesWorkspace />}
        />
      </Route>
      <Route
        element={<PlannerLayout />}
        path='/planner'
      >
        <Route
          index
          element={<PlannerEmpty />}
        />
        <Route
          path=':projectId'
          element={<PlannerBoard />}
        />
      </Route>
      <Route
        element={<NotFound />}
        path='*'
      />
    </Routes>
  )
}

export default App
