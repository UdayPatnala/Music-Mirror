/**
 * YouTube video IDs mapped from song title (lowercase).
 * Single source of truth for the frontend player.
 * Backend maintains its own copy in recommendation_engine.py for server-side fallback.
 */
export const TRACK_YOUTUBE_IDS: Record<string, string> = {
  "blinding lights":          "4NRXx6U8ABQ",
  "levitating":               "TUVcZfQe-Kw",
  "can't stop the feeling!":  "ru0K8uYEZWw",
  "uptown funk":              "OPf0YbXqDm0",
  "happy":                    "ZbZSe6N_BXs",
  "good as hell":             "smDa04GcnzA",
  "walking on sunshine":      "iPUmE-tne5U",
  "sugar":                    "09R8_2nJtjg",
  "sunflower":                "ApXoWvfEYVU",
  "don't start now":          "oygrmJFKYZY",
  "shake it off":             "nfWlot6h_JM",
  "someone like you":         "hLQl3WQQoQ0",
  "sunset lover":             "1G4isv_Fylg",
  "resonance":                "8GW6sLrK40k",
  "fix you":                  "k4V3Mo61hJM",
  "drivers license":          "ZmDBbnmKpqQ",
  "all of me":                "450p7goxZqg",
  "believer":                 "7wtfhZwyrYY",
  "radioactive":              "ktvTqWscGsw",
  "eye of the tiger":         "btPJPFnesV4",
  "stronger":                 "PsO6ZnUZI0g",
  "numb":                     "kXYiU_JCYtU",
  "weightless":               "UfcAVejslrU",
  "clair de lune":            "WNcsUNKlAKw",
  "as it was":                "H5v3kku4y6Q",
  "stay":                     "kTJczUoc26U",
  "heat waves":               "mRD0-GxqHVo",
  "bad guy":                  "DyDfgMOUjCI",
  "industry baby":            "UTEMS6mKGi4",
};

export function getYouTubeId(song: { title?: string; name?: string; youtubeId?: string }): string {
  if (song.youtubeId && song.youtubeId !== "undefined") return song.youtubeId;
  const key = (song.title || song.name || "").toLowerCase().trim();
  return TRACK_YOUTUBE_IDS[key] || "4NRXx6U8ABQ";
}
