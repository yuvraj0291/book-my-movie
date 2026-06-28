import { ImageResponse } from "next/og";
import { getMovieByIdAction } from "@/app/actions/movieActions";

export const alt = "Movie Details | MovieRocks";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ movieId: string }> }) {
  const { movieId } = await params;
  const movie = await getMovieByIdAction(movieId);

  if (!movie) {
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#030712",
            color: "#ffffff",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <div style={{ backgroundColor: "#e11d48", padding: "8px 16px", borderRadius: "8px", fontSize: "24px", fontWeight: "bold" }}>🍿</div>
            <span style={{ fontSize: "36px", fontWeight: "bold" }}>MovieRocks</span>
          </div>
          <span style={{ fontSize: "20px", color: "#9ca3af" }}>Premium Ticket Booking Platform</span>
        </div>
      ),
      { ...size }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#030712",
          color: "#ffffff",
          fontFamily: "sans-serif",
          padding: "48px",
          position: "relative",
        }}
      >
        {/* Background Decorative Glow */}
        <div
          style={{
            position: "absolute",
            top: "-150px",
            right: "-150px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(225,29,72,0.15) 0%, rgba(0,0,0,0) 70%)",
            display: "flex",
          }}
        />

        {/* Movie Poster */}
        <div
          style={{
            width: "280px",
            height: "420px",
            borderRadius: "16px",
            overflow: "hidden",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          }}
        >
          <img
            src={movie.posterUrl}
            alt={movie.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>

        {/* Movie Meta Information */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            marginLeft: "48px",
            flex: 1,
            height: "420px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ backgroundColor: "rgba(225,29,72,0.1)", border: "1px solid rgba(225,29,72,0.2)", padding: "4px 12px", borderRadius: "99px", fontSize: "12px", fontWeight: "bold", color: "#fb7185", textTransform: "uppercase" }}>
                Now Showing
              </div>
              <div style={{ display: "flex", color: "#fbbf24", fontSize: "16px", fontWeight: "bold" }}>
                ★ {movie.rating.toFixed(1)}/10
              </div>
            </div>

            <h1
              style={{
                fontSize: "48px",
                fontWeight: "900",
                lineHeight: "1.1",
                color: "#ffffff",
                margin: 0,
                padding: 0,
              }}
            >
              {movie.title}
            </h1>

            <div style={{ display: "flex", color: "#9ca3af", fontSize: "16px", gap: "12px" }}>
              <span>{movie.durationMins} Mins</span>
              <span>•</span>
              <span>{movie.languages.map((l) => l.language.name).join(", ")}</span>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              {movie.genres.map((g) => (
                <div
                  key={g.genreId}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    padding: "4px 12px",
                    borderRadius: "99px",
                    fontSize: "12px",
                    color: "#d1d5db",
                  }}
                >
                  {g.genre.name}
                </div>
              ))}
            </div>
          </div>

          {/* Platform Watermark */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "auto" }}>
            <div style={{ backgroundColor: "#e11d48", padding: "6px 12px", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", color: "#ffffff", display: "flex", alignItems: "center" }}>
              🍿
            </div>
            <span style={{ fontSize: "20px", fontWeight: "bold", color: "#ffffff" }}>
              Movie<span style={{ color: "#e11d48" }}>Rocks</span>
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
