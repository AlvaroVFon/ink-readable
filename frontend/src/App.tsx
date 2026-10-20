import { Navigate, Route, Routes } from 'react-router'

import { NotesLayout } from '@/components/layout/notes-layout'
import { PlannerLayout } from '@/components/layout/planner-layout'
import { ToolsLayout } from '@/components/layout/tools-layout'
import { InterfaceDocsPage } from '@/features/interface-docs/interface-docs-page'
import { JsonTypesPage } from '@/features/json-types/json-types-page'
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
        element={<ToolsLayout />}
        path='/tools'
      >
        <Route
          index
          element={
            <Navigate
              replace
              to='json-types'
            />
          }
        />
        <Route
          path='json-types'
          element={<JsonTypesPage />}
        />
        <Route
          path='interface-docs'
          element={<InterfaceDocsPage />}
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
