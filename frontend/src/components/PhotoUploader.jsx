
import { useEffect, useState } from "react";
import FaceLandmarkPreview from "./FaceLandmarkPreview.jsx";

const styles = [
  { id: "textured_crop", name: "Textured Crop" },
  { id: "modern_quiff", name: "Modern Quiff" },
  { id: "side_part", name: "Classic Side Part" },
];

function PhotoUploader() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedStyle, setSelectedStyle] =
    useState("textured_crop");

  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [hairSegmentation, setHairSegmentation] = useState(null);
  const [segmentingHair, setSegmentingHair] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    return () => {
      if (generatedImage) {
        URL.revokeObjectURL(generatedImage);
      }
    };
  }, [generatedImage]);

  function handleFileChange(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setGeneratedImage(null);
    setError("");
    setAnalysis(null);
    setHairSegmentation(null);
  }

  async function handleGenerate() {
    if (!file) return;

    setLoading(true);
    setError("");
    setGeneratedImage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("style", selectedStyle);

    try {
      const response = await fetch(
        "http://localhost:8000/api/generate",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.detail || "Generation failed"
        );
      }

      const imageBlob = await response.blob();
      const imageURL = URL.createObjectURL(imageBlob);

      setGeneratedImage(imageURL);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }
  async function handleAnalyze() {
    if (!file) return;

    setAnalyzing(true);
    setError("");
    setAnalysis(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        "http://localhost:8000/api/analyze",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Analysis failed");
      }

      setAnalysis(data);
    } catch (err) {
      setError(err.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
}
async function handleHairSegmentation() {
  if (!file) return;

  setSegmentingHair(true);
  setError("");
  setHairSegmentation(null);

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(
      "http://localhost:8000/api/segment-hair",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Hair segmentation failed");
    }

    setHairSegmentation(data);
  } catch (err) {
    setError(err.message || "Hair segmentation failed");
  } finally {
    setSegmentingHair(false);
  }
}

  return (
    <div style={{
      maxWidth: "850px",
      margin: "40px auto",
      padding: "20px",
      fontFamily: "Arial, sans-serif"
    }}>
      <h1>BarberCopilot</h1>
      <p>Try a new hairstyle before your next haircut.</p>

      <h2>1. Upload your photograph</h2>

      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
      />

      <h2>2. Choose a hairstyle</h2>

      <select
        value={selectedStyle}
        onChange={(e) => {
          setSelectedStyle(e.target.value);
          setGeneratedImage(null);
        }}
        style={{ padding: "10px", fontSize: "16px" }}
      >
        {styles.map((style) => (
          <option key={style.id} value={style.id}>
            {style.name}
          </option>
        ))}
      </select>
      
        <button
        onClick={handleAnalyze}
        disabled={!file || analyzing}
        >
        {analyzing ? "Analyzing..." : "Analyze Face"}
        </button>

        {analysis && (
        <div>
            <h3>Computer Vision Results</h3>

            <p>
            Face detected: {analysis.face_detected ? "Yes" : "No"}
            </p>

            <p>Faces found: {analysis.face_count}</p>

            <p>
            Landmarks detected: {analysis.landmarks.length}
            </p>

            <p>
            Photo usable: {analysis.usable ? "Yes" : "No"}
            </p>

            {analysis.warnings?.map((warning, index) => (
            <p key={index} style={{ color: "orange" }}>
                {warning}
            </p>
            ))}
        </div>
        )}
        {analysis?.face_detected && preview && (
        <div>
            <h3>Facial Landmark Detection</h3>

            <FaceLandmarkPreview
            imageUrl={preview}
            analysis={analysis}
            />
        </div>
        )}
        <button
        onClick={handleHairSegmentation}
        disabled={!file || segmentingHair}
        style={{ marginLeft: "10px" }}
        >
        {segmentingHair ? "Segmenting Hair..." : "Segment Hair"}
        </button>
        {hairSegmentation && (
        <div style={{ marginTop: "30px" }}>
         <h3>Hair Segmentation Results</h3>

         <p>Hair coverage: {hairSegmentation.coverage_pct}%</p>

         {hairSegmentation.hair_bounding_box && (
           <p>
           Hair box: x={hairSegmentation.hair_bounding_box.x},
           y={hairSegmentation.hair_bounding_box.y},
           w={hairSegmentation.hair_bounding_box.width},
           h={hairSegmentation.hair_bounding_box.height}
          </p>
        )}

        {hairSegmentation.warnings?.map((warning, index) => (
         <p key={index} style={{ color: "orange" }}>
         {warning}
         </p>
        ))}

    <div
      style={{
        display: "flex",
        gap: "20px",
        flexWrap: "wrap",
        marginTop: "15px",
      }}
    >
      <div>
        <h4>Hair Overlay</h4>
        <img
          src={`data:image/png;base64,${hairSegmentation.overlay_b64}`}
          alt="Hair segmentation overlay"
          style={{ width: "300px", maxWidth: "100%", borderRadius: "10px" }}
        />
      </div>

      <div>
        <h4>Hair Mask</h4>
        <img
          src={`data:image/png;base64,${hairSegmentation.mask_b64}`}
          alt="Hair segmentation mask"
          style={{ width: "300px", maxWidth: "100%", borderRadius: "10px" }}
        />
      </div>
    </div>
  </div>
)}
      <div style={{ marginTop: "25px" }}>
        <button
          onClick={handleGenerate}
          disabled={!file || loading}
          style={{
            padding: "12px 22px",
            fontSize: "16px",
            cursor: "pointer"
          }}
        >
          {loading ? "Generating..." : "Generate Hairstyle"}
        </button>
      </div>

      {error && (
        <p style={{ color: "red" }}>{error}</p>
      )}

      {(preview || generatedImage) && (
        <div style={{
          display: "flex",
          gap: "20px",
          marginTop: "30px",
          flexWrap: "wrap"
        }}>
          {preview && (
            <div>
              <h3>Original</h3>
              <img
                src={preview}
                alt="Original portrait"
                style={{ width: "300px", maxWidth: "100%" }}
              />
            </div>
          )}

          {generatedImage && (
            <div>
              <h3>AI Hairstyle Preview</h3>
              <img
                src={generatedImage}
                alt="Generated hairstyle"
                style={{ width: "300px", maxWidth: "100%" }}
              />

              <p>
                <a
                  href={generatedImage}
                  download="barbercopilot-preview.png"
                >
                  Download Preview
                </a>
              </p>
            </div>
          )}
        </div>
      )}

      {loading && (
        <p>
          AI is editing your hairstyle.
          This may take a little time.
        </p>
      )}
    </div>
  );
}

export default PhotoUploader;
    
