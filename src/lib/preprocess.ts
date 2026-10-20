const UPSCALE_BELOW_WIDTH = 1500
const CONTRAST_FACTOR = 1.5
const DARK_PIXEL_THRESHOLD = 90
const DARK_IMAGE_RATIO = 0.5

// Prepare a temporary OCR-friendly image; callers should keep the original blob.
export async function preprocessImage(blob: Blob): Promise<Blob> {
  const image = await createImageBitmap(blob)

  try {
    const scale =
      image.width < UPSCALE_BELOW_WIDTH ? 2 : 1
    const canvas = document.createElement('canvas')
    canvas.width = image.width * scale
    canvas.height = image.height * scale

    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) {
      throw new Error('This browser could not prepare the image for OCR.')
    }

    // Upscaling gives OCR more pixels to distinguish small letters and symbols.
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data
    let darkPixelCount = 0

    for (let index = 0; index < pixels.length; index += 4) {
      const gray = Math.round(
        pixels[index] * 0.299 +
          pixels[index + 1] * 0.587 +
          pixels[index + 2] * 0.114,
      )
      if (gray < DARK_PIXEL_THRESHOLD) darkPixelCount += 1

      // Grayscale removes distracting color while keeping text edges visible.
      const contrasted = Math.max(
        0,
        Math.min(255, (gray - 128) * CONTRAST_FACTOR + 128),
      )
      pixels[index] = contrasted
      pixels[index + 1] = contrasted
      pixels[index + 2] = contrasted
    }

    // Inverting mostly dark screenshots makes light-mode OCR text polarity.
    const isDarkScreenshot =
      darkPixelCount / (pixels.length / 4) > DARK_IMAGE_RATIO
    if (isDarkScreenshot) {
      for (let index = 0; index < pixels.length; index += 4) {
        const inverted = 255 - pixels[index]
        pixels[index] = inverted
        pixels[index + 1] = inverted
        pixels[index + 2] = inverted
      }
    }

    context.putImageData(imageData, 0, 0)

    // A PNG keeps the processed text edges crisp for the OCR engine.
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) {
          resolve(result)
        } else {
          reject(new Error('This browser could not encode the OCR image.'))
        }
      }, 'image/png')
    })
  } finally {
    image.close()
  }
}
