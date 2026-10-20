import { createWorker } from 'tesseract.js'

type OcrWorker = Awaited<ReturnType<typeof createWorker>>

let workerPromise: Promise<OcrWorker> | null = null

// Lazily create one English worker and reuse it for every image.
function getWorker(): Promise<OcrWorker> {
  if (!workerPromise) {
    workerPromise = createWorker('eng').catch((error: unknown) => {
      workerPromise = null
      throw error
    })
  }

  return workerPromise
}

export async function recognizeImage(blob: Blob): Promise<string> {
  const worker = await getWorker()
  const result = await worker.recognize(blob)
  return result.data.text
}

// Terminate the shared worker when the app is being torn down.
export async function terminate(): Promise<void> {
  const currentWorkerPromise = workerPromise
  workerPromise = null

  if (currentWorkerPromise) {
    const worker = await currentWorkerPromise
    await worker.terminate()
  }
}
