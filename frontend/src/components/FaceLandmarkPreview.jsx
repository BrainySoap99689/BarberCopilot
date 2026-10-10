
import { useEffect, useRef } from "react";

function FaceLandmarkPreview({ imageUrl, analysis }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!imageUrl || !analysis?.face_detected) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const image = new Image();

    image.onload = () => {
      canvas.width = analysis.image_width;
      canvas.height = analysis.image_height;

      context.clearRect(
        0, 0, canvas.width, canvas.height
      );

      context.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      );

      context.fillStyle = "#00ff99";

      for (const point of analysis.landmarks) {
        context.beginPath();
        context.arc(
          point.x,
          point.y,
          Math.max(1.5, canvas.width / 700),
          0,
          Math.PI * 2
        );
        context.fill();
      }
    };

    image.src = imageUrl;
  }, [imageUrl, analysis]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        maxWidth: "400px",
        height: "auto",
        borderRadius: "12px",
      }}
    />
  );
}

export default FaceLandmarkPreview;
