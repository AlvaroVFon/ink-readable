const columns = ['Backlog', 'Todo', 'In progress', 'Done']

export function PlannerBoard() {
  return (
    <div className='flex flex-1 flex-col gap-4 p-6'>
      <h1 className='text-2xl font-semibold tracking-tight'>Planner</h1>
      <div className='grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {columns.map((column) => (
          <section
            key={column}
            className='flex flex-col gap-2 rounded-lg border bg-muted/30 p-3'
          >
            <h2 className='text-sm font-medium text-muted-foreground'>{column}</h2>
          </section>
        ))}
      </div>
    </div>
  )
}
