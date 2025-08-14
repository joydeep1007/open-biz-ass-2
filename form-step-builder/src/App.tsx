import FormRenderer from './components/FormRenderer'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          Udyam Registration Form
        </h1>
        <FormRenderer />
      </div>
    </div>
  )
}

export default App