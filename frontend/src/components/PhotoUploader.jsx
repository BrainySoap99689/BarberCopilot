
import { useEffect, useState } from "react";

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
