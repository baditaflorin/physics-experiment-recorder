import { HeartHandshake, Star } from 'lucide-react'

const repositoryUrl = 'https://github.com/baditaflorin/physics-experiment-recorder'
const paypalUrl = 'https://www.paypal.com/paypalme/florinbadita'

function App() {
  return (
    <main className="min-h-screen bg-[#f7faf7] text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
              Physics Experiment Recorder
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-normal sm:text-5xl">
              Phone video to physics data.
            </h1>
          </div>
          <nav aria-label="Project links" className="flex flex-wrap gap-2">
            <a className="icon-link" href={repositoryUrl} target="_blank" rel="noreferrer">
              <Star size={18} aria-hidden="true" />
              Star on GitHub
            </a>
            <a className="icon-link" href={paypalUrl} target="_blank" rel="noreferrer">
              <HeartHandshake size={18} aria-hidden="true" />
              Support
            </a>
          </nav>
        </header>

        <section className="grid flex-1 place-items-center py-12">
          <div className="w-full max-w-3xl">
            <p className="text-lg leading-8 text-slate-700">
              A static GitHub Pages lab tool for tracking AprilTag-like markers,
              extracting position-vs-time data, fitting curves with SciPy in
              Pyodide, and exporting reproducible experiment records.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="metric">
                <span>Mode</span>
                <strong>Pure GitHub Pages</strong>
              </div>
              <div className="metric">
                <span>Version</span>
                <strong>{__APP_VERSION__}</strong>
              </div>
              <div className="metric">
                <span>Commit</span>
                <strong>{__GIT_COMMIT__}</strong>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
