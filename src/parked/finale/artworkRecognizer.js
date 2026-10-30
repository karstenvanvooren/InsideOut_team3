// Artwork recognition for the museum finale.
//
// Every recognizer has the same shape:
//   const recognizer = createRecognizer({ container })
//   await recognizer.start(onMatch)   // onMatch() is called once the artwork is recognized
//   recognizer.stop()
//
// Right now only the simulator exists. To plug in real image recognition
// (e.g. MindAR image tracking), add a createMindARRecognizer() with the same
// start/stop shape, and return it from createRecognizer().

export function createSimulatedRecognizer({ delay = 1800 } = {}) {
  let timer = null
  return {
    kind: 'simulated',
    async start(onMatch) {
      timer = setTimeout(onMatch, delay)
    },
    stop() {
      clearTimeout(timer)
    },
  }
}

// Example outline for later:
//
// export function createMindARRecognizer({ container, targetSrc = '/finale/artwork.mind' }) {
//   let mindar = null
//   return {
//     kind: 'mindar',
//     async start(onMatch) {
//       const { MindARThree } = await import('mind-ar/dist/mindar-image-three.prod.js')
//       mindar = new MindARThree({ container, imageTargetSrc: targetSrc })
//       const anchor = mindar.addAnchor(0)
//       anchor.onTargetFound = onMatch
//       await mindar.start()
//     },
//     stop() {
//       mindar?.stop()
//     },
//   }
// }

export function createRecognizer(options = {}) {
  return createSimulatedRecognizer(options)
}
