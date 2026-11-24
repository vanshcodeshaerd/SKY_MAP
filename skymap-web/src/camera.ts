export async function initCamera(videoElement: HTMLVideoElement): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    videoElement.srcObject = stream;
    await videoElement.play();
  } catch (err) {
    console.error("Failed to initialize camera:", err);
    throw new Error("Camera permission denied or camera not found.");
  }
}
