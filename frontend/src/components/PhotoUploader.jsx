
import { useEffect, useState } from "react";
import FaceLandmarkPreview from "./FaceLandmarkPreview.jsx";
import BarberCard from "./BarberCard";

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
  const [editMaskPreview, setEditMaskPreview] = useState(null);
  const [buildingMask, setBuildingMask] = useState(false);
  const [generationMode, setGenerationMode] = useState("standard");

  const [topLength, setTopLength] = useState(3.0);
  const [sideLength, setSideLength] = useState("2");
  const [fadeHeight, setFadeHeight] = useState("mid");
  const [texture, setTexture] = useState("natural");
  const [fringeDirection, setFringeDirection] = useState("side");
  const [generatedSettings, setGeneratedSettings] = useState(null);
  const [sideFile, setSideFile] = useState(null);
  const [sidePreview, setSidePreview] = useState(null);

  const [backFile, setBackFile] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [multiViewResults, setMultiViewResults] = useState({});
  const [generatingAll, setGeneratingAll] = useState(false);
  const [multiViewProgress, setMultiViewProgress] = useState("");
  const [multiViewSettings, setMultiViewSettings] = useState(null);

  // Clean up side photo preview
  useEffect(() => {
    return () => {
      if (sidePreview) URL.revokeObjectURL(sidePreview);
    };
  }, [sidePreview]);

  // Clean up back photo preview
  useEffect(() => {
    return () => {
      if (backPreview) URL.revokeObjectURL(backPreview);
    };
  }, [backPreview]);

  useEffect(() => {
    return () => {
      if (generatedImage) {
        URL.revokeObjectURL(generatedImage);
      }
    };
  }, [generatedImage]);
  useEffect(() => {
    return () => {
      Object.values(multiViewResults).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [multiViewResults]);

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
    setEditMaskPreview(null);
    setGeneratedSettings(null);
    setMultiViewResults({});
    setMultiViewSettings(null);
    setMultiViewProgress("");
    }

    function handleSideFileChange(event) {
      const selected = event.target.files?.[0];
      if (!selected) return;

      if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
        setError("Please select a valid image.");
        return;
      }

      setSideFile(selected);
      setSidePreview(URL.createObjectURL(selected));
      setError("");
      setMultiViewResults({});
      setMultiViewSettings(null);
      setMultiViewProgress("");
    }

    


  function handleBackFileChange(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setError("Please select a valid image.");
      return;
    }

    setBackFile(selected);
    setBackPreview(URL.createObjectURL(selected));
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
    formData.append("mode", generationMode);
    formData.append("top_length", topLength);
    formData.append("side_length", sideLength);
    formData.append("fade_height", fadeHeight);
    formData.append("texture", texture);
    formData.append("fringe_direction", fringeDirection);

    const settingsSnapshot = {
        selectedStyle,
        topLength,
        sideLength,
        fadeHeight,
        texture,
        fringeDirection,
      };  
    


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
      setGeneratedSettings(settingsSnapshot);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateAllViews() {
    if (!file || generatingAll) return;

    setGeneratingAll(true);
    setError("");
    setMultiViewProgress("Preparing images...");

    const settingsSnapshot = {
      selectedStyle,
      topLength,
      sideLength,
      fadeHeight,
      texture,
      fringeDirection,
    };

    const views = [
      { name: "front", photo: file },
      { name: "side", photo: sideFile },
      { name: "back", photo: backFile },
    ].filter((view) => view.photo !== null);

    const results = {};

    try {
      for (const view of views) {
        setMultiViewProgress(`Generating ${view.name} view...`);

        const formData = new FormData();
        formData.append("file", view.photo);
        formData.append("view", view.name);
        formData.append("style", selectedStyle);

        // Front can use facial landmarks.
        // Side and back currently use standard editing.
        formData.append(
          "mode",
          view.name === "front" ? generationMode : "standard"
        );

        formData.append("top_length", topLength);
        formData.append("side_length", sideLength);
        formData.append("fade_height", fadeHeight);
        formData.append("texture", texture);
        formData.append("fringe_direction", fringeDirection);

        const response = await fetch(
          "http://localhost:8000/api/generate",
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          let message = `Failed to generate ${view.name} view`;

          try {
            const data = await response.json();
            if (typeof data.detail === "string") {
              message = data.detail;
            }
          } catch {
            // Keep the fallback error message.
          }

          throw new Error(message);
        }

        const imageBlob = await response.blob();
        results[view.name] = URL.createObjectURL(imageBlob);
      }

      setMultiViewResults(results);
      setMultiViewSettings(settingsSnapshot);
      setMultiViewProgress("All available views generated!");

    } catch (err) {
      // If generation fails, retain successful views.
      if (Object.keys(results).length > 0) {
        setMultiViewResults(results);
        setMultiViewSettings(settingsSnapshot);
      }

      setError(err.message || "Multi-view generation failed");
      setMultiViewProgress("Generation stopped.");
    } finally {
      setGeneratingAll(false);
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
async function handleBuildEditMask() {
  if (!file) return;

  setBuildingMask(true);
  setError("");
  setEditMaskPreview(null);

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(
      "http://localhost:8000/api/debug-edit-mask",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Edit mask generation failed");
    }

    setEditMaskPreview(data);
  } catch (err) {
    setError(err.message || "Edit mask generation failed");
  } finally {
    setBuildingMask(false);
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

      
      <h2>1. Upload your photographs</h2>

      <p>
        Upload a front photograph to get started.
        Side and back photographs are optional.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: "16px",
        marginTop: "20px",
      }}
    >
      {/* FRONT PHOTO */}
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "12px",
          padding: "15px",
        }}
      >
      <h3>Front View *</h3>
      <p>Required</p>

      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        style={{ width: "100%" }}
      />

      {preview && (
        <img
          src={preview}
          alt="Front view preview"
          style={{
            width: "100%",
            marginTop: "12px",
            borderRadius: "8px",
          }}
        />
      )}
    </div>

    {/* SIDE PHOTO */}
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: "12px",
        padding: "15px",
      }}
    >
      <h3>Side View</h3>
      <p>Optional</p>

      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleSideFileChange}
        style={{ width: "100%" }}
      />

      {sidePreview && (
        <img
          src={sidePreview}
          alt="Side view preview"
          style={{
            width: "100%",
            marginTop: "12px",
            borderRadius: "8px",
          }}
        />
      )}
    </div>

    {/* BACK PHOTO */}
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: "12px",
        padding: "15px",
      }}
    >
      <h3>Back View</h3>
      <p>Optional</p>

      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleBackFileChange}
        style={{ width: "100%" }}
      />

      {backPreview && (
        <img
          src={backPreview}
          alt="Back view preview"
          style={{
            width: "100%",
            marginTop: "12px",
            borderRadius: "8px",
          }}
        />
      )}
    </div>
  </div>


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
        <h2>3. Customize the haircut</h2>

        <div style={{ marginBottom: "20px" }}>
          <label>
            Top Length: {topLength.toFixed(1)} inches
          </label>
          <br />
          <input
            type="range"
            min="1"
            max="6"
            step="0.5"
            value={topLength}
            onChange={(e) => setTopLength(parseFloat(e.target.value))}
            style={{ width: "300px" }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label>Side Length (Guard): </label>
          <select
            value={sideLength}
            onChange={(e) => setSideLength(e.target.value)}
            style={{ padding: "8px", marginLeft: "10px" }}
          >
            <option value="0.5">0.5</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="6">6</option>
            <option value="8">8</option>
          </select>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label>Fade Height: </label>
          <select
            value={fadeHeight}
            onChange={(e) => setFadeHeight(e.target.value)}
            style={{ padding: "8px", marginLeft: "10px" }}
          >
            <option value="low">Low</option>
            <option value="mid">Mid</option>
            <option value="high">High</option>
          </select>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label>Texture: </label>
          <select
            value={texture}
            onChange={(e) => setTexture(e.target.value)}
            style={{ padding: "8px", marginLeft: "10px" }}
          >
            <option value="natural">Natural</option>
            <option value="messy">Messy</option>
            <option value="defined">Defined</option>
          </select>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label>Fringe Direction: </label>
          <select
            value={fringeDirection}
            onChange={(e) => setFringeDirection(e.target.value)}
            style={{ padding: "8px", marginLeft: "10px" }}
          >
            <option value="forward">Forward</option>
            <option value="side">Side</option>
            <option value="back">Back</option>
          </select>
        </div>
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          border: "1px solid #ccc",
          borderRadius: "10px",
          background: "#f8f8f8",
        }}
      >
        <h3>Live Haircut Specification</h3>
        <p><strong>Base Style:</strong> {selectedStyle.replace("_", " ")}</p>
        <p><strong>Top Length:</strong> {topLength.toFixed(1)} inches</p>
        <p><strong>Side Length:</strong> Guard {sideLength}</p>
        <p><strong>Fade Height:</strong> {fadeHeight}</p>
        <p><strong>Texture:</strong> {texture}</p>
        <p><strong>Fringe Direction:</strong> {fringeDirection}</p>
      </div>
      
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
      <button
        onClick={handleBuildEditMask}
        disabled={!file || buildingMask}
        style={{ marginLeft: "10px" }}
      >
       {buildingMask ? "Building Edit Mask..." : "Build Edit Mask"}
      </button>
      {editMaskPreview && (
       <div style={{ marginTop: "30px" }}>
       <h3>Edit Mask Debug Preview</h3>

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div>
            <h4>Overlay</h4>
            <img
              src={`data:image/png;base64,${editMaskPreview.overlay_b64}`}
              alt="Edit mask overlay"
              style={{ width: "300px", maxWidth: "100%", borderRadius: "10px" }}
            />
          </div>

          <div>
            <h4>Binary Mask</h4>
            <img
              src={`data:image/png;base64,${editMaskPreview.binary_b64}`}
              alt="Binary edit mask"
              style={{ width: "300px", maxWidth: "100%", borderRadius: "10px" }}
            />
          </div>

          <div>
            <h4>Final Feathered Mask</h4>
            <img
              src={`data:image/png;base64,${editMaskPreview.final_mask_b64}`}
              alt="Final feathered edit mask"
              style={{ width: "300px", maxWidth: "100%", borderRadius: "10px" }}
            />
          </div>
          </div>
          </div>
          )}
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
    <h3>Generation Method</h3>

    <label style={{ marginRight: "20px" }}>
        <input
          type="radio"
          name="generationMode"
          value="standard"
          checked={generationMode === "standard"}
          onChange={(e) => setGenerationMode(e.target.value)}
        />
        Standard AI
      </label>

      <label>
        <input
          type="radio"
          name="generationMode"
          value="masked"
          checked={generationMode === "masked"}
          onChange={(e) => setGenerationMode(e.target.value)}
        />
        CV-Guided AI
      </label>

      <p style={{ fontSize: "13px", color: "#888" }}>
        CV-Guided AI uses your detected hair region
        to guide image editing.
      </p>
    </div>

      
    <div style={{ marginTop: "25px" }}>
      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={handleGenerate}
          disabled={!file || loading || generatingAll}
          style={{
            padding: "12px 22px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          {loading ? "Generating..." : "Generate Hairstyle"}
        </button>

        <button
          onClick={handleGenerateAllViews}
          disabled={!file || generatingAll || loading}
          style={{
            padding: "12px 22px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          {generatingAll
            ? "Generating Views..."
            : "Generate All Views"}
        </button>
      </div>

      {multiViewProgress && (
        <p style={{ marginTop: "12px" }}>
          {multiViewProgress}
        </p>
      )}
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

              {generatedImage && generatedSettings && (
                <BarberCard
                  selectedStyle={generatedSettings.selectedStyle}
                  topLength={generatedSettings.topLength}
                  sideLength={generatedSettings.sideLength}
                  fadeHeight={generatedSettings.fadeHeight}
                  texture={generatedSettings.texture}
                  fringeDirection={generatedSettings.fringeDirection}
                  generatedImage={generatedImage}
                />
            )}



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

      {Object.keys(multiViewResults).length > 0 && (
        <div style={{ marginTop: "35px" }}>
          <h2>Multi-Angle Hairstyle Preview</h2>

          <p>
            All generated views use the same saved haircut settings.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "20px",
            }}
          >
            {["front", "side", "back"].map((view) =>
              multiViewResults[view] ? (
                <div key={view}>
                  <h3>
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                    {" View"}
                  </h3>

                  <img
                    src={multiViewResults[view]}
                    alt={`Generated ${view} hairstyle`}
                    style={{
                      width: "100%",
                      borderRadius: "12px",
                    }}
                  />

                  <a
                    href={multiViewResults[view]}
                    download={`barbercopilot-${view}.png`}
                  >
                    Download {view} view
                  </a>
                </div>
              ) : null
            )}
    </div>

    {multiViewSettings && (
      <p style={{ marginTop: "15px" }}>
        Generated with {multiViewSettings.topLength.toFixed(1)}
        -inch top, {multiViewSettings.fadeHeight} fade,
        #{multiViewSettings.sideLength} sides,
        {multiViewSettings.texture} texture.
      </p>
    )}
  </div>
)}

    </div>
  );
}

export default PhotoUploader;
    
